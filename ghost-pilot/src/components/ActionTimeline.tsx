import type { StepState } from "../core/types";

interface Props {
  steps: StepState[];
  reasoning?: string;
  warnings?: string[];
}

function getActionLabel(step: StepState): string {
  const { action, description, value, elementId } = step.step;
  const desc = description || "";

  switch (action) {
    case "click":
      return `Clicked ${desc}`;
    case "type":
      return `Typing "${value || ""}" — ${desc}`;
    case "select":
      return `Selected "${value || ""}" — ${desc}`;
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
      return `Waiting ${value || "1000"}ms`;
    case "press-key":
      return `Pressed "${value}" key`;
    default:
      return desc;
  }
}

function getRunningLabel(step: StepState): string {
  const { action, description, value } = step.step;

  switch (action) {
    case "click":
      return `Clicking ${description}...`;
    case "type":
      return `Typing "${value || ""}"...`;
    case "select":
      return `Selecting "${value || ""}"...`;
    case "check":
      return `Checking ${description}...`;
    case "uncheck":
      return `Unchecking ${description}...`;
    case "clear":
      return `Clearing ${description}...`;
    case "hover":
      return `Hovering ${description}...`;
    case "scroll-to":
      return `Scrolling to ${description}...`;
    case "wait":
      return `Waiting...`;
    case "press-key":
      return `Pressing "${value}" key...`;
    default:
      return description;
  }
}

export function ActionTimeline({ steps, reasoning, warnings }: Props) {
  return (
    <div className="gp-timeline">
      {warnings && warnings.length > 0 && (
        <div className="gp-warnings">
          {warnings.map((w, i) => (
            <div key={i} className="gp-warning">
              &#9888; {w}
            </div>
          ))}
        </div>
      )}

      <div className="gp-action-feed">
        {steps.map((s, i) => (
          <div key={i} className={`gp-action gp-action-${s.status}`}>
            <span className={`gp-dot gp-dot-${s.status}`} />
            <span className="gp-action-text">
              {s.status === "running"
                ? getRunningLabel(s)
                : s.status === "done"
                  ? getActionLabel(s)
                  : s.status === "error"
                    ? getActionLabel(s)
                    : s.status === "skipped"
                      ? s.step.description
                      : s.step.description}
            </span>
            {s.error && <span className="gp-action-error">{s.error}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
