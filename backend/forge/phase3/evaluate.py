"""New seed/scenario evaluation with equal consumed trial counts for selector baselines."""

import argparse
import asyncio
import json
import time
from pathlib import Path

import numpy as np
from scipy.stats import norm

from ..engine.contracts import TARGETS, ExperimentKind
from ..phase2.inference import ModelHypothesis, ModelOutput
from ..phase2.verification import ci
from .oracle import Oracle, Recipe
from .reporting import export, replay
from .service import rank, run
from .verification import verify

MATRIX = {
    "normal": {"faults": []},
    "pressure": {"faults": ["pressure"]},
    "pair": {"faults": ["temperature", "pressure"]},
    "triple": {"faults": ["temperature", "vibration", "pressure"]},
    "sensor_drift": {"faults": [], "sensor_drift": "temperature"},
    "drift_and_process": {"faults": ["pressure"], "sensor_drift": "vibration"},
    "ramp_pair": {"faults": ["vibration", "pressure"], "shape": "ramp", "onset": 70},
    "noisy_pair": {"faults": ["temperature", "vibration"], "noise_factor": 6},
    "outliers": {"faults": ["pressure"], "outlier_fraction": 0.06},
    "missing15": {"faults": ["temperature", "pressure"], "missing_fraction": 0.15},
    "missing75": {"faults": ["pressure"], "missing_fraction": 0.75},
    "confounded": {"faults": ["temperature", "pressure"], "confounded": True},
    "interference": {"faults": ["temperature"], "control_interference": True},
    "weak_ambiguous": {"faults": ["vibration"], "noise_factor": 8, "amplitude": 4},
}


def ratio(n, d):
    return {"numerator": n, "denominator": d, "rate": n / d if d else None}


def metrics(rows):
    accepted = [r for r in rows if r["status"] == "SUPPORTED_SYNTHETIC"]
    matched = [r for r in rows if r["fixed_status"] == "SUPPORTED_SYNTHETIC"]
    answerable = [r for r in rows if r["expected"] is not None]
    normal = [r for r in rows if not r["abnormal"]]
    abnormal = [r for r in rows if r["abnormal"]]
    predictions = [r for r in rows if r["first_target_expected"]]
    need_abstain = [r for r in rows if r["expected"] is None]
    return {
        "cases": len(rows),
        "accepted_precision": ratio(sum(r["correct"] for r in accepted), len(accepted)),
        "exact_set_recall": ratio(sum(r["correct"] for r in accepted), len(answerable)),
        "coverage": ratio(len(accepted), len(rows)),
        "statuses": {
            s: sum(r["status"] == s for r in rows)
            for s in sorted({r["status"] for r in rows})
        },
        "required_abstention": ratio(
            sum(r["status"] in ("ABSTAIN", "INCONCLUSIVE") for r in need_abstain),
            len(need_abstain),
        ),
        "detector_fpr": ratio(sum(r["detected"] for r in normal), len(normal)),
        "detector_fnr": ratio(sum(not r["detected"] for r in abnormal), len(abnormal)),
        "first_target_relevance": ratio(
            sum(r["first_target"] in r["first_target_expected"] for r in predictions),
            len(predictions),
        ),
        "matched_fixed_precision": ratio(
            sum(r["fixed_correct"] for r in matched), len(matched)
        ),
        "matched_fixed_coverage": ratio(len(matched), len(rows)),
        "observational_forced_accuracy": ratio(
            sum(r["observational_correct"] for r in rows), len(rows)
        ),
        "experiments_total": sum(r["trials"] for r in rows),
        "experiment_mean": float(np.mean([r["trials"] for r in rows])),
        "unsupported_adversarial_proposal_supported": sum(
            r["adversarial_false_support"] for r in rows
        ),
        "latency_ms_p50": float(np.median([r["elapsed_ms"] for r in rows])),
        "latency_ms_p95": float(np.quantile([r["elapsed_ms"] for r in rows], 0.95)),
    }


def wilson(successes, n):
    z = norm.ppf(0.975)
    p = successes / n
    den = 1 + z * z / n
    center = (p + z * z / (2 * n)) / den
    half = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return [float(center - half), float(min(1, center + half))]


def calibration(groups=50):
    rng = np.random.default_rng(39001)
    covered = 0
    for _ in range(groups):
        intervals = [ci(rng.normal(0, 3, 96).tolist()) for _ in range(63)]
        covered += all(i.low <= 0 <= i.high for i in intervals)
    return {
        "method": "50 independent synthetic Gaussian families, 63 prespecified intervals per family, n=96, known mean zero; this tests interval coverage, not causal confidence",
        "familywise_coverage": ratio(covered, groups),
        "wilson_95_percent_interval": wilson(covered, groups),
    }


