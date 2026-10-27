"""Separate matched-case evaluation. Dry by default; never run by CI against a provider."""

import argparse
import asyncio
import json
import os
import time
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
from pydantic_settings import BaseSettings, SettingsConfigDict
from scipy.stats import norm

from ..engine.contracts import TARGETS, digest
from ..phase2.evidence import demo_assets
from ..phase2.inference import ChatProvider, TransportSettings
from ..phase3.oracle import Recipe
from ..phase3.reporting import export, replay
from ..phase3.service import Metadata, Session, create, run
from ..providers import ProviderError
from .models import EVENT_MODEL_ID
from .smoke import ActivationSettings

# Fixed before any genuine inference. New seeds, separate from existing benchmark matrices.
PROFILES = (
    ("normal", {"faults": []}),
    ("pressure_and_sensor", {"faults": ["pressure"], "sensor_biases": ["pressure"]}),
    ("noisy_pair", {"faults": ["temperature", "vibration"], "noise_factor": 6}),
    ("sensor_drift", {"faults": [], "sensor_drift": "temperature"}),
    ("confounded", {"faults": ["temperature", "pressure"], "confounded": True}),
    ("missing75", {"faults": ["pressure"], "missing_fraction": 0.75}),
)
MAX_EXPERIMENTS = 4


class EvaluationSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="FORGE_EVALUATION_", extra="ignore", hide_input_in_errors=True
    )
    owner_authorized: bool = False
    native_thermal_authorized: bool = False


def cases() -> list[tuple[str, Recipe]]:
    return [
        (name, Recipe(seed=12031 + i * 17, **kwargs))
        for i, (name, kwargs) in enumerate(PROFILES)
    ]


def request_count() -> int:
    return sum(
        create(recipe, demo_assets(), Metadata()).status != "COMPLETE"
        for _, recipe in cases()
    )


def preflight(
    config: TransportSettings,
    activation: ActivationSettings,
    approval: EvaluationSettings,
    *,
    fixture: bool = False,
) -> dict:
    from .receipt import verified_smoke_receipt

    limit = request_count()
    checks = [
        (approval.owner_authorized, "separate_owner_authorization_required"),
        (activation.credits_approved, "approved_credits_unconfirmed"),
        (
            activation.card_free_entitlement_confirmed,
            "card_free_entitlement_unconfirmed",
        ),
        (
            config.provider == "baseten" and config.model_id == EVENT_MODEL_ID,
            "exact_event_model_required",
        ),
        (
            config.enabled and config.free_access_confirmed,
            "inference_or_free_entitlement_disabled",
        ),
        (
            bool(config.api_key and config.api_key.get_secret_value()),
            "credential_missing",
        ),
        (config.request_budget == limit, "request_budget_must_match_predeclared_cases"),
        (config.retry_limit == 0, "retries_must_be_zero"),
        (config.max_tokens <= 1024, "maximum_output_must_not_exceed_1024"),
        (
            0 < config.token_budget <= min(limit * 16384, 131072),
            "reservation_budget_out_of_bounds",
        ),
        (
            config.timeout_seconds <= 20 and config.total_timeout_seconds <= 30,
            "deadline_out_of_bounds",
        ),
        (
            not config.thermal_images or approval.native_thermal_authorized,
            "native_thermal_requires_separate_authorization",
        ),
        (
            os.environ.get("FORGE_DEMO_MODE") != "public"
            and os.environ.get("RENDER", "").lower() != "true",
            "public_host_execution_forbidden",
        ),
        (
            fixture
            or verified_smoke_receipt(config.validated_smoke_path, EVENT_MODEL_ID),
            "private_genuine_smoke_receipt_required",
        ),
    ]
    blockers = [code for passed, code in checks if not passed]
    return {
        "ready_for_explicit_execution": not blockers,
        "blockers": blockers,
        "mode": "dry_run",
        "model_id": config.model_id,
        "endpoint": config.endpoint,
        "planned_cases": len(PROFILES),
        "maximum_requests": limit,
        "max_output_tokens": config.max_tokens,
        "reserved_accounting_budget": config.token_budget,
        "attempt_deadline_seconds": config.timeout_seconds,
        "total_request_deadline_seconds": config.total_timeout_seconds,
        "native_thermal": config.thermal_images,
        "retry_limit": 0,
        "max_experiments_per_arm": MAX_EXPERIMENTS,
        "cases": [name for name, _ in PROFILES],
        "network_requests_sent": 0,
        "warning": "Local reservations are not billing caps. Verify promotional balance and no paid fallback in the provider account before authorization.",
    }


