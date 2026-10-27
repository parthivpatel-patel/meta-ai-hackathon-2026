"""Offline read-only telemetry boundary. No hardware adapters or control methods."""

import csv
import io
import json
from collections.abc import AsyncIterator
from typing import Literal, Protocol

from pydantic import AwareDatetime, Field, model_validator

from ..engine.contracts import Record
from .model import SENSORS


class Sample(Record):
    timestamp: AwareDatetime
    sensor_id: str = Field(max_length=40)
    component_id: str = Field(max_length=40)
    value: float | None = Field(ge=-1e6, le=1e6, strict=True)
    unit: str = Field(max_length=16)

    @model_validator(mode="after")
    def mapping(self):
        s = SENSORS.get(self.sensor_id)
        if s is None or self.component_id != s[0] or self.unit != s[1]:
            raise ValueError("Unsupported sensor, component or unit")
        if (
            not 1970 <= self.timestamp.year <= 2100
            or abs(self.timestamp.utcoffset().total_seconds()) > 50400
        ):
            raise ValueError("Unsupported timestamp year")
        return self


class Telemetry(Record):
    schema_version: Literal["forge-telemetry-1"] = Field(alias="schema")
    machine_id: Literal["pump-104"]
    declared_source: Literal["synthetic", "operator_recorded_unverified"] = (
        "operator_recorded_unverified"
    )
    samples: list[Sample] = Field(min_length=1, max_length=5400)

    @model_validator(mode="after")
    def ordering(self):
        pairs = [(r.timestamp, r.sensor_id) for r in self.samples]
        if len(set(pairs)) != len(pairs) or any(
            a.timestamp > b.timestamp
            or (b.timestamp - a.timestamp).total_seconds() > 86400
            for a, b in zip(self.samples, self.samples[1:])
        ):
            raise ValueError("Duplicate or out-of-order sample")
        if len({r.timestamp for r in self.samples}) > 600:
            raise ValueError("Too many timestamps")
        return self


class ReadOnlyAdapter(Protocol):
    def samples(self) -> AsyncIterator[Sample]: ...


def load(data: bytes, format: Literal["json", "csv"] = "json") -> Telemetry:
    if len(data) > 1048576:
        raise ValueError("Import exceeds 1 MiB")
    if format == "json":
        return Telemetry.model_validate(json.loads(data))
    reader = csv.DictReader(io.StringIO(data.decode("utf-8")))
    if reader.fieldnames != ["timestamp", "sensor_id", "component_id", "value", "unit"]:
        raise ValueError("CSV header mismatch")
    rows = []
    for i, row in enumerate(reader):
        if i >= 5400:
            raise ValueError("Too many samples")
        row["value"] = None if row["value"] == "" else float(row["value"])
        rows.append(row)
    return Telemetry.model_validate(
        {"schema": "forge-telemetry-1", "machine_id": "pump-104", "samples": rows}
    )
