"""Private, dry-default one-proposal workflow. Never invoked by an HTTP route."""

import argparse
import asyncio
import json
import os
from datetime import UTC, datetime
from pathlib import Path

import httpx
from pydantic_settings import BaseSettings, SettingsConfigDict

from ..phase2.inference import ChatProvider, ModelOutput, TransportSettings
from ..providers import ProviderError
from ..submission.models import EVENT_MODEL_ID
from ..submission.receipt import verified_smoke_receipt
from ..submission.smoke import ActivationSettings
from ..submission.smoke import preflight as smoke_preflight
from . import meta
from .files import read_json
from .investigation import InvestigationRequest
from .investigation import replay as replay_capture


class Authorization(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="FORGE_WORKSTATION_", extra="ignore", hide_input_in_errors=True
    )
    owner_authorized: bool = False


def preflight(
    config: TransportSettings, activation: ActivationSettings, approval: Authorization
) -> dict:
    check = smoke_preflight(config, activation)
    blockers = list(check["blockers"])
    if not approval.owner_authorized:
        blockers.append("separate_workstation_request_authorization_required")
    if not verified_smoke_receipt(config.validated_smoke_path, EVENT_MODEL_ID):
        blockers.append("private_genuine_smoke_receipt_required")
    return {
        **check,
        "ready_for_explicit_execution": not blockers,
        "blockers": blockers,
        "purpose": "One initial observed-machine hypothesis request. Experiments and replay make zero additional requests.",
        "cost": "Unknown until account credit balance, rates and enforced provider stopping behavior are reviewed. No cash expenditure authorized; notification budgets are insufficient.",
    }


def captured_request(report: dict) -> InvestigationRequest:
    verified = replay_capture(report)
    request = InvestigationRequest.model_validate(verified["request"])
    if request.experiments != 0 or verified["trials"]:
        raise ValueError("Export the initial observed capture before any experiment")
    return request


async def execute(
    capture: dict,
    provider: ChatProvider,
    activation: ActivationSettings,
    approval: Authorization,
    *,
    fixture: bool = False,
) -> dict:
    if fixture:
        if provider.transport is None:
            raise ProviderError(
                "Fixture execution requires an injected local transport"
            )
        if provider.settings.request_budget != 1 or provider.settings.retry_limit != 0:
            raise ProviderError("Fixture must retain a single attempt and zero retries")
    elif not preflight(provider.settings, activation, approval)[
        "ready_for_explicit_execution"
    ]:
        raise ProviderError(
            "Private authorization/account/smoke prerequisites unmet; no request sent"
        )
    request = captured_request(capture)
    observed, features = meta.prepare(request)
    record = await provider.infer(observed, features)
    expected_source = (
        "test_transport" if provider.transport is not None else "meta_http_response"
    )
    if record.source != expected_source or provider.used != 1:
        raise ProviderError("Unexpected provider provenance or request accounting")
    report = meta.make_report(request, meta.public_proposal(record))
    meta.replay(report)
    return {
        "schema": "forge-private-workstation-receipt-1",
        "recorded_utc": datetime.now(UTC).isoformat(),
        "source": expected_source,
        "request_attempts": provider.used,
        "network_requests_sent": 0 if provider.transport is not None else provider.used,
        "diagnostics": provider.attempts,
        "usage": record.usage.model_dump() if record.usage else None,
        "reserved_accounting_units": provider.token_units_used,
        "cost": "Unmeasured. Local reservations are not provider billing caps.",
        "report": report,
    }


