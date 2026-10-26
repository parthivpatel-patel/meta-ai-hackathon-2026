"""Bounded calibrated thermal images and vibration waveforms. No file execution or URL fetching."""

from typing import Annotated, Literal

import numpy as np
from pydantic import Field, model_validator

from ..engine.contracts import Record, digest

Temperature = Annotated[float, Field(ge=-40, le=250)]
Sample = Annotated[float, Field(ge=-1000, le=1000)]


class ThermalFrame(Record):
    pixels: list[list[Temperature]] = Field(min_length=8, max_length=64)
    declared_synthetic: bool = False
    units: Literal["celsius"] = "celsius"

    @model_validator(mode="after")
    def rectangular(self):
        widths = {len(row) for row in self.pixels}
        if len(widths) != 1 or not 8 <= next(iter(widths)) <= 64:
            raise ValueError(
                "Thermal frames require rectangular 8–64 by 8–64 calibrated arrays"
            )
        return self


class Waveform(Record):
    samples: list[Sample] = Field(min_length=128, max_length=4096)
    sample_rate_hz: int = Field(ge=100, le=20000)
    declared_synthetic: bool = False
    units: Literal["mm_per_second"] = "mm_per_second"


class EvidenceBundle(Record):
    thermal: ThermalFrame | None = None
    waveform: Waveform | None = None


def summarize_assets(bundle: EvidenceBundle) -> dict:
    summaries = {}
    if bundle.thermal:
        a = np.asarray(bundle.thermal.pixels, dtype=float)
        center = float(np.median(a))
        scale = max(float(np.median(abs(a - center))) * 1.4826, 0.1)
        summaries["thermal"] = {
            "height": len(a),
            "width": len(a[0]),
            "median_celsius": center,
            "maximum_celsius": float(a.max()),
            "hot_pixel_count": int((a > center + 6 * scale).sum()),
            "declared_synthetic": bundle.thermal.declared_synthetic,
        }
    if bundle.waveform:
        a = np.asarray(bundle.waveform.samples, dtype=float)
        centered = a - a.mean()
        spectrum = abs(np.fft.rfft(centered * np.hanning(len(a))))
        index = int(np.argmax(spectrum[1:]) + 1) if np.any(spectrum[1:]) else 0
        summaries["waveform"] = {
            "samples": len(a),
            "rms_mm_per_second": float(np.sqrt(np.mean(a * a))),
            "peak_frequency_hz": index * bundle.waveform.sample_rate_hz / len(a),
            "frequency_resolution_hz": bundle.waveform.sample_rate_hz / len(a),
            "declared_synthetic": bundle.waveform.declared_synthetic,
        }
    return {
        "content_hash": digest(bundle.model_dump()),
        "modalities": summaries,
        "limitation": "Numerical thermal/waveform features only; uploaded provenance is unverified. No general photo, audio, or video understanding; features do not establish a cause.",
    }


def demo_assets() -> EvidenceBundle:
    pixels = np.full((12, 12), 65.0)
    pixels[4:7, 5:8] = 85
    times = np.arange(256) / 1024
    return EvidenceBundle(
        thermal=ThermalFrame(pixels=pixels.tolist(), declared_synthetic=True),
        waveform=Waveform(
            samples=(2 * np.sin(2 * np.pi * 64 * times)).tolist(),
            sample_rate_hz=1024,
            declared_synthetic=True,
        ),
    )
