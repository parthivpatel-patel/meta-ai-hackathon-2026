import { afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import Phase2Investigation from "./Phase2Investigation";
const report = {
  id: "RUN2-fixture",
  model_source: "deterministic_rules_not_meta",
  asset_features: {},
  verification: {
    status: "SUPPORTED_SYNTHETIC",
    findings: ["process-temperature", "process-vibration"],
    reasons: ["All channels accounted for"],
    uncertainty: "99% familywise intervals",
    channels: [],
  },
  model_assessments: [],
  hypotheses: { hypotheses: [] },
  trace: ["Independent verification"],
  limitations: ["Synthetic only"],
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("runs multifault investigation without claiming Meta inference", async () => {
  const fetchMock = vi
    .fn()
    .mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            url.includes("model-status")
              ? { status: "disabled", network_inference_enabled: false }
              : report,
          ),
      }),
    );
  vi.stubGlobal("fetch", fetchMock);
  render(<Phase2Investigation />);
  await waitFor(() => expect(screen.getByRole("checkbox")).toBeDisabled());
  fireEvent.change(screen.getByLabelText("Phase 2 test case"), {
    target: { value: "multi" },
  });
  fireEvent.click(screen.getByText("Run Phase 2 investigation"));
  expect(await screen.findByText("SUPPORTED SYNTHETIC")).toBeInTheDocument();
  expect(screen.getByText("RULES-BASED · NOT META")).toBeInTheDocument();
  expect(
    screen.getByText(/process-temperature, process-vibration/),
  ).toBeInTheDocument();
  const call = fetchMock.mock.calls.find(
    (c) => c[0] === "/api/v2/investigations",
  )!;
  expect(JSON.parse(call[1].body).use_meta).toBe(false);
});
it("does not silently fall back when the investigation fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(
          url.includes("model-status")
            ? {
                ok: true,
                json: () =>
                  Promise.resolve({
                    status: "disabled",
                    network_inference_enabled: false,
                  }),
              }
            : { ok: false, status: 503 },
        ),
      ),
  );
  render(<Phase2Investigation />);
  fireEvent.click(screen.getByText("Run Phase 2 investigation"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "no inference fallback",
  );
  expect(screen.queryByText("SUPPORTED SYNTHETIC")).not.toBeInTheDocument();
});
it("ingests contextual synthetic thermal and waveform evidence", async () => {
  const assets = {
    thermal: {
      pixels: Array.from({ length: 8 }, () => Array(8).fill(65)),
      units: "celsius",
      declared_synthetic: true,
    },
  };
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(
              url.includes("model-status")
                ? { status: "disabled", network_inference_enabled: false }
                : url.includes("/demo")
                  ? assets
                  : {
                      content_hash: "abc",
                      modalities: {
                        thermal: { maximum_celsius: 85, hot_pixel_count: 9 },
                      },
                      limitation: "Not causal proof",
                    },
            ),
        }),
      ),
  );
  render(<Phase2Investigation />);
  fireEvent.click(screen.getByText("Attach synthetic multimodal sample"));
  expect(
    await screen.findByRole("img", { name: "Calibrated thermal image" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/9 hot pixels/)).toBeInTheDocument();
});
