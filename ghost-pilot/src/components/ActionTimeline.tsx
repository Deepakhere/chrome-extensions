import type { StepState } from "../core/types";

interface Props {
  steps: StepState[];
  reasoning?: string;
  warnings?: string[];
}

function getActionEmoji(action: string): string {
  switch (action) {
    case "click":
      return "👆";
    case "type":
      return "⌨️";
    case "select":
      return "📋";
    case "check":
      return "☑️";
    case "uncheck":
      return "⬜";
    case "hover":
      return "🖱️";
    case "scroll-to":
      return "📜";
    case "wait":
      return "⏳";
    case "press-key":
      return "⌨️";
    case "clear":
      return "🗑️";
    case "double-click":
      return "👆👆";
    default:
      return "✨";
  }
}

function getActionLabel(step: StepState): string {
  const { action, description, value } = step.step;
  const desc = description || "";

  switch (action) {
    case "click":
      return `Clicked ${desc}`;
    case "type":
      return `Typed "${value || ""}" in ${desc}`;
    case "select":
      return `Selected "${value || ""}" in ${desc}`;
    case "check":
      return `Checked ${desc}`;
    case "uncheck":
      return `Unchecked ${desc}`;
    case "clear":
      return `Cleared ${desc}`;
    case "hover":
      return `Hovered ${desc}`;
    case "scroll-to":
      return `Scrolled to ${desc}`;
    case "wait":
      return `Waited ${value || "1"}s`;
    case "press-key":
      return `Pressed ${value || "Enter"}`;
    case "double-click":
      return `Double-clicked ${desc}`;
    default:
      return desc;
  }
}

function getRunningLabel(step: StepState): string {
  const { action, description, value } = step.step;

  switch (action) {
    case "click":
      return `Clicking ${description || "element"}...`;
    case "type":
      return `Typing "${value || ""}"...`;
    case "select":
      return `Selecting "${value || ""}"...`;
    case "check":
      return `Checking ${description || "checkbox"}...`;
    case "wait":
      return `Waiting...`;
    default:
      return `${action} ${description || "..."}`;
  }
}

export function ActionTimeline({ steps, reasoning, warnings }: Props) {
  return (
    <div className="gp-timeline">
      {reasoning && (
        <div className="gp-thought-trail">
          <span className="gp-thought-label">Strategy:</span>
          <p className="gp-thought-text">{reasoning}</p>
        </div>
      )}

      {warnings && warnings.length > 0 && (
        <div className="gp-warnings">
          {warnings.map((w, i) => (
            <div key={i} className="gp-warning">
              ⚠️ {w}
            </div>
          ))}
        </div>
      )}

      <div className="gp-action-feed">
        {steps.map((s, i) => (
          <div key={i} className={`gp-action gp-action-${s.status}`}>
            <span className={`gp-dot gp-dot-${s.status}`}>
              {s.status === "running"
                ? getActionEmoji(s.step.action)
                : s.status === "done"
                  ? "✅"
                  : s.status === "error"
                    ? "❌"
                    : s.status === "skipped"
                      ? "⏭️"
                      : "⏳"}
            </span>
            <span className="gp-action-text">
              {s.status === "running"
                ? getRunningLabel(s)
                : s.status === "done"
                  ? getActionLabel(s)
                  : s.status === "error"
                    ? `${getActionLabel(s)} - FAILED`
                    : s.status === "skipped"
                      ? `${s.step.description} - Skipped`
                      : s.step.description}
            </span>
            {s.error && <span className="gp-action-error">{s.error}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
