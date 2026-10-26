# Meta integration readiness — October 26, 2026

**Status: disabled. No Meta inference has been performed.** Rules-based Phase 1 hypotheses and legacy Phase 0 mock suggestions are labeled separately. No endpoint, key, SDK, payment method, or paid inference request was added.

## Verified from official public sources

Read-only documentation retrieval succeeded from Meta's official GitHub organization:

1. [Llama model repository](https://github.com/meta-llama/llama-models/blob/main/README.md): lists Llama families, including Llama 4 Scout and Maverick, model cards, licenses, download and acceptance requirements. Its published Scout example requires substantial GPU memory (80 GB for its Int4 example); this cloud CPU environment is not a verified local hosting route for that model.
2. [Official Llama Python API SDK](https://github.com/meta-llama/llama-api-python/blob/main/README.md): documents API-key authentication via `LLAMA_API_KEY`, asynchronous calls, timeout/retry features, and a link to Meta's API documentation. Its [client implementation](https://github.com/meta-llama/llama-api-python/blob/main/src/llama_api_client/_client.py) specifies `https://api.llama.com/v1` as its default. This is a documented SDK URL, not a verified available inference endpoint for this participant; it was not called or configured in FORGE.
3. [Llama 4 Community License](https://github.com/meta-llama/llama-models/blob/main/models/llama4/LICENSE): grants conditional royalty-free model rights, requires applicable attribution/license notices when distributing relevant materials or products, incorporates its acceptable-use policy, and has additional large-scale commercial terms. A model license is not a hosted-inference free-tier commitment or a hackathon eligibility determination. FORGE does not claim to be built with Llama yet.
4. [Llama 4 acceptable-use policy](https://github.com/meta-llama/llama-models/blob/main/models/llama4/USE_POLICY.md): includes privacy/personal-information restrictions and restrictions on activities presenting risk of death or bodily harm, including operation of critical infrastructure or heavy machinery. The current software runs synthetic offline investigations with no equipment control; future operational use must be reviewed against the applicable model and service terms.

Retrieved source SHA-256 fingerprints (raw main-branch documents, which may change later):

| Source | SHA-256 |
|---|---|
| Model README | `0ac5f064caca753d78aa286ca382cf7e819b54b1f90edca9a905786b2aac238e` |
| SDK README | `d953bd3863f13c82254f4a69f6d403e7a0af7f3704328a841ba3cc8811c97c4b` |
| Llama 4 license | `6b346865267ef58a4592287a99e9417178223c9300e9da361ce7801be6dea61f` |
| Use policy | `bbf009b29f1dc413c2b3c9abb12637b0cdffa350cd0a3bd6eba89b270fc9e83f` |

## Not verified / blockers

- The owner supplied the official event and participant-guide URLs in a follow-up. Direct retrieval was denied by the proxy; event-specific model eligibility and terms therefore remain independently unverified. See the follow-up record below.
- Access to `llama.developer.meta.com` and `www.llama.com` was denied by the cloud proxy with HTTP 403. This establishes a network-policy blocker for those documentation pages, not that the provider service is down.
- Current participant access, model catalog, free-tier/sponsorship amount, payment-method requirement, quotas, regional restrictions, data retention/training policy, and service-specific data-handling terms remain unverified. The owner previously reported promotional credits but a payment-method prerequisite; no attempt was made to bypass it.
- API-key authentication is documented, but no new key is needed for current functionality. Credentials were not requested, read, or added.

## Conditions before enabling a real provider

Obtain the official rules and a documented, authorized free-access route without a payment method. Confirm model eligibility, current service terms and usage limits, data handling, and model identity. Use synthetic inputs only. Then separately authorize a bounded smoke test and implement an allowlisted HTTPS transport with secret injection, timeout/retry/size limits, output-schema validation, provenance, and no silent fallback. Retain the hard-disabled state until those requirements are met.


## Follow-up: official event links and card-free research

The owner supplied these sources:

- [Event and registration](https://cerebralvalley.ai/e/meta-ai-developer-hackathon)
- [Participant guide, rules, and technical resources](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details)
- [Meta Model API](https://dev.meta.ai/)

**Participant-reported, not independently verified:** the guide permits open-weight models; identifies Muse Spark series, Muse Wonder, Muse Image, Muse Voice Transcribe, SAM 3.1, Muse Glimmer, and Muse Spark Open; names Baseten, Modal, and Fireworks as inference partners; and specifies `meta-models/muse-spark-open-1026` for Baseten. The owner reports a public-repository requirement, work developed during the event, the Build for Your World / Push the Frontier tracks, and a November 4, 2026, 9 PM Eastern submission deadline. FORGE targets Push the Frontier with an internal October 30 deadline. These claims are recorded faithfully but not promoted to verified competition findings while the guide is inaccessible. The prior Llama documentation review does not establish that any particular Llama version is eligible for this event.

Read-only GET attempts to the event, guide, Meta site, and the official partner pages below all failed with `Tunnel connection failed: 403 Forbidden`. This happened before the destination page could be retrieved; it is not evidence of account eligibility, service outage, or a credit-card requirement.

| Official source attempted | Verified outcome |
|---|---|
| `cerebralvalley.ai/e/meta-ai-developer-hackathon` | Proxy denied access |
| `cerebralvalley.ai/e/meta-ai-developer-hackathon/details` | Proxy denied access |
| `dev.meta.ai` | Proxy denied access |
| `www.baseten.co/pricing/` | Proxy denied access |
| `modal.com/pricing` | Proxy denied access |
| `fireworks.ai/pricing` | Proxy denied access |

Official GitHub documentation was accessible: [Baseten Truss](https://github.com/basetenlabs/truss/blob/main/README.md), [Modal client](https://github.com/modal-labs/modal-client/blob/main/README.md), and [Fireworks cookbook](https://github.com/fw-ai/cookbook/blob/main/README.md). These establish official project/documentation resources; the retrieved READMEs do **not** establish current event model availability, participant sponsorship, card-free onboarding, inference quotas, or service data-retention terms. No free/card-free partner recommendation is verified yet.

A network-settings draft adds only documentation/research hosts: `cerebralvalley.ai`, `dev.meta.ai`, `www.baseten.co`, `docs.baseten.co`, `modal.com`, `fireworks.ai`, `docs.fireworks.ai`. Existing package-manager presets are preserved. Saving a draft does not apply it to the current runtime; review/save it in environment settings, then publish the updated environment. Additional redirect or documentation hosts, if required, must be diagnosed rather than bypassing the proxy. No inference destination, secret binding, account signup, promotional redemption, or payment method was configured.

After access is applied, retry the official guide and current service terms. Confirm the exact eligible model, participant-specific card-free offer, quotas/expiration, authentication, data handling, and repository/publication requirements. Check public repository visibility through an authorized metadata read before claiming it is public; successful authenticated Git operations alone do not prove visibility. Preserve the existing mock/rules-based development path until a separately authorized zero-cost inference test is possible. Never represent mock or rules-based output as real Meta output in a submission.
