import { afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import DemoConsole from "./DemoConsole";
import record from "../../docs/submission/misleading_sensor.json";
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
  vi.stubGlobal("scrollTo", vi.fn());
  return f;
}
it("discloses synthetic limits and disables real inference in public mode", async () => {
  setup();
  render(<DemoConsole />);
  await screen.findByText("Synthetic research demo");
  expect(screen.getByLabelText("Use real Meta inference")).toBeDisabled();
  expect(
    screen.getByText(
      /Thermal images and vibration waveforms provide numerical context/,
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Real Meta inference is unavailable/),
  ).toBeInTheDocument();
});
it("handles capacity errors without silently substituting inference", async () => {
  const f = setup();
  render(<DemoConsole />);
  const start = await screen.findByRole("button", {
    name: "Open investigation",
  });
  await waitFor(() => expect(start).toBeEnabled());
  f.mockResolvedValue({ ok: false, status: 429 });
  fireEvent.click(start);
  expect(await screen.findByRole("alert")).toHaveTextContent("capacity limit");
  expect(
    screen.getByText(/Real Meta inference is unavailable/),
  ).toBeInTheDocument();
});
it("requires owner authentication and does not persist tokens", async () => {
  setup(401);
  render(<DemoConsole />);
  expect(await screen.findByLabelText("Owner access token")).toHaveAttribute(
    "type",
    "password",
  );
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
  expect(
    screen.getByText(/Real Meta inference is unavailable/),
  ).toBeInTheDocument();
});

it("shows the ephemeral-hosting warning", async () => {
  setup().mockImplementation(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () =>
      url.endsWith("capabilities")
        ? {
            ...capabilities,
            persistence: "ephemeral_sqlite",
            hosting_notice:
              "Free hosting may sleep; export reports before restart.",
          }
        : [],
  }));
  render(<DemoConsole />);
  expect(await screen.findByRole("note")).toHaveTextContent(
    "export reports before restart",
  );
});
it("keeps the saved investigation ID after a transient hosting failure", async () => {
  localStorage.setItem("forge-sequential-session", "saved");
  setup().mockImplementation(async (url: string) =>
    url.includes("/sessions/")
      ? { ok: false, status: 503 }
      : {
          ok: true,
          status: 200,
          json: async () => (url.endsWith("capabilities") ? capabilities : []),
        },
  );
  render(<DemoConsole />);
  expect(await screen.findByRole("alert")).toHaveTextContent("503");
  expect(localStorage.getItem("forge-sequential-session")).toBe("saved");
});

it("keeps configured but untested inference unavailable", async () => {
  setup().mockImplementation(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () =>
      url.endsWith("capabilities")
        ? {
            mode: "private",
            real_inference_permitted: true,
            real_inference_verified: false,
            model_configuration: "configured_unverified",
          }
        : [],
  }));
  render(<DemoConsole />);
  expect(
    await screen.findByText(
      "The model is configured, but an authenticated test is required before it can be used.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Use real Meta inference")).toBeDisabled();
});
it("moves from the case lobby to focused evidence and report views", async () => {
  setup().mockImplementation(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () =>
      url.endsWith("capabilities")
        ? capabilities
        : url.endsWith("scenarios")
          ? [{ id: "misleading_sensor", title: "Misleading sensor" }]
          : { ...record.investigation, id: "test-case", version: 5 },
  }));
  render(<DemoConsole />);
  const open = await screen.findByRole("button", {
    name: "Open investigation",
  });
  await waitFor(() => expect(open).toBeEnabled());
  fireEvent.click(open);
  await screen.findByRole("heading", { name: "Understand the problem." });
  expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Evidence" }));
  expect(
    screen.getByRole("slider", { name: "Measurement minute" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Report" }));
  expect(
    screen.getByRole("button", { name: /Download verification record/ }),
  ).toBeEnabled();
  expect(
    screen.getByRole("region", { name: "Report preview" }),
  ).toBeInTheDocument();
});
it("lets users inspect another case without discarding the current investigation", async () => {
  localStorage.setItem("forge-sequential-session", "test-case");
  const f = setup();
  f.mockImplementation(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () =>
      url.endsWith("capabilities")
        ? capabilities
        : url.endsWith("scenarios")
          ? [{ id: "misleading_sensor", title: "Case" }]
          : { ...record.investigation, id: "test-case", version: 5 },
  }));
  render(<DemoConsole />);
  await screen.findByRole("heading", { name: "Understand the problem." });
  fireEvent.click(screen.getByRole("button", { name: "Change case" }));
  expect(
    screen.getByRole("heading", { name: "Choose a case" }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Return to your investigation" }),
  );
  expect(
    screen.getByRole("heading", { name: "Understand the problem." }),
  ).toBeInTheDocument();
  expect(localStorage.getItem("forge-sequential-session")).toBe("test-case");
  expect(f.mock.calls.every(([, options]) => options.method === "GET")).toBe(
    true,
  );
});
