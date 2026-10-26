"""Blind candidate generation: accepts summaries only, never a simulation oracle."""

from .contracts import BlindInput, Candidate, ExperimentKind, Selection

DESCRIPTIONS = {
    "temperature": ("Reduced heat removal", "restore_cooling"),
    "vibration": ("Rotating-system imbalance", "balance_rotor"),
    "pressure": ("Reduced feed pressure", "restore_feed"),
}


def generate_candidates(observed: BlindInput) -> list[Candidate]:
    candidates = [
        Candidate(
            id="normal",
            title="No sustained process departure",
            hypothesis="Signals reflect baseline variability.",
            prediction="Primary and independent witness residual intervals remain within ±2 normalized units in every channel.",
            basis="Normal operation remains a competing explanation; absence of flags alone is insufficient.",
        )
    ]
    for channel, (title, intervention) in DESCRIPTIONS.items():
        summary = next((s for s in observed.signals if s.channel == channel), None)
        basis = (
            f"{summary.flags} flagged samples on {channel}."
            if summary
            else "Insufficient validated telemetry."
        )
        candidates.extend(
            [
                Candidate(
                    id=f"process-{channel}",
                    title=title,
                    hypothesis=f"A synthetic process departure affects {channel}.",
                    prediction=f"Independent witness confirms the departure, and {intervention} reduces it by more than 3 normalized units.",
                    basis=basis,
                ),
                Candidate(
                    id=f"sensor-{channel}",
                    title=f"{channel.title()} measurement bias",
                    hypothesis=f"A primary {channel} sensor offset explains the observed departure.",
                    prediction="Primary residual exceeds ±4 while the independent witness stays within ±2, including after intervention.",
                    basis=basis,
                ),
            ]
        )
    return candidates


def select_experiment(observed: BlindInput) -> Selection:
    strongest = max(
        observed.signals, key=lambda s: (s.flags, s.max_score), default=None
    )
    kind = ExperimentKind.REFERENCE
    if strongest and strongest.flags >= 5:
        kind = ExperimentKind(DESCRIPTIONS[strongest.channel][1])
    return describe_selection(
        kind,
        "Choose the most sustained anomalous channel to distinguish process response from measurement bias; otherwise compare all sensors to baseline.",
    )


def describe_selection(kind: ExperimentKind, rationale: str) -> Selection:
    interventions = {
        ExperimentKind.REFERENCE: "Hold the synthetic plant at its current state and acquire independent reference observations.",
        ExperimentKind.COOLING: "Restore the simulated cooling conductance; allow 24 bounded relaxation steps.",
        ExperimentKind.BALANCE: "Apply simulated rotor balance correction; allow 24 bounded relaxation steps.",
        ExperimentKind.FEED: "Restore simulated feed regulation; allow 24 bounded relaxation steps.",
    }
    return Selection(kind=kind, rationale=rationale, intervention=interventions[kind])
