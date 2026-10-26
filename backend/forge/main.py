import json
import logging
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from starlette.exceptions import HTTPException

from .analysis import ChannelEvidence, analyze
from .config import get_settings
from .providers import HypothesisRequest, ProviderError, make_provider, run_inference
from .simulation import Measurement, Scenario, simulate

logger = logging.getLogger("forge.requests")
logger.setLevel(logging.INFO)
if not logger.handlers:
    logger.addHandler(logging.StreamHandler())


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_settings()
    yield


app = FastAPI(title="FORGE", version="0.1.0", lifespan=lifespan)


def error(request: Request, status: int, code: str, message: str):
    return JSONResponse(
        status_code=status,
        content={
            "error": {
                "code": code,
                "message": message,
                "request_id": getattr(request.state, "request_id", "unknown"),
            }
        },
    )


@app.middleware("http")
async def request_logging(request: Request, call_next):
    request.state.request_id = uuid4().hex
    start = time.monotonic()
    try:
        response = await call_next(request)
    except Exception:
        response = error(request, 500, "internal_error", "Internal server error")
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    logger.info(
        json.dumps(
            {
                "event": "request",
                "request_id": request.state.request_id,
                "method": request.method,
                "status": response.status_code,
                "duration_ms": round((time.monotonic() - start) * 1000, 2),
            }
        )
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    return error(
        request, 422, "invalid_input", "Request did not match the required schema"
    )


@app.exception_handler(HTTPException)
async def http_error(request, exc):
    return error(request, exc.status_code, "http_error", "Resource unavailable")


@app.exception_handler(ValueError)
async def data_error(request, exc):
    return error(request, 422, "invalid_data", str(exc))


@app.exception_handler(ProviderError)
async def provider_error(request, exc):
    return error(request, 503, "provider_unavailable", str(exc))


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "version": "0.1.0"}


@app.get("/api/v1/model-status")
def model_status():
    settings = get_settings()
    return {
        "provider": settings.provider,
        "model_id": settings.model_id,
        "status": "mock_ready" if settings.provider == "mock" else "disabled",
        "network_inference_enabled": False,
    }


@app.get("/api/v1/investigations/demo")
async def demo(
    scenario: Scenario = "cooling_loss",
    seed: int = Query(default=42, ge=0, le=2**32 - 1),
):
    rows = simulate(scenario, seed)
    evidence = analyze(rows)
    settings = get_settings()
    hypotheses = await run_inference(
        make_provider(settings),
        HypothesisRequest(
            anomalous_channels=[e.channel for e in evidence if e.anomaly_minutes]
        ),
        settings,
    )
    return {
        "id": f"SIM-{scenario}-{seed}",
        "simulated": True,
        "scenario": scenario,
        "equipment": "P-104 • Process pump",
        "measurements": rows,
        "evidence": evidence,
        "model": hypotheses,
        "timeline": [
            {"minute": 0, "event": "Synthetic acquisition started"},
            {"minute": 60, "event": "Baseline window complete"},
            {"minute": 80, "event": "Controlled scenario injection window"},
            {"minute": 119, "event": "Statistics and mock suggestions generated"},
        ],
    }


class AnalysisRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    measurements: list[Measurement] = Field(min_length=30, max_length=1000)


@app.post("/api/v1/analysis", response_model=list[ChannelEvidence])
def analysis(body: AnalysisRequest):
    return analyze(body.measurements)


@app.post("/api/v1/hypotheses")
async def hypotheses(body: HypothesisRequest):
    settings = get_settings()
    return await run_inference(make_provider(settings), body, settings)


# Registered after Phase 0 routes so /demo preserves its original contract.
from .engine.routes import router as investigation_router

app.include_router(investigation_router)
