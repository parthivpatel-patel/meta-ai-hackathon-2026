import { useEffect, useRef, useState } from "react";
import {
  checkpoint,
  readCheckpoint,
  writeCheckpoint,
  deleteCheckpoint,
  validateCheckpoint,
  type Checkpoint,
} from "./recovery";
export function RecoveryPanel({
  kind,
  data,
  busy,
  onRestore,
}: {
  kind: Checkpoint["kind"];
  data: Checkpoint["data"] | null;
  busy: boolean;
  onRestore: (value: Checkpoint) => Promise<void>;
}) {
  const [checked, setChecked] = useState(false),
    [pending, setPending] = useState<Checkpoint | null>(null),
    [blocked, setBlocked] = useState(false),
    [status, setStatus] = useState("Checking browser recovery…"),
    [error, setError] = useState(""),
    [working, setWorking] = useState(false);
  const latest = useRef(data);
  latest.current = data;
  const operation = useRef(false);
  const revision = useRef(0);
  useEffect(() => {
    if (!globalThis.indexedDB) {
      setChecked(true);
      setBlocked(true);
      setStatus("Browser storage unavailable; export a copy");
      return;
    }
    let alive = true;
    void readCheckpoint(kind)
      .then((value) => {
        if (!alive) return;
        setPending(value);
        setBlocked(!!value);
        setChecked(true);
        setStatus(
          value ? "Saved checkpoint available" : "No browser checkpoint yet",
        );
      })
      .catch(() => {
        if (alive) {
          setChecked(true);
          setBlocked(true);
          setError(
            "Browser recovery is unavailable or saved data is invalid. The current investigation is preserved; export it before leaving.",
          );
        }
      });
    return () => {
      alive = false;
      revision.current++;
    };
  }, [kind]);
  useEffect(() => {
    if (!checked || blocked || busy || working || !data) return;
    const ticket = ++revision.current;
    const timer = setTimeout(() => {
      try {
        const safe = checkpoint(kind, data);
        void writeCheckpoint(safe)
          .then(() => {
            if (ticket === revision.current)
              setStatus("Checkpoint saved on this browser");
          })
          .catch(() => {
            if (ticket === revision.current)
              setError(
                "Checkpoint save failed. Export the investigation; browser storage may be full or unavailable.",
              );
          });
      } catch {
        setStatus("This recording cannot be autosaved; export a copy");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [checked, blocked, busy, working, data, kind]);
  async function restore(value: Checkpoint) {
    if (operation.current || busy) return;
    operation.current = true;
    revision.current++;
    setWorking(true);
    setError("");
    try {
      await onRestore(validateCheckpoint(value, kind));
      setPending(null);
      setBlocked(false);
      setStatus("Checkpoint independently reproduced; playback paused");
    } catch {
      setError(
        "Checkpoint restoration failed validation or the server is unavailable. Current evidence is preserved. No new experiment or model request was authorized.",
      );
    } finally {
      operation.current = false;
      setWorking(false);
    }
  }
  async function save() {
    if (!latest.current || operation.current) return;
    operation.current = true;
    setWorking(true);
    setError("");
    try {
      await writeCheckpoint(checkpoint(kind, latest.current));
      setBlocked(false);
      setPending(null);
      setStatus("Checkpoint saved on this browser");
    } catch {
      setError(
        "Checkpoint save failed. No private credentials or receipts may be stored; export validated public evidence instead.",
      );
    } finally {
      operation.current = false;
      setWorking(false);
    }
  }
  return (
    <section className="browser-recovery" aria-label="Browser recovery">
      {pending && (
        <div className="recovery-available">
          <span>
            Browser checkpoint: {pending.saved_at}. Restore only after
            independent verification.
          </span>
          <button
            disabled={busy || working}
            onClick={() => void restore(pending)}
          >
            Restore browser checkpoint
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <details>
        <summary>
          Browser recovery ·{" "}
          {data ? status : "Current data is not checkpointed; export a copy"}
        </summary>
        <p>
          One versioned checkpoint per case family, up to 1 MiB each, on this
          browser only. It can be cleared or evicted and is not durable server
          storage. Restore replays existing evidence; it never runs a new
          diagnostic test or calls a model.
        </p>
        <button disabled={busy || working || !data} onClick={() => void save()}>
          Save browser checkpoint
        </button>
        <button
          disabled={busy || working || !data}
          onClick={() => {
            try {
              const safe = checkpoint(kind, data!);
              const a = document.createElement("a"),
                u = URL.createObjectURL(
                  new Blob([JSON.stringify(safe, null, 2)], {
                    type: "application/json",
                  }),
                );
              a.href = u;
              a.download = `forge-${kind}-checkpoint.json`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(u), 1000);
            } catch {
              setError(
                "This data cannot be exported as a recovery checkpoint.",
              );
            }
          }}
        >
          Export recovery checkpoint
        </button>
        <label>
          Import recovery checkpoint
          <input
            aria-label={`Import ${kind} checkpoint`}
            type="file"
            accept=".json"
            disabled={busy || working}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                if (f.size > 1048576) throw Error();
                const value = validateCheckpoint(
                  JSON.parse(await f.text()),
                  kind,
                );
                await restore(value);
              } catch {
                setError(
                  "Recovery import rejected: incompatible, malformed, private or oversized data.",
                );
              }
            }}
          />
        </label>
        <button
          disabled={busy || working}
          onClick={() => {
            void deleteCheckpoint(kind)
              .then(() => {
                setPending(null);
                setBlocked(false);
                setError("");
                setStatus("Checkpoint cleared; new changes can be saved");
              })
              .catch(() =>
                setError("Browser checkpoint could not be cleared."),
              );
          }}
        >
          Discard saved checkpoint
        </button>
      </details>
    </section>
  );
}
