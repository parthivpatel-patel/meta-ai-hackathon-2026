"""Fail-closed public-demo launcher. Owner inference is a separate local CLI."""

import os

import uvicorn

from ..phase2.inference import TransportSettings
from ..phase3.safety import DemoSettings


def public_launch_blockers(
    demo: DemoSettings, inference: TransportSettings
) -> list[str]:
    blockers = []
    if demo.mode != "public":
        blockers.append("public_mode_required")
    if inference.enabled or inference.request_budget != 0:
        blockers.append("inference_must_be_disabled_with_zero_request_budget")
    if inference.api_key is not None and inference.api_key.get_secret_value():
        blockers.append("public_container_must_not_receive_inference_credentials")
    if demo.access_token is not None:
        blockers.append("public_container_must_not_receive_owner_credentials")
    return blockers


def main() -> int:
    try:
        blockers = public_launch_blockers(DemoSettings(), TransportSettings())
        port = int(os.environ.get("PORT", "7860"))
        if not 1 <= port <= 65535:
            blockers.append("invalid_port")
        if os.environ.get("FORGE_PROVIDER", "mock") != "mock":
            blockers.append("legacy_provider_must_be_mock")
    except ValueError:
        print("Public startup refused: invalid deployment configuration")
        return 2
    if blockers:
        print("Public startup refused: " + ", ".join(blockers))
        return 2
    uvicorn.run(
        "forge.main:app",
        host="0.0.0.0",
        port=port,
        workers=1,
        proxy_headers=False,
        server_header=False,
        access_log=False,
        limit_concurrency=32,
        backlog=32,
        timeout_keep_alive=5,
        timeout_graceful_shutdown=15,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
