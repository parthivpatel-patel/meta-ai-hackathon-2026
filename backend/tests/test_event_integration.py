import asyncio
import base64
import json
import struct

import httpx
import pytest
from forge.phase2.evidence import demo_assets
from forge.phase2.inference import ChatProvider, TransportSettings
from forge.phase2.thermal_input import thermal_png
from forge.phase3.reporting import export, replay
from forge.phase3.service import PRESETS, run
from forge.providers import ProviderError
from forge.submission.models import EVENT_MODEL_ID
from pydantic import ValidationError

KEY = "fixture-only-event-credential-not-real"


def test_protected_baseten_key_uses_exact_event_model(monkeypatch):
    monkeypatch.setenv("BASETEN_API_KEY", KEY)
    c = TransportSettings()
    assert c.api_key.get_secret_value() == KEY and c.model_id == EVENT_MODEL_ID
    assert (
        KEY not in repr(c)
        and "event_api_key" not in c.model_dump()
        and "api_key" not in c.model_dump()
    )
    assert not ChatProvider(c).status()["network_inference_enabled"]
    with pytest.raises(ValidationError):
        TransportSettings(model_id="meta-models/muse-spark-open")
    with pytest.raises(ValidationError):
        TransportSettings(
            provider="meta",
            endpoint="https://api.meta.ai/v1/chat/completions",
            model_id="muse-spark-1.3",
        )
    with pytest.raises(ValidationError):
        TransportSettings(api_key="conflicting-key")


def test_fixture_success_cannot_claim_authenticated_access():
    def handler(request):
        payload = json.loads(request.content)
        assert payload["model"] == EVENT_MODEL_ID
        assert request.headers["Authorization"] == "Bearer " + KEY
        output = {
            "hypotheses": [
                {
                    "hypothesis_id": h,
                    "rationale": "Fixture proposals only",
                    "evidence_channels": ["pressure"],
                }
                for h in ["process-pressure", "sensor-pressure"]
            ]
        }
        return httpx.Response(
            200,
            json={
                "model": EVENT_MODEL_ID,
                "choices": [
                    {
                        "finish_reason": "stop",
                        "message": {"content": json.dumps(output)},
                    }
                ],
            },
        )

    p = ChatProvider(
        TransportSettings(
            api_key=KEY,
            enabled=True,
            free_access_confirmed=True,
            request_budget=1,
            thermal_images=True,
        ),
        httpx.MockTransport(handler),
    )
    s = asyncio.run(run(PRESETS["misleading_sensor"][1], demo_assets(), provider=p))
    assert (
        s.model_source == "test_transport"
        and s.inference.input_mode == "thermal_png_and_summaries"
    )
    assert s.inference.visual_png_sha256 and replay(export(s)) == s.decision
    assert not p.status()["authenticated_response_received"]
    report = export(s)
    report["investigation"]["inference"]["visual_input_hash"] = "incorrect"
    from forge.engine.contracts import digest

    report["run_id"] = "RUN3-" + digest(report["investigation"])
    with pytest.raises(ValueError, match="provenance"):
        replay(report)


def test_thermal_image_wire_format_and_provenance_are_bounded():
    frame = demo_assets().thermal
    uri, sha = thermal_png(frame)
    data = base64.b64decode(uri.split(",")[1])
    assert data.startswith(b"\x89PNG\r\n\x1a\n") and struct.unpack(
        "!II", data[16:24]
    ) == (12, 12)
    assert len(data) < 1024 and len(sha) == 64
    assert thermal_png(frame) == (uri, sha)
    seen = []

    def handler(request):
        content = json.loads(request.content)["messages"][1]["content"]
        seen.extend(content)
        assert (
            content[0]["type"] == "text"
            and "Raw waveform is NOT audio" in content[0]["text"]
        )
        assert content[1] == {"type": "image_url", "image_url": {"url": uri}}
        return httpx.Response(402)

    p = ChatProvider(
        TransportSettings(
            api_key=KEY,
            enabled=True,
            free_access_confirmed=True,
            request_budget=1,
            thermal_images=True,
        ),
        httpx.MockTransport(handler),
    )
    from forge.engine.contracts import BlindInput

    with pytest.raises(ProviderError):
        asyncio.run(
            p.infer_thermal(BlindInput(signals=[], quality_issues=[]), {}, frame)
        )
    assert p.used == 1 and p.token_units_used > 8192 and len(seen) == 2
    with pytest.raises(ProviderError):
        asyncio.run(
            p.infer_thermal(BlindInput(signals=[], quality_issues=[]), {}, frame)
        )
    assert p.used == 1


def test_native_images_refuse_without_explicit_opt_in():
    p = ChatProvider(TransportSettings())
    from forge.engine.contracts import BlindInput

    with pytest.raises(ProviderError, match="opt-in"):
        asyncio.run(
            p.infer_thermal(
                BlindInput(signals=[], quality_issues=[]), {}, demo_assets().thermal
            )
        )
    assert p.used == 0


