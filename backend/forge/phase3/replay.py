import argparse
import json
from pathlib import Path

from .reporting import replay


def main():
    parser = argparse.ArgumentParser(
        description="Offline Phase 3 sequential evidence replay"
    )
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    if args.report.stat().st_size > 1_048_576:
        parser.error("Report exceeds 1 MiB")
    try:
        decision = replay(json.loads(args.report.read_text()))
    except (ValueError, KeyError, TypeError) as exc:
        parser.exit(1, "Replay rejected: " + str(exc) + "\n")
    print("Phase 3 replay verified:", decision.status, decision.findings)


if __name__ == "__main__":
    main()