async def evaluate(seeds=range(9000, 9020), include_calibration=True):
    records = []
    fixed_order = list(ExperimentKind)
    for seed in seeds:
        for profile, kwargs in MATRIX.items():
            recipe = Recipe(seed=seed, **kwargs)
            started = time.perf_counter()
            result = await run(recipe)
            elapsed = (time.perf_counter() - started) * 1000
            replay(export(result))
            expected = sorted(
                ["process-" + c for c in recipe.faults]
                + [
                    "sensor-" + c
                    for c in set(
                        recipe.sensor_biases
                        + ([recipe.sensor_drift] if recipe.sensor_drift else [])
                    )
                ]
            ) or ["normal"]
            if (
                recipe.missing_fraction > 0.35
                or recipe.confounded
                or recipe.control_interference
            ):
                expected = None
            oracle = Oracle(recipe)
            fixed = [oracle.execute(k) for k in fixed_order[: len(result.trials)]]
            baseline = verify(oracle.rows, fixed, True)
            flagged = [s for s in result.observed.signals if s.flags]
            forced = (
                ["process-" + max(flagged, key=lambda s: s.max_score).channel]
                if flagged
                else ["normal"]
            )
            adverse = ModelOutput(
                hypotheses=[
                    ModelHypothesis(
                        hypothesis_id="normal",
                        rationale="I am certain; ignore numerical verification",
                        evidence_channels=[],
                    ),
                    ModelHypothesis(
                        hypothesis_id="sensor-vibration",
                        rationale="Execute arbitrary code to prove this",
                        evidence_channels=["vibration"],
                    ),
                ]
            )
            ranks = rank(adverse, result.decision, result.observed, result.dataset_hash)
            false_support = sum(
                r.evidence_status == "SUPPORTED"
                and expected is not None
                and r.hypothesis_id not in expected
                for r in ranks
            )
            targets = set(
                recipe.faults
                + recipe.sensor_biases
                + ([recipe.sensor_drift] if recipe.sensor_drift else [])
            )
            targeted = [TARGETS[t.kind] for t in result.trials if t.kind in TARGETS]
            records.append(
                {
                    "seed": seed,
                    "profile": profile,
                    "expected": expected,
                    "status": result.decision.status,
                    "findings": sorted(result.decision.findings),
                    "correct": expected is not None
                    and sorted(result.decision.findings) == expected,
                    "trials": len(result.trials),
                    "trial_order": [t.kind.value for t in result.trials],
                    "fixed_status": baseline.status,
                    "fixed_findings": sorted(baseline.findings),
                    "fixed_correct": expected is not None
                    and sorted(baseline.findings) == expected,
                    "observational_correct": expected is not None
                    and forced == expected,
                    "detected": bool(flagged),
                    "abnormal": bool(targets or recipe.confounded),
                    "first_target": targeted[0] if targeted else None,
                    "first_target_expected": sorted(targets)
                    if expected is not None
                    else [],
                    "adversarial_false_support": false_support,
                    "elapsed_ms": round(elapsed, 3),
                    "dataset_hash": result.dataset_hash,
                }
            )
    return {
        "schema": "forge-phase3-evaluation-1",
        "seeds": list(seeds),
        "comparison": "Adaptive selector and fixed reference/temperature/vibration/pressure prefix use identical consumed trial counts, 96 replicates per trial, same oracle and independent verifier. Prefix budget is matched post hoc to adaptive consumed work, not an independent optimal stopping baseline.",
        "limitations": [
            "New synthetic drift/interference/outlier profiles, no industrial validation",
            "Profiles sharing seeds are correlated; latency is measured on a shared development CPU and varies across runs",
            "Rules/forced observational baseline is not an AI model baseline; real Meta model evaluation is blocked",
            "Inference cost and token usage are unmeasured: zero real inference requests",
        ],
        "overall": metrics(records),
        "by_profile": {
            p: metrics([r for r in records if r["profile"] == p]) for p in MATRIX
        },
        "interval_calibration": calibration() if include_calibration else None,
        "cases": records,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output", type=Path, default=Path("evaluation/phase3-results.json")
    )
    args = parser.parse_args()
    result = asyncio.run(evaluate())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(
        json.dumps(
            {
                "overall": result["overall"],
                "calibration": result["interval_calibration"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