def proportion(n: int, d: int) -> dict:
    if not d:
        return {
            "numerator": n,
            "denominator": d,
            "rate": None,
            "wilson_95_interval": None,
        }
    z = float(norm.ppf(0.975))
    p = n / d
    den = 1 + z * z / d
    center = (p + z * z / (2 * d)) / den
    half = z * np.sqrt(p * (1 - p) / d + z * z / (4 * d * d)) / den
    return {
        "numerator": n,
        "denominator": d,
        "rate": p,
        "wilson_95_interval": [
            max(0.0, float(center - half)),
            min(1.0, float(center + half)),
        ],
    }


def truth(recipe: Recipe) -> list[str]:
    sensors = set(
        recipe.sensor_biases + ([recipe.sensor_drift] if recipe.sensor_drift else [])
    )
    return sorted(
        ["process-" + c for c in recipe.faults] + ["sensor-" + c for c in sensors]
    ) or ["normal"]


def score(session: Session, recipe: Recipe) -> dict:
    latent = truth(recipe)
    answerable = not (
        recipe.confounded
        or recipe.control_interference
        or recipe.missing_fraction > 0.35
    )
    accepted = session.decision.status == "SUPPORTED_SYNTHETIC"
    proposed = (
        [h.hypothesis_id for h in session.hypotheses.hypotheses]
        if session.hypotheses
        else []
    )
    false = [h for h in proposed if h not in latent]
    rejected = [
        r.hypothesis_id
        for r in session.ranking
        if r.hypothesis_id in false and r.evidence_status == "CONTRADICTED"
    ]
    targets = set(
        recipe.faults
        + recipe.sensor_biases
        + ([recipe.sensor_drift] if recipe.sensor_drift else [])
    )
    first = next((TARGETS[t.kind] for t in session.trials if t.kind in TARGETS), None)
    return {
        "status": session.decision.status,
        "known_synthetic_causes": latent,
        "answerable_under_policy": answerable,
        "diagnostic_agreement": accepted
        and answerable
        and sorted(session.decision.findings) == latent,
        "accepted": accepted,
        "abstained_or_inconclusive": session.decision.status
        in ("ABSTAIN", "INCONCLUSIVE"),
        "proposals": proposed,
        "truth_mismatched_proposals": false,
        "false_proposals_rejected": rejected,
        "truth_mismatched_proposals_not_supported": [
            r.hypothesis_id
            for r in session.ranking
            if r.hypothesis_id in false and r.evidence_status != "SUPPORTED"
        ],
        "first_nonreference_target": first,
        "first_target_relevant": first in targets
        if targets and first is not None
        else None,
        "tests_completed": len(session.trials),
        "source": session.model_source,
    }


