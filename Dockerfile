# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --strict-ssl=true --no-audit
COPY frontend/ ./
RUN npm run build

FROM ghcr.io/astral-sh/uv:0.12.23 AS uvtool
FROM python:3.12-slim-bookworm AS backend
COPY --from=uvtool /uv /usr/local/bin/uv
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export SSL_CERT_FILE=/run/secrets/proxy_ca; fi; \
    UV_LINK_MODE=copy uv sync --frozen --no-dev

FROM python:3.12-slim-bookworm AS runtime
RUN groupadd --gid 10001 forge && useradd --uid 10001 --gid 10001 --create-home forge \
    && mkdir -p /data && chown forge:forge /data
WORKDIR /app/backend
COPY --from=backend --chown=forge:forge /app/backend /app/backend
COPY --chown=forge:forge backend/forge /app/backend/forge
COPY --from=frontend --chown=forge:forge /app/frontend/dist /app/frontend/dist
ENV FORGE_DEMO_MODE=public FORGE_DEMO_DB_PATH=/data/investigations.sqlite3 \
    FORGE_PROVIDER=mock FORGE_INFERENCE_ENABLED=false FORGE_INFERENCE_REQUEST_BUDGET=0 \
    PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=7860
USER forge
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD /app/backend/.venv/bin/python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','7860')+'/api/v3/ready',timeout=3)"
CMD ["/app/backend/.venv/bin/python", "-m", "forge.submission.serve"]
