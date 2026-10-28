"""Seven local-transport integration comparisons; never measures genuine model quality."""

import argparse
import asyncio
import json
from pathlib import Path

from ..submission.smoke import ActivationSettings
from . import meta, meta_cli
from .investigation import InvestigationRequest, investigate
from .model import SCENARIOS, Recipe


async def evaluate() -> dict:
    results = []
    for scenario in SCENARIOS:
        initial = investigate(InvestigationRequest(recipe=Recipe(scenario=scenario)))
        provider = meta_cli.fixture_provider()
        receipt = await meta_cli.execute(
            initial,
            provider,
            ActivationSettings(),
            meta_cli.Authorization(),
            fixture=True,
        )
        report = receipt["report"]
        while report["plan"]:
            report = meta.advance(report)
        baseline = investigate(InvestigationRequest.model_validate(report["request"]))
        assert (
            baseline["trials"] == report["trials"]
            and baseline["decision"] == report["decision"]
        )
        assert meta.replay(report) == report and provider.used == 1
        results.append(
            {
                "scenario": scenario,
                "source": "test_transport",
                "decision_matches_independent_baseline": True,
                "status": report["decision"]["status"],
                "findings": report["decision"]["findings"],
                "local_transport_attempts": provider.used,
                "genuine_requests": 0,
                "replay": True,
            }
        )
    return {
        "schema": "forge-model-fixture-comparison-1",
        "cases": results,
        "matched_decisions": f"{len(results)}/{len(results)}",
        "genuine_requests": 0,
        "limitation": "Deliberately fallible fixed local hypotheses. Checks integration/verification independence, not genuine model accuracy or improvement. The separate six-case genuine evaluation remains unexecuted.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = asyncio.run(evaluate())
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({k: v for k, v in result.items() if k != "cases"}))


if __name__ == "__main__":
    main()
