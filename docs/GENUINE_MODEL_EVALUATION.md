# Genuine model evaluation protocol

This suite is **implemented and fixture-tested, not run against a genuine model**. It is separate from the 480/280/280-case synthetic benchmarks and does not replace them. No actual-model accuracy, latency, usage or dollar cost is reported.

## Predeclared panel and fairness

`forge.submission.model_evaluation` fixes six profiles before genuine testing: normal, pressure plus sensor error, noisy temperature/vibration faults, sensor drift, confounded controls and 75% missing data. Seeds start at 12031 and increase by 17, outside the existing benchmark seed ranges. A panel hash records the exact recipes. Ground-truth labels/recipes are retained by the evaluator and are never supplied to the model; only observed statistics and contextual features are passed.

Each baseline/model-assisted pair uses identical telemetry, contextual assets, independent oracle and maximum four-test budget. The model arm proposes structured causes. **Selection, stopping and verification remain deterministic**, so final findings can be identical by design. Do not market this comparison as evidence that the model selects better tests or improves verifier accuracy. It measures proposal behavior, transport validity and faithful integration within a verified investigation.

The missing-data case abstains before hypothesis generation, so it sends no model request. The maximum is five requests, no retries. The entire suite stops on the first failure; failed model arms remain missing, not baseline substitutes. A malformed/authentication/quota failure is an observed operational result, not a zero-accuracy diagnosis for an unseen case.

## Recorded evidence

- Exact requested and validated returned model identity and source; fixtures remain `test_transport`.
- Per-attempt HTTP status, safe failure code, elapsed request time and provider-reported usage when present. No prompts, raw HTTP bodies, headers or credential-bearing exceptions are stored in diagnostics.
- Full replayable reports for both completed arms and separate known synthetic truth in the private artifact.
- Diagnostic agreement: complete supported finding equals the known cause set on answerable cases.
- Accepted precision and required abstention with explicit denominators.
- Proposal truth mismatches: candidate IDs outside the latent synthetic cause set. Competing alternatives are allowed; this metric is **not automatically a hallucination or unsafe-claim score**.
- Rejection: on identifiable cases with truth-mismatched proposals, how often every such candidate is contradicted by verification. Inconclusive/unresolved is not counted as a successful rejection. This is candidate-support verification, not a semantic fact checker of every rationale sentence.
- First non-reference intervention relevance, tests consumed, matched decision differences and each noisy/confounded/missing profile's outcomes.
- Latency sample size/p50/p95, reported tokens and missing-usage count. Fixture token values and timing are not genuine provider measurements. No dollar-cost estimate is invented.

Case-level binomial proportions include Wilson 95% intervals; denominator zero yields null. The six fixed profiles are a small engineering pilot, not a representative population sample. The intervals are descriptive and must not be presented as industrial confidence guarantees. Noise robustness is a per-case observation here, not a measured noise-response curve or a broad robustness certification. Proposals within a case are correlated; no unsupported per-proposal independence claim is made.

## Gates and reproduction

Follow `MODEL_ACTIVATION.md` and review the zero-request preflight. Real execution requires a private genuine smoke receipt, current credit/card-free confirmations, the exact event model/endpoint, bounded reservations/deadlines and separate explicit owner authorization. Execution on public/Render mode is refused. Outputs are new private 0600 files with a pending marker and no overwrite; do not retry automatically after an interruption.

CI runs only the dry CLI and local HTTP fixtures. `docs/final-fixture-evaluation.json` demonstrates six matched fixture pairs, five intercepted requests and zero real calls; its permissive fixture proposes all registered alternatives. It is test evidence for the harness and verification boundary, **not model evaluation evidence**.
