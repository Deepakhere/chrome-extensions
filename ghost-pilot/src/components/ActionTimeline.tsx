import type { StepState } from "../core/types";

interface Props {
  steps: StepState[];
  reasoning?: string;
  warnings?: string[];
}

function StatusIcon({ status }: { status: StepState["status"] }) {
  switch (status) {
    case "pending":
      return <span className="gp-step-icon gp-pending">&#9675;</span>;
    case "running":
      return <span className="gp-step-icon gp-running">&#9881;</span>;
    case "done":
      return <span className="gp-step-icon gp-done">&#10003;</span>;
    case "error":
      return <span className="gp-step-icon gp-error">&#10007;</span>;
    case "skipped":
      return <span className="gp-step-icon gp-skipped">&#8212;</span>;
    default:
      return null;
  }
}

export function ActionTimeline({ steps, reasoning, warnings }: Props) {
  return (
    <div className="gp-timeline">
      {reasoning && (
        <div className="gp-reasoning">
          <strong>Plan:</strong> {reasoning}
        </div>
      )}

      {warnings && warnings.length > 0 && (
        <div className="gp-warnings">
          {warnings.map((w, i) => (
            <div key={i} className="gp-warning">&#9888; {w}</div>
          ))}
        </div>
      )}

      <div className="gp-steps">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`gp-step gp-step-${s.status}`}
          >
            <StatusIcon status={s.status} />
            <div className="gp-step-content">
              <span className="gp-step-num">Step {s.step.step}</span>
              <span className="gp-step-desc">{s.step.description}</span>
              {s.error && <span className="gp-step-error-text">{s.error}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
