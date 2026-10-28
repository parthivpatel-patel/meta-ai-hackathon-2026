"""Recover fixed synthetic legacy cases; never trust a client execution history."""

import json
import sqlite3

from fastapi import APIRouter, HTTPException, Request
from pydantic import model_validator

from ..engine.contracts import Record, digest
from ..phase2.evidence import demo_assets
from ..phase3.routes import storage_error, workload
from ..phase3.service import PRESETS, Metadata, Session, advance, create
from ..phase3.storage import StoreCapacity, get_store

router = APIRouter(prefix="/api/v6", tags=["Validated browser recovery"])


class RecoveryRequest(Record):
    session: Session

    @model_validator(mode="before")
    @classmethod
    def reject_numeric_booleans(cls, value):
        def visit(item, key=""):
            if isinstance(item, bool) and key != "declared_synthetic":
                raise ValueError("Booleans cannot stand in for checkpoint numbers")
            if isinstance(item, dict):
                for name, child in item.items():
                    visit(child, name)
            elif isinstance(item, list):
                for child in item:
                    visit(child)
        visit(value)
        return value


def numeric_json(value):
    """Match browser JSON integral-float spelling without conflating booleans."""
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, dict):
        return {key: numeric_json(child) for key, child in value.items()}
    if isinstance(value, list):
        return [numeric_json(child) for child in value]
    return value


def payload(session: Session) -> dict:
    return session.model_dump(mode="json", exclude={"id", "version"})


async def reproduce(saved: Session) -> tuple[Session, str]:
    if (
        saved.model_source not in {"not_run", "deterministic_rules_not_meta"}
        or saved.inference is not None
        or saved.max_experiments != 4
        or len(saved.events) > 11
        or len(saved.measurements) != 120
        or saved.version > 20
    ):
        raise ValueError("Only fixed deterministic public case checkpoints are recoverable")
    expected_payload = payload(saved)
    for preset, (title, recipe) in PRESETS.items():
        metadata = (
            Metadata(equipment_id="RIG-104", investigation_title=title, acquired_at="2026-10-27T08:00:00Z")
            if preset in {"temperature_response", "vibration_response"}
            else Metadata()
        )
        state = create(recipe, demo_assets(), metadata, 4)
        if state.measurements != saved.measurements or state.metadata != saved.metadata:
            continue
        # Reproduce existing claimed transitions only. No provider and no future test.
        for _ in range(11):
            if digest(numeric_json(payload(state))) == digest(numeric_json(expected_payload)):
                return state.model_copy(update={"version": 0}), preset
            if state.status == "COMPLETE" or len(state.events) >= len(saved.events):
                break
            state = await advance(state, recipe, None)
        break
    raise ValueError("Checkpoint differs from independent fixed-case reproduction")


@router.post("/recover")
async def recover(body: RecoveryRequest, request: Request):
    async with workload(request):
        try:
            state, preset = await reproduce(body.session)
        except (ValueError, TypeError, KeyError):
            raise HTTPException(422, "Checkpoint failed independent recovery validation") from None
        raw = json.dumps({"recipe": PRESETS[preset][1].model_dump(), "use_meta": False, "session": state.model_dump(mode="json")}, allow_nan=False)
        try:
            get_store().create(state.id, raw)
        except (StoreCapacity, sqlite3.Error) as exc:
            raise storage_error(exc) from exc
        return {"session": state, "recovery": {"source_session_id": body.session.id, "source_version": body.session.version, "mode": "independently_reproduced_checkpoint", "model_requests": 0, "future_experiments_executed": 0, "source_authentication": False}}
