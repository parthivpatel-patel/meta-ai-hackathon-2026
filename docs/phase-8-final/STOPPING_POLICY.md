# Why a supported bearing investigation stops at 2/4

Four is a **ceiling**, not a checklist. `phase3.service.select` returns no plan when the independent decision is no longer `IN_PROGRESS`, or when the maximum is consumed. The coupled adapter uses that same selector and verifier. It never requests a model to decide whether numerical support exists.

For the default bearing-degradation recipe, reference acquisition is test 1. A targeted vibration intervention is test 2. The verifier then returns `SUPPORTED_SYNTHETIC` and the selector returns `None`. Asking the offline engine for a four-test allowance still yields the same two trial records, events and decision. The request's declared experiment count differs, so a request-bearing report hash need not equal a two-test request's hash; this is not a state mismatch.

The frontend was showing “2 / 4 tests” without explaining the terminal policy. It now shows **Investigation complete — supported after 2 of 4 permitted tests**, completed count, maximum, remaining allowance, two tests not needed under this policy, recorded verification reason and a report next action. It does not claim real-world industrial causation or that further physical investigation would be redundant.

Other stopping states are distinct:

- `IN_PROGRESS` with a valid plan: review and explicitly confirm the next discriminating test.
- `INCONCLUSIVE` before the maximum: ambiguity/contradiction ended testing under the existing policy. Unused allowance does not establish another eligible test.
- `INCONCLUSIVE` at the maximum: budget exhausted; unresolved alternatives remain.
- `ABSTAIN`: insufficient/invalid evidence; gather or inspect missing information.
- `REJECTED` or inconsistent presentation state: restore/replay verified evidence, never offer execution.

The current default shaft-misalignment scenario actually consumes four tests and ends inconclusively; cavitation ends inconclusively before exhausting the allowance. These differences are retained, not adjusted to make screenshots or metrics look better. The retained confounded library case also exercises four-test exhaustion.

`industrial.presentation` and the frontend progress presenter derive explanatory text from existing status, trial count and plan. They do not feed back into selection, verification or report seals. Original JSON contracts and historical fixtures remain unchanged and independently replayable. JSON already records the decision/reasons, executed trials, plan and request (plus `max_experiments` in legacy sessions); the versioned pump contract fixes its maximum at four. Current industrial/model HTML adds a human-readable stopping section. Historical HTML is retained as historical evidence, not falsely asserted byte-identical to the new presentation. The original legacy submission renderer/artifacts remain unchanged; its decision reasons and complete audit record preserve the stopping evidence.
