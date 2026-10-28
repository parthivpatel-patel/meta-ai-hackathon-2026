export type Recipe = {
  version: "coupled-pump-1";
  scenario: string;
  seed: number;
  steps: number;
  onset: number;
  sample_period_seconds: 1 | 2 | 5;
  actions: { sequence: number; kind: string }[];
};
export type Sensor = {
  id: string;
  component_id: string;
  unit: string;
  range: number[];
};
export type Component = {
  id: string;
  name: string;
  category: string;
  parent: string;
  sensors: string[];
  geometry: { kind: string; position: number[]; size: number[] };
  provenance: string;
};
export type Reading = {
  sensor_id: string;
  value: number | null;
  quality: "VALID" | "MISSING" | "OUT_OF_RANGE";
};
export type Frame = {
  sequence: number;
  timestamp: string;
  state: string;
  source: string;
  readings: Reading[];
};
export type Event = {
  id: string;
  sequence: number;
  kind: string;
  component: string;
};
export type Recording = {
  version: string;
  machine_id: string;
  recipe: Recipe;
  sensors: Sensor[];
  components: Component[];
  frames: Frame[];
  events: Event[];
  limitations: string;
};
export type Report = {
  schema: string;
  provider?: string;
  model_proposal?: {
    source: "test_transport" | "meta_http_response";
    requested_model: string;
    returned_model: string;
  };
  report_hash: string;
  request: {
    recipe: Recipe;
    context: { component_id: string; at_sequence: number };
    experiments: number;
  };
  measurements: unknown[];
  evidence_window: {
    first_sequence: number;
    last_sequence: number;
    time_step_seconds: number;
  };
  hypotheses: { hypotheses: { hypothesis_id: string; rationale: string }[] };
  ranking: {
    hypothesis_id: string;
    evidence_status: string;
    evidence_refs: string[];
  }[];
  trials: { id: string; kind: string; probes: unknown[] }[];
  events: {
    id: string;
    action: string;
    sequence: number;
    after_frame: Frame;
    verification: string;
  }[];
  decision: {
    status: string;
    findings: string[];
    reasons: string[];
    uncertainty: string;
  };
  plan: {
    kind: string;
    reason: string;
    competing_predictions: string[];
  } | null;
  limitations: string[];
};
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}

