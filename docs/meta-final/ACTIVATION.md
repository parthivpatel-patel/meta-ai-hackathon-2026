# Private activation gate — no genuine request authorized

The owner reports a protected Baseten credential configured. Its value was not inspected, printed or used. Current dry preflight is the authoritative local readiness observation; configuration elsewhere does not establish a usable binding here. This directive authorizes fixtures and preparation only.

| Variable | Actual code role |
| --- | --- |
| `BASETEN_API_KEY` | Canonical protected event credential. Restricted to Baseten, the exact endpoint and `meta-models/muse-spark-open-1026`. Excluded from settings dumps/repr. |
| `FORGE_INFERENCE_API_KEY` | Existing generic `TransportSettings.api_key` environment contract. Preserved for compatibility; if the Baseten key is also present, differing values are rejected. Identical values are unambiguous but configuring only the canonical event key is preferred. |
| `FORGE_INFERENCE_KEY` | Was not an implemented credential alias. A nonempty value now fails configuration closed rather than being silently ignored or treated as interchangeable. Public startup refuses this misconfiguration without echoing its value. |
| `FORGE_DEMO_ACCESS_TOKEN` | Separate private HTTP owner authentication, not a provider key. The new private CLI does not create an HTTP inference service. Never put either kind of key on Render. |

## Exact one-request smoke plan

Preserve `deploy/smoke.env.example` with all enabling/account flags false. The prepared request uses the existing synthetic pressure/sensor smoke case, Baseten synchronous `https://inference.baseten.co/v1/chat/completions`, exact event model, one attempt, zero retries, at most 1,024 output tokens, attempt deadline 15 seconds and total deadline 30 seconds. Accounting reservation must be positive and at most 16,384 units; the example uses 8,192. Units combine bounded input bytes/output allowance and are **not billed tokens**.

Before separate owner approval: verify current promotional balance, no payment method/paid fallback, exact model entitlement, rate card and **enforced** Model API stopping behavior. `FORGE_SMOKE_PROVIDER_SPENDING_LIMIT_CONFIRMED` defaults false; a notification-only alert does not satisfy it. This flag is an owner attestation, not an independent provider billing verification. Maximum credit exposure is one attempted request; its dollar cost remains unmeasured until the applicable account rate card is reviewed. No cash expenditure is authorized. Do not configure paid deployments/training.

From `backend`, dry only:

```sh
uv run --frozen python -m forge.submission.smoke
```

Only after that separate explicit approval and all prerequisites, the existing `--execute --output /private/new-smoke.json` procedure reserves a new 0600 artifact before one request. Returned identity must match exactly. Preserve failure/interruption evidence and review provider usage before any newly authorized retry. No automatic retry or fallback is permitted. Successful smoke alone authorizes nothing else.

## Separate one-request workstation plan

Export the initial observed machine capture before experiments. Preserve the genuine private smoke receipt. Review `deploy/workstation.env.example`; all approval flags remain false. After distinct workstation authorization, the planned call uses the same exact endpoint/model/limits, a 16,384-unit reservation cap and one initial observed-only request. Public replay/experiments require no additional calls. The request excludes the reproduction recipe, selected scenario, seed, private truth, future observations and numerical verification outcomes. The prepared input/hash can be reviewed in the workstation before authorization.

```sh
uv run --frozen python -m forge.industrial.meta_cli
# Do not execute under the current directive. Requires separate approval:
uv run --frozen python -m forge.industrial.meta_cli --execute \
  --capture /private/initial-capture.json \
  --output /private/new-workstation-receipt.json \
  --public-report /private/new-sanitized-report.json
```

`FORGE_WORKSTATION_OWNER_AUTHORIZED` defaults false. A valid owner-controlled genuine smoke receipt is also required. Public/Render execution is refused. Both outputs are reserved exclusively before any call; no overwrite/symlink replacement is allowed. Keep the private receipt private. Review the sanitized synthetic report before importing it into an anonymous public service. An imported source claim does not authenticate the private receipt or enable a verified/live badge.

For authorized offline development only, `--fixture` uses `httpx.MockTransport` and fixed, deliberately fallible hypotheses. It is mutually exclusive with `--execute`; records remain `test_transport`. It does not establish real access, eligibility or model quality.

## Separate matched evaluation

The existing six-case panel, at most five genuine calls, matched evidence/arms, four-test budgets and missing-data abstention remain fixed. `FORGE_EVALUATION_OWNER_AUTHORIZED` stays false. The new enforced-spending confirmation is also required. Run only its dry preflight now:

```sh
uv run --frozen python -m forge.submission.model_evaluation
```

After a genuine smoke, review its receipt and remaining credit exposure, then request separate authorization for the panel. Workstation approval does not authorize it. Native thermal input also remains separately gated and has not been verified; no native audio inference is claimed.
