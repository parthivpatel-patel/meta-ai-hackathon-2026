import argparse
import json
from pathlib import Path

from .investigation import proposal_evidence, render, replay


def main():
    parser = argparse.ArgumentParser(
        description="Offline coupled machine investigation replay; no network"
    )
    parser.add_argument("report", type=Path)
    parser.add_argument("--html", type=Path)
    parser.add_argument("--proposal", type=Path)
    args = parser.parse_args()
    if args.report.stat().st_size > 1048576:
        parser.error("Report exceeds 1 MiB")
    try:
        r = replay(json.loads(args.report.read_text()))
    except (ValueError, TypeError, KeyError):
        parser.exit(1, "Industrial replay rejected\n")
    if args.html:
        with args.html.open("x") as f:
            f.write(render(r))
    if args.proposal:
        with args.proposal.open("x") as f:
            json.dump(proposal_evidence(r), f, indent=2)
    print("Industrial replay verified:", r["decision"]["status"])


if __name__ == "__main__":
    main()
