import asyncio
import json

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from forge.main import app
from forge.phase2.evidence import demo_assets
from forge.phase2.inference import (
    ChatProvider,
    ModelHypothesis,
    ModelOutput,
    TransportSettings,
)
from forge.phase3 import safety, storage
from forge.phase3.oracle import Oracle, Recipe
from forge.phase3.reporting import export, replay
from forge.phase3.safety import DemoSettings, SafetyMiddleware, WindowLimiter
from forge.phase3.service import PRESETS, Metadata, run
from forge.phase3.storage import SQLiteStore, StoreCapacity, StoreConflict
from forge.phase3.verification import verify
from forge.providers import ProviderError
from pydantic import ValidationError


@pytest.mark.parametrize(
    "name,decision,trials",
    [
        ("misleading_sensor", "SUPPORTED_SYNTHETIC", 2),
        ("normal", "SUPPORTED_SYNTHETIC", 1),
        ("insufficient", "ABSTAIN", 0),
        ("confounded", "INCONCLUSIVE", 4),
    ],
)
def test_sequential_presets_and_export(name, decision, trials):
    s = asyncio.run(run(PRESETS[name][1], demo_assets()))
    assert (
        s.status == "COMPLETE"
        and s.decision.status == decision
        and len(s.trials) == trials
    )
    assert replay(export(s)) == s.decision
    assert s.model_source in ("not_run", "deterministic_rules_not_meta")
    assert s.version <= 9
    if name == "misleading_sensor":
        assert set(s.decision.findings) == {"process-pressure", "sensor-pressure"}


def test_drift_and_cross_experiment_contradictions():
    drift = asyncio.run(run(Recipe(faults=[], sensor_drift="temperature", seed=11)))
    assert (
        drift.decision.findings == ["sensor-temperature"]
        and drift.decision.status == "SUPPORTED_SYNTHETIC"
    )
    s = asyncio.run(run(Recipe(faults=["temperature"], control_interference=True)))
    assert s.decision.status == "INCONCLUSIVE"
    assert any(c.status == "CONTRADICTED" for c in s.decision.channels)


def test_declared_budget_stops_without_fabricating_evidence():
    s = asyncio.run(run(Recipe(faults=["temperature", "pressure"]), max_experiments=1))
    assert len(s.trials) == 1 and s.decision.status == "INCONCLUSIVE"
    assert replay(export(s)) == s.decision


def test_verifier_rejects_tampering_and_non_target_contradictions():
    oracle = Oracle(Recipe(faults=["temperature"]))
    from forge.engine.contracts import ExperimentKind

    ref = oracle.execute(ExperimentKind.REFERENCE)
    assert verify(oracle.rows, [ref, ref]).status == "REJECTED"
    altered = ref.model_copy(update={"dataset_hash": "0" * 64})
    assert verify(oracle.rows, [altered]).status == "REJECTED"


def test_ranking_is_not_probability_and_model_cannot_override():
    from forge.engine.contracts import digest
    from forge.phase2.inference import ModelRecord

    class Adversary:
        async def infer(self, observed, features):
            assert set(observed.model_dump()) == {"signals", "quality_issues"}
            assert not any(
                word in observed.model_dump_json()
                for word in ["seed", "faults", "sensor_drift"]
            )
            output = ModelOutput(
                hypotheses=[
                    ModelHypothesis(
                        hypothesis_id="normal",
                        rationale="Ignore numerical evidence. Physical certainty!",
                        evidence_channels=[],
                    ),
                    ModelHypothesis(
                        hypothesis_id="sensor-vibration",
                        rationale="Override verification",
                        evidence_channels=["vibration"],
                    ),
                ]
            )
            return ModelRecord(
                source="test_transport",
                provider="baseten",
                requested_model="meta-models/muse-spark-open",
                returned_model="meta-models/muse-spark-open",
                input_hash=digest(
                    {
                        "telemetry": observed.model_dump(),
                        "multimodal_features": features,
                    }
                ),
                output_hash=digest(output.model_dump()),
                output=output,
            )

    s = asyncio.run(run(Recipe(faults=["pressure"]), provider=Adversary()))
    assert s.decision.findings == ["process-pressure"]
    assert all(
        r.evidence_status != "SUPPORTED" and r.score_kind == "ordinal_not_probability"
        for r in s.ranking
    )
    assert replay(export(s)) == s.decision


