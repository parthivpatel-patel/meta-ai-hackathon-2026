import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import Workstation from "./Workstation";
import { boundedFetch } from "../investigation/useInvestigation";
import type { Recording, Report } from "./contracts";
vi.mock("../investigation/useInvestigation", () => ({ boundedFetch: vi.fn() }));
vi.mock("./Machine", () => ({ Machine: () => <div>Machine renderer</div> }));
const recipe = {
  version: "coupled-pump-1" as const,
  scenario: "normal",
  seed: 2026,
  steps: 360,
  onset: 280,
  sample_period_seconds: 1 as const,
  actions: [],
};
const recording: Recording = {
  version: "coupled-pump-1",
  machine_id: "pump-104",
  recipe,
  events: [],
  limitations: "Synthetic only",
  components: ["pump", "bearing", "motor"].map((id) => ({
    id,
    name: id,
    category: "pump",
    parent: "pump-104",
    sensors: ["vibration"],
    geometry: { kind: "box", position: [0, 0, 0], size: [1, 1, 1] },
    provenance: "procedural",
  })),
  sensors: [
    { id: "vibration", component_id: "bearing", unit: "mm/s", range: [0, 30] },
  ],
  frames: Array.from({ length: 360 }, (_, sequence) => ({
    sequence,
    timestamp: new Date(Date.UTC(2026, 9, 27, 8, 0, sequence)).toISOString(),
    state: "RUNNING",
    source: "SIMULATED",
    readings: [
      {
        sensor_id: "vibration",
        value: sequence < 280 ? 1 : 4,
        quality: "VALID",
      },
    ],
  })),
};
const report: Report = {
  schema: "forge-industrial-report-1",
  report_hash: "a".repeat(64),
  request: {
    recipe,
    context: { component_id: "bearing", at_sequence: 319 },
    experiments: 0,
  },
  measurements: [],
  evidence_window: {
    first_sequence: 200,
    last_sequence: 319,
    time_step_seconds: 1,
  },
  hypotheses: { hypotheses: [] },
  ranking: [],
  trials: [],
  events: [],
  decision: {
    status: "IN_PROGRESS",
    findings: [],
    reasons: [],
    uncertainty: "Channel evidence cannot identify a unique physical failure.",
  },
  plan: {
    kind: "vibration_reduction",
    reason: "Separate competing causes",
    competing_predictions: [
      "Process may respond",
      "A sensor offset may persist",
    ],
  },
  limitations: ["Synthetic only"],
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function setup() {
  vi.mocked(boundedFetch).mockImplementation(async (url, options) => {
    if (String(url).endsWith("simulate"))
      return new Response(JSON.stringify(recording));
    if (String(url).endsWith("model-status"))
      return new Response(
        JSON.stringify({
          live_requests_permitted: false,
          live_access_verified: false,
        }),
      );
    if (String(url).endsWith("investigate")) {
      const req = JSON.parse(String(options?.body));
      return new Response(
        JSON.stringify(
          req.experiments
            ? {
                ...report,
                request: req,
                trials: [
                  { id: "one", kind: "vibration_reduction", probes: [] },
                ],
                events: [{ id: "one", action: "vibration_reduction", sequence: 320, after_frame: recording.frames[319], verification: "INCONCLUSIVE" }],
                plan: null,
                decision: { ...report.decision, status: "INCONCLUSIVE" },
              }
            : { ...report, request: req },
        ),
      );
    }
    throw Error("Unexpected route");
  });
  render(<Workstation />);
}
it("retains the captured case, selected component and playback position across all work modes", async () => {
  setup();
  await screen.findByRole("heading", { name: "Pump and motor assembly" });
  fireEvent.click(
    screen.getByRole("button", { name: "Focus scenario window" }),
  );
  fireEvent.change(
    screen.getByLabelText("Machine component", { exact: true }),
    { target: { value: "bearing" } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Capture observation window" }),
  );
  await screen.findByText(/Captured from bearing/);
  const calls = vi
    .mocked(boundedFetch)
    .mock.calls.filter(([u]) => String(u).endsWith("investigate"));
  expect(JSON.parse(String(calls[0][1]?.body)).context).toEqual({
    component_id: "bearing",
    at_sequence: 319,
  });
  for (const name of [
    "Telemetry",
    "Experiments",
    "Verification",
    "Reports",
    "Evidence",
    "Replay",
    "Machine",
  ]) {
    fireEvent.click(screen.getByRole("button", { name }));
    expect(
      screen.getByLabelText("Machine component", { exact: true }),
    ).toHaveValue("bearing");
  }
  expect(screen.getByLabelText("Machine recording position")).toHaveValue(
    "319",
  );
  expect(
    vi
      .mocked(boundedFetch)
      .mock.calls.filter(([u]) => String(u).endsWith("investigate")),
  ).toHaveLength(1);
});
it("never executes an experiment on navigation, requires an explicit confirmation and shows verifier uncertainty", async () => {
  setup();
  await screen.findByRole("heading", { name: "Pump and motor assembly" });
  fireEvent.click(
    screen.getByRole("button", { name: "Focus scenario window" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Capture observation window" }),
  );
  await screen.findByText(/Captured from/);
  fireEvent.click(screen.getByRole("button", { name: "Experiments" }));
  expect(
    vi
      .mocked(boundedFetch)
      .mock.calls.filter(([u]) => String(u).endsWith("investigate")),
  ).toHaveLength(1);
  fireEvent.click(
    screen.getByRole("button", { name: "Run proposed simulated test" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Verification" }),
    ).toHaveAttribute("aria-current", "page"),
  );
  expect(screen.getByText(report.decision.uncertainty)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name:/inspect machine response/}));
  expect(screen.getByRole("button", {name:"Machine"})).toHaveAttribute("aria-current", "page");
  fireEvent.click(screen.getByRole("button", {name:"Return to observed simulation"}));
  fireEvent.click(screen.getByRole("button", {name:"Reports"}));
  expect(screen.getByRole("region", {name:"Report preview"})).toHaveTextContent(report.report_hash);
  expect(
    JSON.parse(
      String(
        vi
          .mocked(boundedFetch)
          .mock.calls.filter(([u]) => String(u).endsWith("investigate"))[1][1]
          ?.body,
      ),
    ).experiments,
  ).toBe(1);
});
it("preserves the existing captured case when a later request fails", async () => {
  setup();
  await screen.findByRole("heading", { name: "Pump and motor assembly" });
  fireEvent.click(
    screen.getByRole("button", { name: "Focus scenario window" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Capture observation window" }),
  );
  await screen.findByText(/Captured from/);
  vi.mocked(boundedFetch).mockRejectedValueOnce(
    Error("Connection interrupted"),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Run proposed simulated test" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Connection interrupted",
  );
  expect(screen.getByText(/Captured from/)).toBeInTheDocument();
});
