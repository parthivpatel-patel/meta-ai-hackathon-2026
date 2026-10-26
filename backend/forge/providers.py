"""No network inference in Phase 0; Meta configuration is reserved and gated."""

import asyncio
from typing import Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field

from .config import Settings


class HypothesisRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    anomalous_channels: list[Literal["temperature", "vibration", "pressure"]] = Field(
        max_length=3
    )


class Hypothesis(BaseModel):
    title: str
    rationale: str
    next_test: str


class HypothesisResponse(BaseModel):
    provider: str
    model_id: str
    simulated: bool
    hypotheses: list[Hypothesis]
    limitations: str


class ProviderError(Exception):
    pass


class Provider(Protocol):
    async def infer(self, request: HypothesisRequest) -> HypothesisResponse: ...


class MockProvider:
    def __init__(self, model_id: str):
        self.model_id = model_id

    async def infer(self, request: HypothesisRequest) -> HypothesisResponse:
        signal = ", ".join(request.anomalous_channels) or "no flagged channels"
        return HypothesisResponse(
            provider="mock",
            model_id=self.model_id,
            simulated=True,
            hypotheses=[
                Hypothesis(
                    title="Process condition changed",
                    rationale=f"Observed: {signal}; cause is unverified.",
                    next_test="Compare a controlled operating-state baseline.",
                ),
                Hypothesis(
                    title="Sensor or calibration issue",
                    rationale="A measurement shift can have multiple causes.",
                    next_test="Compare an independent calibrated sensor.",
                ),
            ],
            limitations="Mock suggestions only. No Meta inference, physical diagnosis, or experiment verification has occurred.",
        )


class MetaProvider:
    async def infer(self, request: HypothesisRequest) -> HypothesisResponse:
        raise ProviderError(
            "Meta inference is disabled in Phase 0; no request was sent"
        )


def make_provider(settings: Settings) -> Provider:
    return (
        MockProvider(settings.model_id)
        if settings.provider == "mock"
        else MetaProvider()
    )


async def run_inference(
    provider: Provider, request: HypothesisRequest, settings: Settings
) -> HypothesisResponse:
    for attempt in range(settings.retry_limit + 1):
        try:
            return await asyncio.wait_for(
                provider.infer(request), timeout=settings.timeout_seconds
            )
        except (TimeoutError, ConnectionError) as exc:
            if attempt == settings.retry_limit:
                raise ProviderError("Model provider unavailable or timed out") from exc
    raise ProviderError("Model provider unavailable")
