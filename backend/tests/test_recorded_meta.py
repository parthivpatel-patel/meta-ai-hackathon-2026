"""Reviewed public artifact integration: no provider or user-controlled evidence."""

import hashlib
import json

import httpx
import pytest
from fastapi.testclient import TestClient
from forge import recorded
from forge.main import app
from forge.phase3 import routes, safety, storage
from forge.phase3.reporting import replay
from forge.phase3.safety import DemoSettings


@pytest.fixture
def client(tmp_path, monkeypatch):
    config = DemoSettings(
        mode="public",
        allowed_hosts=["testserver"],
        db_path=str(tmp_path / "test.sqlite3"),
        rate_per_minute=600,
        writes_per_minute=60,
        global_per_minute=1200,
    )
    for module in [routes, safety, storage]:
        monkeypatch.setattr(module, "settings", lambda: config)
    bundle = tmp_path / "index.html"
    bundle.write_text("<!doctype html><title>Test bundle</title>")
    monkeypatch.setattr(routes, "frontend_bundle_path", lambda: bundle)

    def forbidden(*args, **kwargs):
        raise AssertionError("Recorded evidence must not initialize a provider")

    async def no_network(*args, **kwargs):
        raise AssertionError("Real HTTP forbidden in recorded-evidence tests")

    monkeypatch.setattr(routes, "get_provider", forbidden)
    monkeypatch.setattr("forge.phase2.inference.ChatProvider.infer", no_network)
    monkeypatch.setattr(httpx.AsyncHTTPTransport, "handle_async_request", no_network)
    recorded.reviewed_bytes.cache_clear()
    monkeypatch.setattr(storage, "_store", None)
    monkeypatch.setattr(storage, "_store_path", None)
    with TestClient(app) as c:
        yield c
    recorded.reviewed_bytes.cache_clear()


def test_fixed_case_is_genuine_recorded_synthetic_verified_and_never_live(client):
    result = client.get("/api/v3/recorded-meta")
    assert result.status_code == 200
    p = result.json()["provenance"]
    assert p["labels"] == recorded.LABELS
    assert p["source"] == "meta_http_response" and p["mode"] == "previously_recorded"
    assert p["synthetic"] and p["independently_verified"]
    assert p["public_live_inference_enabled"] is False
    assert p["model_id"] == recorded.MODEL_ID
    assert "not the currently selected" in p["scope"]
    cap = client.get("/api/v3/capabilities").json()
    assert cap["real_inference_permitted"] is False
    assert cap["reviewed_recorded_meta_available"] is True
    assert cap["recorded_meta_is_live"] is False
    assert client.get("/api/v3/ready").json()["recorded_meta_evidence"] is True


def test_export_has_exact_reviewed_integrity_and_independent_replay(client):
    r = client.get("/api/v3/recorded-meta/report.json")
    assert r.status_code == 200
    assert hashlib.sha256(r.content).hexdigest() == recorded.ARTIFACT_SHA256
    assert "attachment" in r.headers["content-disposition"]
    assert r.headers["x-forge-recorded-json-sha256"] == recorded.ARTIFACT_SHA256
    report = r.json()
    assert report["run_id"] == recorded.RUN_ID
    assert report["investigation"]["model_source"] == "meta_http_response"
    assert len(report["investigation"]["hypotheses"]["hypotheses"]) == 3
    assert replay(report).findings == ["process-pressure", "sensor-pressure"]
    for excluded in [
        "reasoning_content",
        "api_key",
        "Authorization",
        "@gmail.com",
        "inference_attempts",
    ]:
        assert excluded not in r.text


def test_html_export_retains_all_source_labels_and_is_escaped(client):
    r = client.get("/api/v3/recorded-meta/report.html")
    assert r.status_code == 200
    assert all(label in r.text for label in recorded.LABELS)
    assert "Recorded Meta response" in r.text and "Built with Muse Spark Open" in r.text
    assert "<script" not in r.text and "reasoning_content" not in r.text
    assert "attachment" in r.headers["content-disposition"]


def test_replay_is_read_only_and_cannot_make_inference_or_replace_evidence(client):
    before = client.get("/api/v3/recorded-meta/report.json").content
    for _ in range(2):
        r = client.get("/api/v3/recorded-meta/replay")
        assert r.status_code == 200
        body = r.json()
        assert body["verified"] and body["status"] == "SUPPORTED_SYNTHETIC"
        assert body["network_requests_sent"] == body["new_experiments_executed"] == 0
        assert body["report_run_id"] == recorded.RUN_ID
    assert client.get("/api/v3/recorded-meta/report.json").content == before
    assert (
        client.get(
            "/api/v3/recorded-meta/report.json?source=test_transport&file=/etc/passwd"
        ).content
        == before
    )


@pytest.mark.parametrize("suffix", ["", "/replay", "/report.json", "/report.html"])
def test_public_routes_accept_no_mutations_or_user_supplied_reports(client, suffix):
    r = client.post(
        "/api/v3/recorded-meta" + suffix,
        json={"source": "meta_http_response", "use_meta": True},
    )
    assert r.status_code == 403
    assert "default-src 'self'" in r.headers["content-security-policy"]
    assert r.headers["x-frame-options"] == "DENY"


@pytest.mark.parametrize(
    "mode", ["modified", "fixture", "symlink", "oversize", "missing"]
)
def test_missing_tampered_or_mock_artifacts_fail_closed(
    client, tmp_path, monkeypatch, mode
):
    path = tmp_path / "evidence.json"
    if mode in ["modified", "fixture"]:
        body = recorded.snapshot()["report"]
        if mode == "modified":
            body["investigation"]["measurements"][0]["pressure"] += 1
        else:
            body["investigation"]["model_source"] = "test_transport"
        path.write_text(json.dumps(body))
    elif mode == "symlink":
        path.symlink_to(recorded.ARTIFACT)
    elif mode == "oversize":
        path.write_bytes(b"x" * 262145)
    monkeypatch.setattr(recorded, "ARTIFACT", path)
    recorded.reviewed_bytes.cache_clear()
    r = client.get("/api/v3/recorded-meta")
    assert r.status_code == 503 and str(path) not in r.text
    ready = client.get("/api/v3/ready")
    assert ready.status_code == 503 and ready.json()["recorded_meta_evidence"] is False


def test_numeric_tampering_is_rejected_even_if_file_checksum_is_replaced(
    client, tmp_path, monkeypatch
):
    body = recorded.snapshot()["report"]
    body["investigation"]["trials"][0]["probes"][0]["witness_before"][0] += 100
    raw = json.dumps(body).encode()
    path = tmp_path / "modified.json"
    path.write_bytes(raw)
    monkeypatch.setattr(recorded, "ARTIFACT", path)
    monkeypatch.setattr(recorded, "ARTIFACT_SHA256", hashlib.sha256(raw).hexdigest())
    recorded.reviewed_bytes.cache_clear()
    assert client.get("/api/v3/recorded-meta").status_code == 503


def test_snapshots_do_not_mutate_the_cached_reviewed_artifact(client):
    s = recorded.snapshot()
    s["report"]["investigation"]["model_source"] = "test_transport"
    s["provenance"]["labels"].clear()
    assert (
        recorded.snapshot()["report"]["investigation"]["model_source"]
        == "meta_http_response"
    )
    assert recorded.snapshot()["provenance"]["labels"] == recorded.LABELS
