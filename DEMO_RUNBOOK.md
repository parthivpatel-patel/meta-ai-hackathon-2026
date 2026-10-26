# Reproducible demonstration runbook

Requirements: Python 3.12+, uv 0.12.23, Node 24, npm; optional Docker. No API key, GPU, account or payment method is needed for this rehearsal. Run from repository root unless a command changes directory.

```bash
UV_CACHE_DIR=/tmp/forge-uv-cache uv sync --project backend --frozen
npm ci --prefix frontend --cache /tmp/forge-npm-cache
npm run build --prefix frontend
mkdir -p /tmp/forge-demo
cd backend
FORGE_DEMO_MODE=public FORGE_DEMO_DB_PATH=/tmp/forge-demo/investigations.sqlite3 \
  .venv/bin/uvicorn forge.main:app --host 127.0.0.1 --port 7860 --workers 1 --no-access-log
```

Open local `/demo` on that server. Build **before** startup; restart after rebuilding. `/api/v3/ready` must return ready with storage and frontend bundle true. This public mode accepts only five fixed synthetic presets. It blocks legacy mutations, custom recipes/uploads, documentation routes and all real inference. Keep the listener local unless an appropriate HTTPS ingress is configured. Do not expose development/Vite mode publicly.

For the preserved Phase 0–2 dashboard, run backend local mode on port 8000 and `npm run dev --prefix frontend -- --host 127.0.0.1` in another terminal; Vite's `/` serves that dashboard and `/demo` the sequential console. Local mode has unrestricted development APIs and must stay local.

## Docker option

```bash
docker build -t forge:phase3 .
docker run --rm --name forge-demo -p 127.0.0.1:7860:7860 \
  --mount type=volume,src=forge-demo-state,dst=/data \
  --memory 512m --cpus 1 --cap-drop ALL --security-opt no-new-privileges forge:phase3
```

The image runs as UID 10001, with one worker, no inference, and a readiness healthcheck. Named volume retains investigations across container restarts. Use a separate new volume for a fresh rehearsal; never delete data without checking its purpose. For this managed cloud's build proxy, preserve Docker credentials/config, set `BUILDX_CONFIG=/tmp/forge-buildx` if home is read-only, and pass `--secret id=proxy_ca,src=/etc/ssl/certs/ca-certificates.crt`. TLS verification remains enabled. No session CA is copied into image layers.

## Validation

```bash
UV_CACHE_DIR=/tmp/forge-uv-cache uv run --project backend --frozen pytest backend/tests -q
npm test --prefix frontend
npm run build --prefix frontend
cd backend
uv run --frozen python -m forge.evaluate --output /tmp/forge-v1.json
uv run --frozen python -m forge.phase2.evaluate --output /tmp/forge-v2.json
uv run --frozen python -m forge.phase3.evaluate --output /tmp/forge-v3.json
uv run --frozen python -m forge.phase3.replay /tmp/forge-phase3-report.json
```

For browser validation, install optional tooling outside the repository:

```bash
npm install --prefix /tmp/forge-browser --cache /tmp/forge-npm-cache playwright
NODE_PATH=/tmp/forge-browser/node_modules node scripts/phase3-browser-check.cjs
```

Requires Chromium at `/usr/bin/chromium`, or set `CHROMIUM_EXECUTABLE_PATH`. Phase 3 browser test targets port 7860 (override `FORGE_DEMO_URL`); it waits 61 seconds between desktop and mobile to respect the default ten writes/minute. It saves screenshots and `/tmp/forge-phase3-report.json`. Run the existing `scripts/browser-check.cjs`, `scripts/phase2-browser-check.cjs` and `python scripts/api-smoke.py` against local backend8000+Vite5173. Replays for v1/v2 use their corresponding `forge.replay` and `forge.phase2.replay` modules.

## Recovery and constraints

- Reload/restore loads the last persisted version; duplicate/stale actions return409. Wait for an in-progress action before retrying. Leases expire after120 seconds; action timeout100 seconds.
- 429: wait60 seconds. Defaults:60 API requests/client/minute,10 writes/client/minute,240 global requests/minute. Forwarded headers are ignored. Proxy users may share a quota. These limits are per process; use one worker.
- Storage503: check volume ownership, capacity and permissions. Maximum256 sessions,24h logical retention; expired rows purge on creation. Back up locally if needed. Storage failure at startup intentionally prevents readiness.
- Expired session404: start a new preset. Network failure never triggers model fallback. Reconnect/restore is explicit.
- Private mode requires `FORGE_DEMO_ACCESS_TOKEN` of at least32 characters, supplied securely; browser keeps it only in memory. It is owner authentication, not multi-user authorization. Do not put tokens in URLs, source or recordings.
- Baseten remains pending. No approved key, zero real calls, no live Meta demo. See `docs/META_INTEGRATION.md` before any future opt-in.
- No public hosting URL has been provisioned or verified. Local Docker is the tested fallback. Do not activate paid hosting.

## Phase4 deployment profile and activation

The image now launches through `forge.submission.serve`, which refuses developer/private mode, inference credentials or a nonzero request budget. Do not override its entrypoint for public hosting. `deploy/compose.yaml` is the tested local profile on127.0.0.1:7862 with read-only root, persistent data and resource limits. Run `docker compose -f deploy/compose.yaml up -d --no-build` after building `forge:phase4` (use the existing proxy CA secret in this managed environment). No TLS/public service is provisioned. Do not pass inference or owner credentials to this profile.

Public/private APIs now require an exact `FORGE_DEMO_ALLOWED_HOSTS` JSON list. Defaults permit localhost,127.0.0.1 and::1. A future public ingress needs its actual hostname plus127.0.0.1 for healthchecks; wildcards/URLs are rejected. Manual local/private uvicorn launches should use `--no-proxy-headers`; the guarded container launcher already does. The public audit and owner activation commands are in [OWNER_ACTIONS.md](OWNER_ACTIONS.md). The smoke tool is dry by default; no real request has been run.

## Render fallback and final judging access

Use root `render.yaml` on branch `deployment/judge-access`; see docs/HOSTING_AND_ACCESS.md for the free-only owner steps and limitations. The public launcher recognizes only a valid platform-provided exact `.onrender.com` hostname. `FORGE_DEMO_STORAGE_EPHEMERAL=true` enables explicit storage/sleep warnings. Current local checks do not establish Render deployment. Retain a recorded demo and exported reports through November18; never use periodic traffic to defeat idle spin-down.
