"""Independent v2 numerical verifier: no oracle recipes or model-client imports."""

from typing import Literal

import numpy as np
from scipy.stats import t

from ..engine.contracts import (
    CHANNELS,
    TARGETS,
    BlindInput,
    Channel,
    HypothesisID,
    Interval,
    Record,
    SignalSummary,
    dataset_hash,
    digest,
)
from ..simulation import Measurement
from .contracts import Trial


class ChannelFinding(Record):
    channel: Channel
    process_supported: bool
    sensor_supported: bool
    witness_before: Interval
    witness_after: Interval
    reduction: Interval
    bias_before: Interval
    bias_after: Interval
    reason: str


class Decision(Record):
    status: Literal["SUPPORTED_SYNTHETIC", "INCONCLUSIVE", "ABSTAIN", "REJECTED"]
    findings: list[HypothesisID]
    channels: list[ChannelFinding]
    reasons: list[str]
    uncertainty: str = "99% familywise Bonferroni t-interval policy over at most 63 comparisons, under independent Gaussian synthetic replicate assumptions; not a cause probability or physical proof."


# 4 trials * 3 channels * 5 intervals + 3 observational comparisons.
COMPARISONS = 63


def ci(values: list[float]) -> Interval:
    a = np.asarray(values, float)
    if len(a) < 20 or not np.isfinite(a).all():
        raise ValueError("Insufficient finite observations")
    mean = float(a.mean())
    margin = float(
        t.ppf(1 - 0.01 / (2 * COMPARISONS), len(a) - 1)
        * a.std(ddof=1)
        / np.sqrt(len(a))
    )
    return Interval(estimate=mean, low=mean - margin, high=mean + margin)


def quiet(i: Interval) -> bool:
    return i.low >= -3 and i.high <= 3


def departed(i: Interval, bound=4) -> bool:
    return i.low > bound or i.high < -bound


def observe(rows: list[Measurement]) -> BlindInput:
    if len(rows) != 120 or [r.minute for r in rows] != list(range(120)):
        raise ValueError("V2 requires exactly 120 ordered minute samples")
    summaries = []
    issues = []
    for channel in CHANNELS:
        raw = [getattr(r, channel) for r in rows]
        base = np.array([x for x in raw[:60] if x is not None], float)
        post = np.array([x for x in raw[80:] if x is not None], float)
        if len(base) < 20 or len(post) < 20 or sum(x is None for x in raw) / 120 > 0.35:
            issues.append(channel + ": insufficient coverage")
            continue
        delta = float(post.mean() - base.mean())
        variance = base.var(ddof=1) / len(base) + post.var(ddof=1) / len(post)
        denominator = (base.var(ddof=1) / len(base)) ** 2 / (len(base) - 1) + (
            post.var(ddof=1) / len(post)
        ) ** 2 / (len(post) - 1)
        df = variance**2 / denominator if denominator else len(base) + len(post) - 2
        margin = float(t.ppf(1 - 0.01 / (2 * COMPARISONS), df) * np.sqrt(variance))
        scale = max(float(np.median(abs(base - np.median(base)))) * 1.4826, 1e-6)
        shifted = abs(delta) > margin and abs(delta) > 0.5 * scale
        summaries.append(
            SignalSummary(
                channel=channel,
                flags=int(shifted) * len(post),
                max_score=abs(delta) / scale,
                post_observed=len(post),
            )
        )
    return BlindInput(signals=summaries, quality_issues=issues)


def verify(rows: list[Measurement], trials: list[Trial]) -> Decision:
    observed = observe(rows)

    def finish(status, reasons, channels=None, findings=None):
        return Decision(
            status=status,
            reasons=reasons,
            channels=channels or [],
            findings=findings or [],
        )

    if observed.quality_issues:
        return finish("ABSTAIN", observed.quality_issues)
    if len(trials) != 4 or {r.kind.value for r in trials} != {
        "reference_check",
        "restore_cooling",
        "balance_rotor",
        "restore_feed",
    }:
        return finish(
            "REJECTED",
            [
                "A reference check and all three distinct bounded interventions are required"
            ],
        )
    data_hash = dataset_hash(rows)
    for trial in trials:
        raw = {
            "dataset_hash": trial.dataset_hash,
            "kind": trial.kind,
            "probes": [p.model_dump() for p in trial.probes],
        }
        if trial.dataset_hash != data_hash or trial.id != "EXP2-" + digest(raw):
            return finish("REJECTED", ["Experimental evidence binding mismatch"])
        if sorted(p.channel for p in trial.probes) != sorted(CHANNELS):
            return finish("REJECTED", ["Duplicate/missing trial channels"])
    flagged = {s.channel for s in observed.signals if s.flags}
    channels = []
    findings = []
    unexplained = []
    for channel in CHANNELS:
        targeted = next(trial for trial in trials if TARGETS.get(trial.kind) == channel)
        probe = next(p for p in targeted.probes if p.channel == channel)
        witness_before = ci(probe.witness_before)
        witness_after = ci(probe.witness_after)
        direction = 1 if witness_before.estimate >= 0 else -1
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
        agreeing = quiet(bias_before) and quiet(bias_after)
        process = (
            channel in flagged
            and departed(witness_before)
            and quiet(witness_after)
            and reduction.low > 3
            and (agreeing or bias)
        )
        sensor = channel in flagged and bias
        if process:
            findings.append("process-" + channel)
        if sensor:
            findings.append("sensor-" + channel)
        # Check reference and non-target interventions for contradictory effects.
        consistent = True
        for trial in trials:
            other = next(p for p in trial.probes if p.channel == channel)
            b = ci(other.witness_before)
            if abs(b.estimate - witness_before.estimate) > 3:
                consistent = False
            if TARGETS.get(trial.kind) != channel and not quiet(
                ci([a - b for a, b in zip(other.witness_before, other.witness_after)])
            ):
                consistent = False
        normal = (
            quiet(ci(probe.primary_before))
            and quiet(witness_before)
            and quiet(witness_after)
        )
        if (
            (channel in flagged and not (process or sensor))
            or (channel not in flagged and not normal)
            or not consistent
        ):
            unexplained.append(channel)
        channels.append(
            ChannelFinding(
                channel=channel,
                process_supported=process,
                sensor_supported=sensor,
                witness_before=witness_before,
                witness_after=witness_after,
                reduction=reduction,
                bias_before=bias_before,
                bias_after=bias_after,
                reason="Require window-level telemetry evidence, intervention specificity, independent witness response and/or persistent primary/witness separation; unexplained observations prevent full support.",
            )
        )
    if unexplained:
        return finish(
            "INCONCLUSIVE",
            ["Unexplained or contradictory evidence on " + ", ".join(unexplained)],
            channels,
            findings,
        )
    return finish(
        "SUPPORTED_SYNTHETIC",
        [
            "All observed channel departures are accounted for within the additive synthetic model; physical causality is not established."
        ],
        channels,
        findings or ["normal"],
    )