def summarize(rows: list[dict]) -> dict:
    result = {}
    for arm in ("baseline", "model_assisted"):
        valid = [r[arm] for r in rows if r.get(arm) is not None]
        answerable = [r for r in valid if r["answerable_under_policy"]]
        accepted = [r for r in valid if r["accepted"]]
        must_abstain = [r for r in valid if not r["answerable_under_policy"]]
        proposed = [r for r in valid if r["proposals"]]
        identifiable_false = [
            r
            for r in valid
            if r["answerable_under_policy"] and r["truth_mismatched_proposals"]
        ]
        targeted = [r for r in valid if r["first_target_relevant"] is not None]
        result[arm] = {
            "completed_cases": len(valid),
            "diagnostic_agreement": proportion(
                sum(r["diagnostic_agreement"] for r in answerable), len(answerable)
            ),
            "accepted_precision": proportion(
                sum(r["diagnostic_agreement"] for r in accepted), len(accepted)
            ),
            "required_abstention": proportion(
                sum(r["abstained_or_inconclusive"] for r in must_abstain),
                len(must_abstain),
            ),
            "cases_with_truth_mismatched_proposals": proportion(
                sum(bool(r["truth_mismatched_proposals"]) for r in proposed),
                len(proposed),
            ),
            "cases_rejecting_all_false_proposals": proportion(
                sum(
                    set(r["false_proposals_rejected"])
                    == set(r["truth_mismatched_proposals"])
                    for r in identifiable_false
                ),
                len(identifiable_false),
            ),
            "first_target_relevance": proportion(
                sum(r["first_target_relevant"] for r in targeted), len(targeted)
            ),
            "proposals_total": sum(len(r["proposals"]) for r in valid),
            "truth_mismatched_proposals_total": sum(
                len(r["truth_mismatched_proposals"]) for r in valid
            ),
            "mean_tests": float(np.mean([r["tests_completed"] for r in valid]))
            if valid
            else None,
        }
    pairs = [r for r in rows if r.get("model_assisted") is not None]
    result["matched_pairs"] = len(pairs)
    result["pairs_with_different_decisions"] = sum(
        r["baseline"]["status"] != r["model_assisted"]["status"]
        or r["baseline"]["diagnostic_agreement"]
        != r["model_assisted"]["diagnostic_agreement"]
        for r in pairs
    )
    result["interpretation"] = (
        "Case-level Wilson intervals are descriptive for this small fixed synthetic panel, not population guarantees. Proposal mismatches are measured against private synthetic truth, not a physical diagnosis. Model candidates do not control test selection or verification, so matched final decisions may be identical by design. Failed model arms are not replaced with baseline output."
    )
    return result