def fixture_provider() -> ChatProvider:
    """Fixed, deliberately fallible hypotheses; no scenario labels or oracle access."""
    output = ModelOutput.model_validate(
        {
            "hypotheses": [
                {
                    "hypothesis_id": "process-vibration",
                    "rationale": "Vibration observations may reflect a process departure; test a competing sensor explanation.",
                    "evidence_channels": ["vibration"],
                },
                {
                    "hypothesis_id": "sensor-vibration",
                    "rationale": "Instrument bias remains possible until independent reference evidence is acquired.",
                    "evidence_channels": ["vibration"],
                },
                {
                    "hypothesis_id": "normal",
                    "rationale": "Measurements may remain compatible with baseline uncertainty.",
                    "evidence_channels": [],
                },
            ]
        }
    )

    def respond(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "model": EVENT_MODEL_ID,
                "choices": [
                    {
                        "finish_reason": "stop",
                        "message": {"content": output.model_dump_json()},
                    }
                ],
            },
        )

    config = TransportSettings(
        provider="baseten",
        endpoint="https://inference.baseten.co/v1/chat/completions",
        model_id=EVENT_MODEL_ID,
        thermal_images=False,
        FORGE_INFERENCE_KEY=None,
        BASETEN_API_KEY="fixture-only-event-key-not-a-credential",
        api_key="fixture-only-event-key-not-a-credential",
        enabled=True,
        free_access_confirmed=True,
        request_budget=1,
        token_budget=16384,
        max_tokens=1024,
        retry_limit=0,
        timeout_seconds=15,
        total_timeout_seconds=30,
    )
    return ChatProvider(config, httpx.MockTransport(respond))


def reserve(path: Path):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    file = os.fdopen(fd, "w")
    file.write(
        '{"status":"pending_or_interrupted","do_not_retry_automatically":true}\n'
    )
    file.flush()
    os.fsync(file.fileno())
    return file


def save(file, value: dict):
    file.seek(0)
    file.truncate()
    json.dump(value, file, indent=2)
    file.flush()
    os.fsync(file.fileno())


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capture", type=Path)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument(
        "--fixture",
        action="store_true",
        help="Local MockTransport only; never genuine inference",
    )
    parser.add_argument("--output", type=Path, help="Exclusive private 0600 receipt")
    parser.add_argument(
        "--public-report",
        type=Path,
        help="Optional exclusive sanitized report; no diagnostics/usage",
    )
    args = parser.parse_args(argv)
    provider = None
    try:
        if args.fixture and args.execute:
            raise ValueError("Fixture and genuine execution are mutually exclusive")
        if args.fixture:
            provider = fixture_provider()
        config = provider.settings if provider else TransportSettings()
        activation, approval = ActivationSettings(), Authorization()
        if not args.execute and not args.fixture:
            print(
                json.dumps(
                    {**preflight(config, activation, approval), "mode": "dry_run"},
                    indent=2,
                )
            )
            return 0
        if not args.capture or not args.output:
            raise ValueError("Capture and private output are required")
        capture = read_json(args.capture)
        captured_request(capture)
        if (
            not args.fixture
            and not preflight(config, activation, approval)[
                "ready_for_explicit_execution"
            ]
        ):
            print(json.dumps(preflight(config, activation, approval), indent=2))
            return 2
    except (ValueError, OSError, TypeError, KeyError):
        print("Invalid private configuration or initial capture; no request sent")
        return 2
    outputs = []
    try:
        outputs.append(reserve(args.output))
        if args.public_report:
            outputs.append(reserve(args.public_report))
    except OSError:
        for file in outputs:
            file.close()
        print("Output reservation failed; no request sent and no file overwritten")
        return 2
    try:
        provider = provider if provider is not None else ChatProvider(config)
        result = asyncio.run(
            execute(capture, provider, activation, approval, fixture=args.fixture)
        )
        save(outputs[0], result)
        if len(outputs) > 1:
            save(outputs[1], result["report"])
    except Exception:  # noqa: BLE001 -- sanitize the complete credential-bearing owner boundary
        save(
            outputs[0],
            {
                "schema": "forge-private-workstation-receipt-1",
                "recorded_utc": datetime.now(UTC).isoformat(),
                "status": "failed_or_unverified",
                "request_attempts": provider.used if provider else 0,
                "diagnostics": provider.attempts if provider else [],
                "warning": "Preserve prior investigation. No fallback. Do not retry automatically; review private provider usage before any new authorization.",
            },
        )
        print(
            "Proposal failed or remains unverified; review private receipt. No fallback or automatic retry."
        )
        return 1
    finally:
        for file in outputs:
            file.close()
    print(
        "Fixture proposal reproduced; zero external requests."
        if args.fixture
        else "One private response recorded; public export does not authenticate source or establish industrial causality."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
