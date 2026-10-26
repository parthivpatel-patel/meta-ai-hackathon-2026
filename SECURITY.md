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