async def evaluate(
    provider: ChatProvider, activation: ActivationSettings, approval: EvaluationSettings
) -> dict:
    fixture = provider.transport is not None
    check = preflight(provider.settings, activation, approval, fixture=fixture)
    if not check["ready_for_explicit_execution"]:
        raise ProviderError("Evaluation prerequisites are unmet; no request was sent")
    if provider.used:
        raise ProviderError(
            "Evaluation requires a fresh process-lifetime request budget"
        )
    started = time.perf_counter()
    rows = []
    for name, recipe in cases():
        baseline = await run(recipe, demo_assets(), max_experiments=MAX_EXPERIMENTS)
        row = {
            "case": name,
            "recipe": recipe.model_dump(),
            "baseline": score(baseline, recipe),
            "baseline_report": export(baseline),
            "model_assisted": None,
        }
        before = provider.used
        try:
            model = await run(
                recipe,
                demo_assets(),
                max_experiments=MAX_EXPERIMENTS,
                provider=provider,
            )
            report = export(model)
            replay(report)
            if model.inference:
                expected_source = "test_transport" if fixture else "meta_http_response"
                if (
                    model.inference.source != expected_source
                    or model.inference.returned_model != EVENT_MODEL_ID
                ):
                    raise ProviderError("Unverified model identity or provenance")
            row.update(
                model_assisted=score(model, recipe),
                model_report=report,
                request_attempts=provider.used - before,
                inference=model.inference.model_dump() if model.inference else None,
            )
        except Exception:  # noqa: BLE001 -- never expose credential-bearing exception text
            row.update(
                error="model_arm_failed_or_unverified_no_fallback",
                request_attempts=provider.used - before,
            )
            rows.append(row)
            break  # Stop on the first failure; no further credits are reserved automatically.
        rows.append(row)
    attempts = provider.attempts
    latencies = [a["elapsed_ms"] for a in attempts if a["elapsed_ms"] is not None]
    usages = [
        a["provider_reported_usage"]
        for a in attempts
        if a["provider_reported_usage"] is not None
    ]
    return {
        "schema": "forge-matched-model-evaluation-1",
        "recorded_utc": datetime.now(UTC).isoformat(),
        "execution_kind": "fixture_only_no_real_model"
        if fixture
        else "explicit_real_http_execution",
        "model_id": EVENT_MODEL_ID,
        "planned_cases": len(PROFILES),
        "completed_pairs": sum(r["model_assisted"] is not None for r in rows),
        "stopped_on_failure": any("error" in r for r in rows),
        "request_attempts": provider.used,
        "real_network_attempts": 0 if fixture else provider.used,
        "genuine_validated_responses": 0
        if fixture
        else sum(a["response_valid"] for a in attempts),
        "fixture_responses": sum(a["response_valid"] for a in attempts)
        if fixture
        else 0,
        "reserved_accounting_units": provider.token_units_used,
        "provider_reported_tokens_total": sum(u["total_tokens"] for u in usages)
        if usages
        else None,
        "usage_missing_attempts": len(attempts) - len(usages),
        "inference_latency_ms": {
            "samples": len(latencies),
            "p50": float(np.median(latencies)) if latencies else None,
            "p95": float(np.quantile(latencies, 0.95)) if latencies else None,
        },
        "elapsed_workflow_ms": round((time.perf_counter() - started) * 1000, 3),
        "attempts": attempts,
        "metrics": summarize(rows),
        "cases": rows,
        "panel_hash": digest([(name, recipe.model_dump()) for name, recipe in cases()]),
        "limitations": [
            "Fixed six-case synthetic panel; no industrial accuracy claim.",
            "No estimated dollar cost. Local accounting units and provider token reports are not an invoice or billing guarantee.",
            "Native audio is not implemented. Thermal input requires separate authorization and actual provider validation.",
            "The model proposes causes; deterministic policy selects experiments and independently verifies results.",
        ],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Requires separate explicit owner authorization and a genuine smoke receipt",
    )
    parser.add_argument(
        "--output", type=Path, help="New private artifact, never overwritten"
    )
    args = parser.parse_args(argv)
    try:
        config, activation, approval = (
            TransportSettings(),
            ActivationSettings(),
            EvaluationSettings(),
        )
        check = preflight(config, activation, approval)
    except ValueError:
        print(
            json.dumps(
                {
                    "ready_for_explicit_execution": False,
                    "blockers": ["invalid_configuration"],
                    "network_requests_sent": 0,
                }
            )
        )
        return 2
    if not args.execute:
        print(json.dumps(check, indent=2))
        return 0
    if not check["ready_for_explicit_execution"]:
        print(json.dumps(check, indent=2))
        return 2
    if args.output is None:
        parser.error("--output is required for execution")
    try:
        fd = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except OSError:
        print("Private artifact could not be reserved; no request was sent")
        return 2
    with os.fdopen(fd, "w") as file:
        json.dump(
            {"status": "pending_or_interrupted", "do_not_retry_automatically": True},
            file,
        )
        file.flush()
        os.fsync(file.fileno())
        provider = None
        try:
            provider = ChatProvider(config)
            result = asyncio.run(evaluate(provider, activation, approval))
        except Exception:  # noqa: BLE001
            result = {
                "status": "failed_or_unverified",
                "request_attempts": provider.used if provider else 0,
                "attempts": provider.attempts if provider else [],
                "do_not_retry_automatically": True,
            }
        file.seek(0)
        file.truncate()
        json.dump(result, file, indent=2)
        file.flush()
        os.fsync(file.fileno())
    failed = result.get("status") == "failed_or_unverified" or result.get(
        "stopped_on_failure"
    )
    print(
        "Private evaluation artifact recorded. No fallback or automatic retry. Review actual provider usage before any further authorization."
    )
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
