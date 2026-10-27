# Evaluation method and measured Phase 1 results

## Blind boundary

The experiment factory alone receives `CaseRecipe` (scenario, seed, noise factor, missingness, sensor bias, confounder). Candidate generation and automatic experiment selection accept only `BlindInput`: validated channel flag counts, maximum robust scores, coverage, and quality issues. The verifier accepts raw observed telemetry and raw experiment results, plus an optional typed proposal. It imports neither the generator nor the private oracle. No scenario label, seed, scenario-bearing identifier, or evaluator answer is passed to either inference boundary.

This is a tested software data-flow boundary in a trusted Python process, not a sandbox against malicious Python code. The operator can select a scenario in the demo UI, and the published evaluator output contains answer keys. The generator does not see those UI controls or evaluation outputs. This is not a private competition test set.

## Fixed experiment and verification policy

Candidate set: one baseline-variability explanation plus process and sensor explanations for each of three channels. Automatic selection targets the most sustained flagged channel (at least 5 robust flags); otherwise it performs a reference check. Ties use maximum anomaly score. An operator may choose another allowlisted intervention before execution.

The independent experiment oracle uses 24 replicates and 24 steps of `x_next = x + 0.25 * (target - x)`. A synthetic process departure has normalized residual ±9. A matching intervention sets the target to 15% of that residual. Independent primary and witness noise has standard deviation `0.5 * noise_factor`; a sensor-bias case adds +10 only to the primary sensor. Confounded cases introduce departures outside the supported single-fault response model. This is a scripted counterfactual mechanism, not an independently validated physical twin.

The verifier recomputes 99% pointwise Student-t intervals. They are not simultaneous intervals, posterior cause probabilities, or a calibrated real-equipment confidence score. Support requires sustained telemetry flags, a matching intervention, witness departure outside ±4, reduction interval wholly above 3, and post-intervention primary/witness intervals within ±2, with baseline primary/witness agreement. Sensor support instead requires primary/witness separation above 4, a quiet witness before/after, and sustained primary departure. Normal support requires quiet primary and witness intervals in all channels and no sustained telemetry flags. Baseline/coverage failures produce ABSTAIN; ambiguity, unexplained channels, or insufficient effect produce INCONCLUSIVE. Physical-cause proposals are always REJECTED.

## Reproducible case matrix

Run `cd backend && uv run --frozen python -m forge.evaluate --output evaluation/results.json`.

Seeds 100–119; four original scenarios × five profiles (clean, 15% missing, noise factor 6, 75% missing, confounded), plus three normal-process sensor-bias cases and one combined-fault case per seed: **480 cases**. Test/development examples use seeds 0, 1, and 42. Policies were fixed before this evaluation; the observation noise-scaling implementation was corrected and the entire matrix regenerated. Published cases are now available for inspection and must not be treated as permanently unseen data.

Source of actual results: [results.json](backend/evaluation/results.json), including every case's inputs to the factory, expected answer, selected experiment, decision, finding, and dataset hash. The investigator never receives that answer-key file. Cases sharing seeds/profiles are correlated, so aggregate rates are descriptive and no independent-case confidence intervals are claimed.

| Measurement | Actual result |
|---|---:|
| Supported synthetic findings | 220 / 480 (45.83% coverage) |
| Precision among supported findings, including normal findings | 220 / 220 (100% on this synthetic matrix) |
| Correct finding recall on supported-scope cases | 220 / 300 (73.33%) |
| Experiment selection accuracy on eligible cases | 247 / 300 (82.33%) |
| ABSTAIN | 80 |
| INCONCLUSIVE | 180 |
| Expected abstention/inconclusive on out-of-policy cases | 180 / 180 |
| Additional abstentions on supported-scope cases | 80 |
| Robust detector false-positive rate | 0 / 80 |
| Robust detector false-negative rate | 113 / 400 (28.25%) |
| Fixed-threshold baseline false-positive rate | 20 / 80 (25%) |
| Fixed-threshold baseline false-negative rate | 71 / 400 (17.75%) |
| Observational-only forced-finding baseline accuracy | 187 / 480 (38.96%) |

For detection metrics, invalid/insufficient observations count as no detection, so false negatives include missing-data cases; verifier abstention is reported separately. A robust detection requires at least five flagged samples. The fixed baseline flags any post-baseline temperature >75 °C, vibration >3 mm/s, or pressure <5 bar. The observational-only baseline forces a process finding on the most flagged channel or normal, without experiments; it cannot distinguish sensor bias or safely abstain. Detection false-negative tradeoffs and low coverage are limitations, not suppressed failures.

Clean, 15%-missing, and isolated sensor-bias cases produce the 220 accepted findings. All 80 high-noise cases are inconclusive. Missing75 produces 80 abstentions; confounded and combined faults produce 100 inconclusive cases. No real-world diagnostic precision, industrial safety, model quality, multimodal capability, or physical causality follows from these results.

Automated numerical/API/security/frontend tests and reproducible browser commands are documented in [Phase 1 validation](docs/PHASE1_VALIDATION.md). Phase 2 should use new untouched seeds, realistic dependence, weaker and combined effects, and independent licensed data rather than tune to this published matrix.


## Phase 2 measured extension

The new published matrix uses seeds 7000–7019 and 14 new composite/ramp/late/noisy/missing profiles, 280 cases total. Accepted complete-set precision is 212/212, coverage 212/280, answerable exact-set recall 212/240, detector FPR 0/20 and FNR 44/260; 20 cases abstain and 48 are inconclusive. All 40 out-of-policy cases abstain or remain inconclusive. Matched-data v1 complete-set precision is 60/66 and coverage 66/280. V2 expends 16× the raw experimental sample budget; this is not equal-compute evidence of algorithmic superiority. No live model outputs were evaluated. Method, profile breakdown, scripts and limitations are in [docs/PHASE2.md](docs/PHASE2.md); raw records are in [phase2-results.json](backend/evaluation/phase2-results.json).


## Phase 3 executed evaluation

The committed backend/evaluation/phase3-results.json records280 new synthetic cases over14 profiles/seeds9000–9019. Accepted precision198/198; answerable recall198/220; coverage198/280; required abstention60/60; detector FNR39/260. Budget-matched fixed prefix coverage78/280; matching is post hoc, not optimized stopping. Adversarial suggestions cannot alter verification.50 Gaussian interval families test interval coverage, not causal calibration. In-process latency excludes browser/storage/network/model calls. No real-model cost or accuracy has been measured. Full definitions and limitations: docs/PHASE3.md.

## Final genuine-model pilot

The separate dry-default `forge.submission.model_evaluation` suite uses six predeclared new-seed matched cases, at most five model calls and equal four-test budgets. It requires genuine smoke evidence and separate owner authorization, stops on first failure, records actual usage/latency when supplied, and reports case-level intervals and missing denominators. Only clearly labeled fixtures have executed. See [the protocol](docs/GENUINE_MODEL_EVALUATION.md); no actual-model metrics or industrial accuracy are claimed.
