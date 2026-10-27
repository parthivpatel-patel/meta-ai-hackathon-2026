import ast
import asyncio
import json
from pathlib import Path

import httpx
import numpy as np
import pytest
from fastapi.testclient import TestClient
from forge.engine.contracts import BlindInput
from forge.main import app
from forge.phase2.evidence import (
    EvidenceBundle,
    demo_assets,
    summarize_assets,
)
from forge.phase2.inference import (
    ENDPOINTS,
    ChatProvider,
    TransportSettings,
)
from forge.phase2.oracle import Recipe
from forge.phase2.service import RunReport, investigate, replay
from forge.phase2.verification import ci, verify
from forge.providers import ProviderError
from pydantic import ValidationError

KEY = "test-only-not-a-real-credential"


def run(**kwargs):
    return asyncio.run(investigate(Recipe(**kwargs), demo_assets()))


def config(**kwargs):
    return TransportSettings(
        enabled=True,
        model_id="meta-models/muse-spark-open",
        free_access_confirmed=True,
        request_budget=2,
        api_key=KEY,
        **kwargs,
    )


def output(hypothesis="process-temperature"):
    return {
        "hypotheses": [
            {
                "hypothesis_id": hypothesis,
                "rationale": "Synthetic candidate only",
                "evidence_channels": ["temperature"],
                "scope": "synthetic_mechanism",
            }
        ]
    }


def response(data=None, **updates):
    body = {
        "model": "meta-models/muse-spark-open",
        "choices": [
            {
                "finish_reason": "stop",
                "message": {"content": json.dumps(data or output())},
            }
        ],
    }
    body.update(updates)
    return httpx.Response(200, json=body)


@pytest.mark.parametrize(
    "kwargs,expected",
    [
        ({}, ["process-temperature"]),
        ({"noise_factor": 6}, ["process-temperature"]),
        (
            {"faults": ["temperature", "vibration"]},
            ["process-temperature", "process-vibration"],
        ),
        (
            {"faults": ["temperature", "vibration", "pressure"]},
            ["process-temperature", "process-vibration", "process-pressure"],
        ),
        (
            {"faults": ["pressure"], "sensor_biases": ["pressure"]},
            ["process-pressure", "sensor-pressure"],
        ),
        ({"faults": [], "sensor_biases": ["vibration"]}, ["sensor-vibration"]),
        ({"faults": []}, ["normal"]),
    ],
)
def test_multifault_noise_and_replay(kwargs, expected):
    result = run(**kwargs)
    assert result.verification.status == "SUPPORTED_SYNTHETIC"
    assert set(result.verification.findings) == set(expected)
    assert len(result.trials) == 4 and all(
        len(p.witness_before) == 96 for trial in result.trials for p in trial.probes
    )
    assert (
        replay(RunReport.model_validate_json(result.model_dump_json()))
        == result.verification
    )
    assert result.model_source == "deterministic_rules_not_meta"


@pytest.mark.parametrize(
    "kwargs,status",
    [({"missing_fraction": 0.75}, "ABSTAIN"), ({"confounded": True}, "INCONCLUSIVE")],
)
def test_missing_and_contradictions(kwargs, status):
    assert run(**kwargs).verification.status == status


def test_features_numerical_reference():
    bundle = demo_assets()
    features = summarize_assets(bundle)["modalities"]
    assert (
        features["thermal"]["hot_pixel_count"] == 9
        and features["thermal"]["maximum_celsius"] == 85
    )
    assert features["waveform"]["rms_mm_per_second"] == pytest.approx(np.sqrt(2))
    assert features["waveform"]["peak_frequency_hz"] == 64
    assert ci([2.0] * 96).low == 2


@pytest.mark.parametrize(
    "data",
    [
        {"thermal": {"pixels": [[65] * 8] * 7}},
        {"thermal": {"pixels": [[65] * 8] * 7 + [[65] * 9]}},
        {"waveform": {"samples": [1] * 127, "sample_rate_hz": 1024}},
        {"image_url": "http://127.0.0.1/admin"},
        {"thermal": {"pixels": [[float("nan")] * 8] * 8}},
    ],
)
def test_evidence_validation(data):
    with pytest.raises(ValidationError):
        EvidenceBundle.model_validate(data)


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/api",
        "https://inference.baseten.co.evil.test/v1/chat/completions",
        "https://user:pass@inference.baseten.co/v1/chat/completions",
        "https://inference.baseten.co/v1/chat/completions?secret=x",
        "https://inference.baseten.co:444/v1/chat/completions",
    ],
)
def test_exact_endpoint_allowlist(url):
    with pytest.raises(ValidationError):
        TransportSettings(endpoint=url)


