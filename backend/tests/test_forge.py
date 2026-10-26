import asyncio
import logging

import httpx
import numpy as np
import pytest
from fastapi.testclient import TestClient
from forge.analysis import analyze
from forge.config import Settings, get_settings
from forge.main import app
from forge.providers import (
    HypothesisRequest,
    MetaProvider,
    ProviderError,
    run_inference,
)
from forge.simulation import Measurement, simulate
from pydantic import ValidationError


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("FORGE_PROVIDER", "mock")
    get_settings.cache_clear()
    with TestClient(app) as c:
        yield c
    get_settings.cache_clear()


@pytest.mark.parametrize(
    "scenario,channel",
    [
        ("cooling_loss", "temperature"),
        ("imbalance", "vibration"),
        ("pressure_loss", "pressure"),
    ],
)
def test_simulated_shifts(scenario, channel):
    normal = simulate("normal")
    rows = simulate(scenario)
    assert rows == simulate(scenario)
    assert rows[:80] == normal[:80]
    evidence = analyze(rows)
    assert next(e for e in evidence if e.channel == channel).anomaly_minutes == list(
        range(80, 120)
    )
    assert all(not e.anomaly_minutes for e in evidence if e.channel != channel)


def test_normal_and_seed():
    assert all(not e.anomaly_minutes for e in analyze(simulate("normal")))
    assert simulate("normal", 1) != simulate("normal", 2)
    assert len(simulate("normal")) == 120


def test_statistics_reference():
    rows = [
        Measurement(
            minute=i, temperature=float(i), vibration=float(i), pressure=float(i)
        )
        for i in range(60)
    ]
    e = analyze(rows)[0]
    assert e.mean == 29.5 and e.median == 29.5
    assert e.std == pytest.approx(np.sqrt((60**2 - 1) / 12))
    assert e.baseline_scale == pytest.approx(15 / 0.6744897501960817)
    assert not e.anomaly_minutes


def test_missing_excluded():
    rows = simulate("cooling_loss")
    rows[85].temperature = None
    e = analyze(rows)[0]
    assert e.missing_count == 1 and e.observed_count == 119
    assert e.scores[85] is None and 85 not in e.anomaly_minutes
    assert e.mean == pytest.approx(
        np.mean([r.temperature for r in rows if r.temperature is not None])
    )


def test_constant_baseline_detects_shift():
    rows = [
        Measurement(
            minute=i, temperature=1.0 if i < 60 else 2.0, vibration=1, pressure=1
        )
        for i in range(80)
    ]
    assert analyze(rows)[0].anomaly_minutes == list(range(60, 80))


@pytest.mark.parametrize("kind", ["short", "order", "finite", "baseline"])
def test_invalid_data(kind):
    rows = simulate("normal")
    if kind == "short":
        rows = rows[:10]
    if kind == "order":
        rows[1].minute = 0
    if kind == "finite":
        rows[1].pressure = float("inf")
    if kind == "baseline":
        for row in rows[:50]:
            row.pressure = None
    with pytest.raises(ValueError):
        analyze(rows)


def test_config_validation():
    assert Settings().provider == "mock"
    for args in [
        {"provider": "unknown"},
        {"timeout_seconds": 0},
        {"retry_limit": 4},
        {"provider": "meta"},
        {
            "provider": "meta",
            "meta_endpoint": "http://example.com",
            "model_id": "llama",
        },
    ]:
        with pytest.raises(ValidationError):
            Settings(**args)
    assert (
        Settings(
            provider="meta",
            meta_endpoint="https://example.com/infer",
            model_id="eligible-model",
        ).provider
        == "meta"
    )


def test_api_workflow(client):
    assert client.get("/api/v1/health").json()["status"] == "ok"
    d = client.get("/api/v1/investigations/demo").json()
    assert d["simulated"] and len(d["measurements"]) == 120
    assert d["evidence"][0]["anomaly_minutes"] == list(range(80, 120))
    assert d["model"]["provider"] == "mock" and len(d["model"]["hypotheses"]) == 2
    assert (
        client.post("/api/v1/analysis", json={"measurements": d["measurements"]}).json()
        == d["evidence"]
    )
    status = client.get("/api/v1/model-status").json()
    assert (
        status["status"] == "mock_ready"
        and status["network_inference_enabled"] is False
    )
    assert client.post("/api/v1/hypotheses", json={"anomalous_channels": []}).json()[
        "simulated"
    ]


