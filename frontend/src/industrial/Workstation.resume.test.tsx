import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import Workstation from "./Workstation";
import { boundedFetch } from "../investigation/useInvestigation";
import { checkpoint, deleteCheckpoint, writeCheckpoint } from "./recovery";
import type { Recipe, Recording, Report } from "./contracts";
import observedReport from "../../../docs/investigation-resume/evidence/before/1440-one-test-report.json";

vi.mock("../investigation/useInvestigation", () => ({ boundedFetch: vi.fn() }));
vi.mock("./Machine", () => ({ Machine: () => <div>Machine renderer</div> }));
const oneTest = observedReport as unknown as Report;
// UI transport double only; numerical reproduction is covered by backend and browser tests.
const captured = {
  ...oneTest,
  report_hash: "b".repeat(64),
  request: { ...oneTest.request, experiments: 0 },
  trials: [],
  events: [],
};
function simulation(recipe: Recipe): Recording {
  return {
    version: recipe.version,
    machine_id: "pump-104",
    recipe,
    events: [],
    limitations: "Synthetic only",
    components: ["pump", "bearing", "base"].map((id) => ({
      id,
      name: id === "bearing" ? "Bearing housing" : id,
      category: "pump",
      parent: "pump-104",
      sensors: id === "base" ? [] : ["vibration"],
      geometry: { kind: "box", position: [0, 0, 0], size: [1, 1, 1] },
      provenance: "procedural",
    })),
    sensors: [
      {
        id: "vibration",
        component_id: "bearing",
        unit: "mm/s",
        range: [0, 30],
      },
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
          quality: "VALID" as const,
        },
      ],
    })),
  };
}
function setup() {
  vi.mocked(boundedFetch).mockImplementation(async (url, options) => {
    if (String(url).endsWith("/simulate"))
      return new Response(
        JSON.stringify(simulation(JSON.parse(String(options?.body)))),
      );
    if (String(url).endsWith("/investigate"))
      return new Response(
        JSON.stringify(
          JSON.parse(String(options?.body)).experiments ? oneTest : captured,
        ),
      );
    if (String(url).endsWith("/model-status"))
      return new Response(
        JSON.stringify({
          live_requests_permitted: false,
          live_access_verified: false,
        }),
      );
    throw Error("Unexpected route");
  });
  render(<Workstation />);
}
const inspect = () =>
  within(document.querySelector(".component-inspector") as HTMLElement);
const calls = () =>
  vi
    .mocked(boundedFetch)
    .mock.calls.filter(([url]) => String(url).endsWith("/investigate"));
