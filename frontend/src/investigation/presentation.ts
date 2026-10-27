export type Stage =
  "Overview" | "Evidence" | "Possible causes" | "Tests" | "Results" | "Report";
export const stages: Stage[] = [
  "Overview",
  "Evidence",
  "Possible causes",
  "Tests",
  "Results",
  "Report",
];
export const introductions: Record<
  Stage,
  { title: string; description: string }
> = {
  Overview: {
    title: "Understand the problem.",
    description: "Review the incident, then inspect the measurements.",
  },
  Evidence: {
    title: "Examine the evidence.",
    description:
      "Explore measurements and supporting records. Unusual readings are not a diagnosis.",
  },
  "Possible causes": {
    title: "Consider what could explain it.",
    description:
      "Compare possible causes before reaching a conclusion. Each one must be checked against independent evidence.",
  },
  Tests: {
    title: "Put an explanation to the test.",
    description:
      "Review the proposed experiment, then run it in the synthetic system. The result determines the next step.",
  },
  Results: {
    title: "See what the evidence supports.",
    description:
      "These findings come from independent numerical checks. A generated explanation cannot change them.",
  },
  Report: {
    title: "Keep a record you can check.",
    description:
      "Download the investigation and its evidence. The numerical record can be verified again without a model connection.",
  },
};
export function sourceLabel(source: string) {
  if (source === "meta_http_response")
    return "Analysis mode: Recorded Meta response";
  if (source === "test_transport")
    return "Analysis mode: Local test response, not Meta";
  if (source === "not_run") return "Model inference has not run";
  return "Analysis mode: Rules-based, not Meta";
}
export function causeName(id: string): string {
  if (id === "normal") return "Measurements consistent with normal operation";
  const [kind, channel] = id.split("-");
  const channels: Record<string, string> = {
    temperature: "temperature",
    vibration: "vibration",
    pressure: "pressure",
  };
  if (channels[channel])
    return kind === "sensor"
      ? `A ${channels[channel]} sensor error`
      : `A change in process ${channels[channel]}`;
  return id.replaceAll("_", " ").replaceAll("-", " ");
}
export function resultLabel(status: string) {
  return (
    (
      {
        SUPPORTED_SYNTHETIC: "Supported in this simulation",
        SUPPORTED: "Supported by the evidence",
        BASELINE_CONSISTENT: "Consistent with the baseline",
        REJECTED: "Not supported",
        CONTRADICTED: "Contradicted by evidence",
        NEEDS_TEST: "Needs a test",
        UNRESOLVED: "Not resolved",
        INCONCLUSIVE: "The evidence is inconclusive",
        ABSTAIN: "Not enough evidence to reach a conclusion",
        IN_PROGRESS: "More tests are needed",
        COMPLETE: "Investigation complete",
        OBSERVED: "Evidence collected",
        HYPOTHESES_READY: "Ready to investigate",
        EXPERIMENT_SELECTED: "A test is ready",
      } as Record<string, string>
    )[status] || status.toLowerCase().replaceAll("_", " ")
  );
}
export function testName(kind: string) {
  return (
    (
      {
        reference_check: "Check independent reference measurements",
        restore_feed: "Restore the process input",
        recalibrate_sensor: "Recalibrate a sensor",
      } as Record<string, string>
    )[kind] || kind.replaceAll("_", " ")
  );
}