@pytest.mark.parametrize(
    "url",
    [
        "/api/v1/investigations/demo?scenario=invalid",
        "/api/v1/investigations/demo?seed=-1",
        "/api/v1/investigations/demo?seed=4294967296",
    ],
)
def test_query_validation(client, url):
    r = client.get(url)
    assert r.status_code == 422 and r.json()["error"]["code"] == "invalid_input"


def test_safe_errors_and_logging(client, caplog):
    sentinel = "secret-sentinel-do-not-log"
    with caplog.at_level(logging.INFO, logger="forge.requests"):
        r = client.post(
            "/api/v1/analysis", json={"measurements": [], "secret": sentinel}
        )
    assert (
        r.status_code == 422 and sentinel not in r.text and sentinel not in caplog.text
    )
    assert r.headers["X-Request-ID"] == r.json()["error"]["request_id"]
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert client.get("/not-found").json()["error"]["code"] == "http_error"
    assert (
        client.post(
            "/api/v1/hypotheses", json={"anomalous_channels": ["__import__('os')"]}
        ).status_code
        == 422
    )
    assert (
        "access-control-allow-origin"
        not in client.get(
            "/api/v1/health", headers={"Origin": "https://evil.example"}
        ).headers
    )


def test_meta_never_sends_network(monkeypatch):
    def forbidden(*a, **kw):
        raise AssertionError("Network inference attempted")

    monkeypatch.setattr(httpx.AsyncClient, "send", forbidden)
    with pytest.raises(ProviderError, match="disabled"):
        asyncio.run(
            run_inference(
                MetaProvider(), HypothesisRequest(anomalous_channels=[]), Settings()
            )
        )


def test_retries_and_timeout():
    class Unavailable:
        calls = 0

        async def infer(self, request):
            self.calls += 1
            raise ConnectionError("sensitive upstream detail")

    p = Unavailable()
    with pytest.raises(ProviderError, match="unavailable"):
        asyncio.run(
            run_inference(
                p, HypothesisRequest(anomalous_channels=[]), Settings(retry_limit=2)
            )
        )
    assert p.calls == 3

    class Slow:
        async def infer(self, request):
            await asyncio.sleep(1)

    with pytest.raises(ProviderError, match="timed out"):
        asyncio.run(
            run_inference(
                Slow(),
                HypothesisRequest(anomalous_channels=[]),
                Settings(timeout_seconds=0.001, retry_limit=0),
            )
        )


def test_meta_api_does_not_fallback(client, monkeypatch):
    monkeypatch.setenv("FORGE_PROVIDER", "meta")
    monkeypatch.setenv("FORGE_META_ENDPOINT", "https://example.com/infer")
    monkeypatch.setenv("FORGE_MODEL_ID", "configured-model")
    get_settings.cache_clear()
    r = client.post("/api/v1/hypotheses", json={"anomalous_channels": []})
    assert r.status_code == 503 and "no request was sent" in r.text
    assert client.get("/api/v1/model-status").json()["status"] == "disabled"


def test_invalid_startup_fails(monkeypatch):
    monkeypatch.setenv("FORGE_RETRY_LIMIT", "99")
    get_settings.cache_clear()
    with pytest.raises(ValidationError):
        with TestClient(app):
            pass
    get_settings.cache_clear()


@pytest.mark.parametrize("value", [-1e7, 1e7, float("nan"), float("inf")])
def test_numeric_input_bounds(value):
    with pytest.raises(ValidationError):
        Measurement(minute=0, temperature=value, vibration=2, pressure=6)


def test_malformed_json_and_unknown_channel(client):
    assert (
        client.post(
            "/api/v1/analysis",
            content="{broken",
            headers={"Content-Type": "application/json"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/hypotheses",
            json={"anomalous_channels": ["temperature"], "prompt": "unexpected"},
        ).status_code
        == 422
    )
