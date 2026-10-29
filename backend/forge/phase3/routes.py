import asyncio
import json
import logging
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import Field

from ..engine.contracts import Record
from ..phase2.evidence import EvidenceBundle, demo_assets
from ..phase2.inference import get_provider
from ..recorded import available as recorded_available
from .oracle import Recipe
from .reporting import export, render
from .safety import settings
from .service import PRESETS, Metadata, Session, advance, create
from .storage import StoreCapacity, StoreConflict, StoreMissing, get_store

router = APIRouter(prefix="/api/v3", tags=["Sequential demonstration"])
logger = logging.getLogger("forge.operations")
logger.setLevel(logging.INFO)
if not logger.handlers:
    logger.addHandler(logging.StreamHandler())


class CreateRequest(Record):
    preset: Literal[
        "misleading_sensor",
        "noisy_multifault",
        "normal",
        "insufficient",
        "confounded",
        "temperature_response",
        "vibration_response",
    ] = "misleading_sensor"
    recipe: Recipe | None = None
    assets: EvidenceBundle | None = None
    metadata: Metadata = Metadata()
    use_meta: bool = False
    max_experiments: int = Field(default=4, ge=1, le=4, strict=True)


class AdvanceRequest(Record):
    expected_version: int = Field(ge=0, le=20)


@asynccontextmanager
async def workload(request: Request):
    gate = request.app.state.work_gate
    try:
        await asyncio.wait_for(gate.acquire(), timeout=0.05)
    except TimeoutError:
        raise HTTPException(429, "Computation capacity reached")
    try:
        yield
    finally:
        gate.release()


def storage_error(exc):
    if isinstance(exc, StoreMissing):
        return HTTPException(404, "Session not found or expired")
    if isinstance(exc, StoreConflict):
        return HTTPException(
            409, "Stale version or operation in progress; reload session"
        )
    return HTTPException(503, "Durable storage unavailable or at capacity")


def frontend_bundle_path() -> Path:
    return Path(__file__).resolve().parents[3] / "frontend" / "dist" / "index.html"


def load(identifier):
    try:
        version, raw = get_store().read(identifier)
        data = json.loads(raw)
        s = Session.model_validate(data["session"])
        if s.version != version:
            raise ValueError("Persisted version mismatch")
        return s, data
    except (StoreMissing, sqlite3.Error, StoreCapacity, StoreConflict) as exc:
        raise storage_error(exc) from exc
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(503, "Persisted session unavailable") from exc


@router.get("/health")
def health():
    return {"status": "ok", "version": "3.0", "scope": "synthetic_development"}


@router.get("/ready")
def ready():
    try:
        database = get_store().ready()
    except (sqlite3.Error, OSError):
        database = False
    bundle = frontend_bundle_path().is_file()
    recorded = recorded_available()
    ok = database and recorded and (settings().mode != "public" or bundle)
    return Response(
        json.dumps(
            {
                "status": "ready" if ok else "not_ready",
                "storage": database,
                "frontend_bundle": bundle,
                "inference_required": False,
                "recorded_meta_evidence": recorded,
            }
        ),
        status_code=200 if ok else 503,
        media_type="application/json",
    )


@router.get("/capabilities")
def capabilities():
    public = settings().mode == "public"
    model_status = None if public else get_provider().status()
    return {
        "mode": settings().mode,
        "scope": "restricted_synthetic_demo" if public else "development",
        "real_inference_permitted": False
        if public
        else model_status["network_inference_enabled"],
        "real_inference_verified": False
        if public
        else model_status["authenticated_response_received"],
        "model_configuration": "disabled" if public else model_status["status"],
        "reviewed_recorded_meta_available": recorded_available(),
        "recorded_meta_is_live": False,
        "max_experiments": 4,
        "replicates_per_experiment": 96,
        "uploads_permitted": not public,
        "persistence": "ephemeral_sqlite"
        if settings().storage_ephemeral
        else "sqlite_local_disk",
        "hosting_notice": "Free hosting may sleep when idle. SQLite sessions can be lost on restart or redeploy. Export completed JSON/HTML reports; start a new synthetic case if saved state is unavailable."
        if settings().storage_ephemeral
        else None,
        "ranking": "ordinal_not_probability",
        "physical_causality": False,
    }