def test_default_gate_and_budget():
    seen = []

    def send(request):
        seen.append(request)
        return response()

    p = ChatProvider(TransportSettings(), httpx.MockTransport(send))
    with pytest.raises(ProviderError, match="disabled"):
        asyncio.run(p.infer(BlindInput(signals=[], quality_issues=[]), {}))
    assert not seen
    p = ChatProvider(
        TransportSettings(
            enabled=True, free_access_confirmed=True, request_budget=1, api_key=KEY, model_id="meta-models/muse-spark-open"
        ),
        httpx.MockTransport(send),
    )
    result = asyncio.run(p.infer(BlindInput(signals=[], quality_issues=[]), {}))
    assert result.source == "test_transport" and p.used == 1
    with pytest.raises(ProviderError):
        asyncio.run(p.infer(BlindInput(signals=[], quality_issues=[]), {}))
    assert (
        len(seen) == 1
        and KEY not in repr(p.settings)
        and "api_key" not in p.settings.model_dump()
    )


def test_model_proposals_are_independently_rejected_and_blind():
    def send(request):
        payload = json.loads(request.content)
        user = json.loads(payload["messages"][1]["content"])
        assert set(user["telemetry"]) == {"signals", "quality_issues"}
        assert not any(
            x in json.dumps(user)
            for x in ["faults", "seed", "scenario", "sensor_biases"]
        )
        return response(output("normal"))

    p = ChatProvider(config(), httpx.MockTransport(send))
    report = asyncio.run(investigate(Recipe(), demo_assets(), p))
    assert report.model_source == "test_transport"
    assert report.verification.findings == ["process-temperature"]
    assert report.model_assessments[0].status == "NOT_SUPPORTED"
    assert replay(report) == report.verification


@pytest.mark.parametrize(
    "mode",
    [
        "redirect",
        "identity",
        "tool",
        "malformed",
        "oversize",
        "truncated",
        "physical",
        "extra",
    ],
)
def test_hostile_and_malformed_provider_responses(mode):
    def send(request):
        if mode == "redirect":
            return httpx.Response(302, headers={"Location": "http://127.0.0.1/admin"})
        if mode == "identity":
            return response(model="unapproved-model")
        if mode == "tool":
            return httpx.Response(
                200,
                json={
                    "model": "meta-models/muse-spark-open",
                    "choices": [
                        {
                            "finish_reason": "stop",
                            "message": {
                                "content": "{}",
                                "tool_calls": [{"function": "exec"}],
                            },
                        }
                    ],
                },
            )
        if mode == "malformed":
            return httpx.Response(200, text="not JSON")
        if mode == "oversize":
            return httpx.Response(200, content=b"x" * 32769)
        if mode == "truncated":
            return httpx.Response(
                200,
                json={
                    "model": "meta-models/muse-spark-open",
                    "choices": [
                        {"finish_reason": "length", "message": {"content": "{}"}}
                    ],
                },
            )
        data = output()
        if mode == "physical":
            data["hypotheses"][0]["scope"] = "physical_cause"
        if mode == "extra":
            data["command"] = "execute something"
        return response(data)

    p = ChatProvider(config(), httpx.MockTransport(send))
    with pytest.raises(ProviderError):
        asyncio.run(p.infer(BlindInput(signals=[], quality_issues=[]), {}))
    assert p.used == 1


def test_timeout_retry_is_bounded_and_sanitized():
    calls = []

    def send(request):
        calls.append(request)
        raise httpx.ReadTimeout(KEY)

    p = ChatProvider(config(retry_limit=1), httpx.MockTransport(send))
    with pytest.raises(ProviderError, match="timed out") as exc:
        asyncio.run(p.infer(BlindInput(signals=[], quality_issues=[]), {}))
    assert KEY not in str(exc.value) and len(calls) == 2 and p.used == 2


def test_total_inference_deadline_includes_slow_transport():
    async def delayed(request):
        await asyncio.sleep(0.1)
        return response()

    provider = ChatProvider(config(timeout_seconds=0.001), httpx.MockTransport(delayed))
    with pytest.raises(ProviderError, match="timed out"):
        asyncio.run(provider.infer(BlindInput(signals=[], quality_issues=[]), {}))
    assert provider.used == 1


def test_replay_tampering_and_independence():
    report = run()
    wrong = report.model_copy(update={"asset_features": {}})
    with pytest.raises(ValueError, match="feature replay"):
        replay(wrong)
    wrong = report.model_copy(
        update={
            "verification": report.verification.model_copy(
                update={"findings": ["normal"]}
            )
        }
    )
    with pytest.raises(ValueError, match="verification replay"):
        replay(wrong)
    trial = report.trials[0].model_copy(update={"dataset_hash": "0" * 64})
    assert verify(report.measurements, [trial, *report.trials[1:]]).status == "REJECTED"
    import forge.phase2.verification as verifier

    for node in ast.walk(ast.parse(Path(verifier.__file__).read_text())):
        if isinstance(node, ast.ImportFrom):
            assert not any(
                x in (node.module or "")
                for x in ["oracle", "inference", "service", "hypotheses"]
            )


