# Product completion candidate

This candidate branches from exact owner-reported deployed application `8f984c2b1ce27ba2fcd638b9f4089fa0ff7ccafd`. The deployed SHA is owner-reported, not independently inspected through Render. Branch: `feature/forge-product-completion`. No Render service, main/deployment branch, historical commit or timestamp was changed. Previous release-preparation documents remain on their original branch.

## What changed and what was reused

The existing modular FastAPI/React application, NumPy/SciPy simulation, sequential selector, independent verifier, SQLite version/lease controls, report digests/replay, security middleware and protected Baseten adapter were reused. No second engine, new graphics library, paid infrastructure or model call was introduced.

Added two genuinely distinct channel recipes to the existing preset registry. The API still rejects public recipes/uploads, private inference and arbitrary interventions. Public defaults supply fixed RIG-104 metadata and a declared synthetic acquisition clock for the new cases. Existing benchmark recipes and JSON evidence are unchanged. Chart selection now starts with a flagged signal instead of always showing pressure. Timestamp inspection derives from the acquired-at clock plus one-minute offsets.

Copy review covered the six public stages, lobby, guide panels, model labels, equipment inspector and report. Shortened the introduction and repeated guide warnings, explicitly renamed “Deterministic” to “Rules-based, not Meta”, replaced raw equipment status identifiers with readable labels, filtered candidate causes to the selected signal and moved long provenance into disclosures. Uncertainty, synthetic provenance, model availability and hosting warnings remain visible. Legacy developer labs remain restricted and were regression-tested; their copy was not completely rewritten.

The HTML report now presents case information, findings, channel verification, uncertainty, ranked causes, before/after witness means, evidence provenance and limitations, followed by the complete escaped audit record. Tables have named column headers, responsive overflow and print styling. Witness values are explicitly normalized baseline units. JSON schema, replay and numerical conclusions are unchanged. Updated historical sample HTML/manifest hashes intentionally reflect the renderer; original JSON exports remain byte-identical.

Added bounded waits for response headers and clear reconnect/reload advice. This is not an end-to-end deadline for every streamed response-body read. Reports and sessions remain subject to existing server bounds. Added automated scenario browser journeys with actual backend requests, refresh/restart isolation, report downloads and negative outcomes, plus component and report tests.

## Scenario methodology and ground truth

All cases describe the **existing synthetic three-channel test rig**, illustrated as a pump assembly. They are not new validated pump, cooling-loop or motor models. Replacing unsupported cooling-system and electric-motor claims with channel-level test-rig incidents is deliberate.

Each recipe generates 120 one-minute observations. Baselines are 65°C, 2 mm/s and 6 bar; independent Gaussian measurement scales are 0.8°C, 0.08 mm/s and 0.12 bar, multiplied by the recipe's noise factor. Default onset is minute80. A process departure is nine baseline-scale units, positive for temperature/vibration and negative for pressure. A biased sensor adds ten scale units. Witness/intervention samples are separately computed; their normalized units differ from raw telemetry. No empirically fitted cross-signal correlation, energy balance, pump curve, rotor dynamics, causal field validation or operating load measurement is claimed. Constant nominal operation is a simulation assumption.

| Visible case / preset | Actual generation | Expected demonstrated behavior |
| --- | --- | --- |
| Pressure / `misleading_sensor` | Seed3042, pressure process departure plus pressure sensor bias | Two reference/input tests support both changes in the synthetic system |
| Temperature / `temperature_response` | Seed8043, temperature-only ramp over20 minutes after onset | Process temperature supported; compare with sensor explanation; fixed synthetic UTC clock |
| Vibration / `vibration_response` | Seed9043, vibration-only departure, noise factor2 | Process vibration supported; fixed synthetic UTC clock; does not prove bearing failure |
| Several signals / `noisy_multifault` | Seed3042, temperature and vibration departures, noise factor6 | Overall INCONCLUSIVE; vibration supported, temperature remains unresolved despite injected truth |
| Baseline / `normal` | Seed3042, no departures | Supported baseline, not a fault claim |
| Incomplete record / `insufficient` | Seed3042, temperature departure,75% missing | ABSTAIN without fabricated certainty |
| Overlapping effects / `confounded` | Seed3042, temperature/vibration departures and shared confounding offset | INCONCLUSIVE after the bounded test budget |

