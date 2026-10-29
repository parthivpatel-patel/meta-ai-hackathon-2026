"""Strict action counts fail before simulation, selection or session creation."""

from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from forge import recorded
from forge.industrial import meta
from forge.industrial import routes as industrial_routes
from forge.main import app
from forge.phase3 import routes, safety, storage
from forge.phase3.service import Session
from pydantic import ValidationError

INVALID_COUNTS = [True, False, "1", 1.0, 1.5, None, -1, 5]


@pytest.fixture
def public_config(tmp_path, monkeypatch):
    config = safety.DemoSettings(
        mode="public",
        allowed_hosts=["testserver"],
        db_path=str(tmp_path / "sessions.sqlite3"),
    )
    for module in (routes, safety, storage):
        monkeypatch.setattr(module, "settings", lambda: config)


@pytest.mark.parametrize("value", INVALID_COUNTS)
@pytest.mark.parametrize(
    "path", ["/api/v4/investigate", "/api/v4/report.html", "/api/v5/prepare"]
)
def test_invalid_counts_never_reach_numerical_execution(
    public_config, monkeypatch, path, value
):
    execute = Mock(side_effect=AssertionError("Invalid count reached execution"))
    prepare = Mock(side_effect=AssertionError("Invalid count reached preparation"))
    monkeypatch.setattr(industrial_routes, "investigate", execute)
    monkeypatch.setattr(meta, "prepare", prepare)
    with TestClient(app) as client:
        response = client.post(path, json={"experiments": value})
    assert response.status_code == 422
    execute.assert_not_called()
    prepare.assert_not_called()


@pytest.mark.parametrize("value", INVALID_COUNTS)
def test_invalid_session_budgets_never_create_a_case(public_config, monkeypatch, value):
    create = Mock(side_effect=AssertionError("Invalid budget reached case creation"))
    monkeypatch.setattr(routes, "create", create)
    with TestClient(app) as client:
        response = client.post("/api/v3/sessions", json={"max_experiments": value})
    assert response.status_code == 422
    create.assert_not_called()


@pytest.mark.parametrize("value", [True, False])
def test_saved_session_budget_cannot_coerce_boolean(value):
    saved = recorded.snapshot()["report"]["investigation"]
    with pytest.raises(ValidationError):
        Session.model_validate(
            {**saved, "id": "0" * 32, "version": 0, "max_experiments": value}
        )


@pytest.mark.parametrize("count", [0, 1, 2, 4])
def test_integer_experiment_counts_preserve_capture_and_early_stopping(
    public_config, count
):
    with TestClient(app) as client:
        response = client.post(
            "/api/v4/investigate",
            json={"recipe": {"scenario": "bearing"}, "experiments": count},
        )
    assert response.status_code == 200
    report = response.json()
    assert report["request"]["experiments"] == count
    assert len(report["trials"]) == min(count, 2)
    assert report["provider"] == "rules-based, not Meta"


@pytest.mark.parametrize("budget", [1, 4])
def test_integer_session_budgets_remain_valid(budget):
    assert routes.CreateRequest(max_experiments=budget).max_experiments == budget


@pytest.mark.parametrize("repeat", [0, 1])
def test_shared_app_gets_fresh_test_quotas_but_clients_do_not(monkeypatch, repeat):
    config = safety.DemoSettings(
        mode="public", allowed_hosts=["testserver"], writes_per_minute=1
    )
    monkeypatch.setattr(safety, "settings", lambda: config)
    # A subsequent test must receive its own first request, even if the prior
    # parametrized case exhausted this exact app. A second client in the SAME
    # test must still share the production process's already-consumed quota.
    with TestClient(app) as first:
        assert (
            first.post("/api/v4/investigate", json={"experiments": True}).status_code
            == 422
        )
    with TestClient(app) as second:
        response = second.post("/api/v4/investigate", json={"experiments": True})
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "rate_limited"
