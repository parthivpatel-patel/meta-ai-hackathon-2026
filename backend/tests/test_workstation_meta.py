import asyncio
import copy
import json
import stat

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from forge.engine.contracts import digest
from forge.industrial import meta, meta_cli
from forge.industrial.investigation import Context, InvestigationRequest, investigate
from forge.industrial.model import Recipe, simulate
from forge.main import app
from forge.phase2.inference import ChatProvider, TransportSettings
from forge.providers import ProviderError
from forge.submission.smoke import ActivationSettings, preflight


def capture(scenario="bearing"):
    return investigate(
        InvestigationRequest(
            recipe=Recipe(scenario=scenario), context=Context(component_id="bearing")
        )
    )


def run_fixture(report=None):
    provider = meta_cli.fixture_provider()
    return asyncio.run(
        meta_cli.execute(
            report or capture(),
            provider,
            ActivationSettings(),
            meta_cli.Authorization(),
            fixture=True,
        )
    )


def test_actual_serialized_request_is_observed_only_and_fixture_is_never_genuine():
    provider = meta_cli.fixture_provider()
    wire = []
    original = provider.transport

    def inspect(request):
        payload = json.loads(request.content)
        wire.append(payload)
        return original.handle_request(request)

    provider.transport = httpx.MockTransport(inspect)
    original_capture = capture()
    result = asyncio.run(
        meta_cli.execute(
            original_capture,
            provider,
            ActivationSettings(),
            meta_cli.Authorization(),
            fixture=True,
        )
    )
    assert result["network_requests_sent"] == 0 and result["source"] == "test_transport"
    supplied = json.loads(wire[0]["messages"][1]["content"])
    assert set(supplied) == {"telemetry", "multimodal_features"}
    encoded = json.dumps(supplied)
    for forbidden in [
        '"recipe"',
        '"seed"',
        '"scenario"',
        '"truth"',
        '"trials"',
        '"decision"',
        '"findings"',
        '"filename"',
        '"rationale"',
        '"witness_before"',
    ]:
        assert forbidden not in encoded
    features = supplied["multimodal_features"]
    assert features["component_id"] == "bearing"
    end = simulate(Recipe())["frames"][319]["timestamp"]
    assert all(x["timestamp"] <= end for x in features["observed_samples"])
    assert digest(supplied) == result["report"]["model_proposal"]["input_hash"]
    assert (
        "diagnostics" not in result["report"]
        and "usage" not in result["report"]["model_proposal"]
    )
    assert "not Meta" in result["report"]["provider"]
    assert capture() == original_capture


def test_model_request_metadata_cannot_carry_recipe_labels_indirectly(monkeypatch):
    request = InvestigationRequest(context=Context(component_id="motor"))
    same_report = investigate(request)
    same_frames = simulate(request.recipe)
    monkeypatch.setattr(meta, "investigate", lambda _: same_report)
    monkeypatch.setattr(meta, "simulate", lambda _: same_frames)
    first = meta.prepare(request)
    second = meta.prepare(
        request.model_copy(
            update={"recipe": Recipe(scenario="pressure_sensor", seed=987654)}
        )
    )
    assert first == second


def test_private_preflight_and_unapproved_execution_make_no_request():
    provider = meta_cli.fixture_provider()
    check = meta_cli.preflight(
        provider.settings, ActivationSettings(), meta_cli.Authorization()
    )
    assert "provider_enforced_spending_limit_unconfirmed" in check["blockers"]
    assert "separate_workstation_request_authorization_required" in check["blockers"]
    assert "private_genuine_smoke_receipt_required" in check["blockers"]
    with pytest.raises(ProviderError):
        asyncio.run(
            meta_cli.execute(
                capture(), provider, ActivationSettings(), meta_cli.Authorization()
            )
        )
    assert provider.used == 0
    assert not preflight(provider.settings, ActivationSettings())[
        "ready_for_explicit_execution"
    ]


@pytest.mark.parametrize(
    "field,value",
    [("enabled", False), ("api_key", None), ("token_budget", 1), ("retry_limit", 1)],
)
def test_disabled_and_budget_failures_never_attempt_transport(field, value):
    base = meta_cli.fixture_provider()
    config = base.settings.model_copy(update={field: value})
    provider = ChatProvider(
        config, httpx.MockTransport(lambda _: pytest.fail("No request allowed"))
    )
    with pytest.raises(ProviderError):
        asyncio.run(
            meta_cli.execute(
                capture(),
                provider,
                ActivationSettings(),
                meta_cli.Authorization(),
                fixture=True,
            )
        )
    assert provider.used == 0


