# Official-source review and eligibility limits

Source retrieval metadata, content hashes and bounded excerpts are in [source-review.json](source-review.json). Documentation GETs are not inference requests or account entitlement checks. Sources were retrieved without authenticated-guide access or policy bypass.

| Source | Supported finding / limitation |
| --- | --- |
| [Cerebral Valley event](https://cerebralvalley.ai/e/meta-ai-developer-hackathon) and [Meta event](https://dev.meta.ai/events/global-hackathon) | Public descriptions permit Meta open weights and describe the hackathon. Public event metadata gives October 26 at 17:00 UTC as the start and November 5 at 02:00 UTC as the end (November 4 at 9 PM Eastern). This does not establish the authenticated development/preexisting-code rule. |
| [Participant details](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details) | HTTP 200 returns the public application/event content. It does not independently establish authenticated participant rules, exact event alias entitlement, submission fields or organizer approval. Owner review remains required. |
| [Baseten model library](https://www.baseten.co/library/muse-spark-open/) | Documents public alias `meta-models/muse-spark-open`. The required event alias `meta-models/muse-spark-open-1026` remains owner-supplied; this phase uses it exactly and does not silently substitute the public alias. No successful inference or account-specific eligibility is established. |
| [Baseten billing](https://docs.baseten.co/organization/billing) | Distinguishes notification-only budgets from **Enforce budget**, which rejects Model API requests at the configured spend. This is not proof that an owner's current balance/limits are configured, and does not cover unrelated deployments/training. |
| [Meta-hosted model license](https://huggingface.co/meta-models/Muse-Spark-Open-816B-A42B/resolve/main/LICENSE.md) | Full retrieved reference, including Exhibit A Usage Policy, is preserved in [MUSE_LICENSE_REFERENCE.txt](MUSE_LICENSE_REFERENCE.txt); SHA-256 `458a5c57d8e622e395eb0e59799ba5bba1ea7524ffd120ee6e3018688d7d6ace`. Confirm the applicable current terms before genuine use. |

Prepared attribution text is **“Built with Muse Spark Open”**. It is not displayed as an active integration badge while genuine use remains unverified. The license requires prominent attribution in the product/service UI or accompanying documentation/site/settings and preservation of the copyright/license/Usage Policy for applicable copies/derivatives. The supplied reference is not a claim that model weights were downloaded or redistributed. No weights were downloaded. The policy's restrictions around harmful critical-infrastructure/heavy-machinery uses require separate review before any real industrial application; this demo does not operate equipment or claim Meta/Baseten safety approval.

The repository's public visibility was checked through GitHub's repository API. Visibility alone does not resolve event compliance. Judging priorities supplied by the owner can guide the presentation, but authenticated guide/form requirements must be confirmed before submission. Internal target: October 30, 2026. Published end/submission target: November 4 at 9 PM Eastern, subject to authoritative rules/form confirmation.

## Open timing question — owner clarification package

Preserve the original [timing review](../ELIGIBILITY_TIMING_REVIEW.md), [28-file snapshot inventory](../eligibility-timing-inventory.json) and [unsent organizer draft](../ORGANIZER_CLARIFICATION_DRAFT.md). The original boilerplate commit is `4f8c522…` at 15:59:03 UTC; foundation commits `0397707…` and `e7f90e9…` are timestamped 16:27:32 and 16:28:43 UTC on October 26, before the published 17:00 UTC start. The first recorded post-cutoff engineering commit is `6498e24…` at 17:04:32 UTC. Author/committer history is unchanged. Commit timestamps alone do not establish the applicable rule or when work began.

Concise clarification for the owner to send, not sent by this work:

> Please confirm the permitted development window and treatment of preexisting preparation/foundation work. Our public repository preserves a boilerplate commit and a 28-file backend/frontend/test foundation snapshot timestamped before the published October 26, 17:00 UTC kickoff, followed by dependent investigation/verifier work after kickoff. The attached inventory identifies exact commits/files/functions. May that foundation and dependent demonstration be included with disclosure? If any part is excluded, what specific remediation or presentation constraints do the rules require?

Status remains **OPEN ELIGIBILITY QUESTION**. Neither compliance nor disqualification is assumed. Obtain written guidance; preserve it with submission evidence. Do not delete, rebuild, re-date or rewrite history based on speculation. No organizer was contacted.
