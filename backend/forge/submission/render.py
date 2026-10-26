"""Render-specific environment wiring, with no account/API/network operations."""

import json
import re
from collections.abc import MutableMapping


def configure_render(environ: MutableMapping[str, str]) -> None:
    if environ.get("RENDER") != "true":
        return
    hostname = environ.get("RENDER_EXTERNAL_HOSTNAME", "")
    if not re.fullmatch(
        r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.onrender\.com", hostname
    ):
        raise ValueError("An exact Render platform hostname is required")
    if "FORGE_DEMO_ALLOWED_HOSTS" not in environ:
        environ["FORGE_DEMO_ALLOWED_HOSTS"] = json.dumps(
            ["localhost", "127.0.0.1", "::1", hostname]
        )
    else:
        hosts = json.loads(environ["FORGE_DEMO_ALLOWED_HOSTS"])
        if (
            not isinstance(hosts, list)
            or hostname not in hosts
            or "127.0.0.1" not in hosts
        ):
            raise ValueError(
                "Render hostname and loopback health host must be explicitly allowed"
            )
