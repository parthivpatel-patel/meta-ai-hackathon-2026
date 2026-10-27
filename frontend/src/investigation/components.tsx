import type { ReactNode } from "react";
import { ArrowRight, Check, ShieldCheck, CircleHelp } from "lucide-react";
import { resultLabel, stages, type Stage } from "./presentation";
export function Badge({ status }: { status: string }) {
  const tone =
    status.startsWith("SUPPORTED") || status === "BASELINE_CONSISTENT"
      ? "positive"
      : ["REJECTED", "CONTRADICTED"].includes(status)
        ? "negative"
        : "neutral";
  return <span className={`result-badge ${tone}`}>{resultLabel(status)}</span>;
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <CircleHelp size={24} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
export function PageHeader({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      <p>{children}</p>
    </header>
  );
}
export function Journey({
  stage,
  onNavigate,
}: {
  stage: Stage;
  onNavigate: (stage: Stage) => void;
}) {
  return (
    <>
      <nav className="journey" aria-label="Investigation stages">
        {stages.map((name, i) => (
          <button
            key={name}
            aria-current={stage === name ? "page" : undefined}
            onClick={() => onNavigate(name)}
          >
            <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
            {name}
          </button>
        ))}
      </nav>
      <label className="mobile-stage">
        Investigation stage
        <select
          aria-label="Investigation stage"
          value={stage}
          onChange={(e) => onNavigate(e.target.value as Stage)}
        >
          {stages.map((name, i) => (
            <option key={name} value={name}>
              {i + 1}. {name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
export function Guide({
  title,
  children,
  action,
  onAction,
  disabled,
  completed,
  result,
  onResult,
  hideResult = false,
}: {
  title: string;
  children: ReactNode;
  action: string;
  onAction: () => void;
  disabled: boolean;
  completed: number;
  result: string;
  onResult: () => void;
  hideResult?: boolean;
}) {
  return (
    <aside className="next-guide" aria-label="What to do next">
      <span className="eyebrow">Your next step</span>
      <h2>{title}</h2>
      <p>{children}</p>
      <button className="primary" onClick={onAction} disabled={disabled}>
        {action}
        <ArrowRight size={17} aria-hidden="true" />
      </button>
      <div className="guide-status">
        <span>
          <Check size={16} aria-hidden="true" />
          {completed} {completed === 1 ? "test completed" : "tests completed"}
        </span>
        <span>
          <ShieldCheck size={16} aria-hidden="true" />
          {result}
        </span>
      </div>
      {!hideResult && (
        <button className="text-button" onClick={onResult}>
          View verification results
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      )}
      <p className="guide-disclosure">
        All equipment and measurements are synthetic. These results do not
        establish a real equipment failure.
      </p>
    </aside>
  );
}
export function Disclosure({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="advanced">
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}
