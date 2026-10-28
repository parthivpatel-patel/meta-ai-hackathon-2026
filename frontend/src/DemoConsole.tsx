import { useState, useMemo } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
import "@fontsource/geist-sans/latin-400.css";
import "@fontsource/geist-sans/latin-500.css";
import "@fontsource/geist-sans/latin-600.css";
import "@fontsource/geist-mono/latin-400.css";
import "./product-v4.css";
import { useInvestigation } from "./investigation/useInvestigation";
import { CaseLobby } from "./investigation/CaseLobby";
import { Journey, Guide, PageHeader } from "./investigation/components";
import {
  Overview,
  EvidenceView,
  CausesView,
  TestsView,
  ResultsView,
  ReportView,
} from "./investigation/views";
import {
  introductions,
  resultLabel,
  sourceLabel,
  type Stage,
} from "./investigation/presentation";
import { RecoveryPanel } from "./industrial/RecoveryPanel";
import { LegacyMachine } from "./industrial/LegacyMachine";
import type { LibraryCheckpoint, Checkpoint } from "./industrial/recovery";
export default function DemoConsole({
  embedded = false,
  workspaceMode,
  onModeChange,
}: {
  embedded?: boolean;
  workspaceMode?: string;
  onModeChange?: (mode: string) => void;
}) {
  const investigation = useInvestigation();
  const { session, cap, busy, error } = investigation;
  const [internalStage, setStage] = useState<Stage>("Overview");
  const stageMap: Record<string, Stage> = {
    Machine: "Overview",
    Telemetry: "Evidence",
    Investigation: "Possible causes",
    Experiments: "Tests",
    Verification: "Results",
    Reports: "Report",
    Evidence: "Evidence",
    Replay: "Report",
  };
  const stage = workspaceMode
    ? stageMap[workspaceMode] || internalStage
    : internalStage;
  const [caseComponent,setCaseComponent]=useState("pump");
  const [caseCursor,setCaseCursor]=useState(0);
  const recoveryData = useMemo(
    () =>
      session && cap?.mode === "public" &&
      ["not_run", "deterministic_rules_not_meta"].includes(
        session.model_source,
      ) &&
      !session.inference
        ? { session, inspection:{selected:caseComponent,cursor:caseCursor,mode:({Overview:"Machine",Evidence:"Evidence","Possible causes":"Investigation",Tests:"Experiments",Results:"Verification",Report:"Reports"} as Record<Stage,string>)[stage]} }
        : null,
    [session, cap?.mode,caseComponent,caseCursor,stage],
  );
  const [choosing, setChoosing] = useState(false);
  const navigate = (next: Stage) => {
    setStage(next);
    onModeChange?.(
      (
        {
          Overview: "Machine",
          Evidence: "Evidence",
          "Possible causes": "Investigation",
          Tests: "Experiments",
          Results: "Verification",
          Report: "Reports",
        } as Record<Stage, string>
      )[next],
    );
    requestAnimationFrame(() => {
      document.getElementById("investigation-main")?.focus();
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  };
  const completed = session?.status === "COMPLETE";
  async function begin() {
    const result = await investigation.act(true);
    if (result) {
      setChoosing(false);setCaseComponent("pump");setCaseCursor(0);
      navigate("Overview");
    }
  }
  async function advance() {
    const result = await investigation.act();
    if (result)
      navigate(
        result.status === "COMPLETE"
          ? "Results"
          : result.status === "HYPOTHESES_READY" && !result.trials.length
            ? "Possible causes"
            : "Tests",
      );
  }
  function next() {
    if (stage === "Overview") navigate("Evidence");
    else if (stage === "Evidence") {
      if (session?.status === "OBSERVED") void advance();
      else navigate("Possible causes");
    } else if (stage === "Possible causes") {
      if (session?.status === "HYPOTHESES_READY") void advance();
      else navigate(completed ? "Results" : "Tests");
    } else if (stage === "Tests") {
      if (completed) navigate("Results");
      else if (session?.status === "OBSERVED") void advance();
      else void advance();
    } else if (stage === "Results") navigate(completed ? "Report" : "Tests");
    else {
      setChoosing(true);
      window.scrollTo(0, 0);
    }
  }
  const guide =
    stage === "Overview"
      ? {
          title: "Take a closer look",
          text: "Open the evidence inspector to understand which measurements need attention.",
          action: "Examine the evidence",
        }
      : stage === "Evidence"
        ? {
            title: completed
              ? "Follow the readings to the findings"
              : "Keep more than one cause open",
            text: completed
              ? "Review which explanations survived the independent tests."
              : "Prepare explanations, then compare each one against the evidence.",
            action:
              session?.status === "OBSERVED"
                ? "Prepare possible causes"
                : "Review possible causes",
          }
        : stage === "Possible causes"
          ? {
              title: completed
                ? "Read the independent result"
                : "Choose a useful test",
              text: completed
                ? "Testing is complete. Compare the explanations with the findings and their limits."
                : "Ask the engine which controlled experiment can distinguish the remaining explanations.",
              action:
                session?.status === "HYPOTHESES_READY"
                  ? "Choose the next test"
                  : completed
                    ? "Review the results"
                    : "Review the selected test",
            }
          : stage === "Tests"
            ? {
                title: completed
                  ? "Testing has finished"
                  : session?.status === "EXPERIMENT_SELECTED"
                    ? "Ready to test the explanation"
                    : "Decide what to test next",
                text: completed
                  ? "Read the independent findings and the limits of the investigation."
                  : "The test runs in a simulation. Independent checks evaluate what changed.",
                action: completed
                  ? "Review the results"
                  : session?.status === "EXPERIMENT_SELECTED"
                    ? "Run the next test"
                    : session?.status === "OBSERVED"
                      ? "Prepare possible causes"
                      : "Choose the next test",
              }
            : stage === "Results"
              ? {
                  title: completed
                    ? "Keep the complete record"
                    : "There is more to investigate",
                  text: completed
                    ? "Export the evidence, test history and verification so the result can be checked again."
                    : "Continue testing before treating these observations as a final finding.",
                  action: completed
                    ? "Prepare the report"
                    : "Return to the tests",
                }
              : {
                  title: "Explore another case",
                  text: "Downloaded reports remain available even if this temporary demo restarts.",
                  action: "Choose another case",
                };
  const lobby = !session || choosing || workspaceMode === "Cases";
  return (
    <div className="forge-v4">
      <a className="v4-skip" href="#investigation-main">
        Skip to investigation
      </a>
      <header className="product-bar" hidden={embedded}>
        <a className="wordmark" href="/demo" aria-label="FORGE home">
          <span className="forge-symbol" aria-hidden="true">
            F
          </span>
          FORGE
        </a>
        <span className="product-name">Equipment investigations</span>
        <span className="simulation-label">Synthetic research demo</span>
        {session && (
          <button
            className="text-button change-case"
            onClick={() => setChoosing(!choosing)}
          >
            {choosing ? "Resume investigation" : "Change case"}
            <ArrowRight size={16} />
          </button>
        )}
      </header>
      <div className="app-boundary">
        {investigation.recoveryNotice && <p role="status">{investigation.recoveryNotice}</p>}
        <RecoveryPanel
          kind="library"
          data={recoveryData}
          busy={busy}
          onRestore={async (value: Checkpoint) => {
            const data=value.data as LibraryCheckpoint;
            await investigation.recoverLocal(data.session);
            if(data.inspection){setCaseComponent(data.inspection.selected);setCaseCursor(data.inspection.cursor);}
            setChoosing(false);navigate(data.inspection ? stageMap[data.inspection.mode] : "Results");
          }}
        />
        {error && (
          <div className="notification error" role="alert">
            <div>
              <strong>We could not complete that action.</strong>
              <p>{error}</p>
            </div>
            <button onClick={investigation.reconnect}>Reconnect</button>
            {session && (
              <button onClick={investigation.restore}>
                Reload investigation
              </button>
            )}
          </div>
        )}
        {cap?.hosting_notice && !embedded && (
          <div className="hosting-message" role="note">
            {cap.hosting_notice}
          </div>
        )}
        {investigation.authRequired && (
          <form
            className="owner-connect"
            onSubmit={(e) => {
              e.preventDefault();
              investigation.connect();
            }}
          >
            <label>
              Owner access token
              <input
                aria-label="Owner access token"
                type="password"
                autoComplete="off"
                value={investigation.tokenInput}
                onChange={(e) => investigation.setTokenInput(e.target.value)}
              />
            </label>
            <button type="submit">Connect securely</button>
            <p>
              Your token stays in memory and is not saved to browser storage.
            </p>
          </form>
        )}
        <main id="investigation-main" tabIndex={-1} aria-busy={busy}>
          {lobby ? (
            <CaseLobby
              scenarios={investigation.scenarios}
              preset={investigation.preset}
              onPreset={investigation.setPreset}
              busy={busy}
              ready={!!cap}
              onBegin={() => void begin()}
              onResume={
                session
                  ? () => {
                      setChoosing(false);
                      navigate("Overview");
                    }
                  : undefined
              }
              useMeta={investigation.useMeta}
              onUseMeta={investigation.setUseMeta}
              modelAllowed={
                !!cap?.real_inference_permitted &&
                !!cap?.real_inference_verified
              }
              modelConfigured={
                cap?.model_configuration === "configured_unverified"
              }
            />
          ) : (
            <>
              <div className="case-context">
                {embedded && <button className="text-button" onClick={()=>{setChoosing(true);onModeChange?.("Cases");}}>Change case</button>}
                <div>
                  <span>{session.metadata.equipment_id}</span>
                  <strong>{session.metadata.investigation_title}</strong>
                </div>
                <span className="case-version">
                  <span className="version-label">Saved</span>
                  <button
                    className="icon-button"
                    aria-label="Reload saved investigation"
                    disabled={busy}
                    onClick={investigation.restore}
                  >
                    <RefreshCw size={16} />
                  </button>
                </span>
              </div>
              <Journey stage={stage} onNavigate={navigate} />
              {embedded && <div hidden={workspaceMode!=="Machine"}><LegacyMachine session={session} selected={caseComponent} cursor={caseCursor} onSelect={setCaseComponent} onCursor={setCaseCursor}/></div>}
              <div className="workspace-layout">
                <article className="stage-content">
                  <PageHeader title={introductions[stage].title}>
                    {introductions[stage].description}
                  </PageHeader>
                  {stage === "Overview" ? (
                    <Overview session={session} onNavigate={navigate} />
                  ) : stage === "Evidence" ? (
                    <EvidenceView session={session} />
                  ) : stage === "Possible causes" ? (
                    <CausesView session={session} />
                  ) : stage === "Tests" ? (
                    <TestsView session={session} />
                  ) : stage === "Results" ? (
                    <ResultsView session={session} />
                  ) : (
                    <ReportView
                      session={session}
                      busy={busy}
                      download={investigation.download}
                    />
                  )}
                </article>
                <Guide
                  title={guide.title}
                  action={busy ? "Completing this step…" : guide.action}
                  onAction={next}
                  disabled={busy}
                  completed={session.trials.length}
                  result={resultLabel(session.decision.status)}
                  onResult={() => navigate("Results")}
                  hideResult={stage === "Results"}
                >
                  {guide.text}
                </Guide>
              </div>
              <div className="analysis-footer">
                <ShieldCheck size={17} aria-hidden="true" />
                <span>{sourceLabel(session.model_source)}.</span>
                {cap?.model_configuration === "configured_unverified" && (
                  <span>An authenticated model test is still required.</span>
                )}
              </div>
            </>
          )}
        </main>
        <footer className="product-footer">
          <span>FORGE</span>
          <p>Simulation only. Not for equipment operation.</p>
          <a href="#investigation-main">
            Back to the workspace
            <ArrowLeft size={14} />
          </a>
        </footer>
      </div>
    </div>
  );
}
