# Validation and reproduction

The exact baseline was rerun before major changes: 234 backend tests, 32 frontend tests, TypeScript/Vite build and all 1,061 existing synthetic cases. Current expanded test counts, browser results, image/source hashes, dependency findings and measurements are recorded in [validation.json](validation.json) and the final handoff. CI conclusions are separate from local observations.

From `backend`:

```sh
uv run --frozen pytest -q
uv run --frozen python -m forge.evaluate --output /tmp/v1.json
uv run --frozen python -m forge.phase2.evaluate --output /tmp/v2.json
uv run --frozen python -m forge.phase3.evaluate --output /tmp/v3.json
uv run --frozen python -m forge.industrial.evaluate --output /tmp/coupled.json
uv run --frozen python -m forge.industrial.meta_evaluate --output /tmp/fixture-comparison.json
uv run --frozen python -m forge.submission.smoke
uv run --frozen python -m forge.submission.model_evaluation
uv run --frozen python -m forge.industrial.meta_cli
uv run --frozen python -m forge.industrial.replay /path/report.json --html /path/new-report.html
```

The last three preflights make zero genuine requests. Do not add `--execute`. The seven-case model fixture comparison always injects a local transport; it validates independent decisions/trial/replay consistency, not model quality. The genuine six-case protocol remains dry/unexecuted.

From `frontend`: `npm run check:tests`, `npm test`, `npm run build`. Source-level tests cover output/credential gates, serialized leakage, HTTP/provider failures, malformed IDs/tools/rationales, missing usage, record tampering, file bounds/output permissions and public restrictions. UI tests cover status/source/preparation gates, missing captures, unexpected status, cancellation and rotor phase. Existing regression assertions remain preserved.

Build the existing Docker image, using the managed session CA secret and Unix socket where required. Start isolated loopback public containers on 8050–8059 with the existing read-only/tmpfs/512 MiB/one-CPU/cap-drop/no-new-privileges recipe. The established machine/lifecycle scripts use 8050–8058; `scripts/meta-integration-browser.cjs` uses 8059. Supply optional Playwright/Axe tooling through `NODE_PATH`; the scripts use `/usr/bin/chromium`, software SwiftShader WebGL or explicitly disabled WebGL. No diagnostic API result is canned. The new script runs the offline private CLI with `--fixture` only; its 0600 private receipt stays under `/tmp`, outside the evidence package.

Run the preserved seven-case library runner on separate fresh ports 8040/8041/8042/8043/8045/8046/8047 and all-width runner on 8044 as documented in [the earlier guide](../product-completion/README.md). Use fresh own test containers or wait for normal quota windows; never raise limits to make tests pass. Dispose completed acceptance containers only after preserving exports. Docker VFS copies container filesystems, so stage these groups to avoid disk exhaustion.

Measure warm controls readiness, selection/capture/experiment/export latency, rotor/pause coherence, short telemetry update gaps, camera RAF cadence, GC-assisted heap snapshots and actual compiled byte/gzip sizes. Label software rendering, concurrent local workloads and viewport emulation. These are not hardware presentation FPS, production cold-start, durable hosting or memory-leak guarantees. Exclude the five legacy performance-only entries from Axe view counts.

The final evidence package must retain actual transcripts, numerical summaries/denominators, browser captures/exports, replay checks, container/dependency/credential review and artifact checksums. No raw credential, environment dump or private provider receipt belongs in Git or screenshots.
