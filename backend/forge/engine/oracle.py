"""Private experiment mechanism. The investigator cannot receive this recipe.

Observational telemetry remains the Phase 0 additive generator. Interventions
instead evolve an independent latent residual using a bounded first-order
relaxation recurrence. Both are scripted synthetic models, not a physical twin.
"""

from typing import Literal

import numpy as np
from pydantic import Field

from ..simulation import Scenario, simulate
from .contracts import (
    CHANNELS,
    TARGETS,
    ExperimentKind,
    ExperimentResult,
    Probe,
    Record,
    Selection,
    dataset_hash,
    digest,
)


class CaseRecipe(Record):
    scenario: Scenario = "cooling_loss"
    seed: int = Field(default=42, ge=0, le=2**32 - 1)
    missing_fraction: float = Field(default=0, ge=0, le=0.9)
    noise_factor: float = Field(default=1, ge=0.25, le=12)
    sensor_bias: Literal["none", "temperature", "vibration", "pressure"] = "none"
    confounder: bool = False


class SyntheticOracle:
    def __init__(self, recipe: CaseRecipe):
        self.__recipe = recipe
        rows = simulate(recipe.scenario, recipe.seed)
        unshifted = simulate("normal", recipe.seed)
        rng = np.random.default_rng(np.random.SeedSequence([recipe.seed, 701]))
        scales = [0.8, 0.08, 0.12]
        means = dict(zip(CHANNELS, [65, 2, 6]))
        for i, row in enumerate(rows):
            for channel, scale in zip(CHANNELS, scales):
                value = getattr(row, channel)
                if recipe.noise_factor != 1:
                    value += (recipe.noise_factor - 1) * (
                        getattr(unshifted[i], channel) - means[channel]
                    )
                if i >= 80 and channel == recipe.sensor_bias:
                    value += 10 * scale
                if i >= 80 and recipe.confounder:
                    value += 7 * scale
                setattr(
                    row,
                    channel,
                    None if rng.random() < recipe.missing_fraction else round(value, 4),
                )
        self.rows = rows
        self.data_hash = dataset_hash(rows)

    def execute(self, selection: Selection) -> ExperimentResult:
        recipe = self.__recipe
        # New seed namespace: experiments never reuse observational samples.
        kinds = list(ExperimentKind)
        rng = np.random.default_rng(
            np.random.SeedSequence([recipe.seed, 1901, kinds.index(selection.kind)])
        )
        affected = {
            "normal": None,
            "cooling_loss": "temperature",
            "imbalance": "vibration",
            "pressure_loss": "pressure",
        }[recipe.scenario]
        probes = []
        for channel in CHANNELS:
            amplitude = (
                (-9.0 if channel == "pressure" else 9.0) if channel == affected else 0.0
            )
            if recipe.confounder:
                amplitude += 7.0
            offset = 10.0 if recipe.sensor_bias == channel else 0.0
            target = (
                amplitude * 0.15
                if TARGETS.get(selection.kind) == channel and not recipe.confounder
                else amplitude
            )
            before = np.full(24, amplitude)
            after = before.copy()
            for _ in range(selection.max_steps):
                after += 0.25 * (target - after)
            sigma = 0.5 * recipe.noise_factor
            probes.append(
                Probe(
                    channel=channel,
                    primary_before=(
                        before + offset + rng.normal(0, sigma, 24)
                    ).tolist(),
                    primary_after=(after + offset + rng.normal(0, sigma, 24)).tolist(),
                    witness_before=(before + rng.normal(0, sigma, 24)).tolist(),
                    witness_after=(after + rng.normal(0, sigma, 24)).tolist(),
                )
            )
        raw = {
            "dataset_hash": self.data_hash,
            "kind": selection.kind,
            "probes": [p.model_dump() for p in probes],
        }
        return ExperimentResult(id="EXP-" + digest(raw), **raw)
