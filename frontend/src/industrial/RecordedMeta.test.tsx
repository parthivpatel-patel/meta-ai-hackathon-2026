import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import RecordedMeta from "./RecordedMeta";

// Supply the real browser WebCrypto API in jsdom using Node's built-in module.
const cryptoModule = "node:crypto";
const { webcrypto } = await import(cryptoModule) as { webcrypto: Crypto };
const fsModule = "node:fs";
const { readFileSync } = await import(fsModule) as { readFileSync: (path: string, encoding: string) => string };
// Vitest runs from frontend/, as configured in package.json and CI.
const raw = readFileSync("../backend/forge/recorded_data/meta-pressure-investigation.json", "utf8");
const report = JSON.parse(raw);
const sha = "8cb36b2d182ac84657abbe07ba6230c7483dd115aeeed0478fee80a49c32b88f";
const metadata = () => ({ provenance: {
  review_id: "forge-meta-pressure-20261028", source: "meta_http_response", mode: "previously_recorded",
  synthetic: true, independently_verified: true, public_live_inference_enabled: false,
  model_id: "meta-models/muse-spark-open-1026", recorded_utc: "2026-10-28T23:07:11.078810+00:00",
  artifact_sha256: sha, input_hash: "input", output_hash: "output",
  scope: "This recorded case is not the currently selected 3D pump recording.", basis: "Reviewed private receipt.",
} });
const replay = { verified: true, status: "SUPPORTED_SYNTHETIC", report_run_id: report.run_id,
  artifact_sha256: sha, network_requests_sent: 0, new_experiments_executed: 0 };
function setup(change?: (value: ReturnType<typeof metadata>) => void, badRaw = false) {
  const value = metadata(); change?.(value);
  const fetcher = vi.fn(async (url: string) => {
    if (url.endsWith("report.json")) return new Response(badRaw ? "{}" : raw);
    return new Response(JSON.stringify(url.endsWith("/replay") ? replay : value));
  });
  vi.stubGlobal("fetch", fetcher); return fetcher;
}
beforeEach(() => { vi.stubGlobal("crypto", webcrypto); setup(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("labels the pinned genuine report as recorded, synthetic and independently verified", async () => {
  const fetcher = setup(); render(<RecordedMeta onReturn={vi.fn()} />);
  expect(await screen.findByText("Genuine Meta model output")).toBeVisible();
  for (const label of ["Previously recorded", "Synthetic investigation", "Independently verified"])
    expect(screen.getByText(label, { exact: true })).toBeVisible();
  expect(screen.getByText(/Public live inference is disabled/)).toBeVisible();
  expect(screen.getByText(/not the currently selected 3D/)).toBeVisible();
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  expect(screen.getByRole("link", { name: "Download recorded investigation JSON" })).toHaveAttribute("href", "/api/v3/recorded-meta/report.json");
  expect(screen.queryByRole("button", { name: /Run proposed/ })).not.toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls.every(([url]) => url.startsWith("/api/v3/recorded-meta"))).toBe(true);
});

it("replays only the fixed recorded evidence and preserves its hypotheses", async () => {
  const fetcher = setup(); render(<RecordedMeta onReturn={vi.fn()} />);
  await screen.findByText("Genuine Meta model output");
  fireEvent.click(screen.getByRole("button", { name: "Replay independent verification" }));
  expect(await screen.findByText(/Independent replay passed/)).toBeVisible();
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(fetcher.mock.calls[2][0]).toBe("/api/v3/recorded-meta/replay");
});

it("keeps the recorded report when replay is unavailable, without retrying inference", async () => {
  const fetcher = setup(); render(<RecordedMeta onReturn={vi.fn()} />);
  await screen.findByText("Genuine Meta model output");
  fetcher.mockImplementationOnce(async () => new Response("untrusted body", { status: 503 }));
  fireEvent.click(screen.getByRole("button", { name: "Replay independent verification" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("recorded investigation is preserved");
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  expect(screen.queryByText(/Independent replay passed/)).not.toBeInTheDocument();
});

it.each(["fixture", "rules", "hash", "live"])("does not label an invalid %s claim as reviewed genuine evidence", async mode => {
  setup(value => {
    if (mode === "fixture") value.provenance.source = "test_transport";
    if (mode === "rules") value.provenance.source = "deterministic_rules_not_meta";
    if (mode === "hash") value.provenance.artifact_sha256 = "wrong";
    if (mode === "live") value.provenance.public_live_inference_enabled = true;
  });
  render(<RecordedMeta onReturn={vi.fn()} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Reviewed recorded evidence is unavailable");
  expect(screen.queryByText("Genuine Meta model output", { exact: true })).not.toBeInTheDocument();
});

it("rejects a changed artifact even when metadata still claims the reviewed hash", async () => {
  setup(undefined, true); render(<RecordedMeta onReturn={vi.fn()} />);
  await screen.findByRole("alert");
  expect(screen.queryByText("Genuine Meta model output", { exact: true })).not.toBeInTheDocument();
});

it("aborts loads on unmount without interpreting provider text or retaining subscriptions", async () => {
  const fetcher = setup(); const { unmount } = render(<RecordedMeta onReturn={vi.fn()} />);
  await screen.findByText("Genuine Meta model output"); unmount();
  const calls = fetcher.mock.calls as unknown as [string, RequestInit][];
  expect(calls[0][1].signal?.aborted).toBe(true);
});

it("leaves the case only through an explicit workspace navigation action", async () => {
  const back = vi.fn(); render(<RecordedMeta onReturn={back} />);
  await screen.findByText("Genuine Meta model output");
  expect(back).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Return to existing workspace" }));
  await waitFor(() => expect(back).toHaveBeenCalledOnce());
});
