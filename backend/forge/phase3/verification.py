"""Independent sequential verifier: only observed data and public trial records."""

from typing import Literal

from ..engine.contracts import (
    CHANNELS,
    TARGETS,
    Channel,
    HypothesisID,
    Record,
    dataset_hash,
    digest,
)
from ..phase2.contracts import Trial
from ..phase2.verification import ci, departed, observe, quiet
from ..simulation import Measurement


class ChannelState(Record):
    channel: Channel
    status: Literal[
        "BASELINE_CONSISTENT", "SUPPORTED", "NEEDS_TEST", "UNRESOLVED", "CONTRADICTED"
    ]
    findings: list[HypothesisID]
    reasons: list[str]
    evidence_refs: list[str]


class SequentialDecision(Record):
    status: Literal[
        "IN_PROGRESS", "SUPPORTED_SYNTHETIC", "INCONCLUSIVE", "ABSTAIN", "REJECTED"
    ]
    findings: list[HypothesisID]
    channels: list[ChannelState]
    reasons: list[str]
    uncertainty: str = "Fixed 99% familywise Bonferroni t-interval policy over at most 63 planned comparisons; deterministic decisions under synthetic replicate assumptions, not calibrated causal probabilities."


def verify(
    rows: list[Measurement], trials: list[Trial], budget_exhausted: bool = False
) -> SequentialDecision:
    observed = observe(rows)

    def finish(status, reasons, channels=None, findings=None):
        return SequentialDecision(
            status=status,
            reasons=reasons,
            channels=channels or [],
            findings=findings or [],
        )

    if observed.quality_issues:
        return finish("ABSTAIN", observed.quality_issues)
    if not trials:
        return finish("IN_PROGRESS", ["Independent reference acquisition is required"])
    if (
        len(trials) > 4
        or len({t.kind for t in trials}) != len(trials)
        or trials[0].kind.value != "reference_check"
    ):
        return finish("REJECTED", ["Duplicate, excessive, or unreferenced experiments"])
    for trial in trials:
        raw = {
            "dataset_hash": trial.dataset_hash,
            "kind": trial.kind,
            "probes": [p.model_dump() for p in trial.probes],
        }
        if (
            trial.dataset_hash != dataset_hash(rows)
            or trial.id != "EXP2-" + digest(raw)
            or sorted(p.channel for p in trial.probes) != sorted(CHANNELS)
        ):
            return finish(
                "REJECTED",
                ["Trial identity, channel coverage, or dataset binding mismatch"],
            )
    flagged = {s.channel for s in observed.signals if s.flags}
    channels = []
    findings = []
    for channel in CHANNELS:
        reference = next(p for p in trials[0].probes if p.channel == channel)
        witness = ci(reference.witness_before)
        primary = ci(reference.primary_before)
        targeted = next((t for t in trials if TARGETS.get(t.kind) == channel), None)
        refs = [trials[0].id + "#" + channel]
        if targeted is None:
            inconsistent = False
            for trial in trials:
                other = next(p for p in trial.probes if p.channel == channel)
                if abs(
                    ci(other.witness_before).estimate - witness.estimate
                ) > 3 or not quiet(
                    ci(
                        [
                            a - b
                            for a, b in zip(other.witness_before, other.witness_after)
                        ]
                    )
                ):
                    inconsistent = True
                    refs.append(trial.id + "#" + channel)
            baseline = channel not in flagged and quiet(witness) and quiet(primary)
            state = (
                "CONTRADICTED"
                if inconsistent
                else "BASELINE_CONSISTENT"
                if baseline
                else "NEEDS_TEST"
            )
            channels.append(
                ChannelState(
                    channel=channel,
                    status=state,
                    findings=[],
                    reasons=[
                        "Non-target control contradicts the reference"
                        if inconsistent
                        else "Independent reference is quiet"
                        if baseline
                        else "An intervention is needed to distinguish process response and sensor offset"
                    ],
                    evidence_refs=refs,
                )
            )
            continue
        probe = next(p for p in targeted.probes if p.channel == channel)
        before = ci(probe.witness_before)
        after = ci(probe.witness_after)
        direction = 1 if before.estimate >= 0 else -1
        reduction = ci(
            [
                direction * (a - b)
                for a, b in zip(probe.witness_before, probe.witness_after)
            ]
        )
        bias_before = ci(
            [a - b for a, b in zip(probe.primary_before, probe.witness_before)]
        )
        bias_after = ci(
            [a - b for a, b in zip(probe.primary_after, probe.witness_after)]
        )
        bias = (
            departed(bias_before)
            and departed(bias_after)
            and bias_before.estimate * bias_after.estimate > 0
        )
        process = (
            channel in flagged
            and departed(before)
            and quiet(after)
            and reduction.low > 3
            and ((quiet(bias_before) and quiet(bias_after)) or bias)
        )
        sensor = channel in flagged and bias
        inconsistent = False
        for trial in trials:
            other = next(p for p in trial.probes if p.channel == channel)
            if abs(ci(other.witness_before).estimate - witness.estimate) > 3:
                inconsistent = True
            if TARGETS.get(trial.kind) != channel and not quiet(
                ci([a - b for a, b in zip(other.witness_before, other.witness_after)])
            ):
                inconsistent = True
        local = []
        if process:
            local.append("process-" + channel)
        if sensor:
            local.append("sensor-" + channel)
        baseline = (
            channel not in flagged and quiet(primary) and quiet(before) and quiet(after)
        )
        status = (
            "CONTRADICTED"
            if inconsistent
            else "SUPPORTED"
            if local
            else "BASELINE_CONSISTENT"
            if baseline
            else "UNRESOLVED"
        )
        if not inconsistent:
            findings += local
        refs.append(targeted.id + "#" + channel)
        channels.append(
            ChannelState(
                channel=channel,
                status=status,
                findings=[] if inconsistent else local,
                reasons=[
                    "Cross-experiment controls conflict"
                    if inconsistent
                    else "Prespecified witness response, persistent sensor offset, telemetry coverage and independent control policy"
                ],
                evidence_refs=refs,
            )
        )
    if any(c.status == "NEEDS_TEST" for c in channels):
        return finish(
            "INCONCLUSIVE" if budget_exhausted else "IN_PROGRESS",
            ["Untested competing mechanisms remain"],
            channels,
            findings,
        )
    if any(c.status in ("UNRESOLVED", "CONTRADICTED") for c in channels):
        return finish(
            "INCONCLUSIVE",
            ["Ambiguity or contradictory evidence prevents a complete finding"],
            channels,
            findings,
        )
    return finish(
        "SUPPORTED_SYNTHETIC",
        [
            "All observed departures are explained within the scripted synthetic model; physical-world causality is not established"
        ],
        channels,
        findings or ["normal"],
    )
