# Financial, credential and integration readiness

## Financial result: unresolved

The owner confirms the Baseten account received $100 hackathon promotional credits, no payment method was requested/added, paid use is not authorized and out-of-pocket spending must remain zero. They explicitly instruct that absence of a card is not proof that charges are impossible. A conditional one-request authorization exists; no routine authorization question is repeated.

Official documentation was fetched without credentials or inference:

- [Billing and usage](https://docs.baseten.co/organization/billing): credits apply to the current invoice before a payment method is charged. When credits run out and a workspace has no payment method, Baseten says it deactivates its models. The same page states usage beyond starting credits is billable. Default budgets only notify; optional **Enforce budget** rejects Model API requests after budget exhaustion, resets with the monthly window and does not stop dedicated deployments/training.
- [Model API pricing and limits](https://docs.baseten.co/inference/model-apis/pricing-and-limits.md): Model APIs bill by tokens; enforced workspace budgets can reject requests after spend reaches the budget. Token/rate limits and a local reservation counter are not cash-spending guarantees.

These conditional policies are useful evidence, but no authenticated/read-only account policy or provider-issued confirmation binds this credential/workspace to a promotional-only $100 boundary with no cash overage/fallback. No account budget/enforcement setting, promotional remainder/applicability or per-request exhaustion/overshoot behavior was verified. The management key/account context is not accessible here. A dollar notification threshold, credit allocation or absent card alone does not establish the required restriction.

**Exact missing financial evidence:** authoritative provider/account confirmation that this event Model API credential cannot generate out-of-pocket liability beyond its applicable promotional credits, including paid fallback/credit exhaustion behavior. A provider support policy reference/statement can suffice if it clearly applies to this account/credential; a usage dashboard or payment information is not required. Do not change billing settings or fabricate confirmations to clear the gate.

## Credential result: unavailable in this runtime

Final managed status is `observations_current=true`, running, network policy enforced, with empty secret/runtime-variable bindings. Local presence-only checks and the existing dry preflight report no canonical/generic key. Owner configuration elsewhere is not a usable binding here. Earlier configuration-change status errors resolved; they are not the current explanation for missing access.

**Exact credential action:** attach/inject the existing `BASETEN_API_KEY` through protected cloud/private-runtime settings, scoped to the authorized Baseten endpoint/model. Recheck current readiness and the existing dry preflight. Never send credentials in chat, read them from secret files for inspection, copy them into frontend/public Render/browser storage, or invent an alias. Preserve existing conflict/unsupported-alias rejection.

## Existing one-request workflow

Use the existing `forge.submission.smoke`; no replacement smoke was created. Prepared endpoint `https://inference.baseten.co/v1/chat/completions`, model `meta-models/muse-spark-open-1026`, maximum one attempted request, 1024 output tokens, zero retries, 15-second attempt, 30-second total, numeric observed summaries only, 8192 reservation units (not billed tokens). A failed request consumes the authorization. A new exclusive mode 0600 output is reserved before a genuine attempt; interrupted markers must not be bypassed with another filename/retry.

A confirmed mismatch allowed up to 20 seconds despite the owner's 15-second limit. It now rejects anything above 15, including 15.001/16/20, before transport. Tests prove zero local transport attempts for those configurations. Financial/security flags remain false in the actual preflight. No `--execute` operation was run by this work.

Only after all financial and credential gates actually pass may the already conditional one-request plan be considered under then-current owner instructions. No public inference, extra evaluation, follow-up workstation request or paid fallback is authorized. Existing procedures remain in `MODEL_ACTIVATION.md` and `docs/meta-final/ACTIVATION.md`; this current scope supersedes older phase-specific permission wording, never the safeguards.

## Integration result and scope

A fresh invocation of the existing private CLI with **`--fixture`** used `httpx.MockTransport`, an initial bearing capture and deliberately fallible structured hypotheses. Observed-only input excluded recipe, scenario, seed, truth, trials and decisions. The parser validated proposals, two explicitly reproduced numerical tests reached the same independent result/trials as the rules baseline, and report replay passed. Source stayed `test_transport`, genuine calls 0, private fixture receipt stayed 0600. No private receipt was published. Existing full tests cover unsupported output, model identity, schema, timeout/error/budget behavior and protected/public boundaries.

This is offline engineering evidence. There is no actual provider HTTP status, returned model, genuine schema result or genuine independent-verification result. Do not translate fixture identity into genuine activation.

The authorized smoke uses the existing structured legacy pressure/sensor diagnostic case and independent replay; it is not merely a connectivity ping. Its hypothetical response must not be attached to an unrelated coupled-pump capture: matching schemas do not prove matching observed input. A successful private smoke would demonstrate only that private case/response. The workstation CLI still requires its genuine smoke receipt and separately authorized matching observed capture; no second call or public integration is implied by this one-request allowance. Public Meta activation remains a separate owner/security decision.

## Owner actions today — October 28

1. Review the verified exact candidate/CI; retain the existing deployment and rollback record.
2. Obtain authoritative financial applicability/zero-overage proof; securely attach the key to this private runtime. Do not provide a card or credentials in chat.
3. Re-run the zero-request preflight. Do not execute while any gate remains unresolved. If all conditions pass under then-current authorization, preserve exactly one attempt and its private evidence; never retry automatically.
4. Review actual requested/returned identity, HTTP diagnostics, structured schema, input/output binding, provenance and independent replay before claiming genuine activation. Any additional genuine workflow/evaluation or public exposure needs its own authorization.
5. Review the manual release/live acceptance procedure separately. No deployment, protected merge, paid resource or submission is performed by this candidate.

The OPEN pre-kickoff eligibility question, final video/access and authenticated submission requirements remain preserved external gates. Phase 8 is not repeated or reclassified as incomplete because inference is blocked.
