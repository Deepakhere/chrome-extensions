import { useEffect, useRef } from "react";
import type { AutomationTask } from "../services/AutomationService";
import type { StepState } from "../core/types";
import { useDrag } from "../hooks/useDrag";
import { PromptInput } from "./PromptInput";
import { ActionTimeline } from "./ActionTimeline";
import { ApiKeyInput } from "./ApiKeyInput";

interface Props {
  onClose: () => void;
  isAutomating?: boolean;
  currentStep?: number;
  currentAction?: string;
  onStartAutomation?: (task: AutomationTask) => Promise<void>;
  phase: string;
  steps: StepState[];
  reasoning: string;
  error: string;
  warnings: string[];
  execute: (prompt: string) => Promise<void>;
  reset: () => void;
  task: AutomationTask | null;
}

function PhaseIndicator({
  phase,
  isAutomating,
  currentStep,
  currentAction,
}: {
  phase: string;
  isAutomating?: boolean;
  currentStep?: number;
  currentAction?: string;
}) {
  const messages: Record<string, string> = {
    extracting: "🔍 Analyzing page elements...",
    planning: "🤔 AI is thinking...",
    executing: "⚡ Executing actions...",
    done: "✅ All done!",
  };

  const getActionEmoji = (action?: string) => {
    if (!action) return "⚡";
    if (action.toLowerCase().includes("click")) return "👆";
    if (action.toLowerCase().includes("type")) return "⌨️";
    if (action.toLowerCase().includes("select")) return "📋";
    if (action.toLowerCase().includes("wait")) return "⏳";
    return "⚡";
  };

  if (isAutomating && currentAction) {
    return (
      <div className="gp-phase gp-phase-executing">
        <span className="gp-spinner" />
        <span style={{ marginRight: "8px" }}>
          {getActionEmoji(currentAction)}
        </span>
        <span>{currentAction}</span>
      </div>
    );
  }

  const msg = messages[phase];
  if (!msg) return null;

  return (
    <div className={`gp-phase gp-phase-${phase}`}>
      {phase !== "done" && <span className="gp-spinner" />}
      {msg}
    </div>
  );
}

export function GhostModal({
  onClose,
  isAutomating,
  currentStep,
  onStartAutomation,
  phase,
  steps,
  reasoning,
  error,
  warnings,
  execute,
  reset,
  task,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const { position, isCentered, onDragStart } = useDrag(barRef);

  // Automatically trigger the multi-step automation runner when the AI plan is ready
  useEffect(() => {
    if (phase === "executing" && task && onStartAutomation && !isAutomating) {
      onStartAutomation(task);
    }
  }, [phase, task, onStartAutomation, isAutomating]);

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
            ? {
                position: "fixed",
                bottom: "24px",
                left: "50%",
                transform: "translateX(-50%)",
              }
            : {
                position: "fixed",
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: "none",
              }
        }
      >
        {/* Header */}
        <div className="gp-header">
          <div className="gp-logo">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-lg bg-indigo-500/10 shrink-0 select-none">
              👻
            </span>
            <span>GhostPilot</span>
          </div>
          <button
            className="gp-close"
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
          >
            &#10005;
          </button>
        </div>

        {/* Content */}
        <div className="gp-body">
          {reasoning && (phase === "executing" || phase === "done") && (
            <div className="gp-thought-trail">
              <span className="gp-thought-label">Agent Strategy:</span>
              <p className="gp-thought-text">{reasoning}</p>
            </div>
          )}

          {phase === "api-key-needed" && (
            <ApiKeyInput
              onSave={() => {
                reset();
              }}
            />
          )}

          {phase === "idle" && !isAutomating && (
            <PromptInput onSubmit={execute} />
          )}

          {(phase === "extracting" || phase === "planning" || isAutomating) && (
            <PhaseIndicator
              phase={phase}
              isAutomating={isAutomating}
              currentStep={currentStep}
              currentAction={
                steps.find((s) => s.status === "running")?.step.description
              }
            />
          )}

          {phase === "executing" && !isAutomating && (
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
              <button
                className="gp-new-task"
                onClick={reset}
                onMouseDown={(e) => e.stopPropagation()}
              >
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
              <button
                className="gp-new-task"
                onClick={reset}
                onMouseDown={(e) => e.stopPropagation()}
              >
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
