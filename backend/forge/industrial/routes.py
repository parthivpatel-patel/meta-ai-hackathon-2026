"""Explicit bounded simulation routes. No connected equipment, URLs, paths or model calls."""

from fastapi import APIRouter, HTTPException, Request

from ..phase3.routes import workload
from .investigation import InvestigationRequest, investigate
from .model import COMPONENTS, SCENARIOS, SENSORS, Recipe, simulate

router = APIRouter(prefix="/api/v4", tags=["Industrial simulation"])


@router.get("/catalog")
def catalog():
    return {
        "scenarios": SCENARIOS,
        "components": list(COMPONENTS.values()),
        "sensors": [
            {"id": k, "component_id": v[0], "unit": v[1], "range": [v[2], v[3]]}
            for k, v in SENSORS.items()
        ],
        "connected": "UNAVAILABLE",
        "provider": "UNAVAILABLE",
        "mode": "SIMULATION_ONLY",
    }


@router.post("/simulate")
async def run(recipe: Recipe, request: Request):
    async with workload(request):
        return simulate(recipe)


@router.post("/investigate")
async def diagnose(body: InvestigationRequest, request: Request):
    async with workload(request):
        try:
            return investigate(body)
        except ValueError as exc:
            raise HTTPException(
                422, "Invalid simulation capture or experiment request"
            ) from exc


from fastapi.responses import HTMLResponse

from .investigation import render


@router.post("/report.html", response_class=HTMLResponse)
async def html_report(body: InvestigationRequest, request: Request):
    async with workload(request):
        try:
            return HTMLResponse(render(investigate(body)))
        except ValueError as exc:
            raise HTTPException(422, "Invalid simulation report request") from exc
