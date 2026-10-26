"""Single-process public-demo boundary. No reliance on forwarded client headers."""

import hmac
import threading
import time
from collections import OrderedDict
from functools import lru_cache
from pathlib import Path
from typing import Literal
from uuid import uuid4

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from starlette.responses import JSONResponse


class DemoSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="FORGE_DEMO_", extra="ignore", hide_input_in_errors=True, frozen=True
    )
    mode: Literal["local", "public", "private"] = "local"
    access_token: SecretStr | None = Field(default=None, repr=False, exclude=True)
    rate_per_minute: int = Field(default=60, ge=1, le=600)
    writes_per_minute: int = Field(default=10, ge=1, le=60)
    global_per_minute: int = Field(default=240, ge=1, le=1200)
    db_path: str = str(
        Path(__file__).resolve().parents[3] / "forge-data" / "investigations.sqlite3"
    )
    max_sessions: int = Field(default=256, ge=1, le=1000)
    retention_hours: int = Field(default=24, ge=1, le=168)

    @model_validator(mode="after")
    def private_token(self):
        if self.mode == "private" and (
            self.access_token is None or len(self.access_token.get_secret_value()) < 32
        ):
            raise ValueError(
                "Private API mode requires a token of at least 32 characters"
            )
        return self


@lru_cache
def settings() -> DemoSettings:
    return DemoSettings()


class WindowLimiter:
    def __init__(self):
        self.entries = OrderedDict()
        self.lock = threading.Lock()

    def allow(self, key, limit, now=None):
        now = time.monotonic() if now is None else now
        with self.lock:
            start, count = self.entries.get(key, (now, 0))
            if now - start >= 60:
                start, count = now, 0
            if count >= limit:
                return False
            self.entries[key] = (start, count + 1)
            self.entries.move_to_end(key)
            while len(self.entries) > 2048:
                self.entries.popitem(last=False)
            return True


def public_path(method, path):
    if method in ("GET", "HEAD"):
        return path in (
            "/",
            "/demo",
            "/api/v1/health",
            "/api/v3/health",
            "/api/v3/ready",
            "/api/v3/capabilities",
            "/api/v3/scenarios",
        ) or path.startswith(("/assets/", "/api/v3/sessions/"))
    return method == "POST" and (
        path == "/api/v3/sessions"
        or (path.startswith("/api/v3/sessions/") and path.endswith("/advance"))
    )


class SafetyMiddleware:
    def __init__(self, app):
        self.app = app
        self.limiter = WindowLimiter()

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        config = settings()
        path = scope["path"]
        method = scope["method"]

        async def reject(status, code, message):
            identifier = uuid4().hex
            response = JSONResponse(
                {"error": {"code": code, "message": message, "request_id": identifier}},
                status_code=status,
                headers={"X-Request-ID": identifier, "Retry-After": "60"}
                if status == 429
                else {"X-Request-ID": identifier},
            )
            await response(scope, receive, secured_send)

        async def secured_send(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                names = {k.lower() for k, v in headers}
                for key, value in {
                    "x-content-type-options": "nosniff",
                    "x-frame-options": "DENY",
                    "referrer-policy": "no-referrer",
                    "permissions-policy": "camera=(), microphone=(), geolocation=()",
                    "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'",
                    "cache-control": "no-store"
                    if path.startswith("/api/")
                    else "no-cache",
                }.items():
                    if (
                        key == "content-security-policy"
                        and config.mode != "public"
                        and path in ("/docs", "/docs/oauth2-redirect", "/redoc")
                    ):
                        continue
                    if key.encode() not in names:
                        headers.append((key.encode(), value.encode()))
                message = {**message, "headers": headers}
            await send(message)

        if config.mode == "public" and not public_path(method, path):
            return await reject(
                403,
                "demo_restricted",
                "Public demo permits only fixed synthetic scenarios and their bounded workflow",
            )
        if (
            config.mode == "private"
            and path.startswith("/api/")
            and path not in ("/api/v3/health", "/api/v3/ready")
        ):
            header = (
                dict(scope.get("headers", []))
                .get(b"authorization", b"")
                .decode("latin1")
            )
            expected = "Bearer " + config.access_token.get_secret_value()
            if not hmac.compare_digest(header.encode(), expected.encode()):
                return await reject(
                    401,
                    "authentication_required",
                    "Private API requires bearer authentication",
                )
        if config.mode != "local" and path.startswith("/api/"):
            client = (scope.get("client") or ("unknown", 0))[0]
            if not self.limiter.allow(
                "global", config.global_per_minute
            ) or not self.limiter.allow("client:" + client, config.rate_per_minute):
                return await reject(429, "rate_limited", "Demo request limit exceeded")
            if method == "POST" and not self.limiter.allow(
                "write:" + client, config.writes_per_minute
            ):
                return await reject(
                    429, "rate_limited", "Demo computation limit exceeded"
                )
        await self.app(scope, receive, secured_send)
