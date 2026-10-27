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


## Phase 2 hardening

The whole API now prebuffers at most 1 MiB per request, including chunked bodies, with a 15-second read deadline. V2 assets are bounded numerical arrays; no URL fetching, file paths, pickle, SVG execution, image decompression, or arbitrary code is supported. Thermal and waveform provenance is declared, not authenticated.

The new transport requires exact reviewed HTTPS URLs/model IDs, explicit opt-in and free-access attestation, a present secret and a positive request budget. It preserves TLS verification and the environment proxy, disables redirects, caps response/input sizes and retries, rejects compressed/incomplete/tool-bearing output and credential echoes, checks returned model identity and validates a strict schema. Unknown Fireworks/event aliases are rejected until documented. No key or endpoint is accepted from an API request. Errors omit raw provider content and credentials. These controls bound requests, not financial liability; provider no-card/budget terms must be confirmed separately.

Model suggestions are untrusted and independently assessed. Replay checks canonical metadata, sources, asset features, selection, raw evidence and decisions. HTML escapes all data and retains a restrictive CSP. Tests exercise SSRF-like configuration, malformed/oversized responses, timeout budgets, physical-scope outputs, markup injection, altered reports and chunked oversized uploads. No real endpoint was invoked by security tests. Authentication, persistent multi-user isolation and production exposure remain outside this checkpoint.


## Phase 3 demonstration boundary

Restricted public mode blocks legacy APIs, custom recipes/uploads and all inference. Private mode uses constant-time bearer comparison and a minimum32-character token; local mode must stay local. One-worker rate/resource caps, body limits, strict schemas, no CORS grants, CSP/security headers, escaped reports, parameterized SQLite and0600 database files protect the demo boundary. Opaque session IDs are not user authorization; only fixed public synthetic data belongs in public mode. SQLite state is unsigned, retention is logical24h, and process-local budgets reset on restart. No credentials were introduced. Dependency audits and security tests are recorded in docs/PHASE3.md; these checks do not constitute a penetration test or industrial certification.


## Phase4 deployment review

Exact Host/route boundaries and a guarded public entrypoint address deployment misconfiguration. The Compose profile runs read-only with a data volume and caps; no inference/owner credentials belong in public containers. Read-only HTTPS audit verifies the deployed boundary but not billing or a full penetration test. See docs/DEPLOYMENT_SECURITY_AUDIT.md for findings/limitations.


## Event credential and redesign safety review

BASETEN_API_KEY is scoped to the exact Baseten event model/endpoint, excluded from settings dumps and rejected on the public launcher. Conflicting credentials fail closed. Public restrictions, auth/rate/resource budgets and independent numerical acceptance are retained. Native thermal input is bounded local PNG/data URI with no URL fetch, no tools and separate8192-unit accounting reservation; its tokenizer/cost is unverified. First smoke is text/numeric only. A protected owner receipt is consistency/replay checked and cannot be uploaded anonymously; it is not a signed provider attestation. Never place either key on the anonymous Render service.

## Final engineering checkpoint

The separate genuine-model evaluation CLI is dry by default and inaccessible through public APIs. It requires a replayed private genuine smoke receipt and fresh owner authorization, caps the fixed pilot at five requests with zero retries, refuses public/Render execution and stops on its first failed model arm. Provider/account spending controls must still be verified: application counters reset by process and reservation units are not invoices or global billing caps.

Smoke/evaluation artifacts are exclusive new 0600 files. Pending/interrupted artifacts must not trigger automatic retries. Safe diagnostics record bounded status/identity/timing/validated usage only; they do not retain raw remote error bodies, authorization headers, prompts or exception text. Invalid envelope types now become controlled provider failures. Structured candidate support is independently checked; every sentence of a rationale is not semantically verified.

Production and test TypeScript configurations are separated so test fixtures outside the Docker frontend context cannot break release builds. Test type-checking still runs in CI, which now also builds and validates the actual non-root restricted public image. The external read-only audit explicitly requests uncompressed responses while preserving response-size/compression restrictions.

Current runtime/public URL/dependency evidence is in `docs/FINAL_REQUIREMENTS_MATRIX.md` and `docs/final-engineering-validation.json`. No real key was configured or inference request sent. Zero known dependency advisories and bounded HTTP tests do not establish production readiness or a complete penetration test.
