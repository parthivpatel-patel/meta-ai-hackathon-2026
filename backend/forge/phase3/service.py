"""Stepwise sequential orchestration; private recipe is never a generator input."""

from typing import Literal
from uuid import uuid4

from pydantic import AwareDatetime, Field

from ..engine.contracts import (
    CHANNELS,
    TARGETS,
    BlindInput,
    ExperimentKind,
    HypothesisID,
    Record,
    dataset_hash,
    digest,
)
from ..engine.hypotheses import generate_candidates
from ..phase2.contracts import Trial
from ..phase2.evidence import EvidenceBundle, summarize_assets
from ..phase2.inference import (
    HypothesisProvider,
    ModelHypothesis,
    ModelOutput,
    ModelRecord,
)
from ..phase2.verification import observe
from ..providers import ProviderError
from ..simulation import Measurement
from .oracle import Oracle, Recipe
from .verification import SequentialDecision, verify

VERSION = "forge-engine-3.0"
PRESETS = {
    "temperature_response": (
        "Temperature rises under steady load",
        Recipe(faults=["temperature"], shape="ramp", seed=8043),
    ),
    "vibration_response": (
        "Vibration rises during operation",
        Recipe(faults=["vibration"], noise_factor=2, seed=9043),
    ),
    "misleading_sensor": (
        "A sensor can impersonate a process fault",
        Recipe(faults=["pressure"], sensor_biases=["pressure"], seed=3042),
    ),
    "noisy_multifault": (
        "Two faults hidden by noisy telemetry",
        Recipe(faults=["temperature", "vibration"], noise_factor=6, seed=3042),
    ),
    "normal": (
        "A normal reference should not become a failure claim",
        Recipe(faults=[], seed=3042),
    ),
    "insufficient": (
        "Missing evidence should cause abstention",
        Recipe(faults=["temperature"], missing_fraction=0.75, seed=3042),
    ),
    "confounded": (
        "Contradictory controls should stop a diagnosis",
        Recipe(faults=["temperature", "vibration"], confounded=True, seed=3042),
    ),
}


class Metadata(Record):
    equipment_id: str = Field(default="P-104", pattern=r"^[A-Za-z0-9_-]{1,40}$")
    investigation_title: str = Field(
        default="Synthetic pump investigation", min_length=1, max_length=100
    )
    acquired_at: AwareDatetime | None = None
    declared_synthetic: bool = True


class EvidenceReference(Record):
    id: str
    modality: Literal["telemetry", "thermal", "waveform", "metadata"]
    summary: str
    provenance: Literal["synthetic_factory", "operator_declared_unverified"]
    scope: Literal["numerical_test_input", "descriptive_context"] = (
        "descriptive_context"
    )


class Ranking(Record):
    hypothesis_id: HypothesisID
    rank: int
    evidence_status: Literal["SUPPORTED", "CONTRADICTED", "NEEDS_TEST", "UNRESOLVED"]
    reason: str
    evidence_refs: list[str]
    score_kind: Literal["ordinal_not_probability"] = "ordinal_not_probability"


class Plan(Record):
    kind: ExperimentKind
    reason: str
    competing_predictions: list[str]


class Event(Record):
    index: int
    action: str
    evidence_refs: list[str] = Field(default_factory=list)
    detail: str


class Session(Record):
    id: str = Field(pattern=r"^[a-f0-9]{32}$")
    version: int = Field(ge=0)
    engine_version: Literal["forge-engine-3.0"] = VERSION
    status: Literal["OBSERVED", "HYPOTHESES_READY", "EXPERIMENT_SELECTED", "COMPLETE"]
    metadata: Metadata
    measurements: list[Measurement]
    dataset_hash: str
    observed: BlindInput
    assets: EvidenceBundle
    asset_features: dict
    evidence: list[EvidenceReference]
    hypotheses: ModelOutput | None = None
    model_source: Literal[
        "not_run",
        "deterministic_rules_not_meta",
        "meta_http_response",
        "test_transport",
    ] = "not_run"
    inference: ModelRecord | None = None
    ranking: list[Ranking] = Field(default_factory=list)
    plan: Plan | None = None
    trials: list[Trial] = Field(default_factory=list, max_length=4)
    decision: SequentialDecision
    max_experiments: int = Field(default=4, ge=1, le=4)
    events: list[Event]
    verification_scope: str = "Telemetry plus controlled synthetic interventions. Thermal/waveform evidence is descriptive context, not cross-modal causal proof."
    uncertainty_policy: str = "Fixed familywise interval policy, not a posterior probability; ranking is ordinal. No physical-world cause is established."


