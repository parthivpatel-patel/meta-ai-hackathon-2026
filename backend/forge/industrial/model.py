"""Coupled pedagogical pump model. Never a hardware driver or calibrated twin."""

import math
from datetime import UTC, datetime, timedelta
from typing import Literal

import numpy as np
from pydantic import Field, model_validator

from ..engine.contracts import Record

VERSION = "coupled-pump-1"
SCENARIOS = {
    "normal": "Normal operation",
    "bearing": "Bearing degradation",
    "misalignment": "Shaft misalignment",
    "cavitation": "Cavitation-like conditions",
    "pressure_sensor": "Pressure sensor offset",
    "thermal": "Cooling degradation",
    "process": "Process pressure disturbance",
}
SENSORS = {
    "rpm": ("motor", "rpm", 0, 3600),
    "motor_temperature": ("motor", "°C", -20, 150),
    "bearing_temperature": ("bearing", "°C", -20, 150),
    "vibration": ("bearing", "mm/s", 0, 30),
    "suction_pressure": ("suction", "bar", -1, 20),
    "discharge_pressure": ("pressure_sensor", "bar", -1, 20),
    "differential_pressure": ("pump", "bar", -20, 20),
    "flow": ("impeller", "m³/h", 0, 150),
    "load": ("motor", "%", 0, 150),
}
# geometry: primitive, center x/y/z, dimensions. Cylinder axis is X; torus normal is X.
PARTS = [
    ("base", "Support base", "structure", [], "box", [0, -0.9, 0], [6, 0.25, 2]),
    (
        "motor",
        "Motor housing",
        "motor",
        ["rpm", "motor_temperature", "load"],
        "cylinder",
        [-1.7, 0, 0],
        [0.55, 1.7, 0.55],
    ),
    (
        "cooling",
        "Cooling fins",
        "motor",
        ["motor_temperature"],
        "box",
        [-1.7, 0.52, 0],
        [1.4, 0.13, 0.8],
    ),
    (
        "fan",
        "Motor cooling fan",
        "motor",
        ["motor_temperature"],
        "cylinder",
        [-2.65, 0, 0],
        [0.5, 0.18, 0.5],
    ),
    (
        "motor_mount",
        "Motor feet",
        "structure",
        [],
        "box",
        [-1.7, -0.65, 0],
        [1.3, 0.3, 1.2],
    ),
    (
        "motor_shaft",
        "Motor shaft",
        "shaft",
        ["rpm", "vibration"],
        "cylinder",
        [-0.65, 0, 0],
        [0.1, 0.5, 0.1],
    ),
    (
        "coupling",
        "Drive coupling",
        "coupling",
        ["rpm", "vibration"],
        "cylinder",
        [-0.25, 0, 0],
        [0.23, 0.35, 0.23],
    ),
    (
        "pump_shaft",
        "Pump shaft",
        "shaft",
        ["rpm", "vibration"],
        "cylinder",
        [0.55, 0, 0],
        [0.1, 1.2, 0.1],
    ),
    (
        "bearing",
        "Bearing housing",
        "bearing",
        ["bearing_temperature", "vibration"],
        "box",
        [0.65, 0, 0],
        [0.4, 0.6, 0.65],
    ),
    (
        "bearing_ring",
        "Bearing ring",
        "bearing",
        ["bearing_temperature", "vibration"],
        "torus",
        [0.65, 0, 0],
        [0.24, 0.07, 0],
    ),
    (
        "pump",
        "Pump casing",
        "pump",
        ["discharge_pressure", "differential_pressure"],
        "cylinder",
        [1.45, 0, 0],
        [0.8, 0.65, 0.8],
    ),
    (
        "impeller",
        "Impeller",
        "pump",
        ["flow", "rpm"],
        "torus",
        [1.82, 0, 0],
        [0.55, 0.09, 0],
    ),
    (
        "suction",
        "Suction flange",
        "pipe",
        ["suction_pressure", "flow"],
        "cylinder",
        [2.05, 0, 0],
        [0.34, 0.45, 0.34],
    ),
    (
        "discharge",
        "Discharge flange",
        "pipe",
        ["discharge_pressure", "flow"],
        "box",
        [1.45, 0.95, 0],
        [0.4, 0.6, 0.4],
    ),
    (
        "pressure_sensor",
        "Pressure instrument",
        "instrument",
        ["discharge_pressure"],
        "cylinder",
        [1.45, 1.35, 0],
        [0.16, 0.14, 0.16],
    ),
    (
        "temperature_sensor",
        "Temperature instrument",
        "instrument",
        ["motor_temperature"],
        "box",
        [-1.7, 0.75, 0],
        [0.12, 0.25, 0.12],
    ),
    (
        "vibration_sensor",
        "Vibration instrument",
        "instrument",
        ["vibration"],
        "box",
        [0.65, 0.42, 0],
        [0.18, 0.18, 0.18],
    ),
    (
        "pump_mount",
        "Pump support",
        "structure",
        [],
        "box",
        [1.3, -0.65, 0],
        [1.1, 0.3, 1],
    ),
]
COMPONENTS = {
    p[0]: {
        "id": p[0],
        "name": p[1],
        "category": p[2],
        "parent": "pump-104",
        "sensors": p[3],
        "geometry": {"kind": p[4], "position": p[5], "size": p[6]},
        "provenance": "procedural engineering approximation; not CAD",
        "supported_investigation": "channel-level synthetic verification",
    }
    for p in PARTS
}