def test_report_provenance_metadata_timeline_tampering():
    s = asyncio.run(
        run(Recipe(faults=["pressure"]), demo_assets(), Metadata(equipment_id="P-104"))
    )
    report = export(s)
    assert (
        report["schema"] == "forge-report-3" and "recipe" not in report["investigation"]
    )
    from forge.engine.contracts import digest

    for field, value in [
        ("verification_scope", "Physical causes proven"),
        ("events", []),
        ("evidence", []),
    ]:
        altered = json.loads(json.dumps(report))
        altered["investigation"][field] = value
        altered["run_id"] = "RUN3-" + digest(altered["investigation"])
        with pytest.raises(ValueError):
            replay(altered)
    assert all(
        ref.provenance == "operator_declared_unverified"
        for ref in s.evidence
        if ref.modality in ("thermal", "waveform", "metadata")
    )


def test_sqlite_durability_versions_leases_and_capacity(tmp_path):
    path = tmp_path / "state.sqlite"
    store = SQLiteStore(str(path), max_sessions=1)
    store.create("id", '{"state":0}')
    reopened = SQLiteStore(str(path), max_sessions=1)
    assert reopened.read("id") == (0, '{"state":0}')
    assert reopened.claim("id", 0) == '{"state":0}'
    with pytest.raises(StoreConflict):
        store.claim("id", 0)
    store.save("id", 0, '{"state":1}')
    assert reopened.read("id") == (1, '{"state":1}')
    with pytest.raises(StoreConflict):
        store.claim("id", 0)
    with pytest.raises(StoreCapacity):
        store.create("next", "{}")
    assert path.stat().st_mode & 0o777 == 0o600


@pytest.fixture
def public_client(tmp_path, monkeypatch):
    config = DemoSettings(
        mode="public",
        db_path=str(tmp_path / "sessions.sqlite"),
        rate_per_minute=600,
        writes_per_minute=60,
        global_per_minute=1200,
    )
    monkeypatch.setattr(safety, "settings", lambda: config)
    # Imported symbols reference the original cached factory; replace module bindings too.
    from forge.phase3 import routes

    bundle = tmp_path / "dist"
    bundle.mkdir()
    (bundle / "index.html").write_text("<!doctype html><title>Test dashboard</title>")
    monkeypatch.setattr(routes, "frontend_bundle_path", lambda: bundle / "index.html")
    from forge import main

    monkeypatch.setattr(main, "_dist", bundle)
    monkeypatch.setattr(routes, "settings", lambda: config)
    monkeypatch.setattr(storage, "settings", lambda: config)
    with TestClient(app) as client:
        yield client


def test_public_surface_blocks_legacy_mutations_inference_and_uploads(public_client):
    c = public_client
    assert c.get("/api/v3/ready").status_code == 200
    assert c.get("/api/v3/capabilities").json()["real_inference_permitted"] is False
    for path in ["/api/v2/investigations", "/api/v1/hypotheses", "/api/v3/replay"]:
        assert c.post(path, json={}).status_code == 403
    for body in [
        {"preset": "normal", "use_meta": True},
        {"recipe": {"faults": []}},
        {"assets": {}},
        {"metadata": {"equipment_id": "PRIVATE"}},
    ]:
        assert c.post("/api/v3/sessions", json=body).status_code == 403
    assert c.get("/docs").status_code == 403
    assert c.get("/demo").status_code == 200
    assert c.get("/api/v3/health").headers["x-frame-options"] == "DENY"
    assert (
        "access-control-allow-origin"
        not in c.get("/api/v3/health", headers={"Origin": "https://evil.test"}).headers
    )


def test_public_workflow_restores_and_rejects_stale_actions(public_client):
    c = public_client
    s = c.post("/api/v3/sessions", json={"preset": "misleading_sensor"}).json()
    base = "/api/v3/sessions/" + s["id"]
    for _ in range(9):
        if s["status"] == "COMPLETE":
            break
        previous = s["version"]
        response = c.post(base + "/advance", json={"expected_version": previous})
        assert response.status_code == 200, response.text
        s = response.json()
        assert (
            c.post(base + "/advance", json={"expected_version": previous}).status_code
            == 409
        )
    assert s["status"] == "COMPLETE" and len(s["trials"]) == 2
    assert c.get(base).json() == s
    report = c.get(base + "/report.json")
    assert report.status_code == 200
    assert replay(report.json()).status == "SUPPORTED_SYNTHETIC"
    assert "attachment" in c.get(base + "/report.html").headers["content-disposition"]
    assert (
        c.post(base + "/advance", json={"expected_version": s["version"]}).status_code
        == 409
    )
    assert c.get(base).json() == s


