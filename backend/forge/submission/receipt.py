"""Owner-controlled local smoke receipt. Replay checks consistency, not signed authenticity."""

import json
import os
import stat
from pathlib import Path


def verified_smoke_receipt(path: Path | None, model_id: str) -> bool:
    if path is None:
        return False
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
        with os.fdopen(fd, "rb") as file:
            metadata = os.fstat(file.fileno())
            if (
                not stat.S_ISREG(metadata.st_mode)
                or metadata.st_mode & 0o077
                or metadata.st_size > 1048576
                or metadata.st_uid != os.getuid()
            ):
                return False
            data = json.loads(file.read(1048577))
        if (
            data.get("schema") != "forge-meta-smoke-1"
            or data.get("source") != "meta_http_response"
            or data.get("model_id") != model_id
            or data.get("request_attempts") != 1
        ):
            return False
        report = data["report"]
        record = report["investigation"]["inference"]
        if (
            report["investigation"]["model_source"] != "meta_http_response"
            or record["source"] != "meta_http_response"
            or record["requested_model"] != model_id
            or record["returned_model"] != model_id
        ):
            return False
        from ..phase3.reporting import replay

        replay(report)
        return True
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        return False
