"""Private Phase 3 drift, outlier, and cross-control stress cases."""

import numpy as np
from pydantic import Field

from ..engine.contracts import CHANNELS, Channel, ExperimentKind, dataset_hash
from ..phase2.contracts import seal_trial
from ..phase2.oracle import Oracle as BaseOracle
from ..phase2.oracle import Recipe as BaseRecipe


class Recipe(BaseRecipe):
    sensor_drift: Channel | None = None
    outlier_fraction: float = Field(default=0, ge=0, le=0.1)
    control_interference: bool = False


class Oracle:
    def __init__(self, recipe: Recipe):
        self.recipe = recipe
        base = BaseRecipe.model_validate(
            recipe.model_dump(
                exclude={"sensor_drift", "outlier_fraction", "control_interference"}
            )
        )
        self._oracle = BaseOracle(base)
        self.rows = self._oracle.rows
        rng = np.random.default_rng(np.random.SeedSequence([recipe.seed, 3301]))
        for row in self.rows:
            for channel, scale in zip(CHANNELS, [0.8, 0.08, 0.12]):
                value = getattr(row, channel)
                if value is None:
                    continue
                if channel == recipe.sensor_drift:
                    value += scale * 10 * row.minute / 119
                if rng.random() < recipe.outlier_fraction:
                    value += scale * float(rng.choice([-8, 8]))
                setattr(row, channel, round(value, 6))
        self.data_hash = dataset_hash(self.rows)

    def execute(self, kind: ExperimentKind):
        trial = self._oracle.execute(kind)
        probes = []
        for p in trial.probes:
            update = {}
            if p.channel == self.recipe.sensor_drift:
                update["primary_before"] = [x + 10 for x in p.primary_before]
                update["primary_after"] = [x + 10 for x in p.primary_after]
            if (
                self.recipe.control_interference
                and kind == ExperimentKind.COOLING
                and p.channel == "vibration"
            ):
                update["primary_after"] = [x + 6 for x in p.primary_after]
                update["witness_after"] = [x + 6 for x in p.witness_after]
            probes.append(p.model_copy(update=update))
        return seal_trial(self.data_hash, kind, probes)
