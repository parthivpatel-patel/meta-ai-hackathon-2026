"""Seeded synthetic pump: shifts are injected signals, not diagnosed failures."""

from typing import Literal

import numpy as np
from pydantic import BaseModel, ConfigDict, Field

Scenario = Literal["normal", "cooling_loss", "imbalance", "pressure_loss"]


class Measurement(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    minute: int = Field(ge=0, le=10**9)
    state: Literal["running"] = "running"
    temperature: float | None = Field(ge=-1e6, le=1e6)
    vibration: float | None = Field(ge=-1e6, le=1e6)
    pressure: float | None = Field(ge=-1e6, le=1e6)


SHIFTS = {
    "normal": (0, 0, 0),
    "cooling_loss": (14, 0, 0),
    "imbalance": (0, 2, 0),
    "pressure_loss": (0, 0, -2),
}


def simulate(scenario: Scenario, seed: int = 42) -> list[Measurement]:
    rng = np.random.default_rng(seed)
    values = rng.normal([65, 2, 6], [0.8, 0.08, 0.12], (120, 3))
    values[80:] += SHIFTS[scenario]
    return [
        Measurement(
            minute=i,
            temperature=round(float(v[0]), 4),
            vibration=round(float(v[1]), 4),
            pressure=round(float(v[2]), 4),
        )
        for i, v in enumerate(values)
    ]
