"""Synthetic coupled-model panel; no inference/network and no field-accuracy claims."""

import argparse
import json
import time
from pathlib import Path

from .investigation import InvestigationRequest, investigate, project, replay
from .model import SCENARIOS, Recipe, simulate


def evaluate():
    cases = []
    for seed in (2026, 2027, 2028):
        for scenario in SCENARIOS:
            recipe = Recipe(scenario=scenario, seed=seed)
            truth = simulate(recipe, True)["frames"][319]
            healthy = simulate(recipe.model_copy(update={"scenario": "normal"}), True)[
                "frames"
            ][319]
            expected = []
            for channel, scale in zip(
                ("temperature", "vibration", "pressure"), (0.8, 0.08, 0.12)
            ):
                if (
                    abs(project(truth, True)[channel] - project(healthy, True)[channel])
                    > 3 * scale
                ):
                    expected.append("process-" + channel)
                bias = (project(truth)[channel] - project(truth, True)[channel]) - (
                    project(healthy)[channel] - project(healthy, True)[channel]
                )
                if abs(bias) > 3 * scale:
                    expected.append("sensor-" + channel)
            expected = expected or ["normal"]
            start = time.perf_counter()
            r = investigate(InvestigationRequest(recipe=recipe, experiments=4))
            elapsed = (time.perf_counter() - start) * 1000
            replay(r)
            cases.append(
                {
                    "scenario": scenario,
                    "seed": seed,
                    "expected": expected,
                    "findings": r["decision"]["findings"],
                    "status": r["decision"]["status"],
                    "experiments": len(r["trials"]),
                    "exact_set": set(expected) == set(r["decision"]["findings"]),
                    "runtime_ms": round(elapsed, 3),
                    "replay": True,
                }
            )
    accepted = [c for c in cases if c["status"] == "SUPPORTED_SYNTHETIC"]
    predictions = [(f, c["expected"]) for c in cases for f in c["findings"]]
    return {
        "schema": "forge-coupled-evaluation-1",
        "cases": cases,
        "metrics": {
            "cases": len(cases),
            "accepted_exact": {
                "numerator": sum(c["exact_set"] for c in accepted),
                "denominator": len(accepted),
            },
            "coverage": {"numerator": len(accepted), "denominator": len(cases)},
            "all_finding_precision": {
                "numerator": sum(f in truth for f, truth in predictions),
                "denominator": len(predictions),
            },
            "exact_agreement": {
                "numerator": sum(c["exact_set"] for c in cases),
                "denominator": len(cases),
            },
            "replay_consistency": f"{len(cases)}/{len(cases)}",
            "inconclusive": sum(c["status"] == "INCONCLUSIVE" for c in cases),
        },
        "limitations": [
            "21 small fixed synthetic cases; not held-out industrial/model performance",
            "Truth label uses a prespecified three-baseline-scale process/bias threshold at capture time",
            "Counterfactual verification can remain inconclusive even when a simulator fault is known",
            "No genuine model requests or external source authenticity proof",
        ],
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--output", type=Path, required=True)
    args = p.parse_args()
    r = evaluate()
    args.output.write_text(json.dumps(r, indent=2) + "\n")
    print(json.dumps(r["metrics"]))


if __name__ == "__main__":
    main()
