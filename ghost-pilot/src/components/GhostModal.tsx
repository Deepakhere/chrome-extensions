import { useEffect, useRef } from "react";
import { useActionPlan } from "../hooks/useActionPlan";
import { useDrag } from "../hooks/useDrag";
import { PromptInput } from "./PromptInput";
import { ActionTimeline } from "./ActionTimeline";
import { ApiKeyInput } from "./ApiKeyInput";

interface Props {
  onClose: () => void;
}

function PhaseIndicator({ phase }: { phase: string }) {
  const messages: Record<string, string> = {
    extracting: "Analyzing page elements...",
    planning: "AI is creating action plan...",
    executing: "Executing actions...",
    done: "All actions completed!",
  };
  const msg = messages[phase];
  if (!msg) return null;

  return (
    <div className={`gp-phase gp-phase-${phase}`}>
      {phase !== "done" && <span className="gp-spinner" />}
      {msg}
    </div>
  );
}

export function GhostModal({ onClose }: Props) {
  const { phase, steps, reasoning, error, warnings, execute, reset } =
    useActionPlan();
  const barRef = useRef<HTMLDivElement>(null);
  const { position, isCentered, onDragStart } = useDrag(barRef);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="gp-wrapper">
      <div
        ref={barRef}
        className="gp-modal"
        onMouseDown={onDragStart}
        style={
          isCentered
            ? { position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)" }
            : { position: "fixed", left: `${position.x}px`, top: `${position.y}px`, transform: "none" }
        }
      >
        {/* Header */}
        <div className="gp-header">
          <div className="gp-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a7 7 0 0 0-7 7c0 3 1.5 5.5 3 7.5S12 22 12 22s2.5-3.5 4-5.5S19 12 19 9a7 7 0 0 0-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <span>GhostPilot</span>
          </div>
          <button className="gp-close" onClick={onClose} onMouseDown={(e) => e.stopPropagation()}>
            &#10005;
          </button>
        </div>

        {/* Content */}
        <div className="gp-body">
          {phase === "api-key-needed" && (
            <ApiKeyInput
              onSave={() => {
                reset();
              }}
            />
          )}

          {phase === "idle" && (
            <PromptInput onSubmit={execute} />
          )}

          {(phase === "extracting" || phase === "planning") && (
            <PhaseIndicator phase={phase} />
          )}

          {phase === "executing" && (
            <>
              <PhaseIndicator phase={phase} />
              <ActionTimeline
                steps={steps}
                reasoning={reasoning}
                warnings={warnings}
              />
            </>
          )}

          {phase === "done" && (
            <>
              <PhaseIndicator phase={phase} />
              <ActionTimeline
                steps={steps}
                reasoning={reasoning}
                warnings={warnings}
              />
              <button className="gp-new-task" onClick={reset} onMouseDown={(e) => e.stopPropagation()}>
                New Task
              </button>
            </>
          )}

          {phase === "error" && (
            <div className="gp-error-section">
              <div className="gp-error-msg">&#9888; {error}</div>
              {steps.length > 0 && (
                <ActionTimeline
                  steps={steps}
                  reasoning={reasoning}
                  warnings={warnings}
                />
              )}
              <button className="gp-new-task" onClick={reset} onMouseDown={(e) => e.stopPropagation()}>
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="gp-footer">
          <span>Press ESC to close</span>
          <span>ALT+P to toggle</span>
        </div>
      </div>
    </div>
  );
}
