"""Workflow orchestration. Public snapshots omit recipes, labels, and RNG seeds."""

from typing import Literal

from pydantic import Field

from ..analysis import ChannelEvidence, analyze
from ..simulation import Measurement
from .contracts import (
    VERSION,
    BlindInput,
    Candidate,
    ExperimentResult,
    Proposal,
    Record,
    Selection,
    SignalSummary,
    Verification,
    dataset_hash,
)
from .hypotheses import describe_selection, generate_candidates, select_experiment
from .oracle import SyntheticOracle
from .verifier import verify


class Snapshot(Record):
    id: str
    engine_version: str = VERSION
    status: Literal[
        "OBSERVED",
        "HYPOTHESES_READY",
        "EXPERIMENT_SELECTED",
        "EXPERIMENT_COMPLETE",
        "VERIFIED",
    ]
    dataset_hash: str
    measurements: list[Measurement]
    evidence: list[ChannelEvidence]
    observed: BlindInput
    candidates: list[Candidate] = Field(default_factory=list)
    selection: Selection | None = None
    experiment: ExperimentResult | None = None
    verification: Verification | None = None
    proposed_finding: Proposal | None = None
    model_source: Literal["deterministic_rules_not_meta"] = (
        "deterministic_rules_not_meta"
    )


def summarize(rows: list[Measurement]) -> tuple[list[ChannelEvidence], BlindInput]:
    try:
        evidence = analyze(rows)
    except ValueError:
        return [], BlindInput(
            signals=[], quality_issues=["Insufficient valid baseline telemetry"]
        )
    summaries = []
    issues = []
    for e in evidence:
        post = sum(getattr(r, e.channel) is not None for r in rows[60:])
        if e.missing_count / len(rows) > 0.35 or post < 20:
            issues.append(f"{e.channel}: insufficient telemetry coverage")
        summaries.append(
            SignalSummary(
                channel=e.channel,
                flags=len(e.anomaly_minutes),
                max_score=max((s for s in e.scores if s is not None), default=0),
                post_observed=post,
            )
        )
    return evidence, BlindInput(signals=summaries, quality_issues=issues)


class Investigation:
    def __init__(self, identifier: str, oracle: SyntheticOracle):
        self.__oracle = oracle
        evidence, observed = summarize(oracle.rows)
        self.snapshot = Snapshot(
            id=identifier,
            status="OBSERVED",
            dataset_hash=dataset_hash(oracle.rows),
            measurements=oracle.rows,
            evidence=evidence,
            observed=observed,
        )

    def step(
        self, action: str, kind=None, proposal: Proposal | None = None
    ) -> Snapshot:
        s = self.snapshot
        order = {
            "hypotheses": ("OBSERVED", "HYPOTHESES_READY"),
            "select": ("HYPOTHESES_READY", "EXPERIMENT_SELECTED"),
            "execute": ("EXPERIMENT_SELECTED", "EXPERIMENT_COMPLETE"),
            "verify": ("EXPERIMENT_COMPLETE", "VERIFIED"),
        }
        if action not in order:
            raise ValueError("Unknown investigation action")
        before, after = order[action]
        if s.status == after:
            if action == "verify" and proposal != s.proposed_finding:
                raise RuntimeError("A different proposal requires a new investigation")
            if action == "select" and kind is not None and s.selection.kind != kind:
                raise RuntimeError(
                    "Selection already committed; create a new investigation"
                )
            return s
        if s.status != before:
            raise RuntimeError(f"Action requires {before}")
        update = {"status": after}
        if action == "hypotheses":
            update["candidates"] = generate_candidates(s.observed)
        if action == "select":
            update["selection"] = (
                select_experiment(s.observed)
                if kind is None
                else describe_selection(
                    kind, "Operator-selected allowlisted intervention"
                )
            )
        if action == "execute":
            update["experiment"] = self.__oracle.execute(s.selection)
        if action == "verify":
            update["proposed_finding"] = proposal
            update["verification"] = verify(s.measurements, s.experiment, proposal)
        self.snapshot = s.model_copy(update=update)
        return self.snapshot

    def run(self) -> Snapshot:
        for action in ("hypotheses", "select", "execute", "verify"):
            self.step(action)
        return self.snapshot
