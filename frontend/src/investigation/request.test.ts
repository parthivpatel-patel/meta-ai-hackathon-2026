import { afterEach, expect, it, vi } from "vitest";
import { boundedFetch } from "./useInvestigation";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("bounds stalled requests and gives recovery instructions", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    (_path: string, init: RequestInit) =>
      new Promise((_resolve, reject) =>
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        ),
      ),
  );
  const pending = expect(boundedFetch("/api/v3/sessions")).rejects.toThrow(
    /Reload the saved investigation/,
  );
  await vi.advanceTimersByTimeAsync(30000);
  await pending;
});
