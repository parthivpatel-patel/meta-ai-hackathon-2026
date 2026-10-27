import asyncio
import json

import httpx
import pytest
from forge.engine.contracts import BlindInput
from forge.phase2.inference import ChatProvider, TransportSettings
from forge.phase3.reporting import replay
from forge.providers import ProviderError
from forge.submission import model_evaluation as evaluation
from forge.submission.smoke import ActivationSettings, execute

KEY = "fixture-only-final-engineering-not-a-real-secret"
ACTIVATION = ActivationSettings(
    credits_approved=True, card_free_entitlement_confirmed=True
)
APPROVAL = evaluation.EvaluationSettings(owner_authorized=True)


def settings(**updates):
    values = {
        "api_key": KEY,
        "enabled": True,
        "free_access_confirmed": True,
        "request_budget": evaluation.request_count(),
        "token_budget": 81920,
    }
    values.update(updates)
    return TransportSettings(**values)


def response(request):
    payload = json.loads(request.content)
    assert payload["model"] == "meta-models/muse-spark-open-1026"
    assert all(
        word not in payload["messages"][1]["content"]
        for word in ['"recipe"', '"seed"', '"faults"', '"expected"']
    )
    output = {
        "hypotheses": [
            {
                "hypothesis_id": h,
                "rationale": "Local fixture only, not a Meta response",
                "evidence_channels": [] if h == "normal" else [h.split("-")[-1]],
            }
            for h in [
                "normal",
                "process-temperature",
                "process-vibration",
                "process-pressure",
                "sensor-temperature",
                "sensor-vibration",
                "sensor-pressure",
            ]
        ]
    }
    return httpx.Response(
        200,
        json={
            "model": payload["model"],
            "choices": [
                {"finish_reason": "stop", "message": {"content": json.dumps(output)}}
            ],
            "usage": {
                "prompt_tokens": 150,
                "completion_tokens": 100,
                "total_tokens": 250,
            },
        },
    )


def test_matched_fixture_suite_is_labeled_replayable_and_budgeted():
    p = ChatProvider(settings(), httpx.MockTransport(response))
    r = asyncio.run(evaluation.evaluate(p, ACTIVATION, APPROVAL))
    assert r["execution_kind"] == "fixture_only_no_real_model"
    assert r["genuine_validated_responses"] == r["real_network_attempts"] == 0
    assert r["completed_pairs"] == len(evaluation.PROFILES) == 6
    assert r["request_attempts"] == evaluation.request_count() == 5
    assert r["fixture_responses"] == 5 and r["provider_reported_tokens_total"] == 1250
    assert not p.status()["authenticated_response_received"]
    assert all(a["response_valid"] and a["elapsed_ms"] >= 0 for a in r["attempts"])
    assert r["metrics"]["pairs_with_different_decisions"] == 0
    assert (
        r["metrics"]["model_assisted"]["cases_with_truth_mismatched_proposals"][
            "denominator"
        ]
        == 5
    )
    for row in r["cases"]:
        assert (
            row["baseline"]["tests_completed"]
            == row["model_assisted"]["tests_completed"]
            <= 4
        )
        assert replay(row["model_report"]) == replay(row["baseline_report"])
    missing = next(row for row in r["cases"] if row["case"] == "missing75")
    assert (
        missing["request_attempts"] == 0
        and missing["model_assisted"]["source"] == "not_run"
    )
    assert KEY not in json.dumps(r)


def test_suite_stops_on_first_failure_without_substitution():
    sent = []
    p = ChatProvider(
        settings(),
        httpx.MockTransport(
            lambda request: sent.append(request) or httpx.Response(402, text=KEY)
        ),
    )
    r = asyncio.run(evaluation.evaluate(p, ACTIVATION, APPROVAL))
    assert len(sent) == r["request_attempts"] == 1
    assert r["stopped_on_failure"] and r["completed_pairs"] == 0
    assert r["cases"][0]["model_assisted"] is None
    assert r["attempts"][0]["http_status"] == 402
    assert r["attempts"][0]["error_code"] == "credits_or_payment_rejected"
    assert r["metrics"]["model_assisted"]["accepted_precision"]["rate"] is None
    assert KEY not in json.dumps(r)