def test_phase2_api_and_graceful_network_gate(monkeypatch):
    from forge.phase2 import routes

    monkeypatch.setattr(
        routes, "get_provider", lambda: ChatProvider(TransportSettings())
    )
    with TestClient(app) as client:
        assert client.get("/api/v2/model-status").json()["status"] == "disabled"
        assets = client.get("/api/v2/evidence/demo").json()
        assert (
            client.post("/api/v2/evidence", json=assets).json()["modalities"][
                "waveform"
            ]["peak_frequency_hz"]
            == 64
        )
        result = client.post(
            "/api/v2/investigations",
            json={
                "recipe": {"faults": ["temperature", "vibration"], "noise_factor": 6},
                "evidence": assets,
            },
        )
        assert result.status_code == 200, result.text
        assert result.json()["verification"]["status"] == "SUPPORTED_SYNTHETIC"
        assert client.post("/api/v2/replay", json=result.json()).status_code == 200
        html = client.post("/api/v2/reports/html", json=result.json())
        assert (
            html.status_code == 200
            and "attachment" in html.headers["content-disposition"]
        )
        assert (
            client.post("/api/v2/investigations", json={"use_meta": True}).status_code
            == 503
        )
        assert (
            client.post(
                "/api/v2/investigations", json={"provider_endpoint": "http://localhost"}
            ).status_code
            == 422
        )
        too_large = client.post("/api/v2/evidence", content=b" " * 1_048_577)
        assert (
            too_large.status_code == 413
            and too_large.json()["error"]["code"] == "body_too_large"
        )
        assert client.get("/api/v1/health").status_code == 200


def test_meta_endpoint_registry_and_no_unverified_models():
    assert (
        TransportSettings(
            provider="meta", endpoint=ENDPOINTS["meta"], model_id="muse-spark-1.3"
        ).provider
        == "meta"
    )
    with pytest.raises(ValidationError):
        TransportSettings(model_id="unverified-or-non-meta-model")
    assert TransportSettings(model_id="meta-models/muse-spark-open-1026").model_id.endswith("-1026")


def test_report_metadata_cannot_invent_physical_claims():
    report = run()
    with pytest.raises(ValueError, match="metadata mismatch"):
        replay(
            report.model_copy(update={"limitations": ["Physical causality was proven"]})
        )


def test_streamed_request_body_limit():
    async def check():
        async def chunks():
            yield b" " * 600000
            yield b" " * 600000

        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            return await client.post("/api/v2/evidence", content=chunks())

    assert asyncio.run(check()).status_code == 413


def test_inference_rejects_sensitive_or_compressed_response():
    for result in [
        response(
            {
                "hypotheses": [
                    {
                        "hypothesis_id": "normal",
                        "rationale": KEY,
                        "evidence_channels": [],
                    }
                ]
            }
        ),
        httpx.Response(
            200,
            headers={"Content-Encoding": "gzip"},
            content=__import__("gzip").compress(b"compressed body"),
        ),
    ]:
        provider = ChatProvider(config(), httpx.MockTransport(lambda request: result))
        with pytest.raises(ProviderError):
            asyncio.run(provider.infer(BlindInput(signals=[], quality_issues=[]), {}))


def test_new_evaluation_reproducibility_and_answer_key_boundary():
    from forge.phase2.evaluate import evaluate

    first = asyncio.run(evaluate(range(2)))
    assert first == asyncio.run(evaluate(range(2)))
    assert first["overall"]["cases"] == 28
    assert first["by_profile"]["missing75_pair"]["statuses"] == {"ABSTAIN": 2}
    assert first["model_evaluation"].startswith("No real model inference")


def test_full_api_model_fixture_verification_and_escaped_export(monkeypatch):
    from forge.phase2 import routes

    hostile = output("normal")
    hostile["hypotheses"][0]["rationale"] = "<script>alert(1)</script>"
    provider = ChatProvider(
        config(), httpx.MockTransport(lambda request: response(hostile))
    )
    monkeypatch.setattr(routes, "get_provider", lambda: provider)
    with TestClient(app) as client:
        generated = client.post("/api/v2/investigations", json={"use_meta": True})
        assert generated.status_code == 200, generated.text
        assert generated.json()["model_source"] == "test_transport"
        assert generated.json()["model_assessments"][0]["status"] == "NOT_SUPPORTED"
        assert client.post("/api/v2/replay", json=generated.json()).status_code == 200
        exported = client.post("/api/v2/reports/html", json=generated.json())
        assert "&lt;script&gt;" in exported.text and "<script>" not in exported.text
