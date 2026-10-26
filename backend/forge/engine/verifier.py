"""Numerical verifier: no hypothesis-generator or private oracle imports.

Recomputes raw paired experimental statistics and observational quality. A digest
checks consistency, not authenticity: this is not an attestation of real sensors.
"""

import numpy as np
from scipy.stats import t

from ..analysis import analyze
from ..simulation import Measurement
from .contracts import (
    CHANNELS,
    TARGETS,
    Assessment,
    ExperimentResult,
    Interval,
    ProbeStatistics,
    Proposal,
    Verification,
    dataset_hash,
    digest,
)

UNCERTAINTY = "99% pointwise Student-t intervals for independent synthetic replicates (not simultaneous coverage); not posterior probabilities of a cause. Thresholds are fixed, not calibrated for real equipment."


def interval(values: list[float]) -> Interval:
    a = np.asarray(values, dtype=float)
    n = len(a)
    if n < 16 or not np.isfinite(a).all():
        raise ValueError("At least 16 finite paired replicates are required")
    mean = float(a.mean())
    margin = float(t.ppf(0.995, n - 1) * a.std(ddof=1) / np.sqrt(n))
    return Interval(estimate=mean, low=mean - margin, high=mean + margin)


def within(i: Interval, bound: float = 2) -> bool:
    return i.low >= -bound and i.high <= bound


def outside(i: Interval, bound: float = 4) -> bool:
    return i.low > bound or i.high < -bound


