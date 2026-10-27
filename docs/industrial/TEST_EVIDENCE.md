# Test and demonstration evidence

Baseline exact `bf500f04ca865568cb28fb73f83ccc7a197aa360`: 209 backend and 25 frontend tests passed before branching. The expanded suites pass **234 backend / 32 frontend**. See [validation.json](validation.json), [evidence index](evidence/README.md) and [engineering report](ENGINEERING_REPORT.md) for actual run scopes, logs and limitations. GitHub Actions is reported separately in the final handoff after pushing; local results are not invented CI results.

Commands from the appropriate directories:

```sh
# backend
uv run --frozen pytest -q
uv run --frozen python -m forge.evaluate --output /tmp/v1.json
uv run --frozen python -m forge.phase2.evaluate --output /tmp/v2.json
uv run --frozen python -m forge.phase3.evaluate --output /tmp/v3.json
uv run --frozen python -m forge.industrial.evaluate --output /tmp/coupled.json
uv run --frozen python -m forge.industrial.replay report.json --html report.html
# frontend
npm run check:tests
npm test
npm run build
```

`industrial-browser-check.cjs` uses real local public containers on8050–8056, one per machine scenario so the existing quotas are preserved. It exercises real WebGL with SwiftShader and explicitly disables WebGL for the cavitation case, plays/pauses, selects components/cameras, captures evidence, confirms proposed experiments, inspects counterfactual responses, exports both formats, round-trips telemetry and rejects invalid imports. It never injects a canned diagnostic response.

The established seven-case and all-width browser scripts now explicitly open `?view=investigations`; assertions and original scenarios remain intact. They continue to exercise the original workflow rather than silently testing the new view instead. Captured exports are independently replayed. Browser/Axe tooling is optional external development tooling, not a new runtime backend dependency.

For production validation, build `docker build -t forge-industrial .` (in this managed cloud, supply the session CA with `--secret id=proxy_ca,src=/etc/ssl/certs/ca-certificates.crt` and the explicit managed Unix socket). Start loopback replicas on ports 8050–8058 for the two scripts, without keys:

```sh
for port in $(seq 8050 8058); do
  docker run -d --name forge-industrial-$port -p 127.0.0.1:$port:7860 \
    --read-only --tmpfs /tmp:rw,nosuid,nodev,size=64m --memory=512m --cpus=1 \
    --cap-drop=ALL --security-opt=no-new-privileges \
    -e FORGE_DEMO_DB_PATH=/tmp/investigations.sqlite3 \
    -e FORGE_DEMO_STORAGE_EPHEMERAL=true \
    -e OPENBLAS_NUM_THREADS=1 -e OMP_NUM_THREADS=1 forge-industrial
done
# Supply Playwright and @axe-core/playwright through a development-only install.
NODE_PATH=/path/to/browser-tools/node_modules node scripts/industrial-browser-check.cjs
NODE_PATH=/path/to/browser-tools/node_modules node scripts/industrial-lifecycle-check.cjs
python scripts/check-container.py forge-industrial-8050 --image forge-industrial
```

Scripts use `/usr/bin/chromium`, local software WebGL, actual backend responses, public quotas and bounded container resources. Four-test cases wait for the normal quota window before extra import checks. This deliberately takes several minutes. Nine simultaneous replicas require sufficient disposable Docker storage; VFS copies images. Remove only these named local test containers after preserving evidence. The legacy runners retain their existing separate port/environment setup described in the [earlier reproduction guide](../product-completion/README.md).

Operator walkthrough: open `/demo`, choose bearing degradation, start simulation, focus the scenario window, inspect bearing instruments, capture, review competing channel explanations, run the reference/targeted tests, inspect the machine response and verification, export/replay. Repeat pressure-sensor offset to demonstrate process-versus-sensor distinction. Show misalignment or cavitation uncertainty. No model key is necessary. Genuine eligible-model evidence remains a separate submission gate.

The final same-branch legacy browser rerun used the preserved library code before the final workstation-only chart/window refinements. Its seven journeys and 56 automated view/viewport checks remain valid regression evidence; five additional entries in the all-width JSON are performance samples, not Axe runs. The final current-image machine run adds 14 Axe views and three narrow touch views. No physical screen-reader or mobile-device certification is claimed.
