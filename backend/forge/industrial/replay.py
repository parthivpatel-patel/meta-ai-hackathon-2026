import argparse
import json
from pathlib import Path

from .files import read_json
from .investigation import proposal_evidence, render, replay


def main():
    parser = argparse.ArgumentParser(
        description="Offline coupled machine investigation replay; no network"
    )
    parser.add_argument("report", type=Path)
    parser.add_argument("--html", type=Path)
    parser.add_argument("--proposal", type=Path)
    args = parser.parse_args()
    try:
        raw = read_json(args.report)
        recorded_model = (
            isinstance(raw, dict)
            and raw.get("schema") == "forge-industrial-model-report-1"
        )
        if recorded_model:
            from . import meta

            r = meta.replay(raw)
        else:
            r = replay(raw)
    except (ValueError, TypeError, KeyError, OSError):
        parser.exit(1, "Industrial replay rejected\n")
    if args.html:
        with args.html.open("x") as f:
            f.write(meta.render(r) if recorded_model else render(r))
    if args.proposal:
        with args.proposal.open("x") as f:
            if recorded_model:
                from ..engine.contracts import digest
                from .investigation import InvestigationRequest

                observed, features = meta.prepare(
                    InvestigationRequest.model_validate(r["request"])
                )
                evidence = {
                    "telemetry": observed.model_dump(),
                    "multimodal_features": features,
                }
                json.dump(
                    {
                        "evidence": evidence,
                        "input_hash": digest(evidence),
                        "network_requests_sent": 0,
                    },
                    f,
                    indent=2,
                )
            else:
                json.dump(proposal_evidence(r), f, indent=2)
    print("Industrial replay verified:", r["decision"]["status"])


if __name__ == "__main__":
    main()
