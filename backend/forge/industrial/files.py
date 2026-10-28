"""Bounded offline JSON reads; do not follow symlinks or block on special files."""

import json
import os
import stat
from pathlib import Path


def read_json(path: Path, limit: int = 1048576) -> dict:
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, "rb") as file:
        metadata = os.fstat(file.fileno())
        if not stat.S_ISREG(metadata.st_mode) or metadata.st_size > limit:
            raise ValueError("Report must be a bounded regular file")
        raw = file.read(limit + 1)
    if len(raw) > limit:
        raise ValueError("Report exceeds limit")
    value = json.loads(raw)
    if not isinstance(value, dict):
        raise TypeError("Report must be an object")
    return value