@pytest.mark.parametrize(
    "failure",
    [
        401,
        402,
        429,
        503,
        "timeout",
        "network",
        "malformed",
        "wrong_model",
        "invalid_id",
        "tool",
        "legacy_tool",
        "truncated",
        "url",
        "code",
        "actuation",
        "wrong_reference",
    ],
)
def test_failed_provider_output_has_no_fallback_or_retry(failure):
    provider = meta_cli.fixture_provider()
    valid = json.loads(
        provider.transport.handle_request(
            httpx.Request("POST", "https://fixture.invalid")
        ).content
    )

    def respond(request):
        if failure == "timeout":
            raise httpx.ReadTimeout("fixture-only")
        if failure == "network":
            raise httpx.ConnectError("fixture-only")
        if isinstance(failure, int):
            return httpx.Response(failure, text="untrusted provider text must not leak")
        if failure == "malformed":
            return httpx.Response(200, text="not JSON")
        data = copy.deepcopy(valid)
        output = json.loads(data["choices"][0]["message"]["content"])
        if failure == "wrong_model":
            data["model"] = "unapproved-model"
        if failure == "tool":
            data["choices"][0]["message"]["tool_calls"] = [{"name": "actuate"}]
        if failure == "legacy_tool":
            data["choices"][0]["message"]["function_call"] = {
                "name": "actuate",
                "arguments": "{}",
            }
        if failure == "truncated":
            data["choices"][0]["finish_reason"] = "length"
        if failure == "invalid_id":
            output["hypotheses"][0]["hypothesis_id"] = "physical-bearing-failure"
        if failure == "url":
            output["hypotheses"][0]["rationale"] = "Visit https://untrusted.invalid"
        if failure == "code":
            output["hypotheses"][0]["rationale"] = "```python exec('unsafe')```"
        if failure == "actuation":
            output["hypotheses"][0]["rationale"] = "Shut down the physical pump"
        if failure == "wrong_reference":
            output["hypotheses"][0]["evidence_channels"] = ["pressure"]
        data["choices"][0]["message"]["content"] = json.dumps(output)
        return httpx.Response(200, json=data)

    provider.transport = httpx.MockTransport(respond)
    current = capture()
    before = copy.deepcopy(current)
    with pytest.raises((ProviderError, ValueError)):
        asyncio.run(
            meta_cli.execute(
                current,
                provider,
                ActivationSettings(),
                meta_cli.Authorization(),
                fixture=True,
            )
        )
    assert current == before and provider.used == 1 and len(provider.attempts) == 1
    assert "untrusted provider text" not in json.dumps(provider.attempts)


def test_proposals_do_not_select_experiments_or_override_verification():
    result = run_fixture(capture("pressure_sensor"))
    report = result["report"]
    assert report["model_proposal"]["source"] == "test_transport"
    while report["plan"]:
        report = meta.advance(report)
    base = investigate(InvestigationRequest.model_validate(report["request"]))
    assert report["trials"] == base["trials"] and report["decision"] == base["decision"]
    assert report["decision"]["findings"] == ["sensor-pressure"]
    assert all(x["hypothesis_id"] != "sensor-pressure" for x in report["ranking"])
    assert meta.replay(report) == report
    assert "not Meta" in meta.render(report)


def test_replay_rejects_tampering_and_recorded_identity_is_not_authentication():
    report = run_fixture()["report"]
    for key in ["measurements", "model_evidence"]:
        bad = copy.deepcopy(report)
        if key == "measurements":
            bad[key][0]["pressure"] += 1
        else:
            bad[key]["multimodal_features"]["equipment_id"] = "injected"
        bad["report_hash"] = digest(
            {k: v for k, v in bad.items() if k != "report_hash"}
        )
        with pytest.raises(ValueError):
            meta.replay(bad)
    claimed = meta.RecordedProposal.model_validate(
        {**report["model_proposal"], "source": "meta_http_response"}
    )
    unverified = meta.make_report(
        InvestigationRequest.model_validate(report["request"]), claimed
    )
    assert "not authenticated" in unverified["provider"]
    assert "VERIFIED_REAL_INFERENCE" not in json.dumps(unverified)


def test_proposal_cannot_be_rebound_to_another_capture_or_component():
    report = run_fixture()["report"]
    proposal = meta.RecordedProposal.model_validate(report["model_proposal"])
    request = InvestigationRequest.model_validate(report["request"])
    for other in [
        request.model_copy(
            update={"recipe": request.recipe.model_copy(update={"seed": 2031})}
        ),
        request.model_copy(update={"context": Context(component_id="motor")}),
    ]:
        with pytest.raises(ValueError):
            meta.make_report(other, proposal)


