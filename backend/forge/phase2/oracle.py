"""Private new synthetic cases: simultaneous faults, ramps, late onsets and noise."""

from typing import Literal

import numpy as np
from pydantic import Field, model_validator

from ..engine.contracts import (
    CHANNELS,
    TARGETS,
    Channel,
    ExperimentKind,
    Record,
    dataset_hash,
)
from ..simulation import Measurement


class Recipe(Record):
    seed: int = Field(default=2042, ge=0, le=2**32 - 1)
    faults: list[Channel] = Field(default_factory=lambda: ["temperature"], max_length=3)
    sensor_biases: list[Channel] = Field(default_factory=list, max_length=3)
    noise_factor: float = Field(default=1, ge=0.5, le=12)
    missing_fraction: float = Field(default=0, ge=0, le=0.9)
    onset: Literal[70, 80, 90] = 80
    shape: Literal["step", "ramp"] = "step"
    amplitude: float = Field(default=9, ge=4, le=12)
    confounded: bool = False

    @model_validator(mode="after")
    def unique_channels(self):
        if len(set(self.faults)) != len(self.faults) or len(
            set(self.sensor_biases)
        ) != len(self.sensor_biases):
            raise ValueError("Fault/bias lists must contain unique channels")
        return self


from .contracts import Samples, Trial, seal_trial


class Oracle:
    def __init__(self, recipe: Recipe):
        self.__recipe = recipe
        rng = np.random.default_rng(np.random.SeedSequence([recipe.seed, 2301]))
        rows = []
        for minute in range(120):
            values = {}
            for channel, mean, scale in zip(CHANNELS, [65, 2, 6], [0.8, 0.08, 0.12]):
                active = minute >= recipe.onset
                fraction = (
                    min(1, (minute - recipe.onset + 1) / 20)
                    if recipe.shape == "ramp" and active
                    else 1
                )
                sign = -1 if channel == "pressure" else 1
                deviation = (
                    sign * recipe.amplitude * fraction
                    if active and channel in recipe.faults
                    else 0
                )
                deviation += 10 if active and channel in recipe.sensor_biases else 0
                deviation += 7 if active and recipe.confounded else 0
                value = mean + scale * (deviation + rng.normal(0, recipe.noise_factor))
                values[channel] = (
                    None
                    if rng.random() < recipe.missing_fraction
                    else round(float(value), 6)
                )
            rows.append(Measurement(minute=minute, **values))
        self.rows = rows
        self.data_hash = dataset_hash(rows)

    def execute(self, kind: ExperimentKind) -> Trial:
        recipe = self.__recipe
        rng = np.random.default_rng(
            np.random.SeedSequence(
                [recipe.seed, 2901, list(ExperimentKind).index(kind)]
            )
        )
        probes = []
        for channel in CHANNELS:
            sign = -1 if channel == "pressure" else 1
            before = sign * recipe.amplitude if channel in recipe.faults else 0
            if recipe.confounded:
                before += 7
            offset = 10 if channel in recipe.sensor_biases else 0
            target = (
                before * 0.15
                if TARGETS.get(kind) == channel and not recipe.confounded
                else before
            )
            after = before
            for _ in range(24):
                after += 0.25 * (target - after)
            sigma = 0.5 * recipe.noise_factor
            probes.append(
                Samples(
                    channel=channel,
                    primary_before=(
                        before + offset + rng.normal(0, sigma, 96)
                    ).tolist(),
                    primary_after=(after + offset + rng.normal(0, sigma, 96)).tolist(),
                    witness_before=(before + rng.normal(0, sigma, 96)).tolist(),
                    witness_after=(after + rng.normal(0, sigma, 96)).tolist(),
                )
            )
        return seal_trial(self.data_hash, kind, probes)
