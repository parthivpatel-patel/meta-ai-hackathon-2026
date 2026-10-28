export type ProgressInput = {
  status: string;
  completed: number;
  maximum: number;
  hasPlan: boolean;
  selectionPending?: boolean;
};
export function investigationProgress({
  status,
  completed,
  maximum,
  hasPlan,
  selectionPending = false,
}: ProgressInput) {
  const remaining = Math.max(0, maximum - completed);
  const terminal = [
    "SUPPORTED_SYNTHETIC",
    "INCONCLUSIVE",
    "ABSTAIN",
    "REJECTED",
  ].includes(status);
  const invalid =
    !Number.isInteger(completed) ||
    !Number.isInteger(maximum) ||
    maximum < 1 ||
    maximum > 4 ||
    completed < 0 ||
    completed > maximum ||
    (!terminal && status !== "IN_PROGRESS") ||
    (terminal && hasPlan) ||
    (status === "IN_PROGRESS" &&
      (remaining === 0 || (!hasPlan && !selectionPending)));
  const code = invalid
    ? "invalid"
    : !terminal
      ? "continue"
      : status === "SUPPORTED_SYNTHETIC"
        ? "supported"
        : status === "ABSTAIN"
          ? "abstain"
          : status === "REJECTED"
            ? "rejected"
            : remaining === 0
              ? "exhausted"
              : "inconclusive";
  const reason = {
    invalid:
      "The report state is inconsistent. Do not execute a test; restore a verified checkpoint or independently replay an exported report.",
    continue: hasPlan
      ? "A discriminating experiment remains available and requires your explicit confirmation."
      : "Prepare hypotheses and select a discriminating experiment before authorizing execution.",
    supported:
      "The independent verifier reached support within the synthetic model. The selector stops on a terminal decision; additional tests are not required by this policy.",
    exhausted:
      "The permitted test budget is exhausted. Unresolved alternatives remain; do not treat this as a supported finding.",
    inconclusive:
      "Ambiguous or contradictory evidence ended this investigation under the existing policy. Unused budget does not establish that another eligible experiment exists.",
    abstain:
      "Evidence quality is insufficient. The verifier abstained; review missing or invalid measurements before starting another investigation.",
    rejected:
      "Evidence or experiment records were rejected. Restore or replay verified evidence before continuing.",
  }[code];
  const title =
    code === "invalid"
      ? "Investigation needs validation"
      : code === "continue"
        ? "Investigation in progress"
        : code === "supported"
          ? `Investigation complete — supported after ${completed} of ${maximum} permitted tests`
          : code === "exhausted"
            ? `Investigation complete — budget exhausted after ${completed} of ${maximum} permitted tests`
            : `Investigation complete — ${code} after ${completed} of ${maximum} permitted tests`;
  return {
    code,
    title,
    reason,
    terminal: terminal && !invalid,
    canExecute: !invalid && !terminal && hasPlan,
    remaining,
    notNeeded: code === "supported" ? remaining : null,
    next: invalid
      ? "Restore or independently replay evidence"
      : !terminal
        ? hasPlan
          ? "Review and confirm the proposed test"
          : "Prepare or select the next experiment"
        : "Review findings and export the report",
  };
}
