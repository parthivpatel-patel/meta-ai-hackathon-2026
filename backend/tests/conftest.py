"""Isolate test-owned process state without weakening production limits."""

import pytest
from forge.main import app
from forge.phase3.safety import SafetyMiddleware, WindowLimiter


@pytest.fixture(autouse=True)
def isolated_demo_rate_limits(monkeypatch):
    # Starlette caches this stack on the shared app, across TestClient lifetimes.
    # The first test builds a fresh stack lazily; later tests need fresh quotas.
    # Keep the same limiter throughout each test so quota tests remain meaningful.
    middleware = app.middleware_stack
    while middleware is not None:
        if isinstance(middleware, SafetyMiddleware):
            monkeypatch.setattr(middleware, "limiter", WindowLimiter())
        middleware = getattr(middleware, "app", None)