def verify(
    rows: list[Measurement],
    result: ExperimentResult | None,
    proposal: Proposal | None = None,
) -> Verification:
    def finish(decision, reasons, assessments=None, statistics=None, finding=None):
        return Verification(
            decision=decision,
            finding=finding,
            reasons=reasons,
            assessments=assessments or [],
            statistics=statistics or [],
            uncertainty=UNCERTAINTY,
        )

    if proposal and proposal.scope == "physical_cause":
        return finish(
            "REJECTED",
            ["Synthetic experiments cannot demonstrate physical-world causality."],
        )
    try:
        evidence = analyze(rows)
    except ValueError:
        return finish(
            "ABSTAIN",
            [
                "Insufficient valid baseline telemetry; no causal conclusion is supported."
            ],
        )
    for channel in CHANNELS:
        post = [
            getattr(r, channel) for r in rows[60:] if getattr(r, channel) is not None
        ]
        observed = sum(getattr(r, channel) is not None for r in rows)
        if len(post) < 20 or 1 - observed / len(rows) > 0.35:
            return finish(
                "ABSTAIN",
                [
                    "Missing telemetry exceeds the evidence policy or fewer than 20 post-baseline observations remain."
                ],
            )
    if result is None:
        return finish(
            "INCONCLUSIVE",
            [
                "Observational correlation alone is insufficient; an intervention and independent reference are required."
            ],
        )
    expected = digest(
        {
            "dataset_hash": result.dataset_hash,
            "kind": result.kind,
            "probes": [p.model_dump() for p in result.probes],
        }
    )
    if result.dataset_hash != dataset_hash(rows) or result.id != "EXP-" + expected:
        return finish("REJECTED", ["Evidence digest or dataset binding mismatch."])
    if sorted(p.channel for p in result.probes) != sorted(CHANNELS):
        return finish("REJECTED", ["Duplicate or missing experimental channels."])
    stats = []
    for probe in result.probes:
        lengths = {
            len(probe.primary_before),
            len(probe.primary_after),
            len(probe.witness_before),
            len(probe.witness_after),
        }
        if len(lengths) != 1 or min(lengths) < 16:
            return finish("ABSTAIN", ["Insufficient aligned experimental replicates."])
        direction = 1 if np.mean(probe.witness_before) >= 0 else -1
        reduction = [
            direction * (b - a)
            for b, a in zip(probe.witness_before, probe.witness_after)
        ]
        stats.append(
            ProbeStatistics(
                channel=probe.channel,
                n=len(probe.witness_before),
                primary_before=interval(probe.primary_before),
                primary_after=interval(probe.primary_after),
                witness_before=interval(probe.witness_before),
                witness_after=interval(probe.witness_after),
                witness_reduction=interval(reduction),
            )
        )
    assessments = []
    anomaly_channels = {e.channel for e in evidence if len(e.anomaly_minutes) >= 5}
    all_quiet = all(
        within(s.primary_before)
        and within(s.primary_after)
        and within(s.witness_before)
        and within(s.witness_after)
        for s in stats
    )
    assessments.append(
        Assessment(
            hypothesis_id="normal",
            status="SUPPORTED"
            if all_quiet and not anomaly_channels
            else "CONTRADICTED"
            if anomaly_channels or any(outside(s.witness_before) for s in stats)
            else "INSUFFICIENT",
            evidence_refs=[result.id],
            reason="Check all primary and witness intervals against the ±2 quiet band, plus sustained observational departures.",
        )
    )
    for s in stats:
        ref = f"{result.id}#{s.channel}"
        mismatch = (
            s.primary_before.low - s.witness_before.high > 4
            or s.witness_before.low - s.primary_before.high > 4
        )
        process_support = (
            s.channel in anomaly_channels
            and TARGETS.get(result.kind) == s.channel
            and outside(s.witness_before)
            and s.witness_reduction.low > 3
            and within(s.witness_after)
            and within(s.primary_after)
            and abs(s.primary_before.estimate - s.witness_before.estimate) < 2
        )
        process_contradiction = within(s.witness_before) or (
            TARGETS.get(result.kind) == s.channel and s.witness_reduction.high < 3
        )
        sensor_support = (
            s.channel in anomaly_channels
            and mismatch
            and within(s.witness_before)
            and within(s.witness_after)
            and outside(s.primary_after)
        )
        sensor_contradiction = outside(s.witness_before)
        assessments.extend(
            [
                Assessment(
                    hypothesis_id=f"process-{s.channel}",
                    status="SUPPORTED"
                    if process_support
                    else "CONTRADICTED"
                    if process_contradiction
                    else "INSUFFICIENT",
                    evidence_refs=[ref],
                    reason="Require sustained telemetry departure, matching intervention, witness-confirmed departure, reduction interval above 3, and post-intervention quiet band.",
                ),
                Assessment(
                    hypothesis_id=f"sensor-{s.channel}",
                    status="SUPPORTED"
                    if sensor_support
                    else "CONTRADICTED"
                    if sensor_contradiction
                    else "INSUFFICIENT",
                    evidence_refs=[ref],
                    reason="Require primary/witness interval separation above 4 while independent witness intervals remain inside ±2.",
                ),
            ]
        )
    supported = [a.hypothesis_id for a in assessments if a.status == "SUPPORTED"]
    # Multiple mechanisms or unexplained channels are outside this single-fault model.
    explained = {h.split("-")[-1] for h in supported if h != "normal"}
    if len(supported) != 1 or (
        anomaly_channels - explained and supported != ["normal"]
    ):
        return finish(
            "INCONCLUSIVE",
            [
                "No unique, sufficient explanation: contradictory, ambiguous, or unexplained evidence remains."
            ],
            assessments,
            stats,
        )
    winner = supported[0]
    if proposal and proposal.hypothesis_id != winner:
        return finish(
            "REJECTED",
            ["The proposed conclusion is not the uniquely supported explanation."],
            assessments,
            stats,
        )
    if proposal and proposal.scope == "correlation":
        return finish(
            "INCONCLUSIVE",
            [
                "A correlation-only proposal does not claim an intervention-supported synthetic mechanism."
            ],
            assessments,
            stats,
        )
    return finish(
        "SUPPORTED_SYNTHETIC",
        [
            "One hypothesis meets the prespecified synthetic evidence policy; alternatives are contradicted or insufficient."
        ],
        assessments,
        stats,
        winner,
    )
