import { useEffect, useRef, useState } from "react";
import { canonical } from "../industrial/contracts";
import { checkpoint } from "../industrial/recovery";
import type { Session, Capabilities } from "./types";
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function boundedFetch(path: string, init: RequestInit = {}) {
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), 30000);
  try {
    return await fetch(path, {
      ...init,
      signal: init.signal
        ? AbortSignal.any([init.signal, deadline.signal])
        : deadline.signal,
    });
  } catch (error) {
    if (deadline.signal.aborted)
      throw Error(
        "The server took too long to respond. Wait for the demo to wake, then reconnect. Reload the saved investigation before retrying a test.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
function savedSessionID() {
  try {
    return localStorage.getItem("forge-sequential-session");
  } catch {
    return null;
  }
}
function rememberSessionID(id: string | null) {
  try {
    if (id) localStorage.setItem("forge-sequential-session", id);
    else localStorage.removeItem("forge-sequential-session");
  } catch {
    /* Storage denial must not turn a successful server action into a retry. */
  }
}
export function useInvestigation() {
  const [cap, setCap] = useState<Capabilities | null>(null);
  const [scenarios, setScenarios] = useState<{ id: string; title: string }[]>(
    [],
  );
  const [preset, setPreset] = useState("misleading_sensor");
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const token = useRef("");
  const [reload, setReload] = useState(0);
  const [useMeta, setUseMeta] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const activeOperation = useRef(false);
  const generation = useRef(0);
  async function call(path: string, body?: object, signal?: AbortSignal) {
    const response = await boundedFetch(path, {
      method: body ? "POST" : "GET",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token.current ? { Authorization: "Bearer " + token.current } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
    if (response.status === 401) {
      setAuthRequired(true);
      throw Error(
        "Connect with your owner access token to continue. It will stay in this browser tab only.",
      );
    }
    if (!response.ok)
      throw new ApiError(
        response.status,
        response.status === 409
          ? "This investigation has changed. Reload the saved investigation before running another test."
          : response.status === 429
            ? "The demo has reached its capacity limit. Wait one minute, then try again."
            : `The server could not complete this action (${response.status}). Reconnect and try again. The analysis method has not changed.`,
      );
    return response.json();
  }
  useEffect(() => {
    controller.current?.abort();
    activeOperation.current = false;
    setBusy(false);
    const abort = new AbortController();
    const revision = ++generation.current;
    setError("");
    Promise.all([
      call("/api/v3/capabilities", undefined, abort.signal),
      call("/api/v3/scenarios", undefined, abort.signal),
    ])
      .then(async ([c, list]) => {
        if (abort.signal.aborted || generation.current !== revision) return;
        setCap(c);
        setScenarios(list);
        setAuthRequired(false);
        const saved = savedSessionID();
        if (saved) {
          try {
            const restored = await call(
              "/api/v3/sessions/" + saved,
              undefined,
              abort.signal,
            );
            if (!abort.signal.aborted && generation.current === revision)
              setSession(restored);
          } catch (e) {
            if (abort.signal.aborted || generation.current !== revision) return;
            if (e instanceof ApiError && e.status === 404) {
              rememberSessionID(null);
              setError(
                "Your saved investigation is no longer available. The demo may have restarted. Restore a browser checkpoint or choose a new case; downloaded reports can still be checked offline.",
              );
            } else {
              setError(
                e instanceof Error
                  ? e.message
                  : "We could not load your saved investigation. Reconnect once the server is available.",
              );
            }
          }
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted && generation.current === revision)
          setError(e.message);
      });
    return () => {
      abort.abort();
      controller.current?.abort();
    };
  }, [reload]);
  async function act(create = false) {
    if (activeOperation.current) return;
    activeOperation.current = true;
    generation.current++;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    try {
      const result = await call(
        create ? "/api/v3/sessions" : `/api/v3/sessions/${session!.id}/advance`,
        create
          ? { preset, use_meta: useMeta }
          : { expected_version: session!.version },
        abort.signal,
      );
      if (!abort.signal.aborted) {
        setSession(result);
        rememberSessionID(result.id);
        return result as Session;
      }
    } catch (e) {
      if (!abort.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "The server could not be reached. Check your connection and try again.",
        );
    } finally {
      if (controller.current === abort) {
        activeOperation.current = false;
        if (!abort.signal.aborted) setBusy(false);
      }
    }
  }
  async function restore() {
    if (activeOperation.current) return;
    activeOperation.current = true;
    generation.current++;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    try {
      const id = session?.id || savedSessionID();
      if (id) {
        const result = await call(
          "/api/v3/sessions/" + id,
          undefined,
          abort.signal,
        );
        if (!abort.signal.aborted && controller.current === abort)
          setSession(result);
      }
    } catch (e) {
      if (!abort.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "The saved investigation could not be loaded. Restore a browser checkpoint or choose another case.",
        );
    } finally {
      if (controller.current === abort) {
        activeOperation.current = false;
        setBusy(false);
      }
    }
  }

  async function download(format: "json" | "html") {
    const revision = generation.current;
    setError("");
    try {
      const r = await boundedFetch(
        `/api/v3/sessions/${session!.id}/report.${format}`,
        {
          headers: token.current
            ? { Authorization: "Bearer " + token.current }
            : {},
        },
      );
      if (!r.ok)
        throw Error(
          "The report is not available yet. Finish the investigation, then try again.",
        );
      const blob = await r.blob();
      if (generation.current !== revision) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `forge-sequential.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      if (generation.current !== revision) return;
      setError(
        e instanceof Error
          ? e.message
          : "The report could not be downloaded. Try again when the server is available.",
      );
    }
  }
  async function recoverLocal(snapshot: Session) {
    if (busy || activeOperation.current) throw Error("Operation pending");
    activeOperation.current = true;
    generation.current++;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    try {
      const result = await call(
        "/api/v6/recover",
        { session: snapshot },
        abort.signal,
      );
      if (abort.signal.aborted || controller.current !== abort)
        throw Error("Recovery interrupted");
      if (
        !result.session ||
        result.recovery?.model_requests !== 0 ||
        result.recovery?.future_experiments_executed !== 0 ||
        result.recovery?.source_authentication !== false
      )
        throw Error("Invalid recovery response");
      checkpoint("library", { session: result.session });
      const strip = (s: Session) =>
        Object.fromEntries(
          Object.entries(s).filter(([key]) => !["id", "version"].includes(key)),
        );
      if (canonical(strip(snapshot)) !== canonical(strip(result.session)))
        throw Error("Recovery changed recorded evidence");
      setSession(result.session);
      rememberSessionID(result.session.id);
      setError("");
      setRecoveryNotice(
        `Independently reproduced browser checkpoint ${snapshot.id} version ${snapshot.version} in a new temporary session. Past observations and test records are preserved; source authentication is not established.`,
      );
    } finally {
      if (controller.current === abort) {
        activeOperation.current = false;
        setBusy(false);
      }
    }
  }
  return {
    recoverLocal,
    recoveryNotice,
    cap,
    scenarios,
    preset,
    setPreset,
    session,
    busy,
    error,
    authRequired,
    tokenInput,
    setTokenInput,
    useMeta,
    setUseMeta,
    act,
    restore,
    download,
    reconnect: () => setReload((x) => x + 1),
    connect: () => {
      token.current = tokenInput;
      setTokenInput("");
      setReload((x) => x + 1);
    },
  };
}
