"""Reproducible blind evaluation. Only this module sees expected labels.

Run from backend: uv run --frozen python -m forge.evaluate --output evaluation/results.json
No generator/verifier function receives a scenario, seed, recipe, or answer label.
"""

import argparse
import json
from collections import Counter
from pathlib import Path

from .engine.contracts import VERSION
from .engine.investigation import Investigation
from .engine.oracle import CaseRecipe, SyntheticOracle
from .engine.reporting import make_report, replay_report

SCENARIOS = ("normal", "cooling_loss", "imbalance", "pressure_loss")
TARGET = {
    "normal": "normal",
    "cooling_loss": "process-temperature",
    "imbalance": "process-vibration",
    "pressure_loss": "process-pressure",
}
EXPERIMENT = {
    "normal": "reference_check",
    "cooling_loss": "restore_cooling",
    "imbalance": "balance_rotor",
    "pressure_loss": "restore_feed",
}
PROFILES = {
    "clean": {},
    "missing15": {"missing_fraction": 0.15},
    "noise6": {"noise_factor": 6},
    "missing75": {"missing_fraction": 0.75},
    "confounded": {"confounder": True},
}


def ratio(n, d):
    return {"numerator": n, "denominator": d, "rate": n / d if d else None}


def confusion(records, key):
    tp = sum(r[key] and r["truth_abnormal"] for r in records)
    fp = sum(r[key] and not r["truth_abnormal"] for r in records)
    fn = sum(not r[key] and r["truth_abnormal"] for r in records)
    tn = sum(not r[key] and not r["truth_abnormal"] for r in records)
    return {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "false_positive_rate": ratio(fp, fp + tn),
        "false_negative_rate": ratio(fn, fn + tp),
    }


def summarize(records):
    accepted = [r for r in records if r["decision"] == "SUPPORTED_SYNTHETIC"]
    abstained = [r for r in records if r["decision"] in ("ABSTAIN", "INCONCLUSIVE")]
    should_abstain = [r for r in records if r["expected_finding"] is None]
    selectable = [r for r in records if r["expected_experiment"] is not None]
    return {
        "cases": len(records),
        "decisions": dict(sorted(Counter(r["decision"] for r in records).items())),
        "robust_detector": confusion(records, "robust_detected"),
        "fixed_threshold_baseline": confusion(records, "fixed_detected"),
        "experiment_selection_accuracy": ratio(
            sum(r["selection"] == r["expected_experiment"] for r in selectable),
            len(selectable),
        ),
        "verification_precision": ratio(
            sum(r["correct"] for r in accepted), len(accepted)
        ),
        "finding_coverage": ratio(len(accepted), len(records)),
        "correct_finding_recall": ratio(
            sum(r["correct"] for r in accepted),
            sum(r["expected_finding"] is not None for r in records),
        ),
        "abstention_rate": ratio(len(abstained), len(records)),
        "required_abstention_recall": ratio(
            sum(r["decision"] in ("ABSTAIN", "INCONCLUSIVE") for r in should_abstain),
            len(should_abstain),
        ),
        "supported_scope_abstentions": sum(
            r["expected_finding"] is not None for r in abstained
        ),
        "observational_only_forced_finding_accuracy": ratio(
            sum(r["observational_finding"] == r["expected_finding"] for r in records),
            len(records),
        ),
    }


def evaluate(seeds=range(100, 120)):
    records = []

    def run(profile, recipe, expected, expected_experiment):
        oracle = SyntheticOracle(recipe)
        snapshot = Investigation("blind-session", oracle).run()
        # The evaluator, not any inference input, holds the answer key.
        detected = any(s.flags >= 5 for s in snapshot.observed.signals)
        fixed = any(
            (r.temperature is not None and r.temperature > 75)
            or (r.vibration is not None and r.vibration > 3)
            or (r.pressure is not None and r.pressure < 5)
            for r in oracle.rows[60:]
        )
        strongest = max(snapshot.observed.signals, key=lambda s: s.flags, default=None)
        observational = (
            "process-" + strongest.channel
            if strongest and strongest.flags >= 5
            else "normal"
        )
        replay_report(make_report(snapshot))
        records.append(
            {
                "profile": profile,
                "seed": recipe.seed,
                "scenario_answer": recipe.scenario,
                "sensor_bias_answer": recipe.sensor_bias,
                "expected_finding": expected,
                "expected_experiment": expected_experiment,
                "truth_abnormal": recipe.scenario != "normal"
                or recipe.sensor_bias != "none"
                or recipe.confounder,
                "robust_detected": detected,
                "fixed_detected": fixed,
                "observational_finding": observational,
                "selection": snapshot.selection.kind,
                "decision": snapshot.verification.decision,
                "finding": snapshot.verification.finding,
                "correct": expected is not None
                and snapshot.verification.finding == expected,
                "dataset_hash": snapshot.dataset_hash,
            }
        )

    for seed in seeds:
        for profile, args in PROFILES.items():
            for scenario in SCENARIOS:
                expected = (
                    None if profile in ("missing75", "confounded") else TARGET[scenario]
                )
                selection = None if expected is None else EXPERIMENT[scenario]
                run(
                    profile,
                    CaseRecipe(scenario=scenario, seed=seed, **args),
                    expected,
                    selection,
                )
        for channel, selection in [
            ("temperature", "restore_cooling"),
            ("vibration", "balance_rotor"),
            ("pressure", "restore_feed"),
        ]:
            run(
                "sensor_bias",
                CaseRecipe(scenario="normal", seed=seed, sensor_bias=channel),
                "sensor-" + channel,
                selection,
            )
        run(
            "combined_fault",
            CaseRecipe(scenario="cooling_loss", seed=seed, sensor_bias="vibration"),
            None,
            None,
        )
    return {
        "schema": "forge-evaluation-1",
        "engine_version": VERSION,
        "seeds": list(seeds),
        "method": "Fixed thresholds selected before holdout execution. Cases sharing a seed/profile are correlated; rates are descriptive, not independent confidence estimates.",
        "abstention_policy": "Missing75, confounded, and combined_fault cases are outside the supported single-fault/coverage policy; abstention or inconclusive is expected.",
        "baselines": "Fixed thresholds T>75/V>3/P<5 on post-baseline samples; observational-only baseline forces a process finding on the most flagged channel or normal. Neither baseline verifies causes.",
        "overall": summarize(records),
        "by_profile": {
            p: summarize([r for r in records if r["profile"] == p])
            for p in sorted({r["profile"] for r in records})
        },
        "cases": records,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("evaluation/results.json"))
    args = parser.parse_args()
    result = evaluate()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(json.dumps(result["overall"], indent=2))


if __name__ == "__main__":
    main()
