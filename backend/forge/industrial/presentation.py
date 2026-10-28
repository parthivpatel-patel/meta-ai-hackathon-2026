"""Derived report presentation only: never an input to selection or verification."""

import html


def progress(report: dict) -> dict:
    completed = len(report["trials"])
    maximum = 4
    remaining = max(0, maximum - completed)
    status = report["decision"]["status"]
    has_plan = report["plan"] is not None
    terminal = status in {"SUPPORTED_SYNTHETIC", "INCONCLUSIVE", "ABSTAIN", "REJECTED"}
    if completed > maximum or (terminal and has_plan) or (not terminal and (status != "IN_PROGRESS" or not has_plan or not remaining)):
        code = "invalid"
        reason = "The report state needs independent validation; do not execute another test."
    elif not terminal:
        code = "continue"
        reason = "Review and explicitly confirm the proposed discriminating experiment."
    elif status == "SUPPORTED_SYNTHETIC":
        code = "supported"
        reason = "The independent verifier reached support within the synthetic model. The selector stops on a terminal decision; additional tests are not required by this policy."
    elif status == "ABSTAIN":
        code = "abstain"
        reason = "Evidence quality is insufficient; review missing or invalid measurements."
    elif status == "REJECTED":
        code = "rejected"
        reason = "Evidence or experiment records were rejected; restore verified evidence."
    elif not remaining:
        code = "exhausted"
        reason = "The permitted budget is exhausted. Unresolved alternatives remain; this is not a supported finding."
    else:
        code = "inconclusive"
        reason = "Ambiguous or contradictory evidence ended testing under the existing policy. Unused allowance does not establish another eligible experiment."
    return {"code": code, "completed": completed, "maximum": maximum, "remaining": remaining, "not_needed": remaining if code == "supported" else None, "reason": reason}


def render_progress(report: dict) -> str:
    value = progress(report)
    escape = lambda x: html.escape(str(x))
    return (
        '<section aria-label="Test stopping policy"><h2>Test stopping policy</h2><p>'
        + ("Investigation in progress" if value["code"] == "continue" else "Investigation needs validation" if value["code"] == "invalid" else "Investigation complete — " + escape(value["code"]))
        + " — " + str(value["completed"]) + " of 4 permitted tests.</p><p>Remaining allowance: "
        + str(value["remaining"]) + ". "
        + ("Tests not needed under this policy: " + str(value["not_needed"]) + ". " if value["not_needed"] is not None else "Unused allowance is not authorization for more tests. ")
        + escape(value["reason"]) + "</p><p>Review findings and retain the JSON record for independent replay. No physical-world causal identification is implied.</p></section>"
    )
