"""Bounded, process-local workflow store. No persistence or authentication claim."""

import threading
import time
from contextlib import contextmanager
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from .contracts import ExperimentKind, Proposal, Record
from .investigation import Investigation, Snapshot
from .oracle import CaseRecipe, SyntheticOracle
from .reporting import make_report, render_html

router = APIRouter(
    prefix="/api/v1/investigations", tags=["verified synthetic investigations"]
)


class SelectRequest(Record):
    kind: ExperimentKind | None = None


class VerifyRequest(Record):
    proposal: Proposal | None = None


class SessionStore:
    def __init__(self, capacity=64, ttl=3600):
        self.capacity, self.ttl = capacity, ttl
        self.entries = {}
        self.lock = threading.RLock()

    def create(self, recipe: CaseRecipe) -> Snapshot:
        with self.lock:
            self.entries = {
                key: pair
                for key, pair in self.entries.items()
                if time.monotonic() - pair[0] < self.ttl
            }
            if len(self.entries) >= self.capacity:
                raise HTTPException(
                    429,
                    "Investigation capacity reached; restart the development service or wait for expiry",
                )
            identifier = uuid4().hex
            investigation = Investigation(identifier, SyntheticOracle(recipe))
            self.entries[identifier] = (time.monotonic(), investigation)
            return investigation.snapshot

    @contextmanager
    def access(self, identifier):
        with self.lock:
            pair = self.entries.get(identifier)
            if not pair or time.monotonic() - pair[0] >= self.ttl:
                self.entries.pop(identifier, None)
                raise HTTPException(404, "Investigation not found or expired")
            yield pair[1]


store = SessionStore()


@router.post("", response_model=Snapshot, status_code=201)
def create_case(body: CaseRecipe):
    return store.create(body)


@router.get("/{identifier}", response_model=Snapshot)
def get_case(identifier: str):
    with store.access(identifier) as investigation:
        return investigation.snapshot


@router.post("/{identifier}/hypotheses", response_model=Snapshot)
def generate(identifier: str):
    return advance(identifier, "hypotheses")


@router.post("/{identifier}/selection", response_model=Snapshot)
def select(identifier: str, body: SelectRequest):
    return advance(identifier, "select", body.kind)


@router.post("/{identifier}/experiments", response_model=Snapshot)
def execute(identifier: str):
    return advance(identifier, "execute")


@router.post("/{identifier}/verification", response_model=Snapshot)
def verification(identifier: str, body: VerifyRequest | None = None):
    return advance(identifier, "verify", proposal=body.proposal if body else None)


def advance(identifier, action, kind=None, proposal=None):
    with store.access(identifier) as investigation:
        try:
            return investigation.step(action, kind, proposal)
        except RuntimeError as exc:
            raise HTTPException(409, "Invalid workflow transition") from exc


@router.get("/{identifier}/report.json")
def json_report(identifier: str):
    with store.access(identifier) as investigation:
        try:
            report = make_report(investigation.snapshot)
        except ValueError as exc:
            raise HTTPException(409, "Complete verification before export") from exc
        return Response(
            report.model_dump_json(indent=2),
            media_type="application/json",
            headers={
                "Content-Disposition": 'attachment; filename="forge-investigation.json"',
                "Cache-Control": "no-store",
            },
        )


@router.get("/{identifier}/report.html")
def html_report(identifier: str):
    with store.access(identifier) as investigation:
        try:
            report = make_report(investigation.snapshot)
        except ValueError as exc:
            raise HTTPException(409, "Complete verification before export") from exc
        return Response(
            render_html(report),
            media_type="text/html",
            headers={
                "Content-Disposition": 'attachment; filename="forge-investigation.html"',
                "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
                "Cache-Control": "no-store",
            },
        )
