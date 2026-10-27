"""Dry by default. One explicitly approved synthetic model call, then offline replay."""

import argparse
import asyncio
import json
import os
import time
from datetime import UTC, datetime
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

from ..phase2.evidence import demo_assets
from ..phase2.inference import ChatProvider, TransportSettings
from ..phase3.reporting import export, replay
from ..phase3.service import PRESETS, run
from ..providers import ProviderError
from .models import EVENT_MODEL_ID


class ActivationSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="FORGE_SMOKE_", extra="ignore", hide_input_in_errors=True
    )
    credits_approved: bool = False
    card_free_entitlement_confirmed: bool = False


def preflight(settings: TransportSettings, activation: ActivationSettings) -> dict:
    blockers = []
    for passed, code in [
        (activation.credits_approved, "approved_credits_unconfirmed"),
        (
            activation.card_free_entitlement_confirmed,
            "card_free_entitlement_unconfirmed",
        ),
        (settings.provider == "baseten", "smoke_requires_reviewed_baseten_provider"),
        (settings.model_id == EVENT_MODEL_ID, "smoke_requires_exact_hackathon_model"),
        (settings.enabled, "inference_disabled"),
        (settings.free_access_confirmed, "free_access_unconfirmed"),
        (
            bool(settings.api_key and settings.api_key.get_secret_value()),
            "credential_missing",
        ),
        (settings.request_budget == 1, "request_budget_must_equal_one"),
        (settings.retry_limit == 0, "retries_must_be_zero"),
        (not settings.thermal_images, "first_smoke_must_use_numeric_summaries_only"),
        (0 < settings.token_budget <= 16384, "reservation_budget_must_be_one_to_16384"),
        (settings.timeout_seconds <= 20, "timeout_must_not_exceed_20_seconds"),
    ]:
        if not passed:
            blockers.append(code)
    return {
        "ready_for_explicit_execution": not blockers,
        "blockers": blockers,
        "provider": settings.provider,
        "model_id": settings.model_id,
        "request_limit": 1,
        "retry_limit": 0,
        "network_requests_sent": 0,
        "entitlement_basis": "Operator attestations, not independently verified provider billing",
        "cost": "Not measured. Local budgets do not guarantee provider billing.",
    }


async def execute(provider: ChatProvider, activation: ActivationSettings) -> dict:
    check = preflight(provider.settings, activation)
    if not check["ready_for_explicit_execution"]:
        raise ProviderError(
            "Smoke activation prerequisites are unmet; no request was sent"
        )
    started = time.perf_counter()
    session = await run(
        PRESETS["misleading_sensor"][1], demo_assets(), provider=provider
    )
    report = export(session)
    decision = replay(report)
    expected_source = (
        "test_transport" if provider.transport is not None else "meta_http_response"
    )
    if session.model_source != expected_source or provider.used != 1:
        raise ProviderError("Unexpected inference provenance or request accounting")
    return {
        "schema": "forge-meta-smoke-1",
        "recorded_utc": datetime.now(UTC).isoformat(),
        "source": expected_source,
        "model_id": provider.settings.model_id,
        "request_attempts": provider.used,
        "reserved_accounting_units": provider.token_units_used,
        "elapsed_workflow_ms": round((time.perf_counter() - started) * 1000, 3),
        "independent_replay_status": decision.status,
        "report": report,
        "provider_reported_usage": session.inference.usage.model_dump()
        if session.inference and session.inference.usage
        else None,
        "cost": "Unmeasured; no reviewed rate-card calculation. Provider-reported tokens are not an invoice.",
        "cost_and_provider_tokens": "Byte/output reservation is not billed-token usage; provider-reported usage retained when supplied",
        "scope": "Synthetic numeric/context summaries; not raw-image model vision or industrial validation",
        "entitlement_basis": check["entitlement_basis"],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Send one request only after every access prerequisite passes",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="New private local artifact; required for execution; never overwritten",
    )
    args = parser.parse_args(argv)
    try:
        config, activation = TransportSettings(), ActivationSettings()
    except ValueError:
        print(
            json.dumps(
                {
                    "ready_for_explicit_execution": False,
                    "blockers": ["invalid_activation_or_inference_configuration"],
                    "network_requests_sent": 0,
                }
            )
        )
        return 2
    check = preflight(config, activation)
    if not args.execute:
        print(json.dumps({**check, "mode": "dry_run"}, indent=2))
        return 0
    if not check["ready_for_explicit_execution"]:
        print(json.dumps(check, indent=2))
        return 2
    if args.output is None:
        parser.error("--output is required for execution")
    # Reserve the artifact BEFORE any request. O_EXCL refuses symlinks/overwrite.
    try:
        fd = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except OSError:
        print("Artifact cannot be safely created; no request was sent")
        return 2
    with os.fdopen(fd, "w") as artifact:
        artifact.write(
            '{"status":"pending_or_interrupted","do_not_retry_automatically":true}\n'
        )
        artifact.flush()
        os.fsync(artifact.fileno())
        try:
            result = asyncio.run(execute(ChatProvider(config), activation))
        except Exception:  # noqa: BLE001 -- sanitize the entire credential-bearing CLI boundary
            # Never include remote bodies, credential-bearing validation, or exception text.
            result = {
                "schema": "forge-meta-smoke-1",
                "status": "failed_or_unverified",
                "warning": "Do not retry automatically; an attempt may have consumed credits. Inspect provider usage securely. No fallback was used.",
            }
            artifact.seek(0)
            artifact.truncate()
            json.dump(result, artifact, indent=2)
            artifact.flush()
            os.fsync(artifact.fileno())
            print(
                "Smoke failed or remains unverified. Review the private artifact and provider usage."
            )
            return 1
        artifact.seek(0)
        artifact.truncate()
        json.dump(result, artifact, indent=2)
        artifact.flush()
        os.fsync(artifact.fileno())
    print(
        "One model response recorded and independently replayed. Review the private artifact; no billing/physical-causality claim is established."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