async function reproduce() {
  setup();
  await screen.findByRole("heading", { name: "Pump and motor assembly" });
  fireEvent.change(screen.getByLabelText("Machine scenario", { exact: true }), {
    target: { value: "bearing" },
  });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Focus scenario window" }),
    ).toBeEnabled(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Focus scenario window" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Capture observation window" }),
  );
  await screen.findByText(/Captured from bearing/);
  fireEvent.click(
    screen.getByRole("button", { name: "Run proposed simulated test" }),
  );
  await waitFor(() =>
    expect(screen.getByText(/1 \/ 4 tests ·/)).toBeInTheDocument(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: /inspect machine response/ }),
  );
  expect(screen.getByText("Counterfactual test result")).toBeInTheDocument();
  expect(screen.getByLabelText("Machine recording position")).toHaveValue(
    "319",
  );
  return inspect();
}
async function assertPreserved() {
  fireEvent.click(screen.getByRole("button", { name: "Reports" }));
  expect(
    screen.getByRole("region", { name: "Report preview" }),
  ).toHaveTextContent(oneTest.report_hash);
  expect(screen.getByText(/1 \/ 4 tests ·/)).toBeInTheDocument();
}
beforeAll(() => vi.stubGlobal("indexedDB", new IDBFactory()));
beforeEach(async () => {
  await deleteCheckpoint("machine");
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
afterAll(() => vi.unstubAllGlobals());

it("resumes the reported counterfactual bearing investigation without recapturing or executing tests", async () => {
  const inspector = await reproduce();
  expect(
    inspector.getByRole("button", { name: "Resume existing investigation" }),
  ).toBeEnabled();
  expect(
    inspector.getByRole("button", {
      name: "Capture new observation window",
      hidden: true,
    }),
  ).toBeDisabled();
  expect(
    inspector.getByText(
      /These samples are simulated experiment outcomes, not observed evidence/,
    ),
  ).toBeInTheDocument();
  const count = calls().length;
  fireEvent.click(
    inspector.getByRole("button", { name: "Resume existing investigation" }),
  );
  expect(screen.getByRole("button", { name: "Investigation" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(calls()).toHaveLength(count);
  await assertPreserved();
  fireEvent.click(screen.getByRole("button", { name: "Machine" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Return to observed simulation" }),
  );
  expect(
    inspector.getByRole("button", {
      name: "Capture new observation window",
      hidden: true,
    }),
  ).toBeEnabled();
  expect(calls()).toHaveLength(count);
  await assertPreserved();
});

it("keeps capture guards and a resume action after independently restored one-test checkpoints", async () => {
  await writeCheckpoint(
    checkpoint("machine", {
      recipe: oneTest.request.recipe,
      selected: "bearing",
      cursor: 319,
      tab: "Machine",
      speed: 8,
      report: oneTest,
    }),
  );
  setup();
  fireEvent.click(
    await screen.findByRole("button", { name: "Restore browser checkpoint" }),
  );
  await screen.findByRole("button", { name: "Resume existing investigation" });
  const inspector = inspect(),
    count = calls().length;
  expect(
    inspector.getByRole("button", {
      name: "Capture new observation window",
      hidden: true,
    }),
  ).toBeEnabled();
  fireEvent.change(screen.getByLabelText("Machine recording position"), {
    target: { value: "318" },
  });
  expect(
    inspector.getByRole("button", {
      name: "Capture new observation window",
      hidden: true,
    }),
  ).toBeDisabled();
  expect(
    inspector.getByRole("button", { name: "Resume existing investigation" }),
  ).toBeEnabled();
  fireEvent.change(screen.getByLabelText("Machine recording position"), {
    target: { value: "319" },
  });
  fireEvent.change(
    screen.getByLabelText("Machine component", { exact: true }),
    { target: { value: "base" } },
  );
  expect(
    inspector.getByRole("button", {
      name: "Capture new observation window",
      hidden: true,
    }),
  ).toBeDisabled();
  fireEvent.click(
    inspector.getByRole("button", { name: "Resume existing investigation" }),
  );
  expect(calls()).toHaveLength(count);
  await assertPreserved();
});

it("preserves prior report and test history when an explicit new capture fails", async () => {
  const inspector = await reproduce();
  fireEvent.click(
    screen.getByRole("button", { name: "Return to observed simulation" }),
  );
  expect(
    inspector.getByText(
      /A new capture replaces the active investigation and its test history/,
    ),
  ).toBeInTheDocument();
  vi.mocked(boundedFetch).mockRejectedValueOnce(Error("Capture interrupted"));
  fireEvent.click(
    inspector.getByRole("button", {
      name: "Capture new observation window",
      hidden: true,
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Capture interrupted",
  );
  expect(
    inspector.getByRole("button", { name: "Resume existing investigation" }),
  ).toBeEnabled();
  await assertPreserved();
});

it("allows navigation to an existing report while an experiment is pending without bypassing the busy guard", async () => {
  const inspector = await reproduce();
  fireEvent.click(
    inspector.getByRole("button", { name: "Resume existing investigation" }),
  );
  let finish!: (value: Response) => void;
  vi.mocked(boundedFetch).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Run proposed simulated test" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Machine" }));
  expect(
    inspector.getByRole("button", {
      name: "Capture new observation window",
      hidden: true,
    }),
  ).toBeDisabled();
  const count = calls().length;
  fireEvent.click(
    inspector.getByRole("button", { name: "Resume existing investigation" }),
  );
  expect(calls()).toHaveLength(count);
  expect(
    screen.getByRole("button", { name: "Run proposed simulated test" }),
  ).toBeDisabled();
  finish(new Response(JSON.stringify(oneTest)));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Run proposed simulated test" }),
    ).toBeEnabled(),
  );
});
