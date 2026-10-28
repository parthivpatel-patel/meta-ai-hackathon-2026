import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useInvestigation } from "./useInvestigation";
import fixture from "../../../docs/submission/misleading_sensor.json";
const oldSession = { ...fixture.investigation, id: "a".repeat(32), version: 7 };
const fresh = { ...oldSession, id: "b".repeat(32), version: 0 };
const response = (value: unknown) => new Response(JSON.stringify(value));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});
it("does not attach a stale boot recovery after the user has started another case", async () => {
  localStorage.setItem("forge-sequential-session", oldSession.id);
  let finish!: (value: Response) => void;
  const fetch = vi.fn(async (url: string) =>
    url.endsWith("/capabilities")
      ? response({ mode: "public" })
      : url.endsWith("/scenarios")
        ? response([])
        : url.endsWith("/sessions")
          ? response(fresh)
          : new Promise<Response>((resolve) => {
              finish = resolve;
            }),
  );
  vi.stubGlobal("fetch", fetch);
  const { result } = renderHook(() => useInvestigation());
  await waitFor(() => expect(result.current.cap?.mode).toBe("public"));
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  await act(async () => {
    await result.current.act(true);
  });
  expect(result.current.session?.id).toBe(fresh.id);
  await act(async () => {
    finish(response(oldSession));
    await Promise.resolve();
  });
  expect(result.current.session?.id).toBe(fresh.id);
  expect(localStorage.getItem("forge-sequential-session")).toBe(fresh.id);
});
it("locks immediately against duplicate advance requests rather than aborting a submitted experiment", async () => {
  localStorage.setItem("forge-sequential-session", oldSession.id);
  let finish!: (value: Response) => void;
  const fetch = vi.fn(async (url: string) =>
    url.endsWith("/capabilities")
      ? response({ mode: "public" })
      : url.endsWith("/scenarios")
        ? response([])
        : url.endsWith("/advance")
          ? new Promise<Response>((resolve) => {
              finish = resolve;
            })
          : response(oldSession),
  );
  vi.stubGlobal("fetch", fetch);
  const { result } = renderHook(() => useInvestigation());
  await waitFor(() => expect(result.current.session?.id).toBe(oldSession.id));
  let first!: Promise<unknown>;
  act(() => {
    first = result.current.act();
    void result.current.act();
  });
  await waitFor(() =>
    expect(
      fetch.mock.calls.filter(([url]) => url.endsWith("/advance")),
    ).toHaveLength(1),
  );
  await act(async () => {
    finish(response({ ...oldSession, version: oldSession.version + 1 }));
    await first;
  });
  expect(result.current.session?.version).toBe(oldSession.version + 1);
  expect(result.current.busy).toBe(false);
});

it("reconnects an interrupted operation by loading saved server state and releasing the busy latch", async () => {
  localStorage.setItem("forge-sequential-session", oldSession.id);
  let finish!: (value: Response) => void;
  const fetch = vi.fn(async (url: string) =>
    url.endsWith("/capabilities")
      ? response({ mode: "public" })
      : url.endsWith("/scenarios")
        ? response([])
        : url.endsWith("/advance")
          ? new Promise<Response>((resolve) => {
              finish = resolve;
            })
          : response(oldSession),
  );
  vi.stubGlobal("fetch", fetch);
  const { result } = renderHook(() => useInvestigation());
  await waitFor(() => expect(result.current.session?.id).toBe(oldSession.id));
  let operation!: Promise<unknown>;
  act(() => {
    operation = result.current.act();
  });
  await waitFor(() => expect(result.current.busy).toBe(true));
  act(() => result.current.reconnect());
  await waitFor(() => expect(result.current.busy).toBe(false));
  await act(async () => {
    finish(response({ ...oldSession, version: 99 }));
    await operation;
  });
  expect(result.current.session?.version).toBe(oldSession.version);
  expect(result.current.busy).toBe(false);
});
