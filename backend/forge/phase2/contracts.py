from typing import Literal

from pydantic import Field

from ..engine.contracts import Channel, ExperimentKind, Number, Record, digest


class Samples(Record):
    channel: Channel
    primary_before: list[Number] = Field(min_length=96, max_length=96)
    primary_after: list[Number] = Field(min_length=96, max_length=96)
    witness_before: list[Number] = Field(min_length=96, max_length=96)
    witness_after: list[Number] = Field(min_length=96, max_length=96)


class Trial(Record):
    id: str
    dataset_hash: str
    kind: ExperimentKind
    probes: list[Samples] = Field(min_length=3, max_length=3)
    simulator: Literal["multifault-relaxation-v2"] = "multifault-relaxation-v2"


def seal_trial(data_hash: str, kind: ExperimentKind, probes: list[Samples]) -> Trial:
    raw = {
        "dataset_hash": data_hash,
        "kind": kind,
        "probes": [p.model_dump() for p in probes],
    }
    return Trial(id="EXP2-" + digest(raw), **raw)