Thermal and waveform arrays remain descriptive synthetic context. They are not dynamically coupled to every recipe, independently time-aligned or proof of native model vision/audio. Sample timestamps are declared demonstration clocks, not real acquisition records. Apparent precision is generated numerical output, not validated sensor calibration.

## Intelligence and evaluation

Candidate generation is separate from numerical verification. Existing selection uses deterministic competing predictions, remaining uncertainty and a maximum of four experiments; users review/confirm that proposal. Arbitrary experiment choice is not exposed because replay reconstructs the policy and verifies the execution history. Ranking is ordinal, not calibrated confidence. Gaussian interval coverage tests describe the fixed statistical policy, not industrial causality or Bayesian diagnosis probability.

The 480/280/280 case suites were rerun (1,040 synthetic cases). The sequential280-case suite retains accepted precision198/198, answerable exact-set recall198/220, coverage198/280, required abstention60/60, detector false positives0/20 and false negatives39/260, first-target relevance199/200, mean2.425 experiments. These results include weak/noisy false negatives; 100% accepted precision is not universal diagnostic accuracy. See validation JSON for measured runtime and denominators. Genuine model performance is unmeasured.

## Validation and performance scope

The validation artifact and browser results record actual checks, environment limits and measurements. The seven-case browser runner uses separate loopback public-mode processes, preserving existing quotas rather than weakening them. Every case is exercised through actual case creation, evidence, proposed tests, sequential completion, six-stage navigation, independent findings, JSON/HTML downloads, refresh and a new isolated session. All exported JSON records are replayed offline. Four-experiment cases wait for the normal quota window before restarting. No fake frontend outcome is injected.

The original all-width browser runner additionally covers 320/375/390/430px, desktop, charts, thermal/waveform, keyboard equipment controls and explicit missing data. Accessibility checks cover names/headings/contrast via Axe and keyboard automation, not certification with physical screen readers. Viewport emulation is not physical mobile performance. Bounded JS-heap samples are not leak detection. Timing includes browser automation/download overhead and warm local hosting, not public cold starts or pure server latency. The resource-limited container is not a claim about Render's internal runtime flags.

## Security and release limits

Full backend regression covers authentication/private access, public allow-list, request/response/resource limits, invalid inputs, safe errors, optimistic versions, leases/concurrent sessions, integrity and tampering. The report renderer replays input before rendering and escapes all data; a new injection test checks equipment titles. Dependency audits and a local container boundary audit supplement those tests, not a penetration test or complete security certification. The image launcher requires public mode, disabled inference, zero requests and no provider/owner key. No credentials were accessed or committed.

This remains a **public research demonstration**, not an enterprise industrial system: ephemeral SQLite, one process, no multi-tenant identity/account system, no durable backups or guaranteed uptime, no real equipment ingestion/actuation, no calibrated digital twin, no arbitrary test designer, no signed source attestation and no genuine Meta execution. No monitoring/keep-alive service was added. Export reports and preserve the recorded fallback independently.

Review the final commit in the final report. Deployment requires fresh owner approval of that exact SHA; do not reuse approval for8f984c2 or deploy a moving head silently. Use the existing exact-commit Render procedure, keeping Free/auto-deploy off/public/no keys/zero inference, and verify actual external commit/readiness/full anonymous workflow afterward. Preserve both the owner-reported current8f984c2 and earlier known rollback5e2ad425 without altering branches/history. No deployment has occurred. Model activation, eligibility clarification, final recording and submission remain separate owner gates; no organizer was contacted.