def test_dry_suite_does_not_construct_a_provider(monkeypatch, capsys):
    monkeypatch.setattr(evaluation, "TransportSettings", lambda: settings())

    def forbidden(*args, **kwargs):
        raise AssertionError("Provider constructed in dry run")

    monkeypatch.setattr(evaluation, "ChatProvider", forbidden)
    assert evaluation.main([]) == 0
    r = json.loads(capsys.readouterr().out)
    assert r["network_requests_sent"] == 0
    assert "separate_owner_authorization_required" in r["blockers"]
    assert "private_genuine_smoke_receipt_required" in r["blockers"]


@pytest.mark.parametrize(
    "change",
    [
        {"request_budget": 6},
        {"retry_limit": 1},
        {"thermal_images": True},
        {"token_budget": 131072},
    ],
)
def test_evaluation_limits_fail_before_request(change):
    p = ChatProvider(
        settings(**change),
        httpx.MockTransport(lambda request: pytest.fail("Network touched")),
    )
    with pytest.raises(ProviderError, match="prerequisites"):
        asyncio.run(evaluation.evaluate(p, ACTIVATION, APPROVAL))
    assert p.used == 0


def test_genuine_evaluation_requires_receipt_and_separate_authorization(monkeypatch):
    assert evaluation.preflight(settings(), ACTIVATION, APPROVAL)["blockers"] == [
        "private_genuine_smoke_receipt_required"
    ]
    monkeypatch.setenv("FORGE_DEMO_MODE", "public")
    assert (
        "public_host_execution_forbidden"
        in evaluation.preflight(settings(), ACTIVATION, APPROVAL, fixture=True)[
            "blockers"
        ]
    )


@pytest.mark.parametrize(
    "body",
    [
        [],
        None,
        "not an object",
        {"model": "meta-models/muse-spark-open-1026", "choices": [None]},
    ],
)
def test_malformed_envelopes_fail_gracefully_and_keep_safe_diagnostics(body):
    p = ChatProvider(
        settings(request_budget=1),
        httpx.MockTransport(
            lambda request: httpx.Response(200, content=json.dumps(body))
        ),
    )
    with pytest.raises(ProviderError, match="structured schema"):
        asyncio.run(p.infer(BlindInput(signals=[], quality_issues=[]), {}))
    assert p.attempts[0]["error_code"] == "structured_response_invalid"
    assert not p.attempts[0]["response_valid"] and p.attempts[0]["elapsed_ms"] >= 0


@pytest.mark.parametrize(
    "status,code",
    [
        (401, "authentication_rejected"),
        (403, "access_rejected"),
        (429, "rate_or_quota_rejected"),
        (503, "http_non_success"),
    ],
)
def test_http_failures_preserve_codes_without_remote_bodies(status, code):
    p = ChatProvider(
        settings(request_budget=1),
        httpx.MockTransport(lambda request: httpx.Response(status, text=KEY)),
    )
    with pytest.raises(ProviderError):
        asyncio.run(p.infer(BlindInput(signals=[], quality_issues=[]), {}))
    assert (
        p.attempts[0]["http_status"] == status and p.attempts[0]["error_code"] == code
    )
    assert KEY not in json.dumps(p.attempts)


def test_smoke_records_separate_inference_latency_identity_and_usage():
    p = ChatProvider(
        settings(request_budget=1, token_budget=16384), httpx.MockTransport(response)
    )
    r = asyncio.run(execute(p, ACTIVATION))
    assert r["response_valid"] and r["returned_model"] == p.settings.model_id
    assert r["inference_attempts"][0]["provider_reported_usage"]["total_tokens"] == 250
    assert r["elapsed_workflow_ms"] >= r["inference_attempts"][0]["elapsed_ms"] >= 0


