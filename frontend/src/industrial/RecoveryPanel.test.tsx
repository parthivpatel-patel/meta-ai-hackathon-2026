import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { RecoveryPanel } from "./RecoveryPanel";
import {
  checkpoint,
  readCheckpoint,
  writeCheckpoint,
  deleteCheckpoint,
  type MachineCheckpoint,
} from "./recovery";
vi.mock("./recovery", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./recovery")>()),
  readCheckpoint: vi.fn(),
  writeCheckpoint: vi.fn(),
  deleteCheckpoint: vi.fn(),
}));
const data: MachineCheckpoint = {
  recipe: {
    version: "coupled-pump-1",
    scenario: "bearing",
    seed: 2026,
    steps: 360,
    onset: 280,
    sample_period_seconds: 1,
    actions: [],
  },
  selected: "bearing",
  cursor: 319,
  tab: "Machine",
  speed: 8,
  report: null,
};
const pending = checkpoint("machine", data);
beforeEach(() => {
  vi.stubGlobal("indexedDB", {});
  vi.mocked(readCheckpoint).mockResolvedValue(pending);
  vi.mocked(writeCheckpoint).mockResolvedValue();
  vi.mocked(deleteCheckpoint).mockResolvedValue();
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});
it("makes quota/storage write failures actionable without losing the restore candidate", async () => {
  vi.mocked(writeCheckpoint).mockRejectedValue(
    new DOMException("quota detail", "QuotaExceededError"),
  );
  render(
    <RecoveryPanel
      kind="machine"
      data={data}
      busy={false}
      onRestore={vi.fn()}
    />,
  );
  await screen.findByRole("button", { name: "Restore browser checkpoint" });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Save browser checkpoint",
      hidden: true,
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    /storage may be full or unavailable/,
  );
  expect(
    screen.getByRole("button", { name: "Restore browser checkpoint" }),
  ).toBeEnabled();
  expect(screen.queryByText("quota detail")).not.toBeInTheDocument();
});
it("handles storage denial while retaining public export and import paths", async () => {
  vi.mocked(readCheckpoint).mockRejectedValue(
    new DOMException("private storage failure", "SecurityError"),
  );
  render(
    <RecoveryPanel
      kind="machine"
      data={data}
      busy={false}
      onRestore={vi.fn()}
    />,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    /current investigation is preserved/,
  );
  expect(
    screen.getByRole("button", {
      name: "Export recovery checkpoint",
      hidden: true,
    }),
  ).toBeEnabled();
  expect(screen.getByLabelText("Import machine checkpoint")).toBeEnabled();
});
it("locks delayed file imports immediately so duplicate restore events cannot authorize duplicate work", async () => {
  let finish!: (text: string) => void;
  const file = new File(["pending"], "checkpoint.json", {
    type: "application/json",
  });
  Object.defineProperty(file, "text", {
    value: () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  });
  const restore = vi.fn().mockResolvedValue(undefined);
  render(
    <RecoveryPanel
      kind="machine"
      data={data}
      busy={false}
      onRestore={restore}
    />,
  );
  await screen.findByRole("button", { name: "Restore browser checkpoint" });
  fireEvent.change(screen.getByLabelText("Import machine checkpoint"), {
    target: { files: [file] },
  });
  expect(screen.getByLabelText("Import machine checkpoint")).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Restore browser checkpoint" }),
  );
  expect(restore).not.toHaveBeenCalled();
  finish(JSON.stringify(pending));
  await waitFor(() => expect(restore).toHaveBeenCalledTimes(1));
  expect(restore).toHaveBeenCalledWith(pending);
});
it("rejects a delayed file read if its workspace callback changed before attachment", async () => {
  let finish!: (text: string) => void;
  const file = new File(["pending"], "checkpoint.json", {
    type: "application/json",
  });
  Object.defineProperty(file, "text", {
    value: () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  });
  const oldRestore = vi.fn(),
    newRestore = vi.fn();
  const view = render(
    <RecoveryPanel
      kind="machine"
      data={data}
      busy={false}
      onRestore={oldRestore}
    />,
  );
  await screen.findByRole("button", { name: "Restore browser checkpoint" });
  fireEvent.change(screen.getByLabelText("Import machine checkpoint"), {
    target: { files: [file] },
  });
  view.rerender(
    <RecoveryPanel
      kind="machine"
      data={{ ...data, recipe: { ...data.recipe, scenario: "normal" } }}
      busy={false}
      onRestore={newRestore}
    />,
  );
  finish(JSON.stringify(pending));
  expect(await screen.findByRole("alert")).toHaveTextContent(/stale data/);
  expect(oldRestore).not.toHaveBeenCalled();
  expect(newRestore).not.toHaveBeenCalled();
});
