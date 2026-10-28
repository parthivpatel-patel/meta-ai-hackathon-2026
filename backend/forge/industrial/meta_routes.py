"""Public observed-evidence/replay only. No provider import or inference route."""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse

from ..engine.contracts import digest
from ..phase3.routes import workload
from . import meta
from .investigation import InvestigationRequest

router = APIRouter(prefix="/api/v5", tags=["Recorded model proposals"])


@router.get("/model-status")
def model_status():
    return {
        "state": "UNAVAILABLE",
        "live_requests_permitted": False,
        "live_access_verified": False,
        "model_id": meta.MODEL_ID,
        "reason": "No HTTP inference endpoint. Genuine inference requires a separately authorized private CLI run; recorded imports do not authenticate provider access.",
    }


@router.post("/prepare")
async def prepare(body: InvestigationRequest, request: Request):
    async with workload(request):
        try:
            observed, features = meta.prepare(body)
            payload = {
                "telemetry": observed.model_dump(),
                "multimodal_features": features,
            }
            return {
                "input_hash": digest(payload),
                "evidence": payload,
                "network_requests_sent": 0,
            }
        except ValueError as exc:
            raise HTTPException(422, "Invalid observed capture") from exc


@router.post("/replay")
async def replay(body: dict, request: Request):
    async with workload(request):
        try:
            return meta.replay(body)
        except (ValueError, KeyError, TypeError) as exc:
            raise HTTPException(
                422, "Recorded proposals or numerical evidence did not reproduce"
            ) from exc


@router.post("/advance")
async def advance(body: dict, request: Request):
    async with workload(request):
        try:
            return meta.advance(body)
        except (ValueError, KeyError, TypeError) as exc:
            raise HTTPException(
                422,
                "Recorded investigation cannot advance; preserve the current report",
            ) from exc


@router.post("/report.html", response_class=HTMLResponse)
async def html_report(body: dict, request: Request):
    async with workload(request):
        try:
            return HTMLResponse(meta.render(body))
        except (ValueError, KeyError, TypeError) as exc:
            raise HTTPException(422, "Recorded report did not reproduce") from exc