def test_recorded_html_escapes_untrusted_narrative_instead_of_interpreting_it():
    report = run_fixture()["report"]
    raw = copy.deepcopy(report["model_proposal"])
    raw["output"]["hypotheses"][0]["rationale"] = (
        '<b onclick="alert(1)">untrusted text</b>'
    )
    raw["output_hash"] = digest(raw["output"])
    reproduced = meta.make_report(
        InvestigationRequest.model_validate(report["request"]),
        meta.RecordedProposal.model_validate(raw),
    )
    rendered = meta.render(reproduced)
    assert "<b onclick=" not in rendered and "&lt;b onclick=" in rendered


def test_public_api_cannot_initialize_provider_and_handles_malformed_imports(
    monkeypatch,
):
    from forge.phase3 import safety

    monkeypatch.setattr(
        safety,
        "settings",
        lambda: safety.DemoSettings(mode="public", allowed_hosts=["testserver"]),
    )
    monkeypatch.setattr(
        "forge.phase2.inference.get_provider",
        lambda: pytest.fail("No provider in HTTP workflow"),
    )
    report = run_fixture()["report"]
    with TestClient(app, client=("203.0.113.57", 50000)) as client:
        status = client.get("/api/v5/model-status").json()
        assert (
            status["live_requests_permitted"] is False
            and status["live_access_verified"] is False
        )
        assert client.post("/api/v5/infer", json={}).status_code == 403
        prepared = client.post("/api/v5/prepare", json=report["request"])
        assert (
            prepared.status_code == 200
            and prepared.json()["network_requests_sent"] == 0
        )
        assert client.post("/api/v5/replay", json=report).status_code == 200
        advanced = client.post("/api/v5/advance", json=report)
        assert advanced.status_code == 200 and len(advanced.json()["trials"]) == 1
        assert client.post("/api/v5/report.html", json=report).status_code == 200
        bad = {**report, "api_key": "untrusted marker"}
        response = client.post("/api/v5/replay", json=bad)
        assert response.status_code == 422 and "untrusted marker" not in response.text
        assert client.post("/api/v5/replay", content=b"x" * 1048577).status_code == 413


def test_private_fixture_cli_reserves_outputs_and_keeps_diagnostics_private(tmp_path):
    source, receipt, public = (
        tmp_path / p for p in ["capture.json", "receipt.json", "public.json"]
    )
    source.write_text(json.dumps(capture()))
    args = [
        "--fixture",
        "--capture",
        str(source),
        "--output",
        str(receipt),
        "--public-report",
        str(public),
    ]
    assert meta_cli.main(args) == 0
    assert stat.S_IMODE(receipt.stat().st_mode) == 0o600
    assert stat.S_IMODE(public.stat().st_mode) == 0o600
    private = json.loads(receipt.read_text())
    shared = json.loads(public.read_text())
    assert private["network_requests_sent"] == 0 and "diagnostics" in private
    assert "diagnostics" not in shared and "usage" not in shared["model_proposal"]
    assert meta_cli.main(args) == 2
    assert meta.replay(shared) == shared
    later = investigate(InvestigationRequest(experiments=1))
    with pytest.raises(ValueError):
        meta_cli.captured_request(later)


def test_credential_roles_and_unsupported_name_fail_closed(monkeypatch):
    marker = "fixture-only-unsupported-key-not-a-real-secret"
    monkeypatch.setenv("FORGE_INFERENCE_KEY", marker)
    with pytest.raises(ValidationError) as caught:
        TransportSettings()
    assert marker not in str(caught.value)
    monkeypatch.delenv("FORGE_INFERENCE_KEY")
    monkeypatch.setenv("FORGE_INFERENCE_API_KEY", marker)
    assert not ChatProvider(TransportSettings()).status()["network_inference_enabled"]
    monkeypatch.setenv("BASETEN_API_KEY", "different-fixture-only-key")
    with pytest.raises(ValidationError):
        TransportSettings()


def test_offline_capture_rejects_symlinks_special_files_and_oversize(tmp_path):
    from forge.industrial.files import read_json

    source = tmp_path / "capture.json"
    source.write_text(json.dumps(capture()))
    alias = tmp_path / "alias.json"
    alias.symlink_to(source)
    with pytest.raises(OSError):
        read_json(alias)
    source.write_bytes(b"x" * 1048577)
    with pytest.raises(ValueError):
        read_json(source)
    with pytest.raises((ValueError, OSError)):
        read_json(tmp_path)
