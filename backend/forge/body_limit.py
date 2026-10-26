"""Bounded ASGI prebuffer before JSON parsing, including chunked requests."""

import asyncio
from uuid import uuid4

from starlette.responses import JSONResponse


class BodyLimitMiddleware:
    def __init__(self, app, limit=1_048_576):
        self.app = app
        self.limit = limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        chunks = []
        size = 0

        async def reject(status, code):
            identifier = uuid4().hex
            response = JSONResponse(
                {
                    "error": {
                        "code": code,
                        "message": "Request body exceeded resource limits",
                        "request_id": identifier,
                    }
                },
                status_code=status,
                headers={
                    "X-Request-ID": identifier,
                    "X-Content-Type-Options": "nosniff",
                },
            )
            await response(scope, receive, send)

        try:
            async with asyncio.timeout(15):
                while True:
                    message = await receive()
                    if message["type"] == "http.disconnect":
                        return
                    size += len(message.get("body", b""))
                    if size > self.limit:
                        return await reject(413, "body_too_large")
                    chunks.append(message)
                    if not message.get("more_body", False):
                        break
        except TimeoutError:
            return await reject(408, "body_timeout")
        index = 0

        async def buffered():
            nonlocal index
            if index < len(chunks):
                message = chunks[index]
                index += 1
                return message
            return await receive()

        await self.app(scope, buffered, send)
