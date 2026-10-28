import { canonical, type Recipe, type Report } from "./contracts";
import type { Session } from "../investigation/types";
export const modes = [
  "Machine",
  "Telemetry",
  "Investigation",
  "Experiments",
  "Verification",
  "Reports",
  "Evidence",
  "Replay",
] as const;
export type Mode = (typeof modes)[number];
export type MachineCheckpoint = {
  recipe: Recipe;
  selected: string;
  cursor: number;
  tab: string;
  speed: number;
  report: Report | null;
};
export type LibraryCheckpoint = {session:Session;inspection?:{selected:string;cursor:number;mode:string}};
export type Checkpoint = {
  schema: "forge-browser-checkpoint-1";
  kind: "machine" | "library";
  saved_at: string;
  data: MachineCheckpoint | LibraryCheckpoint;
};
const parts = new Set([
  "base",
  "motor",
  "cooling",
  "fan",
  "motor_mount",
  "motor_shaft",
  "coupling",
  "pump_shaft",
  "bearing",
  "bearing_ring",
  "pump",
  "impeller",
  "suction",
  "discharge",
  "pressure_sensor",
  "temperature_sensor",
  "vibration_sensor",
  "pump_mount",
]);
function keys(
  value: unknown,
  expected: string[],
): asserts value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join() !== expected.sort().join()
  )
    throw Error("Incompatible checkpoint fields");
}
function denySecrets(value: unknown, depth = 0) {
  if (depth > 32) throw Error("Checkpoint nesting exceeds limit");
  if (Array.isArray(value)) {
    for (const v of value) denySecrets(v, depth + 1);
    return;
  }
  if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) {
      if (
        /api.?key|authorization|access.?token|private.?receipt|provider.?receipt|password|secret/i.test(
          k,
        )
      )
        throw Error("Private credentials/receipts cannot be stored");
      denySecrets(v, depth + 1);
    }
  if (
    typeof value === "string" &&
    /-----BEGIN .*PRIVATE KEY|\b(?:ghp_|github_pat_|sk-proj-)[A-Za-z0-9_\-]{20,}|(?:BASETEN_API_KEY|FORGE_INFERENCE_API_KEY)\s*=/i.test(
      value,
    )
  )
    throw Error("Credential-like text cannot be stored");
}
export function validateCheckpoint(
  raw: unknown,
  kind?: Checkpoint["kind"],
): Checkpoint {
  if (new TextEncoder().encode(JSON.stringify(raw)).length > 1_048_576)
    throw Error("Checkpoint exceeds 1 MiB");
  keys(raw, ["schema", "kind", "saved_at", "data"]);
  if (
    raw.schema !== "forge-browser-checkpoint-1" ||
    !["machine", "library"].includes(String(raw.kind)) ||
    (kind && raw.kind !== kind) ||
    typeof raw.saved_at !== "string" ||
    !Number.isFinite(Date.parse(raw.saved_at))
  )
    throw Error("Unsupported checkpoint version or source");
  denySecrets(raw);
  if (raw.kind === "machine") {
    keys(raw.data, ["recipe", "selected", "cursor", "tab", "speed", "report"]);
    const d = raw.data;
    keys(d.recipe, [
      "version",
      "scenario",
      "seed",
      "steps",
      "onset",
      "sample_period_seconds",
      "actions",
    ]);
    const r = d.recipe;
    if (
      r.version !== "coupled-pump-1" ||
      ![
        "normal",
        "bearing",
        "misalignment",
        "cavitation",
        "pressure_sensor",
        "thermal",
        "process",
      ].includes(String(r.scenario)) ||
      !Number.isInteger(r.seed) ||
      Number(r.seed) < 0 ||
      Number(r.seed) > 4294967295 ||
      !Number.isInteger(r.steps) ||
      Number(r.steps) < 320 ||
      Number(r.steps) > 600 ||
      !Number.isInteger(r.onset) ||
      Number(r.onset) < 240 ||
      Number(r.onset) > 280 ||
      ![1, 2, 5].includes(Number(r.sample_period_seconds)) ||
      !Array.isArray(r.actions) ||
      r.actions.length > 1
    )
      throw Error("Invalid simulation checkpoint recipe");
    for (const a of r.actions) {
      keys(a, ["sequence", "kind"]);
      if (
        !Number.isInteger(a.sequence) ||
        Number(a.sequence) < 1 ||
        Number(a.sequence) >= Number(r.steps) ||
        !["stop", "reset_fault"].includes(String(a.kind))
      )
        throw Error("Invalid recorded operating action");
    }
    if (
      !parts.has(String(d.selected)) ||
      !Number.isInteger(d.cursor) ||
      Number(d.cursor) < 0 ||
      Number(d.cursor) >= Number(r.steps) ||
      !modes.includes(d.tab as Mode) ||
      ![1, 8, 32].includes(Number(d.speed))
    )
      throw Error("Invalid selection or observation window");
    if (d.report !== null) {
      const report = d.report as Report;
      keys(report, [
        "schema",
        "engine",
        "request",
        "machine_id",
        "source",
        "provider",
        "evidence_window",
        "measurements",
        "observed",
        "hypotheses",
        "ranking",
        "trials",
        "events",
        "decision",
        "plan",
        "limitations",
        "report_hash",
        ...(report.schema === "forge-industrial-model-report-1"
          ? ["model_proposal", "model_evidence"]
          : []),
      ]);
      if (report.model_proposal)
        keys(report.model_proposal, [
          "source",
          "provider",
          "requested_model",
          "returned_model",
          "input_hash",
          "output_hash",
          "output",
        ]);
      if (
        ![
          "forge-industrial-report-1",
          "forge-industrial-model-report-1",
        ].includes(report.schema) ||
        canonical(report.request?.recipe) !== canonical(r)
      )
        throw Error("Report/recipe provenance differs");
    }
  } else {
    keys(raw.data, ["session", ...(Object.prototype.hasOwnProperty.call(raw.data || {},"inspection")?["inspection"]:[])]);
    const inspection=(raw.data as LibraryCheckpoint).inspection;
    if(inspection){keys(inspection,["selected","cursor","mode"]);if(!parts.has(String(inspection.selected))||!Number.isInteger(inspection.cursor)||inspection.cursor<0||inspection.cursor>=120||!modes.includes(inspection.mode as Mode))throw Error("Invalid case inspection state");}
    const s = raw.data.session as Session;
    keys(s, [
      "id",
      "version",
      "engine_version",
      "status",
      "metadata",
      "measurements",
      "dataset_hash",
      "observed",
      "assets",
      "asset_features",
      "evidence",
      "hypotheses",
      "model_source",
      "inference",
      "ranking",
      "plan",
      "trials",
      "decision",
      "max_experiments",
      "events",
      "verification_scope",
      "uncertainty_policy",
    ]);
    if (
      !s ||
      !/^[a-f0-9]{32}$/.test(s.id) ||
      !Number.isInteger(s.version) ||
      s.version < 0 ||
      s.version > 20 ||
      !["not_run", "deterministic_rules_not_meta"].includes(s.model_source) ||
      s.inference != null ||
      !Array.isArray(s.measurements) ||
      s.measurements.length !== 120 ||
      !Array.isArray(s.trials) ||
      s.trials.length > 4 ||
      !Array.isArray(s.events) ||
      s.events.length > 11
    )
      throw Error(
        "Unsupported library checkpoint; only deterministic public sessions can be saved",
      );
  }
  return raw as unknown as Checkpoint;
}
export function checkpoint(
  kind: Checkpoint["kind"],
  data: Checkpoint["data"],
): Checkpoint {
  return validateCheckpoint(
    {
      schema: "forge-browser-checkpoint-1",
      kind,
      saved_at: new Date().toISOString(),
      data,
    },
    kind,
  );
}
let opening: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  if (!opening)
    opening = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) {
        reject(Error("Browser storage unavailable"));
        return;
      }
      const request = indexedDB.open("forge-recovery", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("checkpoints");
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          opening = undefined;
        };
        resolve(db);
      };
      request.onerror = () => reject(Error("Browser storage unavailable"));
      request.onblocked = () =>
        reject(
          Error("Browser storage upgrade blocked; close other FORGE tabs"),
        );
    });
  return opening;
}
export async function readCheckpoint(
  kind: Checkpoint["kind"],
): Promise<Checkpoint | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction("checkpoints")
      .objectStore("checkpoints")
      .get(kind);
    req.onsuccess = () => {
      try {
        resolve(
          req.result == null ? null : validateCheckpoint(req.result, kind),
        );
      } catch {
        reject(
          Error(
            "Saved checkpoint is invalid or incompatible; it has not been restored",
          ),
        );
      }
    };
    req.onerror = () => reject(Error("Browser checkpoint could not be read"));
  });
}
export async function writeCheckpoint(value: Checkpoint): Promise<void> {
  const safe = validateCheckpoint(value);
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("checkpoints", "readwrite");
    tx.objectStore("checkpoints").put(safe, safe.kind);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(Error("Browser checkpoint could not be saved; export a copy"));
    tx.onabort = () => reject(Error("Browser checkpoint save interrupted"));
  });
}
export async function deleteCheckpoint(
  kind: Checkpoint["kind"],
): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("checkpoints", "readwrite");
    tx.objectStore("checkpoints").delete(kind);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(Error("Browser checkpoint could not be cleared"));
  });
}
