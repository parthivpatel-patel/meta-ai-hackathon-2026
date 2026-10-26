import html

from fastapi import APIRouter
from fastapi.responses import Response

from ..engine.contracts import Record
from .evidence import EvidenceBundle, demo_assets, summarize_assets
from .inference import get_provider
from .oracle import Recipe
from .service import RunReport, investigate, replay

router = APIRouter(prefix="/api/v2", tags=["Phase 2 multimodal investigations"])


class RunRequest(Record):
    recipe: Recipe = Recipe()
    evidence: EvidenceBundle = EvidenceBundle()
    use_meta: bool = False


@router.get("/model-status")
def status():
    return get_provider().status()


@router.post("/evidence")
def evidence(body: EvidenceBundle):
    return summarize_assets(body)


@router.get("/evidence/demo")
def demo():
    return demo_assets()


@router.post("/investigations", response_model=RunReport)
async def run(body: RunRequest):
    provider = get_provider() if body.use_meta else None
    return await investigate(body.recipe, body.evidence, provider)


@router.post("/replay")
def replay_api(body: RunReport):
    return replay(body)


@router.post("/reports/html")
def html_report(body: RunReport):
    replay(body)
    content = (
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FORGE Phase 2 report</title><h1>FORGE · Synthetic multimodal investigation</h1><h2>'
        + html.escape(body.verification.status)
        + "</h2><p>Source: "
        + html.escape(body.model_source)
        + '</p><p>Physical-world causality is not established.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">'
        + html.escape(body.model_dump_json(indent=2))
        + "</pre></html>"
    )
    return Response(
        content,
        media_type="text/html",
        headers={
            "Content-Disposition": 'attachment; filename="forge-phase2.html"',
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
            "Cache-Control": "no-store",
        },
    )