def evidence_refs(rows, assets, metadata):
    refs = [
        EvidenceReference(
            id=dataset_hash(rows),
            modality="telemetry",
            summary="120 synthetic minute measurements",
            provenance="synthetic_factory",
            scope="numerical_test_input",
        ),
        EvidenceReference(
            id=digest(metadata.model_dump(mode="json")),
            modality="metadata",
            summary="Equipment/time context, not used for hypothesis inference",
            provenance="operator_declared_unverified",
        ),
    ]
    for modality in ("thermal", "waveform"):
        asset = getattr(assets, modality)
        if asset is not None:
            refs.append(
                EvidenceReference(
                    id=digest(asset.model_dump()),
                    modality=modality,
                    summary="Validated numerical "
                    + modality
                    + " context; alignment to telemetry is not independently established",
                    provenance="operator_declared_unverified",
                )
            )
    return refs


def rank(
    output: ModelOutput | None,
    decision: SequentialDecision,
    observed: BlindInput,
    data_hash: str,
) -> list[Ranking]:
    if output is None:
        return []
    entries = []
    flagged = {s.channel for s in observed.signals if s.flags}
    for h in output.hypotheses:
        if h.hypothesis_id == "normal":
            status = (
                "SUPPORTED"
                if decision.status == "SUPPORTED_SYNTHETIC"
                and decision.findings == ["normal"]
                else "CONTRADICTED"
                if flagged or decision.findings
                else "NEEDS_TEST"
            )
            refs = [data_hash]
        else:
            channel = h.hypothesis_id.split("-")[-1]
            state = next((c for c in decision.channels if c.channel == channel), None)
            status = (
                "SUPPORTED"
                if state and h.hypothesis_id in state.findings
                else "CONTRADICTED"
                if state
                and state.status in ("SUPPORTED", "BASELINE_CONSISTENT", "CONTRADICTED")
                else "UNRESOLVED"
                if state and state.status == "UNRESOLVED"
                else "NEEDS_TEST"
            )
            refs = state.evidence_refs if state else [data_hash]
        entries.append(
            (
                {"SUPPORTED": 3, "NEEDS_TEST": 2, "UNRESOLVED": 1, "CONTRADICTED": 0}[
                    status
                ],
                h.hypothesis_id,
                status,
                refs,
            )
        )
    entries.sort(key=lambda r: (-r[0], r[1]))
    return [
        Ranking(
            hypothesis_id=identity,
            rank=i + 1,
            evidence_status=status,
            reason="Deterministic evidence fit; model rationale and asserted certainty cannot override numerical support",
            evidence_refs=refs,
        )
        for i, (_, identity, status, refs) in enumerate(entries)
    ]


def select(
    observed: BlindInput,
    decision: SequentialDecision,
    trials: list[Trial],
    max_experiments: int,
) -> Plan | None:
    if decision.status not in ("IN_PROGRESS",) or len(trials) >= max_experiments:
        return None
    if not trials:
        return Plan(
            kind=ExperimentKind.REFERENCE,
            reason="Acquire independent reference readings before choosing an intervention",
            competing_predictions=[
                "Process: primary and witness depart together",
                "Sensor bias: primary/witness disagree",
                "Normal: both remain inside the quiet band",
            ],
        )
    needs = {c.channel for c in decision.channels if c.status == "NEEDS_TEST"}
    ranked = sorted(observed.signals, key=lambda s: (-s.flags, -s.max_score, s.channel))
    channels = [s.channel for s in ranked if s.channel in needs] + [
        c for c in CHANNELS if c in needs and c not in {s.channel for s in ranked}
    ]
    for channel in channels:
        kind = next(k for k, v in TARGETS.items() if v == channel)
        if kind not in {t.kind for t in trials}:
            return Plan(
                kind=kind,
                reason="Resolve the strongest remaining untested channel after evaluating prior evidence",
                competing_predictions=[
                    "Process departure should respond to this targeted intervention",
                    "Persistent primary/witness separation supports a sensor-offset candidate",
                    "Non-target response or unstable controls contradict the current mechanism",
                ],
            )
    return None


