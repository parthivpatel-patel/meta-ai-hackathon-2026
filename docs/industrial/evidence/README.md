# Acceptance evidence

These artifacts come from actual local test runs on `feature/forge-industrial-workstation`, based on `bf500f04ca865568cb28fb73f83ccc7a197aa360`. They do not establish a public deployment or genuine Meta inference. Final commit identity is in the handoff/Git history; an artifact cannot embed the hash of its own containing commit. [Source hashes](image-source-hashes.json) bind the tested image to backend modules and every compiled frontend asset.

- [Backend transcript](backend-tests.txt), [frontend tests](frontend-tests.txt), [type-checked production build](frontend-build.txt), [Ruff](ruff.txt), [Docker build](docker-build.txt).
- [Container audit](container-audit.json): actual non-root image, 32 public HTTP checks and credential-bearing public-start refusal. Loopback HTTP is not external HTTPS evidence.
- [Machine browser journeys](browser-results.json), [mobile/lifecycle/graphics/controls](lifecycle-results.json), [machine replays](coupled-replays.json).
- [Same-branch library browser rerun](library/browser-results.json), [all-width observations](library-all-width-browser.json), [legacy replays and original fixture byte identity](legacy-replays.json). The width file has 56 actual Axe views plus five interaction-performance samples; do not count the latter as accessibility audits.
- Offline evaluations: [480 v1](v1-evaluation.json), [280 v2](v2-evaluation.json), [280 sequential](v3-evaluation.json), [21 coupled](coupled-evaluation.json). Only synthetic fixed panels; not genuine-model or field accuracy.
- Dependency audits: [npm](npm-audit.json), [Python](python-audit.json). Zero known findings at run time is not a security guarantee.
- [Bounded secret-pattern scan](security-scan.json), [artifact checksums](manifest.json), and [validation summary](../validation.json).

## Machine reports downloaded from the browser

| Scenario | JSON | HTML | Expected boundary |
| --- | --- | --- | --- |
| Normal | [Record](normal.json) | [Report](normal.html) | Baseline support |
| Bearing degradation | [Record](bearing.json) | [Report](bearing.html) | Vibration-channel support |
| Misalignment | [Record](misalignment.json) | [Report](misalignment.html) | Inconclusive overlapping response |
| Cavitation-like | [Record](cavitation.json) | [Report](cavitation.html) | Inconclusive; no-WebGL browser run |
| Pressure instrument | [Record](pressure_sensor.json) | [Report](pressure_sensor.html) | Sensor-pressure support |
| Cooling degradation | [Record](thermal.json) | [Report](thermal.html) | Temperature-channel support |
| Process disturbance | [Record](process.json) | [Report](process.html) | Pressure-channel support |

Reports are synthetic and disclose simulator recipes. Prepared future model evidence excludes those labels/seeds and does not initiate transport. Screenshots are unedited local candidate captures, not production screenshots. Manual visual review covers the bearing machine/plots, narrow pressure view, fallback and verification. Software WebGL timings and emulated touch widths do not replace physical-device or screen-reader testing.