@pytest.mark.parametrize(
    "usage",
    [
        {"prompt_tokens": 30, "completion_tokens": 20, "total_tokens": 50},
        {"prompt_tokens": -1, "completion_tokens": 20, "total_tokens": 19},
        {"prompt_tokens": 30, "completion_tokens": 20, "total_tokens": 1},
    ],
)
def test_provider_usage_is_validated_without_financial_claims(usage):
    from forge.phase2.inference import ProviderUsage

    if usage["prompt_tokens"] == 30 and usage["total_tokens"] == 50:
        assert ProviderUsage(**usage).total_tokens == 50
    else:
        with pytest.raises(ValidationError):
            ProviderUsage(**usage)


def test_smoke_receipt_refuses_fixture_world_readable_and_symlink(tmp_path):
    from forge.submission.receipt import verified_smoke_receipt

    path = tmp_path / "smoke.json"
    path.write_text(
        json.dumps(
            {
                "schema": "forge-meta-smoke-1",
                "source": "test_transport",
                "model_id": EVENT_MODEL_ID,
                "request_attempts": 1,
            }
        )
    )
    path.chmod(0o600)
    assert not verified_smoke_receipt(path, EVENT_MODEL_ID)
    path.chmod(0o644)
    assert not verified_smoke_receipt(path, EVENT_MODEL_ID)
    link = tmp_path / "link"
    link.symlink_to(path)
    assert not verified_smoke_receipt(link, EVENT_MODEL_ID)
    assert not verified_smoke_receipt(tmp_path / "missing", EVENT_MODEL_ID)


def test_total_deadline_cancels_fixture_attempt_without_retry():
    seen = []

    async def slow(request):
        seen.append(request)
        await asyncio.sleep(0.2)
        return httpx.Response(503)

    p = ChatProvider(
        TransportSettings(
            api_key=KEY,
            enabled=True,
            free_access_confirmed=True,
            request_budget=2,
            retry_limit=1,
            total_timeout_seconds=0.01,
        ),
        httpx.MockTransport(slow),
    )
    from forge.engine.contracts import BlindInput

    with pytest.raises(ProviderError, match="Total inference deadline"):
        asyncio.run(p.infer(BlindInput(signals=[], quality_issues=[]), {}))
    assert len(seen) == p.used == 1


def test_owner_receipt_checks_consistency_not_signed_authenticity(tmp_path):
    # Administrative format fixture ONLY. No real provider/network response is claimed.
    from forge.submission.receipt import verified_smoke_receipt

    def handler(request):
        output = {
            "hypotheses": [
                {
                    "hypothesis_id": h,
                    "rationale": "Administrative receipt-format fixture, not real inference",
                    "evidence_channels": ["pressure"],
                }
                for h in ["process-pressure", "sensor-pressure"]
            ]
        }
        return httpx.Response(
            200,
            json={
                "model": EVENT_MODEL_ID,
                "choices": [
                    {
                        "finish_reason": "stop",
                        "message": {"content": json.dumps(output)},
                    }
                ],
            },
        )

    p = ChatProvider(
        TransportSettings(
            api_key=KEY, enabled=True, free_access_confirmed=True, request_budget=1
        ),
        httpx.MockTransport(handler),
    )
    s = asyncio.run(run(PRESETS["misleading_sensor"][1], demo_assets(), provider=p))
    report = export(s)
    from forge.engine.contracts import digest

    investigation = report["investigation"]
    investigation["model_source"] = "meta_http_response"
    investigation["inference"]["source"] = "meta_http_response"
    for event in investigation["events"]:
        event["detail"] = event["detail"].replace(
            "test_transport", "meta_http_response"
        )
    report["run_id"] = "RUN3-" + digest(investigation)
    path = tmp_path / "receipt.json"
    path.write_text(
        json.dumps(
            {
                "schema": "forge-meta-smoke-1",
                "source": "meta_http_response",
                "model_id": EVENT_MODEL_ID,
                "request_attempts": 1,
                "report": report,
            }
        )
    )
    path.chmod(0o600)
    assert verified_smoke_receipt(path, EVENT_MODEL_ID)
    assert not verified_smoke_receipt(path, "different-model")
    investigation["decision"]["findings"] = ["normal"]
    path.write_text(
        json.dumps(
            {
                "schema": "forge-meta-smoke-1",
                "source": "meta_http_response",
                "model_id": EVENT_MODEL_ID,
                "request_attempts": 1,
                "report": report,
            }
        )
    )
    assert not verified_smoke_receipt(path, EVENT_MODEL_ID)


@pytest.mark.parametrize("body", ["null", "[]", '"text"', '{"report": null}'])
def test_malformed_owner_receipt_is_unverified_not_an_exception(tmp_path, body):
    from forge.submission.receipt import verified_smoke_receipt

    path = tmp_path / "invalid.json"
    path.write_text(body)
    path.chmod(0o600)
    assert not verified_smoke_receipt(path, EVENT_MODEL_ID)
