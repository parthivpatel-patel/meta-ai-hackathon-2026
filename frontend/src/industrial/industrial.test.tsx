import { afterEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  validateRecording,
  parseCSV,
  canonical,
  rotorPhases,
  type Sensor,
  type Component,
  type Frame,
} from "./contracts";
import { Machine } from "./Machine";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("derives slowed rotor phase from acquisition time/RPM and freezes stopped states", () => {
  const frames: Frame[] = [0, 1, 2].map((sequence) => ({
    sequence, timestamp: `2026-10-27T08:00:0${sequence}Z`, state: sequence === 2 ? "STOPPED" : "RUNNING", source: "SIMULATED",
    readings: [{ sensor_id: "rpm", value: 3000, quality: "VALID" }],
  }));
  const phases = rotorPhases(frames);
  expect(phases[1]).toBeCloseTo(Math.PI / 6);
  expect(phases[2]).toBe(phases[1]);
  frames[1].readings[0].value = null;
  expect(rotorPhases(frames)[1]).toBeNull();
  frames[1].readings[0] = { sensor_id: "rpm", value: 8000, quality: "OUT_OF_RANGE" };
  expect(rotorPhases(frames)[1]).toBeNull();
});
const sensors: Sensor[] = [
  { id: "vibration", component_id: "bearing", unit: "mm/s", range: [0, 30] },
];
const row = {
  timestamp: "2026-10-27T08:00:00Z",
  sensor_id: "vibration",
  component_id: "bearing",
  value: 2,
  unit: "mm/s",
};
it("validates declared units and associations, fills missing values and retains unverified provenance", () => {
  const frames = validateRecording(
    {
      schema: "forge-telemetry-1",
      machine_id: "pump-104",
      samples: [{ ...row, value: null }],
    },
    sensors,
  );
  expect(frames[0].source).toBe("REPLAYED_UNVERIFIED");
  expect(frames[0].readings[0].quality).toBe("MISSING");
  for (const change of [
    { unit: "rpm" },
    { component_id: "motor" },
    { value: NaN },
    { timestamp: "2026-02-30T08:00:00Z" },
    { timestamp: "2026-10-27T24:00:00Z" },
  ])
    expect(() =>
      validateRecording(
        {
          schema: "forge-telemetry-1",
          machine_id: "pump-104",
          samples: [{ ...row, ...change }],
        },
        sensors,
      ),
    ).toThrow();
});
it("rejects duplicate timestamps/sensors, excessive samples and ordering errors", () => {
  for (const samples of [
    [row, row],
    [{ ...row, timestamp: "2026-10-28T08:00:00Z" }, row],
    Array(5401).fill(row),
  ])
    expect(() =>
      validateRecording(
        { schema: "forge-telemetry-1", machine_id: "pump-104", samples },
        sensors,
      ),
    ).toThrow();
});
it("parses bounded simple CSV without executing formula-like fields", () => {
  const data = parseCSV(
    "timestamp,sensor_id,component_id,value,unit\n2026-10-27T08:00:00Z,vibration,bearing,2,mm/s",
  );
  expect(validateRecording(data, sensors)[0].readings[0].value).toBe(2);
  expect(() => parseCSV("hello,world")).toThrow();
  expect(() =>
    validateRecording(
      parseCSV(
        "timestamp,sensor_id,component_id,value,unit\n2026-10-27T08:00:00Z,=alert(1),bearing,2,mm/s",
      ),
      sensors,
    ),
  ).toThrow();
});
it("canonical report comparison detects changed evidence independent of key order", () => {
  expect(canonical({ a: 1, b: 2 })).toBe(canonical({ b: 2, a: 1 }));
  expect(canonical({ a: 2 })).not.toBe(canonical({ a: 1 }));
});
it("keeps fallback inspection and camera buttons functional without WebGL", () => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const components: Component[] = [
    {
      id: "motor",
      name: "Motor",
      category: "motor",
      parent: "pump-104",
      sensors: [],
      geometry: { kind: "cylinder", position: [-1, 0, 0], size: [0.5, 1, 0.5] },
      provenance: "procedural",
    },
  ];
  const frame: Frame = {
    sequence: 0,
    timestamp: "2026-10-27T08:00:00Z",
    state: "STARTING",
    source: "SIMULATED",
    readings: [],
  };
  const selected = vi.fn();
  const { container } = render(
    <Machine
      components={components}
      selected="motor"
      onSelect={selected}
      frame={frame}
    />,
  );
  expect(screen.getByText("2D inspection mode")).toBeInTheDocument();
  fireEvent.click(screen.getByText(/Camera and inspection tools/));
  const before = container.querySelector("svg g")?.getAttribute("transform");
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(container.querySelector("svg g")?.getAttribute("transform")).not.toBe(
    before,
  );
});
it("manual 2D inspection allocates no WebGL context", () => {
  const spy = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue(null);
  const frame: Frame = {
    sequence: 0,
    timestamp: "2026-10-27T08:00:00Z",
    state: "STARTING",
    source: "SIMULATED",
    readings: [],
  };
  render(
    <Machine
      components={[]}
      selected="motor"
      onSelect={() => {}}
      frame={frame}
      force2D
    />,
  );
  expect(screen.getByText("2D inspection mode")).toBeInTheDocument();
  expect(spy).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("button", { name: "Retry 3D" }),
  ).not.toBeInTheDocument();
});
it("fallback camera reset synchronizes the active view indicator", () => {
  const frame: Frame = {
    sequence: 0,
    timestamp: "2026-10-27T08:00:00Z",
    state: "STARTING",
    source: "SIMULATED",
    readings: [],
  };
  render(
    <Machine
      components={[]}
      selected="motor"
      onSelect={() => {}}
      frame={frame}
      force2D
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Front view" }));
  expect(screen.getByRole("button", { name: "Front view" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  fireEvent.click(screen.getByRole("button", { name: "Reset camera" }));
  expect(
    screen.getByRole("button", { name: "Isometric view" }),
  ).toHaveAttribute("aria-pressed", "true");
});