def create(
    recipe: Recipe, assets: EvidenceBundle, metadata: Metadata, max_experiments=4
) -> Session:
    oracle = Oracle(recipe)
    observed = observe(oracle.rows)
    decision = verify(oracle.rows, [])
    return Session(
        id=uuid4().hex,
        version=0,
        status="COMPLETE" if decision.status == "ABSTAIN" else "OBSERVED",
        metadata=metadata,
        measurements=oracle.rows,
        dataset_hash=oracle.data_hash,
        observed=observed,
        assets=assets,
        asset_features=summarize_assets(assets),
        evidence=evidence_refs(oracle.rows, assets, metadata),
        decision=decision,
        max_experiments=max_experiments,
        events=[
            Event(
                index=0,
                action="observe",
                detail="Created an isolated synthetic case; recipe/answer labels excluded from model inputs",
            )
        ],
    )


async def advance(
    s: Session, recipe: Recipe, provider: HypothesisProvider | None = None
) -> Session:
    if s.status == "COMPLETE":
        raise ValueError("Investigation is already complete")
    update = {}
    detail = ""
    action = ""
    refs = []
    if s.status == "OBSERVED":
        if (
            provider
            and getattr(provider, "thermal_images_enabled", False)
            and s.assets.thermal is not None
        ):
            inference = await provider.infer_thermal(
                s.observed, s.asset_features, s.assets.thermal
            )
        else:
            inference = (
                await provider.infer(s.observed, s.asset_features) if provider else None
            )
        if inference:
            if len(inference.output.hypotheses) < 2:
                raise ProviderError(
                    "Sequential investigation requires at least two competing structured hypotheses; no fallback was used"
                )
            output = inference.output
            source = inference.source
        else:
            candidates = generate_candidates(s.observed)
            output = ModelOutput(
                hypotheses=[
                    ModelHypothesis(
                        hypothesis_id=c.id,
                        rationale=c.hypothesis,
                        evidence_channels=[]
                        if c.id == "normal"
                        else [c.id.split("-")[-1]],
                    )
                    for c in candidates
                ]
            )
            source = "deterministic_rules_not_meta"
        update.update(
            hypotheses=output,
            model_source=source,
            inference=inference,
            status="HYPOTHESES_READY",
            ranking=rank(output, s.decision, s.observed, s.dataset_hash),
        )
        action = "hypothesize"
        detail = (
            "Candidate suggestions from "
            + source
            + "; all remain subject to independent verification"
        )
    elif s.status == "HYPOTHESES_READY":
        plan = select(s.observed, s.decision, s.trials, s.max_experiments)
        if plan is None:
            raise ValueError("No eligible bounded experiment remains")
        update.update(plan=plan, status="EXPERIMENT_SELECTED")
        action = "select"
        detail = plan.kind.value + ": " + plan.reason
    else:
        if s.plan is None:
            raise ValueError("A selected experiment is required")
        oracle = Oracle(recipe)
        if oracle.data_hash != s.dataset_hash:
            raise ValueError("Private recipe no longer reproduces the dataset")
        trial = oracle.execute(s.plan.kind)
        trials = [*s.trials, trial]
        decision = verify(s.measurements, trials, len(trials) >= s.max_experiments)
        plan = select(s.observed, decision, trials, s.max_experiments)
        done = decision.status != "IN_PROGRESS" or plan is None
        if done and decision.status == "IN_PROGRESS":
            decision = decision.model_copy(
                update={
                    "status": "INCONCLUSIVE",
                    "reasons": [
                        "No eligible experiment remains within the declared budget"
                    ],
                }
            )
        update.update(
            trials=trials,
            decision=decision,
            plan=None,
            status="COMPLETE" if done else "HYPOTHESES_READY",
            ranking=rank(s.hypotheses, decision, s.observed, s.dataset_hash),
        )
        action = "execute_and_verify"
        detail = s.plan.kind.value + " → " + decision.status
        refs = [trial.id]
    return s.model_copy(
        update={
            **update,
            "version": s.version + 1,
            "events": [
                *s.events,
                Event(
                    index=len(s.events),
                    action=action,
                    detail=detail,
                    evidence_refs=refs,
                ),
            ],
        }
    )


async def run(
    recipe: Recipe,
    assets: EvidenceBundle | None = None,
    metadata: Metadata | None = None,
    max_experiments=4,
    provider=None,
) -> Session:
    s = create(
        recipe, assets or EvidenceBundle(), metadata or Metadata(), max_experiments
    )
    for _ in range(9):
        if s.status == "COMPLETE":
            return s
        s = await advance(s, recipe, provider)
    if s.status != "COMPLETE":
        raise RuntimeError("Sequential action budget exceeded")
    return s
