> Follow-up: the separately authorized [second genuine smoke](SECOND_SMOKE.md) succeeded on exact repair commit `c3075a3`. Cumulative genuine requests are now 2, both authorizations consumed. The one-request count and second-test prerequisites below are the preserved pre-second-attempt repair snapshot. No third attempt is authorized.

# Phase 9 — offline response repair

## Current state

One genuine request has occurred in total. It returned HTTP **200**, model **`meta-models/muse-spark-open-1026`**, in **4260.997 ms**, then failed `structured_response_invalid`. That authorization is **consumed**. The financial review subsequently accepted the supplied Gmail original-message PDF and its recorded authentication/results and exact event-key assurances; this was a documentary assessment, not live DKIM revalidation. The protected runtime binding was ready. No new financial confirmation or credential is needed for this offline repair.

**Additional genuine requests during this repair: 0. No second request is authorized.** The original private receipt and consumed-authorization ledger are unchanged. A [sanitized first-attempt record](evidence/response-repair/first-genuine-attempt.json) is now tracked so future work cannot mistake the old allowance for unused. Private email/receipts and credentials are not committed.

## Root-cause assessment

Confirmed:

- The exact first failure cannot be reconstructed: the old failure path discarded raw response text and collapsed finish-reason, content, schema and usage errors into one code. Usage was validated only after the answer, losing otherwise useful token counts on an answer failure.
- Baseten documents `choices[0].message.content` as the final answer and separate `reasoning_content`. This envelope assumption was supported. The old adapter already excluded separate reasoning from hypothesis parsing; reasoning presence alone is not a proven bug.
- Muse Spark Open always reasons. Baseten's reasoning-depth table documents `low` through `xhigh`, with `xhigh` as default. The old request omitted this setting. `max_tokens` includes reasoning and final-answer tokens, so a 1024-token request can exhaust its budget before producing a final JSON answer.
- Muse accepts `json_object`/`json_schema` settings without enforcing JSON/schema output. The old client did not send those settings, so this is not a confirmed unsupported-parameter bug. Prompted JSON requires local validation; adding `response_format` alone would not establish correctness.
- The old parser accepted only bare JSON; it rejected a whole JSON code fence even when the contained object satisfied the schema.

Unconfirmed explanations for the first response: token exhaustion or reasoning-only output, a whole Markdown fence, malformed JSON, a missing/invalid envelope field, tool/refusal content, or a hypothesis/usage schema violation. There is **no evidence that the discarded response was valid and incorrectly rejected**. Offline reproductions are new synthetic cases, not recovered original output.

## Minimal private-adapter changes

- Request documented `reasoning_effort: low` only for the Baseten Muse family, including the exact event alias. Keep the model ID, endpoint, 1024-token ceiling, deadlines, financial/access gates and retry limits unchanged. Low effort does not disable reasoning or guarantee that this event alias completes within the existing budget; that remains a live-test question.
- Ask for one complete JSON object, no Markdown/prose, and short rationales. Do not add unsupported JSON-enforcement or reasoning-token-budget parameters.
- Accept bare final JSON or exactly one whole `json`/unlabelled code fence. Parse the entire result, with duplicate-key and non-finite-number rejection, then apply the existing strict hypothesis schema. Do not extract JSON from prose/reasoning, repair partial JSON, reinterpret tools, or accept a `length` stop even if it contains syntactically valid JSON.
- Preserve exact model identity, transport/body-size/secret-echo checks, explicit experiment authorization, independent numerical verification, and disabled public inference. Other providers do not receive Muse-specific reasoning settings.
- Keep the existing top-level diagnostic error contract and add a specific `validation_code`, response field types/counts, allowlisted finish reasons, content length, reasoning presence/type, and bounded numeric usage/reasoning-token counts. Usage is inspected before answer rejection. Reject malformed/coerced usage and reported completion counts above the configured cap; this is detection, not a billing control.
- Schema diagnostics contain at most eight allowlisted error types and bounded field paths. Unknown field names become `other_field`. No prompt, reasoning/answer text, input values, tool arguments, headers, refusal text, raw body or parser exception text is retained in diagnostics. Structured hypotheses from successful answers remain in the existing report contract. Parser exception chains suppress untrusted text.

The frontend, Phase 8 diagnostic algorithms, experiment policy, deployment files and public Render configuration are unchanged. No fallback or automatic inference was introduced.

## Offline validation

- **67** new deterministic parser tests: valid bare/fenced answers with separate reasoning; malformed/duplicate/non-finite JSON; missing/wrong fields; reasoning-only and truncated responses; tools/refusals; strict hypotheses; malicious field names/text; usage/token limits; identity/key-echo protection; consumed per-process budgets; provider-specific request settings; and numerical rejection of an incorrect model proposal.
- **355 backend tests passed**, with the existing Starlette/httpx deprecation warning. The full backend run covers shared adapter consumers and public-boundary regressions. Ruff passed. Frontend/browser work was not repeated because those files did not change.
- Four [sanitized offline diagnostic examples](evidence/response-repair/offline-diagnostics.json) distinguish successful normalization, truncation, malformed JSON and schema rejection. The existing smoke workflow also passed structured parsing and independent replay through `MockTransport`, with socket connections disabled. Source remains **`test_transport`**, never genuine Meta inference.
- [Documentation review](evidence/response-repair/documentation.json) records official URLs/content hashes. The public Muse family docs inform this repair; they do not independently guarantee private event-alias compatibility.

Reproduce without private keys:

```sh
cd backend
env -u BASETEN_API_KEY -u FORGE_INFERENCE_API_KEY -u FORGE_INFERENCE_KEY \
  OPENBLAS_NUM_THREADS=1 uv run --frozen pytest -q tests/test_chat_response.py
```

Tests inject only `httpx.MockTransport`; the new module refuses real HTTP transport. No application dependencies or lockfiles changed. Exact pushed-commit CI is reported in the handoff.

## Second genuine test — remaining steps, not execution authorization

1. Review the repaired commit, offline results and current financial/credential applicability. The first genuine receipt remains failed; never mark it successful, overwrite it, delete its consumed marker or reset the historical count.
2. Obtain **explicit authorization for one additional genuine attempt**. The existing allowance does not cover it. No second request, follow-up workstation call, evaluation panel or public activation is authorized by this document.
3. After that authorization only, use this repaired private CLI and a **new** private exclusive 0600 receipt path. Recheck current runtime binding and run the existing zero-request `python -m forge.submission.smoke` preflight with the reviewed settings. Enable flags only for that private command; do not change Render or persist live flags globally.
4. Preserve `meta-models/muse-spark-open-1026`, exact Baseten endpoint, maximum one new request, <=1024 output tokens, retries0, attempt<=15s, overall<=30s and no paid fallback. Do not raise limits automatically if reasoning still consumes the budget. Stop if any preflight blocker remains.
5. Only then execute the existing smoke once. Inspect HTTP status, exact returned model, finish reason, final-content type, numeric usage, specific validation code, schema/provenance and independent replay. Preserve failure/interruption evidence and stop without retry. Valid JSON alone does not establish physical correctness or public integration.

**Readiness:** the offline correction is verified; production-ready genuine structured integration is **not yet demonstrated**. The next external milestone is the separately authorized test above. A private smoke alone would still not authorize or prove public Meta integration.
