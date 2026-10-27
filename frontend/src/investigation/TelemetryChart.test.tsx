import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { TelemetryChart } from "./TelemetryChart";
afterEach(cleanup);
it("shows missing observations as gaps without inventing connecting measurements", () => {
  const rows = Array.from({ length: 120 }, (_, minute) => ({
    minute,
    pressure: minute === 60 ? null : 6,
    temperature: 65,
    vibration: 2,
  }));
  const { container } = render(
    <TelemetryChart rows={rows} flags={[{ channel: "pressure", flags: 1 }]} />,
  );
  expect(container.querySelectorAll(".plot-trace")).toHaveLength(2);
  expect(container.querySelectorAll(".missing-mark")).toHaveLength(1);
  fireEvent.change(screen.getByRole("slider", { name: "Measurement minute" }), {
    target: { value: "60" },
  });
  expect(screen.getByText("Missing")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Temperature" }));
  expect(container.querySelectorAll(".plot-trace")).toHaveLength(1);
  expect(container.querySelectorAll(".missing-mark")).toHaveLength(0);
  expect(
    screen.getByRole("img", { name: "Temperature measurements in °C" }),
  ).toBeInTheDocument();
});
it("maps the selected minute to the declared synthetic acquisition clock", () => {
  render(
    <TelemetryChart
      rows={Array.from({ length: 120 }, (_, minute) => ({
        minute,
        temperature: 65,
        pressure: 6,
        vibration: 2,
      }))}
      flags={[]}
      acquiredAt="2026-10-27T08:00:00Z"
    />,
  );
  fireEvent.change(screen.getByRole("slider", { name: "Measurement minute" }), {
    target: { value: "5" },
  });
  expect(screen.getByText("2026-10-27T08:05:00.000Z")).toBeInTheDocument();
});
it("opens the flagged signal so the incident is visible immediately", () => {
  render(
    <TelemetryChart
      rows={Array.from({ length: 120 }, (_, minute) => ({
        minute,
        temperature: 65,
        pressure: 6,
        vibration: 2,
      }))}
      flags={[{ channel: "temperature", flags: 10 }]}
    />,
  );
  expect(
    screen.getByRole("img", { name: "Temperature measurements in °C" }),
  ).toBeInTheDocument();
});