@router.get("/scenarios")
def scenarios():
    return [
        {"id": key, "title": value[0], "synthetic": True}
        for key, value in PRESETS.items()
    ]


@router.post("/sessions", response_model=Session, status_code=201)
async def create_session(body: CreateRequest, request: Request):
    if settings().mode == "public" and (
        body.recipe is not None
        or body.assets is not None
        or body.metadata != Metadata()
        or body.use_meta
        or body.max_experiments != 4
    ):
        raise HTTPException(
            403,
            "Public demo accepts fixed synthetic presets only; inference and uploads are blocked",
        )
    if body.use_meta and not get_provider().status()["network_inference_enabled"]:
        from ..providers import ProviderError

        raise ProviderError(
            "Real model transport is unavailable; no request was sent and no fallback is used"
        )
    async with workload(request):
        recipe = body.recipe or PRESETS[body.preset][1]
        s = create(
            recipe,
            body.assets if body.assets is not None else demo_assets(),
            Metadata(
                equipment_id="RIG-104",
                investigation_title=PRESETS[body.preset][0],
                acquired_at="2026-10-27T08:00:00Z",
            )
            if body.recipe is None
            and body.metadata == Metadata()
            and body.preset in {"temperature_response", "vibration_response"}
            else body.metadata,
            body.max_experiments,
        )
        state = json.dumps(
            {
                "recipe": recipe.model_dump(),
                "use_meta": body.use_meta,
                "session": s.model_dump(mode="json"),
            },
            allow_nan=False,
        )
        try:
            get_store().create(s.id, state)
        except (sqlite3.Error, StoreCapacity) as exc:
            raise storage_error(exc) from exc
        return s


@router.get("/sessions/{identifier}", response_model=Session)
def get_session(identifier: str):
    return load(identifier)[0]


@router.post("/sessions/{identifier}/advance", response_model=Session)
async def step(identifier: str, body: AdvanceRequest, request: Request):
    async with workload(request):
        try:
            raw = get_store().claim(identifier, body.expected_version)
        except (StoreMissing, StoreConflict, StoreCapacity, sqlite3.Error) as exc:
            raise storage_error(exc) from exc
        try:
            data = json.loads(raw)
            s = Session.model_validate(data["session"])
            if s.version != body.expected_version:
                raise StoreConflict("Persisted version mismatch")
            if settings().mode == "public" and data["use_meta"]:
                raise HTTPException(
                    403, "Public mode never advances a network-inference session"
                )
            if s.status == "COMPLETE":
                raise HTTPException(409, "Investigation already completed")
            async with asyncio.timeout(100):
                result = await advance(
                    s,
                    Recipe.model_validate(data["recipe"]),
                    get_provider() if data["use_meta"] else None,
                )
            data["session"] = result.model_dump(mode="json")
            get_store().save(
                identifier, body.expected_version, json.dumps(data, allow_nan=False)
            )
            logger.info(
                json.dumps(
                    {
                        "event": "sequential_transition",
                        "session_id": identifier,
                        "version": result.version,
                        "status": result.status,
                        "decision": result.decision.status,
                        "experiments": len(result.trials),
                        "model_source": result.model_source,
                    }
                )
            )
            return result
        except (StoreMissing, StoreConflict, StoreCapacity, sqlite3.Error) as exc:
            raise storage_error(exc) from exc
        except TimeoutError as exc:
            raise HTTPException(503, "Investigation action timed out") from exc
        finally:
            get_store().release(identifier, body.expected_version)


@router.get("/sessions/{identifier}/report.json")
def json_report(identifier: str):
    s, _ = load(identifier)
    if s.status != "COMPLETE":
        raise HTTPException(409, "Complete investigation before export")
    report = export(s)
    return Response(
        json.dumps(report, indent=2, ensure_ascii=False),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="forge-sequential.json"'},
    )


@router.get("/sessions/{identifier}/report.html")
def html_report(identifier: str):
    s, _ = load(identifier)
    if s.status != "COMPLETE":
        raise HTTPException(409, "Complete investigation before export")
    return Response(
        render(export(s)),
        media_type="text/html",
        headers={
            "Content-Disposition": 'attachment; filename="forge-sequential.html"',
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
        },
    )
