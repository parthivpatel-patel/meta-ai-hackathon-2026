import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { investigationProgress } from "./progress";
import { InvestigationProgress } from "./InvestigationProgress";
import { InstrumentStrip } from "../industrial/WorkspacePanels";
import type { Frame } from "../industrial/contracts";
afterEach(cleanup);
it.each([
  ["SUPPORTED_SYNTHETIC", 2, 4, false, "supported", false],
  ["IN_PROGRESS", 1, 4, true, "continue", true],
  ["INCONCLUSIVE", 2, 4, false, "inconclusive", false],
  ["INCONCLUSIVE", 4, 4, false, "exhausted", false],
  ["ABSTAIN", 0, 4, false, "abstain", false],
  ["REJECTED", 1, 4, false, "rejected", false],
  ["IN_PROGRESS", 4, 4, true, "invalid", false],
  ["SUPPORTED_SYNTHETIC", 2, 4, true, "invalid", false],
  ["IN_PROGRESS", 1, 4, false, "invalid", false],
  ["UNKNOWN", 1, 4, false, "invalid", false],
] as const)(
  "presents %s with %i/%i and plan %s as %s",
  (status, completed, maximum, hasPlan, code, canExecute) => {
    const summary = investigationProgress({
      status,
      completed,
      maximum,
      hasPlan,
    });
    expect(summary.code).toBe(code);
    expect(summary.canExecute).toBe(canExecute);
    expect(summary.remaining).toBe(maximum - completed);
  },
);
it("treats four as a ceiling, explains a supported 2/4 stop and supplies the report next action", () => {
  render(
    <InvestigationProgress
      status="SUPPORTED_SYNTHETIC"
      completed={2}
      maximum={4}
      hasPlan={false}
      reasons={["All departures explained within synthetic assumptions"]}
    />,
  );
  expect(
    screen.getByRole("heading", {
      name: "Investigation complete — supported after 2 of 4 permitted tests",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Tests not needed under this policy"),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Review findings and export the report/),
  ).toBeInTheDocument();
  expect(screen.queryByText(/More tests are needed/)).not.toBeInTheDocument();
});
it("permits legacy preparation before selection while honoring its declared smaller budget", () => {
  expect(
    investigationProgress({
      status: "IN_PROGRESS",
      completed: 0,
      maximum: 1,
      hasPlan: false,
      selectionPending: true,
    }).code,
  ).toBe("continue");
  const result = investigationProgress({
    status: "INCONCLUSIVE",
    completed: 1,
    maximum: 1,
    hasPlan: false,
  });
  expect(result.code).toBe("exhausted");
  expect(result.remaining).toBe(0);
  expect(result.notNeeded).toBeNull();
});
it("never describes valid counterfactual or imported samples as observed acquisition", () => {
  const frame: Frame = {
    sequence: 319,
    timestamp: "2026-10-27T08:05:19Z",
    source: "SIMULATED",
    state: "RUNNING",
    readings: [{ sensor_id: "rpm", value: 3000, quality: "VALID" }],
  };
  const { rerender } = render(
    <InstrumentStrip frame={frame} mode="counterfactual" />,
  );
  expect(screen.getByText("Counterfactual test sample")).toBeInTheDocument();
  expect(
    screen.queryByText("Observed synthetic sample"),
  ).not.toBeInTheDocument();
  rerender(<InstrumentStrip frame={frame} mode="imported" />);
  expect(
    screen.getByText("Imported sample; source unverified"),
  ).toBeInTheDocument();
  expect(screen.getAllByText("MISSING")).toHaveLength(4);
});
