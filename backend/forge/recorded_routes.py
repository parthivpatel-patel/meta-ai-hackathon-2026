"""Fixed GET-only reviewed case; never invokes a model or creates a session."""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response

from . import recorded
from .phase3.routes import workload

router = APIRouter(prefix="/api/v3/recorded-meta", tags=["Reviewed recorded Meta case"])


def checked():
    if not recorded.available():
        raise HTTPException(503, "Reviewed recorded evidence unavailable")


@router.get("")
def investigation():
    checked()
    return {
        "provenance": recorded.snapshot()["provenance"],
        "report_url": "/api/v3/recorded-meta/report.json",
    }


@router.get("/report.json")
def json_report():
    checked()
    return Response(
        recorded.reviewed_bytes(),
        media_type="application/json",
        headers={
            "Content-Disposition": 'attachment; filename="forge-recorded-meta-investigation.json"',
            "X-Forge-Recorded-JSON-SHA256": recorded.ARTIFACT_SHA256,
        },
    )


@router.get("/report.html")
async def html_report(request: Request):
    checked()
    async with workload(request):
        return Response(
            recorded.report_html(),
            media_type="text/html",
            headers={
                "Content-Disposition": 'attachment; filename="forge-recorded-meta-investigation.html"'
            },
        )


@router.get("/replay")
async def replay(request: Request):
    checked()
    async with workload(request):
        return recorded.replay_recorded()
