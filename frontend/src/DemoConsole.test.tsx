import { afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import DemoConsole from "./DemoConsole";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});
const capabilities = { mode: "public", real_inference_permitted: false };
function setup(status = 200) {
  const f = vi.fn().mockImplementation(async (url: string) => ({
    ok: status === 200,
    status,
    json: async () =>
      url.endsWith("capabilities")
        ? capabilities
        : [{ id: "misleading_sensor", title: "Misleading sensor" }],
  }));
  vi.stubGlobal("fetch", f);
  return f;
}
it("discloses synthetic limits and disables real inference in public mode", async () => {
  setup();
  render(<DemoConsole />);
  await screen.findByText("Restricted public demo · SYNTHETIC");
  expect(screen.getByLabelText("Use real Meta inference")).toBeDisabled();
  expect(
    screen.getByText(/Thermal\/waveform features are context/),
  ).toBeInTheDocument();
  expect(screen.getByText("Inference not run")).toBeInTheDocument();
});
it("handles capacity errors without silently substituting inference", async () => {
  const f = setup();
  render(<DemoConsole />);
  const start = await screen.findByRole("button", {
    name: "Start investigation",
  });
  await waitFor(() => expect(start).toBeEnabled());
  f.mockResolvedValue({ ok: false, status: 429 });
  fireEvent.click(start);
  expect(await screen.findByRole("alert")).toHaveTextContent("capacity limit");
  expect(screen.getByText("Inference not run")).toBeInTheDocument();
});
it("requires owner authentication and does not persist tokens", async () => {
  setup(401);
  render(<DemoConsole />);
  expect(
    await screen.findByLabelText("Owner access token (not stored)"),
  ).toHaveAttribute("type", "password");
  expect(localStorage.length).toBe(0);
});
it("removes an expired saved session gracefully", async () => {
  localStorage.setItem("forge-sequential-session", "expired");
  const f = setup();
  f.mockImplementation(async (url: string) =>
    url.includes("/sessions/")
      ? { ok: false, status: 404 }
      : {
          ok: true,
          status: 200,
          json: async () => (url.endsWith("capabilities") ? capabilities : []),
        },
  );
  render(<DemoConsole />);
  await waitFor(() =>
    expect(localStorage.getItem("forge-sequential-session")).toBeNull(),
  );
  expect(screen.getByText("Inference not run")).toBeInTheDocument();
});
