import { ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { Disclosure } from "./components";
export function CaseLobby({
  scenarios,
  preset,
  onPreset,
  busy,
  ready,
  onBegin,
  onResume,
  useMeta,
  onUseMeta,
  modelAllowed,
  modelConfigured,
}: {
  scenarios: { id: string; title: string }[];
  preset: string;
  onPreset: (id: string) => void;
  busy: boolean;
  ready: boolean;
  onBegin: () => void;
  onResume?: () => void;
  useMeta: boolean;
  onUseMeta: (value: boolean) => void;
  modelAllowed: boolean;
  modelConfigured: boolean;
}) {
  const descriptions: Record<string, { title: string; description: string }> = {
    misleading_sensor: {
      title: "An unusual pressure reading",
      description:
        "Investigate whether an unexpected reading comes from the process, the measurement or both.",
    },
    noisy_multifault: {
      title: "Several signals need attention",
      description:
        "Work through noisy measurements and more than one possible cause.",
    },
    normal: {
      title: "A normal operating baseline",
      description:
        "Examine a reference case without assuming that a fault must exist.",
    },
    insufficient: {
      title: "An incomplete measurement record",
      description:
        "Explore what can be concluded when important observations are missing.",
    },
    confounded: {
      title: "A case with overlapping effects",
      description:
        "See how the investigation handles evidence that cannot cleanly separate causes.",
    },
  };
  return (
    <div className="case-lobby">
      <div className="lobby-intro">
        {onResume && (
          <button className="text-button" onClick={onResume}>
            <ArrowLeft size={17} />
            Return to your investigation
          </button>
        )}
        <span className="eyebrow">
          A testable path from observation to conclusion
        </span>
        <h1>Investigate equipment problems.</h1>
        <p>
          Choose a synthetic case. Examine the evidence, compare possible causes
          and run tests before reaching a conclusion.
        </p>
        <ol className="lobby-journey">
          <li>
            <span>1</span>Examine evidence
          </li>
          <li>
            <span>2</span>Test possible causes
          </li>
          <li>
            <span>3</span>Verify and report
          </li>
        </ol>
        <div className="lobby-scope">
          <ShieldCheck size={21} />
          <p>
            FORGE checks explanations against independent numerical evidence. It
            reports uncertainty when the evidence is not enough.
          </p>
        </div>
      </div>
      <section
        className="case-selection"
        aria-labelledby="case-selection-title"
      >
        <header>
          <span className="eyebrow">Start an investigation</span>
          <h2 id="case-selection-title">Choose a case</h2>
          <p>All cases use simulated equipment and measurements.</p>
        </header>
        <fieldset disabled={busy || !ready}>
          <legend className="sr-only">Investigation case</legend>
          {scenarios.map((s) => (
            <label
              className={`case-option ${preset === s.id ? "selected" : ""}`}
              key={s.id}
            >
              <input
                type="radio"
                name="case"
                value={s.id}
                checked={preset === s.id}
                onChange={() => onPreset(s.id)}
              />
              <span>
                <strong>{descriptions[s.id]?.title || s.title}</strong>
                <small>
                  {descriptions[s.id]?.description ||
                    "Examine this synthetic case and verify its evidence."}
                </small>
              </span>
            </label>
          ))}
        </fieldset>
        {!ready && <p role="status">Connecting to the investigation server…</p>}
        <button
          className="primary begin-case"
          onClick={onBegin}
          disabled={busy || !ready || !scenarios.length}
        >
          {busy ? "Opening your investigation…" : "Open investigation"}
          <ArrowRight size={18} />
        </button>
        <Disclosure title="Analysis options and model availability">
          <label className="meta-option">
            <input
              type="checkbox"
              aria-label="Use real Meta inference"
              checked={useMeta}
              disabled={!modelAllowed || busy}
              onChange={(e) => onUseMeta(e.target.checked)}
            />
            Use a verified Meta connection
          </label>
          <p>
            {modelAllowed
              ? "A verified connection is available. Requests remain subject to configured budgets."
              : modelConfigured
                ? "The model is configured, but an authenticated test is required before it can be used."
                : "Real Meta inference is unavailable in this environment. Investigations use explicitly labeled deterministic analysis."}
          </p>
          <p>
            Thermal images and vibration waveforms provide numerical context.
            They do not establish verified model visual or audio reasoning.
          </p>
        </Disclosure>
      </section>
    </div>
  );
}