class Action(Record):
    sequence: int = Field(ge=1, le=599)
    kind: Literal[
        "restore_cooling", "balance_rotor", "restore_feed", "stop", "reset_fault"
    ]


class Recipe(Record):
    version: Literal["coupled-pump-1"] = VERSION
    scenario: Literal[
        "normal",
        "bearing",
        "misalignment",
        "cavitation",
        "pressure_sensor",
        "thermal",
        "process",
    ] = "normal"
    seed: int = Field(default=2026, ge=0, le=2**32 - 1)
    steps: int = Field(default=360, ge=320, le=600)
    onset: int = Field(default=280, ge=240, le=280)
    sample_period_seconds: Literal[1, 2, 5] = 1
    actions: list[Action] = Field(default_factory=list, max_length=16)

    @model_validator(mode="after")
    def legal_actions(self):
        if len({a.sequence for a in self.actions}) != len(
            self.actions
        ) or self.actions != sorted(self.actions, key=lambda a: a.sequence):
            raise ValueError("Actions must have unique ascending sequence numbers")
        stopped = False
        for action in self.actions:
            if action.sequence >= self.steps or stopped:
                raise ValueError("Action outside run or after stop")
            if action.kind == "stop":
                stopped = True
            elif action.sequence < self.onset:
                raise ValueError(
                    "Fault interventions require an active scenario window"
                )
        return self


