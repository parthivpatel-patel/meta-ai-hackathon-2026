# Controlled genuine Meta activation

**Current gate:** the owner reports a protected Baseten key configured; its value and account entitlement remain unverified by this work. No genuine Meta inference has run in this environment. Earlier text authorizing an automatic test when a key appeared is superseded: **obtain fresh explicit owner authorization before every real smoke, evaluation or follow-up inference run.** Promotional credits are authorized for controlled testing only after availability and spending safeguards are confirmed.

## Before requesting authorization

1. The owner confirms selection and $100 promotional Baseten credits, but the **current remaining balance, card-free entitlement, model access and enforced stopping policy must be checked in the actual account**. No payment method, paid subscription or GPU deployment is allowed. The provider's notification-only budget is not sufficient; confirm enforced Model API limits/no paid fallback. Local request counters and reservation units do not prove billing limits.
2. Configure `BASETEN_API_KEY` through protected environment settings, scoped only to `inference.baseten.co`. Never send it in chat, commit it, print it or put it into frontend/public Render settings. A configured key alone never authorizes a probe.
3. Target only `meta-models/muse-spark-open-1026` at `https://inference.baseten.co/v1/chat/completions`. No public alias substitution. The participant confirms this restricted event identifier; final authenticated rules/account access still need owner review.
4. Use a trusted private/local owner runtime. Keep public Render credential-free, inference disabled and request budget zero. The public launcher refuses inference credentials. Check the official model license/Usage Policy and required **“Built with Muse Spark Open”** attribution before actual service use; the full license/terms links are in `docs/META_INTEGRATION.md`.

## First bounded request

Review `deploy/smoke.env.example`; it contains no credential. Use one request, no retries, maximum 1024 output tokens, reservation 8192 (or up to 16384), per-attempt 15s and total deadline at most 30s. Keep native thermal false. Enable credit/free-access and `FORGE_SMOKE_PROVIDER_SPENDING_LIMIT_CONFIRMED` attestations only after owner verification of enforced stopping behavior and explicit authorization.

From `backend`, first run the zero-request preflight:

```sh
uv run --frozen python -m forge.submission.smoke
```

**Only after the owner authorizes this exact one-request plan**, execute in the protected runtime:

```sh
mkdir -p ../artifacts
uv run --frozen python -m forge.submission.smoke --execute --output ../artifacts/event-smoke-01.json
```

The new artifact is exclusive and mode 0600. Existing paths/symlinks are refused before networking. A pending/interrupted marker means an attempt may have consumed credits; do not automatically retry under another filename.

Inspect the actual returned model, source `meta_http_response`, structured competing candidates, safe attempt timing/status, provider token usage when supplied and independent numerical replay. Workflow latency and request latency are different fields. Missing usage remains missing, not zero. HTTP 401/403, 402, 429, transport/deadline failures, invalid JSON/schema/model identity or tool-bearing output fail without fallback. Failed artifacts retain only safe diagnostics; raw bodies, headers and exception text are discarded.

No future test is implicitly authorized by a successful smoke. The receipt is administrative consistency evidence checked against a private owner-controlled file and independent replay, not a cryptographically signed provider attestation.

## Separate matched evaluation

After a genuine successful smoke, review `deploy/evaluation.env.example` and `docs/GENUINE_MODEL_EVALUATION.md`. Set `FORGE_INFERENCE_VALIDATED_SMOKE_PATH` to the genuine private receipt. The fixed pilot has six cases, at most **five** model calls (the missing-data case abstains before inference), zero retries and four experiments per arm. `FORGE_EVALUATION_OWNER_AUTHORIZED` defaults false. Request a separate explicit owner authorization after showing the dry preflight and checking remaining credits.

```sh
uv run --frozen python -m forge.submission.model_evaluation
# Execute only after that separate authorization:
uv run --frozen python -m forge.submission.model_evaluation --execute --output ../artifacts/event-evaluation-01.json
```

The suite stops at its first failed model arm; it does not substitute rules output or continue reserving credits. Review provider usage before any retry. Successful comparison does not prove industrial accuracy or a model-driven experiment policy.

## Follow-up owner UI and thermal evidence

Use the genuine receipt and a separately authorized request budget only in the trusted owner runtime. A configured key or fixture is not authenticated access. The exact event model supports a prepared native thermal PNG path, but its actual acceptance/interpretation has not been tested. Require separate authorization, `FORGE_INFERENCE_THERMAL_IMAGES=true` and, for the suite, `FORGE_EVALUATION_NATIVE_THERMAL_AUTHORIZED=true`. Keep numerical and native-image results separate.

No native audio path is implemented. The vibration evidence is measured in mm/s and processed by RMS/FFT; converting it into purported audio would misrepresent the evidence.

## Phase 5 workstation pathway

See [credential roles and exact request gates](docs/meta-final/ACTIVATION.md). `FORGE_INFERENCE_KEY` is not a supported alias and now fails closed when nonempty; conflicting canonical/generic sources remain rejected. The private workstation CLI requires a genuine smoke receipt and separate `FORGE_WORKSTATION_OWNER_AUTHORIZED` approval. Public HTTP endpoints only prepare/replay/advance numeric evidence and never call a model. No genuine call is authorized by the Phase 5 directive.