def test_failure_artifact_remains_private_and_cannot_be_overwritten(
    tmp_path, monkeypatch
):
    monkeypatch.setattr(evaluation, "TransportSettings", lambda: settings())
    monkeypatch.setattr(
        evaluation, "preflight", lambda *a, **kw: {"ready_for_explicit_execution": True}
    )
    monkeypatch.setattr(
        evaluation,
        "ChatProvider",
        lambda config: ChatProvider(
            config, httpx.MockTransport(lambda r: httpx.Response(401))
        ),
    )
    output = tmp_path / "evaluation.json"
    assert evaluation.main(["--execute", "--output", str(output)]) == 1
    assert output.stat().st_mode & 0o777 == 0o600
    r = json.loads(output.read_text())
    assert r["stopped_on_failure"] and r["request_attempts"] == 1
    preserved = output.read_bytes()
    assert evaluation.main(["--execute", "--output", str(output)]) == 2
    assert output.read_bytes() == preserved


def test_small_sample_intervals_and_empty_denominators_are_explicit():
    assert evaluation.proportion(0, 0)["wilson_95_interval"] is None
    interval = evaluation.proportion(1, 1)["wilson_95_interval"]
    assert 0 < interval[0] < 0.3 and interval[1] <= 1


@pytest.mark.parametrize(
    "updates", [{"max_tokens": 2048}, {"total_timeout_seconds": 60}]
)
def test_activation_deadline_and_output_plan_are_enforced(updates):
    from forge.submission.smoke import preflight

    assert not preflight(
        settings(request_budget=1, token_budget=16384, **updates), ACTIVATION
    )["ready_for_explicit_execution"]
    assert not evaluation.preflight(
        settings(**updates), ACTIVATION, APPROVAL, fixture=True
    )["ready_for_explicit_execution"]


def test_smoke_is_also_forbidden_on_public_hosts(monkeypatch):
    from forge.submission.smoke import preflight

    monkeypatch.setenv("RENDER", "true")
    assert (
        "public_host_execution_forbidden"
        in preflight(settings(request_budget=1, token_budget=16384), ACTIVATION)[
            "blockers"
        ]
    )


def test_concurrent_deadline_diagnostics_stay_with_their_own_request():
    async def scenario():
        first_started = asyncio.Event()
        release_second = asyncio.Event()
        seen = 0

        async def handler(request):
            nonlocal seen
            seen += 1
            if seen == 1:
                first_started.set()
                await asyncio.Event().wait()
            await release_second.wait()
            return response(request)

        p = ChatProvider(
            settings(request_budget=2, total_timeout_seconds=0.3),
            httpx.MockTransport(handler),
        )
        first = asyncio.create_task(
            p.infer(BlindInput(signals=[], quality_issues=[]), {})
        )
        await asyncio.wait_for(first_started.wait(), timeout=1)
        await asyncio.sleep(0.1)
        second = asyncio.create_task(
            p.infer(BlindInput(signals=[], quality_issues=[]), {})
        )
        with pytest.raises(ProviderError, match="Total inference deadline"):
            await first
        release_second.set()
        record = await second
        assert record.source == "test_transport"
        assert p.attempts[0]["error_code"] == "total_deadline"
        assert p.attempts[1]["response_valid"] and p.attempts[1]["error_code"] is None

    asyncio.run(scenario())


def test_injected_falsy_transport_cannot_be_labeled_real_inference():
    class FalsyTransport(httpx.MockTransport):
        def __bool__(self):
            return False

    p = ChatProvider(settings(request_budget=1), FalsyTransport(response))
    record = asyncio.run(p.infer(BlindInput(signals=[], quality_issues=[]), {}))
    assert record.source == "test_transport"
    assert not p.status()["authenticated_response_received"]
