import asyncio
import json

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from forge.phase2.inference import ChatProvider, TransportSettings
from forge.phase3.safety import (
    DemoSettings,
    SafetyMiddleware,
    host_allowed,
    public_path,
)
from forge.providers import ProviderError
from forge.submission.audit import DENIED_PATHS, HEADER_POLICY, audit, validate_url
from forge.submission.models import BASETEN_MODELS, DOCUMENTED_BASETEN_IDS
from forge.submission.serve import public_launch_blockers
from forge.submission.smoke import ActivationSettings, execute, main, preflight
from pydantic import ValidationError

KEY = "dummy-fixture-only-not-a-real-key"


def config(**kwargs):
    return TransportSettings(
        enabled=True,
        free_access_confirmed=True,
        api_key=KEY,
        request_budget=1,
        token_budget=16384,
        **kwargs,
    )


ACTIVATED = ActivationSettings(
    credits_approved=True, card_free_entitlement_confirmed=True
)


def test_candidate_catalog_does_not_enable_unverified_event_alias():
    assert [m.model_id for m in BASETEN_MODELS] == [
        "meta-models/muse-spark-open",
        "meta-models/muse-spark-open-1026",
    ]
    assert DOCUMENTED_BASETEN_IDS == {"meta-models/muse-spark-open"}
    assert not any(m.account_access_verified for m in BASETEN_MODELS)
    with pytest.raises(ValidationError):
        TransportSettings(model_id=BASETEN_MODELS[1].model_id)


@pytest.mark.parametrize(
    "activation",
    [
        ActivationSettings(),
        ActivationSettings(credits_approved=True),
        ActivationSettings(card_free_entitlement_confirmed=True),
    ],
)
def test_missing_entitlement_blocks_before_network(activation):
    sent = []
    p = ChatProvider(config(), httpx.MockTransport(lambda r: sent.append(r)))
    with pytest.raises(ProviderError):
        asyncio.run(execute(p, activation))
    assert not sent and p.used == 0


@pytest.mark.parametrize(
    "kwargs",
    [
        {"request_budget": 2},
        {"retry_limit": 1},
        {"token_budget": 32768},
        {"enabled": False},
        {"free_access_confirmed": False},
        {"timeout_seconds": 30},
        {"api_key": None},
    ],
)
def test_smoke_refuses_unsafe_configuration(kwargs):
    base = config().model_dump()
    base["api_key"] = KEY
    base.update(kwargs)
    assert not preflight(TransportSettings(**base), ACTIVATED)[
        "ready_for_explicit_execution"
    ]


def test_one_fixture_response_is_labeled_and_independently_replayed():
    sent = []

    def handler(request):
        sent.append(request)
        payload = json.loads(request.content)
        assert "seed" not in payload["messages"][1]["content"]
        output = {
            "hypotheses": [
                {
                    "hypothesis_id": h,
                    "rationale": "Synthetic test candidate, not real inference",
                    "evidence_channels": ["pressure"],
                }
                for h in ["process-pressure", "sensor-pressure"]
            ]
        }
        return httpx.Response(
            200,
            json={
                "model": config().model_id,
                "choices": [
                    {
                        "finish_reason": "stop",
                        "message": {"content": json.dumps(output)},
                    }
                ],
            },
        )

    p = ChatProvider(config(), httpx.MockTransport(handler))
    result = asyncio.run(execute(p, ACTIVATED))
    assert (
        result["source"] == "test_transport"
        and result["request_attempts"] == len(sent) == 1
    )
    assert result["independent_replay_status"] == "SUPPORTED_SYNTHETIC"
    assert result["report"]["investigation"]["model_source"] == "test_transport"
    assert KEY not in json.dumps(result)


def test_dry_run_never_calls_provider(monkeypatch, capsys):
    monkeypatch.setattr("forge.submission.smoke.TransportSettings", lambda: config())
    monkeypatch.setattr("forge.submission.smoke.ActivationSettings", lambda: ACTIVATED)

    def forbidden(*args, **kwargs):
        raise AssertionError("Dry run attempted provider creation")

    monkeypatch.setattr("forge.submission.smoke.ChatProvider", forbidden)
    assert main([]) == 0
    assert json.loads(capsys.readouterr().out)["network_requests_sent"] == 0


def test_existing_artifact_is_never_overwritten_or_sent(tmp_path, monkeypatch):
    output = tmp_path / "report.json"
    output.write_text("preserve")
    monkeypatch.setattr("forge.submission.smoke.TransportSettings", lambda: config())
    monkeypatch.setattr("forge.submission.smoke.ActivationSettings", lambda: ACTIVATED)

    def forbidden(*args, **kwargs):
        raise AssertionError("Attempted provider creation")

    monkeypatch.setattr("forge.submission.smoke.ChatProvider", forbidden)
    assert main(["--execute", "--output", str(output)]) == 2
    assert output.read_text() == "preserve"


def test_successful_fixture_artifact_is_private(tmp_path, monkeypatch):
    from forge.submission import smoke

    monkeypatch.setattr(smoke, "TransportSettings", lambda: config())
    monkeypatch.setattr(smoke, "ActivationSettings", lambda: ACTIVATED)

    async def fixture(*args):
        return {"source": "test_transport", "warning": "No real Meta request"}

    monkeypatch.setattr(smoke, "execute", fixture)
    output = tmp_path / "fixture.json"
    assert main(["--execute", "--output", str(output)]) == 0
    assert output.stat().st_mode & 0o777 == 0o600
    assert json.loads(output.read_text())["source"] == "test_transport"