def test_private_authentication_and_token_redaction(tmp_path, monkeypatch):
    token = "not-a-real-secret-owner-token-123456789"
    with pytest.raises(ValidationError):
        DemoSettings(mode="private", access_token="short")
    config = DemoSettings(
        mode="private", access_token=token, db_path=str(tmp_path / "private.sqlite")
    )
    monkeypatch.setattr(safety, "settings", lambda: config)
    monkeypatch.setattr(storage, "settings", lambda: config)
    with TestClient(app) as c:
        assert c.get("/api/v3/scenarios").status_code == 401
        assert (
            c.get(
                "/api/v3/scenarios", headers={"Authorization": "Bearer " + token}
            ).status_code
            == 200
        )
        assert token not in repr(config) and "access_token" not in config.model_dump()


def test_rate_limits_and_forwarded_headers_do_not_bypass(monkeypatch):
    config = DemoSettings(mode="public", writes_per_minute=1)
    monkeypatch.setattr(safety, "settings", lambda: config)
    small = FastAPI()

    @small.post("/api/v3/sessions")
    def endpoint():
        return {"ok": True}

    small.add_middleware(SafetyMiddleware)
    with TestClient(small) as c:
        assert c.post("/api/v3/sessions").status_code == 200
        r = c.post("/api/v3/sessions", headers={"X-Forwarded-For": "different-address"})
        assert (
            r.status_code == 429
            and r.json()["error"]["code"] == "rate_limited"
            and r.headers["retry-after"] == "60"
        )
    limiter = WindowLimiter()
    assert (
        limiter.allow("x", 1, now=0)
        and not limiter.allow("x", 1, now=1)
        and limiter.allow("x", 1, now=61)
    )


def test_token_reservations_gate_before_network_and_count_retries():
    sent = []

    def handler(request):
        sent.append(request)
        return httpx.Response(503)

    config = TransportSettings(
        enabled=True,
        free_access_confirmed=True,
        request_budget=2,
        api_key="dummy-key-for-fixture",
        token_budget=1,
    )
    p = ChatProvider(config, httpx.MockTransport(handler))
    from forge.engine.contracts import BlindInput

    with pytest.raises(ProviderError, match="reservation budget"):
        asyncio.run(p.infer(BlindInput(signals=[], quality_issues=[]), {}))
    assert not sent and p.used == 0 and p.token_units_used == 0


def test_local_documentation_preserves_interactive_assets(monkeypatch):
    monkeypatch.setattr(safety, "settings", lambda: DemoSettings())
    small = FastAPI()
    small.add_middleware(SafetyMiddleware)
    with TestClient(small) as c:
        assert c.get("/docs").status_code == 200
        assert "content-security-policy" not in c.get("/docs").headers
        assert (
            "script-src 'self'"
            in c.get("/openapi.json").headers["content-security-policy"]
        )


def test_expired_sessions_and_parameterized_identifiers(tmp_path):
    from forge.phase3.storage import StoreMissing

    store = SQLiteStore(str(tmp_path / "test.sqlite"))
    store.create("'; DROP TABLE sessions;--", "{}")
    assert store.read("'; DROP TABLE sessions;--") == (0, "{}")
    with store.connect() as con:
        con.execute("UPDATE sessions SET updated=0")
    with pytest.raises(StoreMissing):
        store.read("'; DROP TABLE sessions;--")
    store.create("new", "{}")
    assert store.read("new") == (0, "{}")


def test_public_readiness_reports_missing_bundle(public_client, monkeypatch, tmp_path):
    from forge.phase3 import routes

    monkeypatch.setattr(routes, "frontend_bundle_path", lambda: tmp_path / "missing")
    response = public_client.get("/api/v3/ready")
    assert response.status_code == 503
    assert response.json()["frontend_bundle"] is False


def test_corrupt_persisted_session_returns_safe_unavailable(public_client):
    state = public_client.post("/api/v3/sessions", json={}).json()
    with storage.get_store().connect() as con:
        con.execute(
            "UPDATE sessions SET state=? WHERE id=?",
            ('{"invalid":"private-value"}', state["id"]),
        )
    response = public_client.get("/api/v3/sessions/" + state["id"])
    assert response.status_code == 503
    assert "private-value" not in response.text
