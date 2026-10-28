"""Offline regression of the owner's one-attempt limits; no genuine transport."""
import asyncio

import httpx
import pytest
from forge.industrial.meta_cli import Authorization
from forge.industrial.meta_cli import preflight as workstation_preflight
from forge.phase2.inference import ChatProvider, TransportSettings
from forge.providers import ProviderError
from forge.submission.smoke import ActivationSettings, execute, preflight


def settings(timeout):
    return TransportSettings(
        api_key="fixture-only-never-a-provider-credential",
        BASETEN_API_KEY=None,
        FORGE_INFERENCE_KEY=None,
        enabled=True,
        free_access_confirmed=True,
        request_budget=1,
        token_budget=8192,
        max_tokens=1024,
        retry_limit=0,
        timeout_seconds=timeout,
        total_timeout_seconds=30,
    )


# Synthetic configuration flags for gate testing, never account attestations.
APPROVED_FIXTURE = ActivationSettings(
    credits_approved=True,
    card_free_entitlement_confirmed=True,
    provider_spending_limit_confirmed=True,
)


@pytest.mark.parametrize("timeout", [15.001, 16, 20])
def test_authorized_attempt_deadline_cannot_exceed_fifteen_seconds(timeout):
    seen = []
    provider = ChatProvider(
        settings(timeout), httpx.MockTransport(lambda request: seen.append(request))
    )
    check = preflight(provider.settings, APPROVED_FIXTURE)
    assert "timeout_must_not_exceed_15_seconds" in check["blockers"]
    assert not check["ready_for_explicit_execution"]
    with pytest.raises(ProviderError, match="no request was sent"):
        asyncio.run(execute(provider, APPROVED_FIXTURE))
    assert provider.used == 0 and seen == []
    assert "timeout_must_not_exceed_15_seconds" in workstation_preflight(
        provider.settings, APPROVED_FIXTURE, Authorization()
    )["blockers"]


def test_exact_plan_retains_budget_retries_model_and_financial_gates():
    config = settings(15)
    check = preflight(config, APPROVED_FIXTURE)
    assert check["ready_for_explicit_execution"]
    assert check["request_limit"] == 1 and check["retry_limit"] == 0
    assert check["attempt_deadline_seconds"] == 15
    assert check["total_request_deadline_seconds"] == 30
    assert check["max_output_tokens"] == 1024
    assert check["model_id"] == "meta-models/muse-spark-open-1026"
    missing = preflight(config, ActivationSettings())
    assert not missing["ready_for_explicit_execution"]
    assert "provider_enforced_spending_limit_unconfirmed" in missing["blockers"]
    assert missing["network_requests_sent"] == 0
