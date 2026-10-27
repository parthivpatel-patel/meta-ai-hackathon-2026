"""Deterministic bounded PNG conversion of calibrated thermal arrays, not model vision."""

import base64
import hashlib
import struct
import zlib

from ..engine.contracts import digest
from .evidence import ThermalFrame


def thermal_png(frame: ThermalFrame) -> tuple[str, str]:
    rows = frame.pixels
    low = min(map(min, rows))
    high = max(map(max, rows))
    height = len(rows)
    width = len(rows[0])
    # Explicit false-color scale: dark brown → warm cream. No interpolation or invented pixels.
    raw = bytearray()
    for row in rows:
        raw.append(0)
        for value in row:
            t = (value - low) / (high - low) if high != low else 0
            raw.extend((round(65 + 180 * t), round(48 + 155 * t), round(30 + 95 * t)))

    def chunk(kind, data):
        return (
            struct.pack("!I", len(data))
            + kind
            + data
            + struct.pack("!I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack("!IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    return "data:image/png;base64," + base64.b64encode(png).decode(), hashlib.sha256(
        png
    ).hexdigest()


def thermal_identity(frame: ThermalFrame) -> tuple[str, str]:
    return digest(frame.model_dump()), thermal_png(frame)[1]


def verify_visual_record(record, assets) -> bool:
    if record.input_mode == "numerical_summaries":
        return record.visual_input_hash is None and record.visual_png_sha256 is None
    return assets.thermal is not None and (
        record.visual_input_hash,
        record.visual_png_sha256,
    ) == thermal_identity(assets.thermal)
