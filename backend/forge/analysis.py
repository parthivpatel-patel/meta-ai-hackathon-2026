from itertools import pairwise
from math import isfinite

import numpy as np
from pydantic import BaseModel
from scipy.stats import median_abs_deviation

from .simulation import Measurement

CHANNELS = ("temperature", "vibration", "pressure")


class ChannelEvidence(BaseModel):
    channel: str
    unit: str
    mean: float
    median: float
    std: float
    minimum: float
    maximum: float
    observed_count: int
    missing_count: int
    baseline_median: float
    baseline_scale: float
    scores: list[float | None]
    anomaly_minutes: list[int]


UNITS = {"temperature": "°C", "vibration": "mm/s RMS", "pressure": "bar"}


def analyze(rows: list[Measurement]) -> list[ChannelEvidence]:
    if len(rows) < 30 or len(rows) > 1000:
        raise ValueError("Require 30–1000 measurements")
    if any(b.minute <= a.minute for a, b in pairwise(rows)):
        raise ValueError("Measurement minutes must strictly increase")
    result = []
    for channel in CHANNELS:
        raw = [getattr(r, channel) for r in rows]
        if any(v is not None and not isfinite(v) for v in raw):
            raise ValueError("Measurements must be finite or null")
        baseline = np.array([v for v in raw[:60] if v is not None], dtype=float)
        if len(baseline) < 20:
            raise ValueError("Require at least 20 observed baseline values per channel")
        observed = np.array([v for v in raw if v is not None], dtype=float)
        center = float(np.median(baseline))
        scale = max(float(median_abs_deviation(baseline, scale="normal")), 1e-6)
        scores = [None if v is None else abs(v - center) / scale for v in raw]
        result.append(
            ChannelEvidence(
                channel=channel,
                unit=UNITS[channel],
                mean=float(observed.mean()),
                median=float(np.median(observed)),
                std=float(observed.std()),
                minimum=float(observed.min()),
                maximum=float(observed.max()),
                observed_count=len(observed),
                missing_count=len(rows) - len(observed),
                baseline_median=center,
                baseline_scale=scale,
                scores=scores,
                anomaly_minutes=[
                    r.minute for r, s in zip(rows, scores) if s is not None and s > 6
                ],
            )
        )
    return result
