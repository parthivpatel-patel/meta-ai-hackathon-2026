import {
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  expect,
  it,
  vi,
} from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import {
  checkpoint,
  validateCheckpoint,
  readCheckpoint,
  writeCheckpoint,
  deleteCheckpoint,
  type MachineCheckpoint,
} from "./recovery";
import { RecoveryPanel } from "./RecoveryPanel";
import fixture from "../../../docs/unified/evidence/model/fixture-final.json";
import legacy from "../../../docs/submission/misleading_sensor.json";
import type { Report } from "./contracts";
import type { Session } from "../investigation/types";
const data: MachineCheckpoint = {
  recipe: {
    version: "coupled-pump-1",
    scenario: "normal",
    seed: 2026,
    steps: 360,
    onset: 280,
    sample_period_seconds: 1,
    actions: [],
  },
  selected: "pump",
  cursor: 319,
  tab: "Reports",
  speed: 8,
  report: null,
};
beforeAll(() => vi.stubGlobal("indexedDB", new IDBFactory()));
beforeEach(async () => {
  await deleteCheckpoint("machine");
  await deleteCheckpoint("library");
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
afterAll(() => vi.unstubAllGlobals());
it("round-trips bounded versioned browser data and keeps the two case families separate", async () => {
  const a = checkpoint("machine", data);
  await writeCheckpoint(a);
  expect(await readCheckpoint("machine")).toEqual(a);
  expect(await readCheckpoint("library")).toBeNull();
  await deleteCheckpoint("machine");
  expect(await readCheckpoint("machine")).toBeNull();
});
it("rejects incompatible versions, extra fields, credentials, invalid selection and recipe mismatches", () => {
  for (const change of [
    { schema: "old" },
    { api_key: "fixture-only-not-a-real-key" },
    { data: { ...data, cursor: 900 } },
    { data: { ...data, selected: "unknown" } },
    { data: { ...data, report: fixture } },
    {
      data: {
        ...data,
        recipe: { ...data.recipe, actions: [{ sequence: 900, kind: "stop" }] },
      },
    },
  ])
    expect(() =>
      validateCheckpoint({ ...checkpoint("machine", data), ...change }),
    ).toThrow();
  expect(() =>
    validateCheckpoint({
      ...checkpoint("machine", data),
      data: { ...data, note: "x".repeat(1048577) },
    }),
  ).toThrow();
});
it("preserves sanitized recorded-fixture provenance but rejects private receipt fields", () => {
  const state = {
    ...data,
    recipe: fixture.request.recipe as MachineCheckpoint["recipe"],
    report: fixture as unknown as Report,
  };
  expect(validateCheckpoint(checkpoint("machine", state)).data).toEqual(state);
  expect(() =>
    checkpoint("machine", {
      ...state,
      report: {
        ...fixture,
        raw_receipt: { headers: { authorization: "fixture-only" } },
      } as unknown as Report,
    }),
  ).toThrow();
  const session = {
    ...legacy.investigation,
    id: "a".repeat(32),
    version: 7,
  } as unknown as Session;
  expect(validateCheckpoint(checkpoint("library", { session })).kind).toBe(
    "library",
  );
  expect(() =>
    checkpoint("library", {
      session: {
        ...session,
        inference: { private_receipt: "fixture-only" },
      } as unknown as Session,
    }),
  ).toThrow();
});
it("offers recovery without overwriting the older checkpoint or authorizing an experiment", async () => {
  const saved = checkpoint("machine", { ...data, selected: "bearing" });
  await writeCheckpoint(saved);
  const restore = vi.fn().mockResolvedValue(undefined);
  render(
    <RecoveryPanel
      kind="machine"
      data={data}
      busy={false}
      onRestore={restore}
    />,
  );
  const button = await screen.findByRole("button", {
    name: "Restore browser checkpoint",
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  expect(restore).not.toHaveBeenCalled();
  expect(await readCheckpoint("machine")).toEqual(saved);
  fireEvent.click(button);
  await waitFor(() => expect(restore).toHaveBeenCalledTimes(1));
  expect(restore).toHaveBeenCalledWith(saved);
});
it("keeps a failed restore available and sanitizes raw errors", async () => {
  await writeCheckpoint(checkpoint("machine", data));
  const restore = vi
    .fn()
    .mockRejectedValue(Error("fixture-only-private-error"));
  render(
    <RecoveryPanel
      kind="machine"
      data={data}
      busy={false}
      onRestore={restore}
    />,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Restore browser checkpoint" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Current evidence is preserved",
  );
  expect(
    screen.queryByText("fixture-only-private-error"),
  ).not.toBeInTheDocument();
  expect(await readCheckpoint("machine")).not.toBeNull();
});
it("rejects incompatible records already present in IndexedDB before restoration",async()=>{
 await new Promise<void>((resolve,reject)=>{const r=indexedDB.open("forge-recovery",1);r.onsuccess=()=>{const tx=r.result.transaction("checkpoints","readwrite");tx.objectStore("checkpoints").put({...checkpoint("machine",data),schema:"unsupported"},"machine");tx.oncomplete=()=>resolve();tx.onerror=()=>reject(Error("test database failure"));};});
 await expect(readCheckpoint("machine")).rejects.toThrow("invalid or incompatible");
});
