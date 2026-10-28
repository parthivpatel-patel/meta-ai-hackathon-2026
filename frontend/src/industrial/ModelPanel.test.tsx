import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { boundedFetch } from "../investigation/useInvestigation";
import { ModelPanel } from "./ModelPanel";
import type { Report } from "./contracts";

vi.mock("../investigation/useInvestigation", () => ({ boundedFetch: vi.fn() }));
beforeEach(() => {
  vi.mocked(boundedFetch).mockReset();
  vi.mocked(boundedFetch).mockResolvedValue({
    ok: true, json: async () => ({ live_requests_permitted: false, live_access_verified: false }),
  } as Response);
});
afterEach(cleanup);
function report(): Report {
  return {
    schema: "forge-industrial-report-1", report_hash: "a".repeat(64),
    request: { recipe: { version: "coupled-pump-1", scenario: "normal", seed: 2026, steps: 360, onset: 280, sample_period_seconds: 1, actions: [] }, context: { component_id: "pump", at_sequence: 319 }, experiments: 0 },
    measurements: [], evidence_window: { first_sequence: 200, last_sequence: 319, time_step_seconds: 1 },
    hypotheses: { hypotheses: [] }, ranking: [], trials: [], events: [],
    decision: { status: "IN_PROGRESS", findings: [], reasons: [], uncertainty: "Unknown" }, plan: null, limitations: [],
  };
}
it("keeps live inference unavailable and preparation disabled without a capture", async () => {
  render(<ModelPanel report={null} busy={false} preparedHash="" onPrepare={vi.fn()} />);
  await screen.findByText(/Live Meta inference unavailable/);
  expect(screen.getByRole("button", { name: "Prepare observed model evidence" })).toBeDisabled();
  expect(screen.getByText("Deterministic rules — not Meta inference")).toBeInTheDocument();
  expect(screen.queryByText(/Built with Muse Spark Open/)).not.toBeInTheDocument();
});
it("prepares only initial captured evidence and explains the resulting hash", async () => {
  const prepare = vi.fn();
  const r = report();
  const { rerender } = render(<ModelPanel report={r} busy={false} preparedHash="aabb" onPrepare={prepare} />);
  fireEvent.click(screen.getByRole("button", { name: "Prepare observed model evidence" }));
  expect(prepare).toHaveBeenCalledTimes(1);
  expect(screen.getByText("aabb")).toBeInTheDocument();
  rerender(<ModelPanel report={{ ...r, request: { ...r.request, experiments: 1 } }} busy={false} preparedHash="" onPrepare={prepare} />);
  expect(screen.getByRole("button", { name: "Prepare observed model evidence" })).toBeDisabled();
  await screen.findByText(/Live Meta inference unavailable/);
});
it("labels fixture proposals explicitly and never as genuine Meta inference", async () => {
  const r = { ...report(), model_proposal: { source: "test_transport" as const, requested_model: "target", returned_model: "target" } };
  render(<ModelPanel report={r} busy={true} preparedHash="" onPrepare={vi.fn()} />);
  await screen.findByText("Recorded fixture proposals — not Meta inference");
  expect(screen.getByRole("button", { name: "Prepare observed model evidence" })).toBeDisabled();
  expect(screen.queryByText(/VERIFIED_REAL_INFERENCE|Built with/)).not.toBeInTheDocument();
});
it("treats imported model identity as a recorded unverified claim", async () => {
  const r = { ...report(), model_proposal: { source: "meta_http_response" as const, requested_model: "target", returned_model: "target" } };
  render(<ModelPanel report={r} busy={false} preparedHash="" onPrepare={vi.fn()} />);
  await screen.findByText(/Recorded Meta response claim — source not authenticated/);
  expect(screen.queryByText(/Built with/)).not.toBeInTheDocument();
});
it("fails closed on an unexpected live status without losing deterministic guidance", async () => {
  vi.mocked(boundedFetch).mockResolvedValue({ ok: true, json: async () => ({ live_requests_permitted: true, live_access_verified: true }) } as Response);
  render(<ModelPanel report={null} busy={false} preparedHash="" onPrepare={vi.fn()} />);
  await screen.findByText(/Model status unavailable/);
  expect(screen.getByText("Deterministic rules — not Meta inference")).toBeInTheDocument();
});
it("aborts status lookup on unmount instead of leaving a subscription", async () => {
  vi.mocked(boundedFetch).mockImplementation(() => new Promise(() => {}));
  const { unmount } = render(<ModelPanel report={null} busy={false} preparedHash="" onPrepare={vi.fn()} />);
  await waitFor(() => expect(boundedFetch).toHaveBeenCalledTimes(1));
  const signal = vi.mocked(boundedFetch).mock.calls[0][1]?.signal;
  unmount();
  expect(signal?.aborted).toBe(true);
});
