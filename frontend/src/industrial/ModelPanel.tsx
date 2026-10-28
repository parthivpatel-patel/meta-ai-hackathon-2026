import { useEffect, useState } from "react";
import { boundedFetch } from "../investigation/useInvestigation";
import type { Report } from "./contracts";

export function ModelPanel({ report, busy, preparedHash, onPrepare }: {
  report: Report | null; busy: boolean; preparedHash: string; onPrepare: () => void;
}) {
  const [status, setStatus] = useState("Checking the read-only model status…");
  useEffect(() => {
    const abort = new AbortController();
    void boundedFetch("/api/v5/model-status", { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw Error("Unavailable");
        const value = await response.json();
        if (value.live_requests_permitted !== false || value.live_access_verified !== false)
          throw Error("Unsupported public inference configuration");
        if (!abort.signal.aborted) setStatus("Live Meta inference unavailable here — separate private authorization required.");
      })
      .catch(() => {
        if (!abort.signal.aborted) setStatus("Model status unavailable. Deterministic investigations remain available; retry by reopening the workstation.");
      });
    return () => abort.abort();
  }, []);
  return <section aria-label="Meta diagnostic pathway">
    <h3>Meta diagnostic pathway</h3>
    <p role="status">{status}</p>
    <p>Prepared target: meta-models/muse-spark-open-1026. This screen makes no model requests.</p>
    <p><strong>Hypothesis source: </strong>{
      report?.model_proposal?.source === "test_transport"
        ? "Recorded fixture proposals — not Meta inference"
        : report?.model_proposal
          ? "Recorded Meta response claim — source not authenticated by replay"
          : "Deterministic rules — not Meta inference"
    }</p>
    <button disabled={busy || !report || report.request.experiments !== 0} onClick={onPrepare}>
      Prepare observed model evidence
    </button>
    <p>Capture an observed window before experiments, then export its initial JSON for the private owner workflow. Only observations and closed component/sensor references enter the prepared input. No scenario answers, trials or verification decisions are sent.</p>
    {preparedHash && <p>Prepared input hash: <code>{preparedHash}</code>. Preparation is not inference.</p>}
    <p>Import only the sanitized recorded-proposal report through Evidence. Each test still requires confirmation. Imported provider claims remain unverified; replay checks numerical consistency and makes zero model calls.</p>
  </section>;
}