// Sampled, deliberately slowed rotor illustration; never a diagnostic input.
export function rotorPhases(frames: Frame[]): (number | null)[] {
  let angle = 0;
  return frames.map((frame, index) => {
    const reading = frame.readings.find((r) => r.sensor_id === "rpm");
    const rpm = reading?.value;
    if (rpm == null || !Number.isFinite(rpm) || reading?.quality !== "VALID") return null;
    if (index === 0 || frame.state === "STOPPED") return angle;
    const previous = frames[index - 1];
    const previousReading = previous.readings.find((r) => r.sensor_id === "rpm");
    const before = previousReading?.value;
    if (before == null || !Number.isFinite(before) || previousReading?.quality !== "VALID") return null;
    const dt = (Date.parse(frame.timestamp) - Date.parse(previous.timestamp)) / 1000;
    angle = (angle + ((rpm + before) / 2) * dt * 2 * Math.PI / 60 / 600) % (2 * Math.PI);
    return angle;
  });
}
function validTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(
      value,
    );
  if (!m) return false;
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
  return (
    year >= 1970 &&
    year <= 2100 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= new Date(Date.UTC(year, month, 0)).getUTCDate() &&
    hour < 24 &&
    minute < 60 &&
    second < 60 &&
    (!m[7] ||
      (Number(m[7]) <= 14 &&
        Number(m[8]) < 60 &&
        (Number(m[7]) < 14 || Number(m[8]) === 0)))
  );
}
export function validateRecording(raw: unknown, sensors: Sensor[]): Frame[] {
  if (!raw || typeof raw !== "object")
    throw Error("Import must be a JSON telemetry object");
  const r = raw as Record<string, unknown>;
  if (
    r.schema !== "forge-telemetry-1" ||
    r.machine_id !== "pump-104" ||
    (r.declared_source !== undefined &&
      !["synthetic", "operator_recorded_unverified"].includes(
        String(r.declared_source),
      )) ||
    !Array.isArray(r.samples) ||
    !r.samples.length ||
    r.samples.length > 5400
  )
    throw Error("Unsupported schema or sample count (maximum 5400)");
  const frames = new Map<number, Frame>();
  let last = -Infinity;
  const duplicate = new Set<string>();
  for (const row of r.samples) {
    if (!row || typeof row !== "object") throw Error("Invalid sample");
    const x = row as Record<string, unknown>;
    const sensor = sensors.find((s) => s.id === x.sensor_id);
    const time = validTimestamp(x.timestamp) ? Date.parse(x.timestamp) : NaN;
    if (
      !sensor ||
      sensor.component_id !== x.component_id ||
      sensor.unit !== x.unit ||
      !Number.isFinite(time) ||
      time < last ||
      (time > last + 86400000 && last !== -Infinity)
    )
      throw Error("Invalid mapping, unit, timestamp or ordering");
    if (
      x.value !== null &&
      (typeof x.value !== "number" ||
        !Number.isFinite(x.value) ||
        Math.abs(x.value) > 1000000)
    )
      throw Error("Invalid numeric value");
    const key = time + ":" + sensor.id;
    if (duplicate.has(key)) throw Error("Duplicate sensor at timestamp");
    duplicate.add(key);
    last = time;
    if (!frames.has(time))
      frames.set(time, {
        sequence: frames.size,
        timestamp: String(x.timestamp),
        state: "REPLAYING",
        source:
          r.declared_source === "synthetic"
            ? "REPLAYED_SYNTHETIC"
            : "REPLAYED_UNVERIFIED",
        readings: [],
      });
    const value = x.value as number | null;
    frames.get(time)!.readings.push({
      sensor_id: sensor.id,
      value,
      quality:
        value === null
          ? "MISSING"
          : value < sensor.range[0] || value > sensor.range[1]
            ? "OUT_OF_RANGE"
            : "VALID",
    });
  }
  if (frames.size > 600) throw Error("Maximum 600 timestamps");
  for (const frame of frames.values())
    for (const sensor of sensors)
      if (!frame.readings.some((r) => r.sensor_id === sensor.id))
        frame.readings.push({
          sensor_id: sensor.id,
          value: null,
          quality: "MISSING",
        });
  return [...frames.values()];
}
export function parseCSV(text: string): unknown {
  const rows = text.trim().split(/\r?\n/);
  if (rows.shift() !== "timestamp,sensor_id,component_id,value,unit")
    throw Error(
      "CSV header must be timestamp,sensor_id,component_id,value,unit",
    );
  return {
    schema: "forge-telemetry-1",
    machine_id: "pump-104",
    samples: rows.map((line) => {
      const fields = line.split(",");
      if (fields.length !== 5)
        throw Error("CSV requires five unquoted fields per row");
      return {
        timestamp: fields[0],
        sensor_id: fields[1],
        component_id: fields[2],
        value: fields[3] === "" ? null : Number(fields[3]),
        unit: fields[4],
      };
    }),
  };
}
export function validateSimulation(value: unknown): Recording {
  if (!value || typeof value !== "object")
    throw Error("Invalid simulation response");
  const r = value as Recording;
  if (
    r.version !== "coupled-pump-1" ||
    r.machine_id !== "pump-104" ||
    !Array.isArray(r.frames) ||
    !r.frames.length ||
    r.frames.length > 600 ||
    !Array.isArray(r.components) ||
    r.components.length > 40 ||
    !Array.isArray(r.sensors) ||
    r.sensors.length > 16 ||
    !Array.isArray(r.events) ||
    r.events.length > 20
  )
    throw Error("Unsupported simulation schema or bounds");
  const ids = new Set(r.components.map((c) => c.id));
  const sensorIds = new Set(r.sensors.map((s) => s.id));
  if (ids.size !== r.components.length || sensorIds.size !== r.sensors.length)
    throw Error("Duplicate catalog identifier");
  for (const c of r.components)
    if (
      !/^[a-z_]{1,40}$/.test(c.id) ||
      !Array.isArray(c.sensors) ||
      c.sensors.some((s) => !sensorIds.has(s)) ||
      !["box", "cylinder", "torus"].includes(c.geometry?.kind) ||
      c.geometry.position.length !== 3 ||
      c.geometry.size.length !== 3 ||
      [...c.geometry.position, ...c.geometry.size].some(
        (v) => !Number.isFinite(v) || Math.abs(v) > 20,
      )
    )
      throw Error("Invalid component geometry or associations");
  for (const s of r.sensors)
    if (
      !ids.has(s.component_id) ||
      typeof s.unit !== "string" ||
      s.unit.length > 16 ||
      s.range.length !== 2 ||
      s.range.some((v) => !Number.isFinite(v))
    )
      throw Error("Invalid sensor mapping");
  for (const [i, f] of r.frames.entries())
    if (
      f.sequence !== i ||
      f.source !== "SIMULATED" ||
      ![
        "STARTING",
        "RUNNING",
        "STOPPING",
        "STOPPED",
        "SIMULATED_FAULT",
      ].includes(f.state) ||
      (i > 0 &&
        Date.parse(f.timestamp) <= Date.parse(r.frames[i - 1].timestamp)) ||
      !validTimestamp(f.timestamp) ||
      !Array.isArray(f.readings) ||
      f.readings.length !== sensorIds.size ||
      new Set(f.readings.map((x) => x.sensor_id)).size !== sensorIds.size ||
      f.readings.some(
        (x) =>
          !sensorIds.has(x.sensor_id) ||
          x.value === null ||
          !Number.isFinite(x.value) ||
          Math.abs(x.value) > 1e6 ||
          !["VALID", "OUT_OF_RANGE"].includes(x.quality),
      ) ||
      "truth" in f
    )
      throw Error("Invalid or unsafe simulation frame");
  for (const e of r.events)
    if (
      !ids.has(e.component) ||
      !Number.isInteger(e.sequence) ||
      e.sequence < 0 ||
      e.sequence >= r.frames.length
    )
      throw Error("Invalid timeline association");
  return r;
}