def simulate(recipe: Recipe, include_truth=False):
    rng = np.random.default_rng(recipe.seed)
    rpm = 0.0
    motor = 65.0
    bearing = 55.0
    stopped = False
    repaired = set()
    frames = []
    events = []
    epoch = datetime(2026, 10, 27, 8, tzinfo=UTC)
    actions = {a.sequence: a.kind for a in recipe.actions}
    for seq in range(recipe.steps):
        if seq in actions:
            kind = actions[seq]
            repaired.add(kind)
            if kind == "stop":
                stopped = True
            events.append(
                {
                    "id": f"action-{seq}",
                    "sequence": seq,
                    "kind": kind,
                    "component": "motor" if stopped else "pump",
                }
            )
        active = seq >= recipe.onset and "reset_fault" not in repaired
        fault = recipe.scenario if active else "normal"
        degradation = float(fault == "bearing" and "balance_rotor" not in repaired)
        alignment = float(fault == "misalignment" and "balance_rotor" not in repaired)
        cav = float(fault == "cavitation" and "restore_feed" not in repaired)
        disturbance = float(fault == "process" and "restore_feed" not in repaired)
        thermal = float(fault == "thermal" and "restore_cooling" not in repaired)
        target = 0 if stopped else 3000 * (1 - 0.025 * alignment)
        rpm += (target - rpm) * (1 - 0.8**recipe.sample_period_seconds)
        if abs(target - rpm) < 0.01:
            rpm = float(target)
        ratio = rpm / 3000
        load = 100 * ratio * (1 + 0.08 * alignment)
        flow = 60 * ratio * (1 - 0.2 * cav - 0.25 * disturbance)
        suction = 1.2 - 0.2 * (flow / 60) ** 2 - 0.6 * cav * ratio
        differential = (5 / 0.88) * ratio**2 * (
            1 - 0.12 * (flow / 60) ** 2
        ) - 1.3 * disturbance * ratio**2
        motor += (25 + 40 * ratio * (load / 100) + 12 * thermal * ratio - motor) * (
            1 - 0.96**recipe.sample_period_seconds
        )
        bearing += (
            30 + 25 * ratio + 18 * degradation * ratio + 6 * alignment * ratio - bearing
        ) * (1 - 0.96**recipe.sample_period_seconds)
        vibration = max(
            0,
            ratio
            * (
                2
                + 1.0 * degradation
                + 0.9 * alignment
                + 0.8 * cav * (1 + 0.2 * math.sin(seq * 0.6))
            ),
        )
        truth = {
            "rpm": rpm,
            "motor_temperature": motor,
            "bearing_temperature": bearing,
            "vibration": vibration,
            "suction_pressure": suction,
            "discharge_pressure": suction + differential,
            "differential_pressure": differential,
            "flow": flow,
            "load": load if rpm else 0,
        }
        scales = {
            "rpm": 2,
            "motor_temperature": 0.15,
            "bearing_temperature": 0.15,
            "vibration": 0.025,
            "suction_pressure": 0.01,
            "discharge_pressure": 0.025,
            "differential_pressure": 0,
            "flow": 0.1,
            "load": 0.1,
        }
        values = {
            k: round(
                v
                + float(
                    np.clip(rng.normal(0, scales[k]), -3 * scales[k], 3 * scales[k])
                ),
                6,
            )
            for k, v in truth.items()
        }
        if active and recipe.scenario == "pressure_sensor":
            values["discharge_pressure"] += 1.2
        # Derived pressure uses the observed instruments; truth remains separate.
        values["differential_pressure"] = round(
            values["discharge_pressure"] - values["suction_pressure"], 6
        )
        values["rpm"] = max(0, values["rpm"])
        values["flow"] = max(0, values["flow"])
        values["vibration"] = max(0, values["vibration"])
        values["load"] = max(0, values["load"])
        state = (
            "STOPPED"
            if stopped and rpm < 1
            else "STOPPING"
            if stopped
            else "STARTING"
            if seq < 30
            else "SIMULATED_FAULT"
            if bool(
                degradation
                or alignment
                or cav
                or disturbance
                or thermal
                or fault == "pressure_sensor"
            )
            else "RUNNING"
        )
        readings = [
            {
                "sensor_id": k,
                "value": v,
                "quality": "VALID"
                if SENSORS[k][2] <= v <= SENSORS[k][3]
                else "OUT_OF_RANGE",
            }
            for k, v in values.items()
        ]
        frame = {
            "sequence": seq,
            "timestamp": (
                epoch + timedelta(seconds=seq * recipe.sample_period_seconds)
            ).isoformat(),
            "state": state,
            "source": "SIMULATED",
            "readings": readings,
        }
        if include_truth:
            frame["truth"] = truth
        frames.append(frame)
        if seq in (0, 30, recipe.onset):
            events.append(
                {
                    "id": f"state-{seq}",
                    "sequence": seq,
                    "kind": state,
                    "component": "motor"
                    if seq < recipe.onset
                    else {
                        "bearing": "bearing",
                        "misalignment": "coupling",
                        "cavitation": "impeller",
                        "pressure_sensor": "pressure_sensor",
                        "thermal": "cooling",
                        "process": "pump",
                    }.get(recipe.scenario, "pump"),
                }
            )
    return {
        "version": VERSION,
        "machine_id": "pump-104",
        "recipe": recipe.model_dump(mode="json"),
        "sensors": [
            {"id": k, "component_id": v[0], "unit": v[1], "range": [v[2], v[3]]}
            for k, v in SENSORS.items()
        ],
        "components": list(COMPONENTS.values()),
        "frames": frames,
        "events": events,
        "connected_mode": "UNAVAILABLE",
        "provider_state": "UNAVAILABLE",
        "limitations": "Simplified coupled simulation, not a calibrated digital twin. No physical actuation or genuine model inference.",
    }