def test_public_launcher_rejects_developer_mode_credentials_and_budget():
    public = DemoSettings(mode="public")
    assert not public_launch_blockers(public, TransportSettings())
    assert public_launch_blockers(DemoSettings(), TransportSettings()) == [
        "public_mode_required"
    ]
    assert public_launch_blockers(public, config())
    assert public_launch_blockers(public, TransportSettings(api_key=KEY))


@pytest.mark.parametrize(
    "host",
    [
        "*",
        "*.example.org",
        "https://example.org",
        "example.org/path",
        "UPPER.test",
        "bad..test",
    ],
)
def test_host_configuration_rejects_ambiguous_entries(host):
    with pytest.raises(ValidationError):
        DemoSettings(allowed_hosts=[host])


@pytest.mark.parametrize(
    "host",
    [
        "evil.test",
        "owner@localhost",
        "localhost.evil.test",
        "localhost/path",
        "localhost%00.evil",
        "localhost:bad",
        "localhost\\evil",
        "localhost\n",
    ],
)
def test_host_boundary_rejects_spoofed_authority(host):
    assert not host_allowed([(b"host", host.encode())], ["localhost"])


def test_host_boundary_rejects_duplicates_and_accepts_explicit_port_ipv6():
    assert not host_allowed(
        [(b"host", b"localhost"), (b"host", b"evil")], ["localhost"]
    )
    assert host_allowed([(b"host", b"localhost:7860")], ["localhost"])
    assert host_allowed([(b"host", b"[::1]:7860")], ["::1"])


def test_public_surface_is_exact_not_a_prefix():
    for path in [
        "/api/v3/sessions/developer",
        "/api/v3/sessions/" + "a" * 32 + "/extra",
        "/assets/../secrets",
        "/api/v3/sessions/" + "a" * 32 + "/advance/extra",
    ]:
        assert not public_path("GET", path) and not public_path("POST", path)
    assert public_path("POST", "/api/v3/sessions/" + "a" * 32 + "/advance")


def test_invalid_host_gets_structured_security_headers(monkeypatch):
    from forge.phase3 import safety

    monkeypatch.setattr(safety, "settings", lambda: DemoSettings(mode="public"))
    small = FastAPI()
    small.add_middleware(SafetyMiddleware)
    with TestClient(small) as client:
        r = client.get(
            "/api/v3/health",
            headers={"Host": "evil.test", "X-Forwarded-Host": "localhost"},
        )
        assert r.status_code == 400 and r.json()["error"]["code"] == "invalid_host"
        assert r.headers["x-frame-options"] == "DENY"


@pytest.mark.parametrize(
    "url",
    [
        "http://example.org",
        "https://user:secret@example.org",
        "https://example.org/?token=x",
        "https://example.org/path",
        "http://localhost",
        "http://127.0.0.1.evil",
    ],
)
def test_deployment_audit_requires_safe_origin(url):
    with pytest.raises(ValueError):
        validate_url(url, True)


def test_deployment_audit_is_read_only_and_reports_fixture_transport():
    seen = []

    def handler(request):
        seen.append(request)
        path = request.url.path
        headers = {
            **HEADER_POLICY,
            "content-security-policy": "default-src 'self'",
            "cache-control": "no-store",
        }
        if path.endswith("capabilities"):
            return httpx.Response(
                200,
                json={
                    "mode": "public",
                    "real_inference_permitted": False,
                    "uploads_permitted": False,
                    "physical_causality": False,
                },
                headers=headers,
            )
        if path.endswith("ready"):
            return httpx.Response(
                200,
                json={
                    "status": "ready",
                    "storage": True,
                    "frontend_bundle": True,
                    "inference_required": False,
                },
                headers=headers,
            )
        return httpx.Response(403 if path in DENIED_PATHS else 200, headers=headers)

    result = audit("https://fixture.invalid", transport=httpx.MockTransport(handler))
    assert result["passed"] and result["transport"] == "local_fixture_not_deployed"
    assert all(r.method == "GET" for r in seen)


def test_deployment_audit_stops_if_server_exposes_development_mode():
    seen = []

    def handler(request):
        seen.append(request)
        return httpx.Response(200, json={"mode": "local"})

    result = audit("https://fixture.invalid", transport=httpx.MockTransport(handler))
    assert not result["passed"] and len(seen) == 1


def test_failed_smoke_artifact_never_echoes_exception_secrets(
    tmp_path, monkeypatch, capsys
):
    from forge.submission import smoke

    monkeypatch.setattr(smoke, "TransportSettings", lambda: config())
    monkeypatch.setattr(smoke, "ActivationSettings", lambda: ACTIVATED)

    async def failed(*args):
        raise ProviderError(KEY)

    monkeypatch.setattr(smoke, "execute", failed)
    output = tmp_path / "failed.json"
    assert main(["--execute", "--output", str(output)]) == 1
    assert KEY not in output.read_text() + capsys.readouterr().out
    assert json.loads(output.read_text())["status"] == "failed_or_unverified"


def test_tls_failure_is_never_reported_as_verified(monkeypatch):
    def failed(request):
        raise httpx.ConnectError("TLS verification failed")

    client = httpx.Client(transport=httpx.MockTransport(failed))
    monkeypatch.setattr("forge.submission.audit.httpx.Client", lambda **kwargs: client)
    result = audit("https://untrusted.invalid")
    assert not result["passed"] and result["transport"] == "https_not_verified"


def test_audit_rejects_compressed_responses_before_reading():
    result = audit(
        "https://fixture.invalid",
        transport=httpx.MockTransport(
            lambda r: httpx.Response(200, headers={"content-encoding": "gzip"})
        ),
    )
    assert not result["passed"]
