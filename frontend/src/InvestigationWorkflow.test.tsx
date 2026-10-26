import { afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import InvestigationWorkflow from "./InvestigationWorkflow";
const base = {
  id: "opaque-case",
  dataset_hash: "a".repeat(64),
  model_source: "deterministic_rules_not_meta",
  observed: { signals: [], quality_issues: [] },
  candidates: [],
  selection: null,
  experiment: null,
  verification: null,
};
const candidates = [
  {
    id: "process-temperature",
    title: "Reduced heat removal",
    hypothesis: "Synthetic departure",
    prediction: "Witness responds to cooling intervention",
    basis: "40 flags",
    source: "deterministic_rules_not_meta",
  },
];
const selection = {
  kind: "restore_cooling",
  rationale: "Discriminate competing mechanisms",
  intervention: "Restore cooling conductance",
  replicates: 24,
  max_steps: 24,
};
const experiment = {
  id: "EXP-evidence",
  simulator: "independent-relaxation-v1",
  provenance: "Synthetic paired intervention replicates",
  probes: [
    {
      channel: "temperature",
      primary_before: [9, 9],
      primary_after: [1, 1],
      witness_before: [9, 9],
      witness_after: [1, 1],
    },
  ],
};
const verification = {
  decision: "SUPPORTED_SYNTHETIC",
  finding: "process-temperature",
  reasons: ["One supported explanation"],
  uncertainty: "99% Student-t intervals; not cause probabilities",
  causal_scope: "synthetic_model_only",
  assessments: [
    {
      hypothesis_id: "process-temperature",
      status: "SUPPORTED",
      evidence_refs: ["EXP-evidence"],
      reason: "Reduction exceeds threshold",
    },
  ],
  statistics: [
    {
      channel: "temperature",
      n: 24,
      witness_before: { estimate: 9, low: 8.7, high: 9.3 },
      witness_after: { estimate: 1, low: 0.7, high: 1.3 },
      witness_reduction: { estimate: 8, low: 7.7, high: 8.3 },
    },
  ],
};
function setup() {
  const replies = [
    { ...base, status: "OBSERVED" },
    { ...base, status: "HYPOTHESES_READY", candidates },
    { ...base, status: "EXPERIMENT_SELECTED", candidates, selection },
    {
      ...base,
      status: "EXPERIMENT_COMPLETE",
      candidates,
      selection,
      experiment,
    },
    {
      ...base,
      status: "VERIFIED",
      candidates,
      selection,
      experiment,
      verification,
    },
  ];
  const fetchMock = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(replies.shift()),
      }),
    );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("investigation workflow", () => {
  it("runs each stage, displays evidence and uncertainty, and offers portable reports", async () => {
    const fetchMock = setup();
    render(<InvestigationWorkflow scenario="cooling_loss" />);
    for (const label of [
      "Start investigation",
      "Generate candidates",
      "Select experiment",
      "Run simulation",
      "Verify evidence",
    ]) {
      fireEvent.click(await screen.findByRole("button", { name: label }));
    }
    expect(await screen.findByText("SUPPORTED SYNTHETIC")).toBeInTheDocument();
    expect(screen.getByText(/99% Student-t/)).toBeInTheDocument();
    expect(
      screen.getByText(/Physical-world causality is not established/),
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveTextContent("9.00");
    expect(screen.getByRole("link", { name: "Download JSON" })).toHaveAttribute(
      "href",
      "/api/v1/investigations/opaque-case/report.json",
    );
    expect(screen.getByRole("link", { name: "Download HTML" })).toHaveAttribute(
      "href",
      "/api/v1/investigations/opaque-case/report.html",
    );
    const calls = fetchMock.mock.calls;
    expect(JSON.parse(calls[0][1].body)).toEqual({
      scenario: "cooling_loss",
      seed: 42,
    });
    expect(calls[1][1].body).toBeUndefined();
    expect(JSON.parse(calls[2][1].body)).toEqual({ kind: null });
    fireEvent.click(screen.getByText("New investigation"));
    expect(screen.getByText("Start investigation")).toBeInTheDocument();
  });
  it("keeps failed steps available for retry and clears results when scenario changes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(<InvestigationWorkflow scenario="normal" />);
    fireEvent.click(screen.getByText("Start investigation"));
    expect(await screen.findByRole("alert")).toHaveTextContent("503");
    await waitFor(() =>
      expect(screen.getByText("Start investigation")).not.toBeDisabled(),
    );
    rerender(<InvestigationWorkflow scenario="imbalance" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("renders abstention reasons rather than presenting a failure diagnosis", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              ...base,
              status: "VERIFIED",
              verification: {
                ...verification,
                decision: "ABSTAIN",
                finding: null,
                reasons: ["Missing telemetry exceeds policy"],
                statistics: [],
                assessments: [],
              },
            }),
        }),
    );
    render(<InvestigationWorkflow scenario="normal" />);
    fireEvent.click(screen.getByText("Start investigation"));
    expect(await screen.findByText("ABSTAIN")).toBeInTheDocument();
    expect(
      screen.getByText("Missing telemetry exceeds policy"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No sufficiently supported finding/),
    ).toBeInTheDocument();
  });
});
