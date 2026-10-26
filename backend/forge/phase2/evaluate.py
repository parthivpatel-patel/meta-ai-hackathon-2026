"""Previously unused seeds and new composite/ramp/late-onset scenarios; answer keys stay here."""

import argparse
import asyncio
import json
from collections import Counter
from pathlib import Path

from ..engine.contracts import ExperimentResult, Probe, digest
from ..engine.hypotheses import select_experiment
from ..engine.investigation import summarize
from ..engine.verifier import verify as verify_v1
from .evidence import EvidenceBundle
from .oracle import Recipe
from .service import investigate, replay

MATRIX = {
    "normal": {"faults": []},
    "single": {"faults": ["temperature"]},
    "pair": {"faults": ["temperature", "vibration"]},
    "triple": {"faults": ["temperature", "vibration", "pressure"]},
    "same_channel_sensor_process": {
        "faults": ["pressure"],
        "sensor_biases": ["pressure"],
    },
    "sensor_only": {"faults": [], "sensor_biases": ["vibration"]},
    "ramp_pair": {
        "faults": ["temperature", "pressure"],
        "shape": "ramp",
        "onset": 70,
        "amplitude": 6,
    },
    "late_pressure": {"faults": ["pressure"], "onset": 90, "noise_factor": 3},
    "noisy_single": {"faults": ["temperature"], "noise_factor": 6},
    "noisy_pair": {"faults": ["temperature", "vibration"], "noise_factor": 6},
    "missing15_pair": {"faults": ["temperature", "pressure"], "missing_fraction": 0.15},
    "missing75_pair": {"faults": ["temperature", "pressure"], "missing_fraction": 0.75},
    "confounded": {"faults": ["temperature", "pressure"], "confounded": True},
    "weak_noisy": {"faults": ["vibration"], "amplitude": 4, "noise_factor": 8},
}


def rate(n, d):
    return {"numerator": n, "denominator": d, "rate": n / d if d else None}


async def evaluate(seeds=range(7000, 7020)):
    records = []
    for seed in seeds:
        for profile, kwargs in MATRIX.items():
            recipe = Recipe(seed=seed, **kwargs)
            result = await investigate(recipe, EvidenceBundle())
            replay(result)
            expected = sorted(
                ["process-" + x for x in recipe.faults]
                + ["sensor-" + x for x in recipe.sensor_biases]
            ) or ["normal"]
            if recipe.confounded or recipe.missing_fraction > 0.35:
                expected = None
            # Baseline gets identical observations and first 24 replicates, with v1 selection/policy.
            _, blind = summarize(result.measurements)
            selection = select_experiment(blind)
            trial = next(t for t in result.trials if t.kind == selection.kind)
            probes = [
                Probe(
                    channel=p.channel,
                    **{
                        key: getattr(p, key)[:24]
                        for key in [
                            "primary_before",
                            "primary_after",
                            "witness_before",
                            "witness_after",
                        ]
                    },
                )
                for p in trial.probes
            ]
            raw = {
                "dataset_hash": result.dataset_hash,
                "kind": trial.kind,
                "probes": [p.model_dump() for p in probes],
            }
            baseline = verify_v1(
                result.measurements, ExperimentResult(id="EXP-" + digest(raw), **raw)
            )
            records.append(
                {
                    "seed": seed,
                    "profile": profile,
                    "expected": expected,
                    "findings": sorted(result.verification.findings),
                    "status": result.verification.status,
                    "correct": expected is not None
                    and sorted(result.verification.findings) == expected,
                    "v1_status": baseline.decision,
                    "v1_correct": expected is not None
                    and [baseline.finding] == expected,
                    "abnormal": bool(
                        recipe.faults or recipe.sensor_biases or recipe.confounded
                    ),
                    "detected": any(s.flags for s in result.observed.signals),
                    "dataset_hash": result.dataset_hash,
                }
            )

    def metrics(rows):
        accepted = [r for r in rows if r["status"] == "SUPPORTED_SYNTHETIC"]
        baseline = [r for r in rows if r["v1_status"] == "SUPPORTED_SYNTHETIC"]
        negatives = [r for r in rows if not r["abnormal"]]
        positives = [r for r in rows if r["abnormal"]]
        abstain_required = [r for r in rows if r["expected"] is None]
        return {
            "cases": len(rows),
            "statuses": dict(Counter(r["status"] for r in rows)),
            "accepted_precision": rate(
                sum(r["correct"] for r in accepted), len(accepted)
            ),
            "coverage": rate(len(accepted), len(rows)),
            "answerable_exact_set_recall": rate(
                sum(r["correct"] for r in accepted),
                sum(r["expected"] is not None for r in rows),
            ),
            "detector_fpr": rate(sum(r["detected"] for r in negatives), len(negatives)),
            "detector_fnr": rate(
                sum(not r["detected"] for r in positives), len(positives)
            ),
            "required_abstention": rate(
                sum(
                    r["status"] in ("ABSTAIN", "INCONCLUSIVE") for r in abstain_required
                ),
                len(abstain_required),
            ),
            "v1_precision": rate(sum(r["v1_correct"] for r in baseline), len(baseline)),
            "v1_coverage": rate(len(baseline), len(rows)),
        }

    return {
        "schema": "forge-phase2-evaluation-1",
        "seeds": list(seeds),
        "model_evaluation": "No real model inference; deterministic investigation and verification only",
        "comparison_limitations": "V2 uses four interventions with 96 replicates each; v1 uses one with 24. Sixteenfold raw experiment sample budget; not a like-for-like compute comparison. Same observational datasets; correlated profiles; descriptive rates only.",
        "overall": metrics(records),
        "by_profile": {
            profile: metrics([r for r in records if r["profile"] == profile])
            for profile in MATRIX
        },
        "cases": records,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output", type=Path, default=Path("evaluation/phase2-results.json")
    )
    args = parser.parse_args()
    result = asyncio.run(evaluate())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, sort_keys=True, indent=2) + "\n")
    print(json.dumps(result["overall"], indent=2))


if __name__ == "__main__":
    main()
