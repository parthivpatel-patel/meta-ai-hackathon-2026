# Security

## Current controls

- No API credentials in configuration, fixtures, or source; no inference network requests. Meta adapter fails closed, even when configured. No paid requests or payment details are needed.
- Structured request schemas with bounded sample counts, numeric magnitude and seed bounds, finite values, ordered timestamps, allowed scenario/channel values, and forbidden extra analysis/model-input fields.
- No code execution, shell-command API, file upload, physical equipment controls, or external URL fetch functionality.
- Server-generated request IDs and JSON request metadata logs omit body, query, authorization headers, endpoint configuration, and model prompts. Validation failures do not echo rejected values.
- Generic unexpected-error responses. Configured HTTP destinations cannot cause SSRF because Meta transport is disabled.
- No permissive CORS configuration; Vite proxies same-origin API traffic. `nosniff` response header.
- Locked Python/npm dependencies and read-only GitHub Actions permissions. Local dependency audit results are recorded in the build log.

## Deployment limitations

Development only. There is no authentication, authorization, TLS termination, rate limiting, durable audit log, request byte limit, or multi-user isolation. List-size limits do not prevent an oversized JSON request from being buffered before validation. Do not expose the backend or Vite publicly. Browser clients and request-size controls must be revisited before hosting.

The project cannot control unrelated installed tools or the host network; its inference adapter is specifically disabled. Future Meta transport needs a reviewed destination allowlist, credential injection, redaction, explicit opt-in, spending controls, no redirects to unapproved hosts, bounded response size, structured-output validation, and a separately authorized free-access smoke test. An endpoint field alone does not establish eligibility or connectivity.

Synthetic signals and hypotheses are not safety advice or proof of physical failure. Never use Phase 0 to control equipment or make safety decisions. No penetration test or production-readiness claim is made.

## Reporting

Report a vulnerability privately to the repository owner. Include reproduction steps with synthetic data and redact credentials. Never place secrets in issues, logs, or test snapshots. `.env` is ignored, but ignored files are not a secret-management system.


## Phase 1 controls and remaining limits

Experiments are a fixed enum with exactly 24 replicates and at most 24 relaxation steps, not model-generated Python, shell, tool names, or URLs. Private scenario recipes are not passed to hypothesis generation, selection, or verification. The new generator is deterministic rules-based software and does not claim Meta output. The existing Meta transport remains disabled.

The store caps active cases at 64 with a one-hour lifetime and serializes state changes under a lock. Invalid transitions and changing committed choices are rejected; identical immediate retries are idempotent. This is bounded local development state, not multi-user isolation or persistence. A malicious local client can exhaust the small store; no authenticated ownership or distributed rate limit is implemented.

The verifier recomputes raw evidence and digests, enforces dataset binding and replicate coverage, rejects unsupported physical-cause proposals, and detects sensor/process contradictions. Only typed registered hypotheses/scopes can be proposed; arbitrary causal prose is not interpreted as a verified claim. Digests are not cryptographic attestation of origin. Reports contain synthetic evidence but no private recipe, hidden scenario answer, credential, or authenticated user information. The evaluation answer-key artifact is intentionally separate.

HTML exports escape all dynamic content, contain no JavaScript or remote resources, force attachment download, disable caching, and set a restrictive Content Security Policy. The JSON replay CLI caps input at 2 MB and parses strict schemas; it never evaluates embedded instructions or arbitrary code. Report version/source, canonical predictions/selection, summaries, references, and decisions are recomputed or checked.

Meta license/use-policy and hosted-service data requirements remain an integration prerequisite documented in `docs/META_INTEGRATION.md`. Current synthetic experiments must not be presented as proof of physical-world causality or used to operate industrial equipment.
