"""Read-only deployment audit. HTTPS required except explicit literal-loopback tests."""

import argparse
import json
from urllib.parse import urlsplit

import httpx

HEADER_POLICY = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
}
DENIED_PATHS = (
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/v1/model-status",
    "/api/v1/investigations/demo",
    "/api/v2/model-status",
)


def validate_url(url: str, allow_loopback_http: bool = False) -> str:
    parsed = urlsplit(url)
    if (
        parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or parsed.path not in ("", "/")
        or not parsed.hostname
    ):
        raise ValueError(
            "Use a base origin without credentials, query, fragment or path"
        )
    if parsed.scheme != "https" and not (
        allow_loopback_http
        and parsed.scheme == "http"
        and parsed.hostname in ("127.0.0.1", "::1")
    ):
        raise ValueError(
            "HTTPS is required; HTTP is allowed only for explicit literal-loopback tests"
        )
    if any(c.isspace() for c in url) or "\\" in url or "%" in parsed.netloc:
        raise ValueError("Invalid origin")
    if parsed.port is not None and not 1 <= parsed.port <= 65535:
        raise ValueError("Invalid origin port")
    return url.rstrip("/")


def audit(
    url: str,
    allow_loopback_http: bool = False,
    transport: httpx.BaseTransport | None = None,
) -> dict:
    origin = validate_url(url, allow_loopback_http)
    checks = []
    tls_verified = False

    def check(name, passed):
        checks.append({"check": name, "passed": bool(passed)})

    with httpx.Client(
        transport=transport, timeout=8, follow_redirects=False, trust_env=True
    ) as client:

        def get(path):
            nonlocal tls_verified
            with client.stream(
                "GET", origin + path, headers={"Origin": "https://untrusted.invalid"}
            ) as r:
                tls_verified = origin.startswith("https://")
                if r.headers.get("content-encoding", "identity") not in (
                    "",
                    "identity",
                ):
                    raise ValueError("Compressed audit responses are not permitted")
                raw = bytearray()
                for part in r.iter_bytes(chunk_size=4096):
                    raw.extend(part)
                    if len(raw) > 65536:
                        raise ValueError("Probe response exceeded limit")
                check(
                    path + ":security_headers",
                    all(r.headers.get(k) == v for k, v in HEADER_POLICY.items())
                    and "default-src 'self'"
                    in r.headers.get("content-security-policy", ""),
                )
                check(
                    path + ":no_cors_grant",
                    "access-control-allow-origin" not in r.headers,
                )
                if path.startswith("/api/"):
                    check(
                        path + ":no_cache", r.headers.get("cache-control") == "no-store"
                    )
                return r.status_code, bytes(raw)

        try:
            status, raw = get("/api/v3/capabilities")
            data = json.loads(raw)
            public = (
                status == 200
                and isinstance(data, dict)
                and data.get("mode") == "public"
                and data.get("real_inference_permitted") is False
                and data.get("uploads_permitted") is False
                and data.get("physical_causality") is False
            )
            check("restricted_public_capabilities", public)
            # Never probe developer APIs on a server that fails the public boundary gate.
            if public:
                status, raw = get("/api/v3/ready")
                data = json.loads(raw)
                check(
                    "ready_storage_and_bundle",
                    status == 200
                    and data.get("status") == "ready"
                    and data.get("storage") is True
                    and data.get("frontend_bundle") is True
                    and data.get("inference_required") is False,
                )
                status, _ = get("/demo")
                check("compiled_demo_available", status == 200)
                for path in DENIED_PATHS:
                    status, _ = get(path)
                    check(path + ":forbidden", status == 403)
        except (httpx.HTTPError, ValueError, TypeError, AttributeError):
            check("bounded_probe_completed", False)
    return {
        "schema": "forge-deployment-audit-1",
        "passed": bool(checks) and all(c["passed"] for c in checks),
        "checks": checks,
        "transport": "local_fixture_not_deployed"
        if transport is not None
        else "https_verified_by_client"
        if tls_verified
        else "https_not_verified"
        if origin.startswith("https://")
        else "loopback_http_not_public_https",
        "scope": "Read-only HTTP boundary/configuration checks; not a penetration test or proof of hosting billing/retention. No model calls or investigation mutations.",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True)
    parser.add_argument("--allow-loopback-http", action="store_true")
    args = parser.parse_args(argv)
    try:
        result = audit(args.url, args.allow_loopback_http)
    except ValueError:
        print(
            "Invalid audit origin. HTTPS is required outside explicit loopback tests."
        )
        return 2
    print(json.dumps(result, indent=2))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
