import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { EquipmentModel } from "./EquipmentModel";
import type { Session } from "./types";
afterEach(cleanup);
const session = {
  measurements: [{ minute: 0, temperature: 65, vibration: null, pressure: 6 }],
  observed: { signals: [{ channel: "pressure", flags: 3 }] },
  ranking: [],
  plan: null,
  trials: [],
  decision: { channels: [] },
  evidence: [
    {
      id: "telemetry",
      summary: "Synthetic measurements",
      provenance: "simulation",
    },
  ],
} as unknown as Session;
it("rotates projected geometry and resets without changing evidence", () => {
  const { container } = render(<EquipmentModel session={session} />);
  const before = container.querySelector("polygon")!.getAttribute("points");
  fireEvent.change(screen.getByRole("slider", { name: "Equipment rotation" }), {
    target: { value: "90" },
  });
  expect(container.querySelector("polygon")!.getAttribute("points")).not.toBe(
    before,
  );
  fireEvent.click(screen.getByRole("button", { name: "Reset equipment view" }));
  expect(container.querySelector("polygon")!.getAttribute("points")).toBe(
    before,
  );
  expect(screen.getByText(/not a validated digital twin/)).toBeInTheDocument();
});
it("provides keyboard accessible selection, missing data and actual evidence", () => {
  render(<EquipmentModel session={session} />);
  fireEvent.click(screen.getByRole("button", { name: "Bearing assembly" }));
  expect(screen.getByText(/Latest sample: Missing/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Pump housing" }));
  expect(
    screen.getByText(/Latest sample: 6 bar. Flagged samples: 3/),
  ).toBeInTheDocument();
  expect(screen.getByText(/Synthetic measurements/)).toBeInTheDocument();
  expect(screen.getByRole("img")).toHaveAccessibleName(/Pump housing selected/);
});
it("displays independent test witnesses and channel verification without inventing results", () => {
  const completed = {
    ...session,
    trials: [
      {
        id: "test-1",
        kind: "cooling_step",
        probes: [
          {
            channel: "temperature",
            witness_before: [65],
            witness_after: [60],
            primary_before: [65],
            primary_after: [60],
          },
        ],
      },
    ],
    decision: {
      channels: [
        {
          channel: "temperature",
          status: "supported",
          reasons: ["Independent witness agrees"],
        },
      ],
    },
  } as Session;
  render(<EquipmentModel session={completed} />);
  expect(
    screen.getByText(/Independent witness before: 65; after: 60/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      /Independent verification: supported. Independent witness agrees/,
    ),
  ).toBeInTheDocument();
});
