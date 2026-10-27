> **Final engineering checkpoint (October 27):** replacement key pending; zero real calls. Fresh explicit authorization is required before every real run. Read [current activation](../MODEL_ACTIVATION.md), [the requirements matrix](FINAL_REQUIREMENTS_MATRIX.md) and [current source evidence](final-source-check.json). Historical automatic-test and alias-disabled statements below are superseded. The existing external Render URL now passes the 32-check HTTPS boundary audit; the final candidate is not deployed.

> **Current redesign checkpoint:** participant confirms Baseten selection/$100 and the restricted event model `meta-models/muse-spark-open-1026`. Use protected `BASETEN_API_KEY`, never substitute the public alias. Key is absent and no authenticated call has succeeded here. Read [MODEL_ACTIVATION.md](../MODEL_ACTIVATION.md); older pending/unverified-alias research below is historical.

# Meta model access — verified follow-up, October 26, 2026

**No real inference calls were made. No payment method, account signup, or paid deployment was initiated.** Configuration has no credentials and remains disabled. A secure adapter is implemented and tested with explicitly labeled local HTTP fixtures; these are not real Meta output.

## Official sources now accessible

The published network policy permits the approved documentation sites. Public source retrieval succeeded:

| Source | Verified finding |
|---|---|
| [Official event](https://cerebralvalley.ai/e/meta-ai-developer-hackathon) | Use Muse Spark series, Muse Wonder, Muse Image and SAM 3.1 through Meta Model API or run Meta open weights; Push the Frontier includes manufacturing/physical systems. Lists Baseten $100 credits + 2M TPM, Modal $100 credits, Fireworks $25 credits **for selected participants**. Lists November 4, 9 PM Eastern submission, subject to updates. |
| [Participant guide](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details) | Returns an application shell, not the guide. Public client code wraps details in authentication and approved-attendee boundaries. No attempt to bypass them. Event-specific `meta-models/muse-spark-open-1026`, public-repository and during-event-work clauses remain owner-reported pending authenticated confirmation. |
| [Meta model site](https://dev.meta.ai/models/muse-spark-open/) and [model docs](https://dev.meta.ai/docs/muse-spark-open/) | Muse Spark Open is Meta's open-weight model; Baseten, Fireworks and Modal are among its inference launch platforms. Public event open-weight allowance supports this family in principle; exact event alias must still be checked. |
| [Meta quickstart](https://dev.meta.ai/docs/quickstart), [authentication](https://dev.meta.ai/docs/authentication), [pricing](https://dev.meta.ai/docs/pricing-rate-limits) | Documents `https://api.meta.ai/v1`, bearer `MODEL_API_KEY`, and current Muse Spark IDs. Standard content is not used to train Meta models; Contributor variants permit training on submitted content and are discounted, not free. Owner reports the promotional-credit account requires a payment method; this was not bypassed or tested with inference. |

The earlier Llama documentation review is historical and does **not** establish event eligibility for a particular Llama version. No placeholder endpoint or model identifier has been invented.

## Card-free route comparison

| Provider | Evidence | Decision under $0/no-card constraint |
|---|---|---|
| **Baseten** | [Billing](https://docs.baseten.co/organization/billing): new-workspace credits apply before charging; when credits run out and no payment method exists, models are deactivated. [Pricing](https://www.baseten.co/pricing/) also advertises starting credits. Event advertises $100 for selected participants. | **Fastest documented candidate**, conditional on owner activation/remaining credits and actual model access. Use hosted Model APIs, not billable GPU deployment/training. No account-specific entitlement or request has been verified. |
| **Modal** | [Billing](https://modal.com/docs/guide/billing) explicitly requires a payment method to use Modal. [Pricing](https://modal.com/pricing) says Starter $30 applies to compute, not Shared Endpoints; those charge from first token (effective September 1, 2026). Event advertises $100 credits. | Standard onboarding does not meet no-card constraint. An organizer-confirmed event exception would be required; not verified. Do not mistake compute credits for free endpoint tokens. |
| **Fireworks** | [Pricing](https://fireworks.ai/pricing) describes adding a payment method to buy serverless credits. Event advertises $25 for selected participants. Its Muse Glimmer 30B SFT promotion says no card through November 30, but this is **training**, not proof of free inference. | Event-specific card-free inference redemption remains unverified. Do not infer free inference from the training promotion. |

Baseten's default budget is **notification only**. Its billing docs say enabling **Enforce budget** rejects Model API requests at the configured spend; this does not stop dedicated deployments or training. Do not rely on a notification budget or this application's request counter as proof of zero charges. Confirm no payment method, active credits, Model API access and enforced stopping behavior before authorizing one bounded request. We did not register an account, redeem credits, add payment information, or send messages to organizers/providers.

## Documented model identifiers and endpoints

| Platform | Independently documented identifier / endpoint |
|---|---|
| Baseten [Muse Spark Open library](https://www.baseten.co/library/muse-spark-open/) | `meta-models/muse-spark-open`; base `https://inference.baseten.co/v1`, chat path `/chat/completions`, API key authentication. The event-specific `…-1026` alias was supplied by the owner but not independently accessible in the guide. The code registry accepts only the public documented alias until the event alias is checked. |
| Direct Meta | `muse-spark-1.3`, `muse-spark-1.2`, `muse-spark-1.1`; `https://api.meta.ai/v1/chat/completions` documented by authentication/quickstart. Contributor variants are not included in the application's reviewed registry. No direct Meta account access was verified. |
| Fireworks [quickstart](https://docs.fireworks.ai/getting-started/quickstart) and [pricing](https://docs.fireworks.ai/serverless/pricing) | `https://api.fireworks.ai/inference/v1/chat/completions`; pricing lists Muse Spark Open and a model-page link, but its exact API identifier was not independently retrieved. The adapter's Fireworks model registry stays closed rather than guessing a canonical ID from a UI slug. |
| Local open weights [Meta download guide](https://dev.meta.ai/docs/muse-spark-open/get-the-model) | `meta-models/Muse-Spark-Open-816B-A42B` (~1.65 TB BF16), `meta-models/Muse-Spark-Open-816B-A42B-NVFP4` (~537 GB weights), with documented multi-B300 GPU recipes. No weights downloaded; not a viable fast CPU route for this environment. |

## License and data handling

The full [Muse Model License, including Exhibit A Usage Policy](https://huggingface.co/meta-models/Muse-Spark-Open-816B-A42B/resolve/main/LICENSE.md) was successfully retrieved after the network update on October26. This supersedes the earlier proxy-blocked review. The conditional free grant permits use, modification and distribution; copies/substantial portions and derivatives must include the copyright, license and Usage Policy. Products/services using the model must display **“Built with Muse Spark Open”** in UI or accompanying documentation/site/settings. This attribution is not shown as an active integration claim while FORGE has not used the model. Section3 requires a separate Meta agreement for applicable Model-as-a-Service businesses above$20M aggregate revenue in12 months; exceptions include internal/non-MaaS product-feature use. Meta disclaims output ownership and provides the software/outputs AS IS.

Exhibit A prohibits illegal/privacy-infringing activity, bypassing safeguards and specified harmful uses, including activities presenting risk of death/bodily harm involving critical infrastructure/heavy machinery. FORGE's synthetic educational demo does not operate equipment; real industrial deployment would require a separate policy/safety review. A separate USE_POLICY.md retrieval did not establish access, but Exhibit A in the retrieved license supplies the incorporated policy. Do not substitute Llama terms or treat this summary as unconditional permission. Source URL/hash is recorded in `phase3-source-manifest.json`.

[Baseten security](https://docs.baseten.co/observability/security) states synchronous inference zero retention by default; async inputs can remain queued up to 72 hours. [Fireworks data handling](https://docs.fireworks.ai/guides/security_compliance/data_handling) describes no persistent prompt/generation storage for open models by default, volatile prompt caching, and metadata logging; Responses API `store=True` retains conversation data for 30 days. The implemented adapter uses synchronous chat completions, not Responses or asynchronous jobs. [Meta pricing](https://dev.meta.ai/docs/pricing-rate-limits) distinguishes Standard (not used for training) and Contributor (training permission) modes. Only synthetic summaries/features would be sent by this checkpoint; no actual sensor/customer data is uploaded externally.

## Required next actions

1. Owner: sign in to the approved-attendee guide and verify the exact eligible model alias, license and detailed rules. Do not submit mock/rules-based results as Meta inference. Verify repository visibility separately; authenticated Git access does not prove it is public.
2. Owner: obtain/activate Baseten starting or participant credits **without any payment method**. Verify balance, Model API access, no-card stopping behavior and enforceable limits; stop if payment information is required. No card is requested.
3. If that route is usable, enter `FORGE_INFERENCE_API_KEY` securely in environment settings, scoped to `inference.baseten.co`; never send its value in chat. The optional requirement is saved for the recommended route. Apply the network/secret settings and publish as needed. Existing metadata and process-name presence checks found no usable key.
4. Only after zero-cost access and an exact model ID are confirmed, explicitly authorize a one-request synthetic smoke test and enable the transport with a request budget of one. It is disabled by default even when a key exists. The application cap resets on restart and cannot guarantee provider billing behavior.

Research-domain additions for owner review include the actual linked model/license/account pages and GitHub metadata: `huggingface.co`, `app.baseten.co`, `app.fireworks.ai`, `api.github.com`. The secret binding adds `inference.baseten.co`. GitHub metadata access must be checked against the newly published policy; local CI-equivalent checks are recorded separately. Saving a draft does not apply it, prove account readiness, or initiate inference.


## Phase3 access checkpoint

Baseten approval remains pending, no inference credential is configured, and zero real calls have been made. Public mode hard-denies inference independently of global configuration. The local adapter now reserves a bounded UTF-8-payload/output accounting allowance per attempt in addition to its request cap; this is not provider token billing. `meta-models/muse-spark-open-1026` remains unverified and rejected by the registry. The final submission still requires genuine eligible Meta inference, measured evaluation and truthful provenance.


## Phase4 activation readiness

Current official Model APIs/chat docs confirm bearer authentication and the reviewed endpoint. Muse Spark Open lacks provider-native JSON/schema mode; the adapter uses prompted JSON plus strict validation. Both Baseten ID candidates are cataloged, but the event alias remains disabled pending authenticated evidence. Use the dry-default forge.submission.smoke CLI and OWNER_ACTIONS.md; no genuine call has run.
