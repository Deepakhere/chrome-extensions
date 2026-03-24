import { useState, useCallback, useRef, useEffect } from "react";
import type {
  PlanPhase,
  StepState,
  DOMSnapshot,
  ActionPlan,
} from "../core/types";
import { extractDOMSnapshot } from "../core/dom-extractor";
import { serializeSnapshot } from "../core/dom-serializer";
import { parseAIResponse } from "../ai/response-parser";
import { type AutomationTask } from "../services/AutomationService";

export function useActionPlan() {
  const [phase, setPhase] = useState<PlanPhase>("idle");
  const [steps, setSteps] = useState<StepState[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [task, setTask] = useState<AutomationTask | null>(null);
  const snapshotRef = useRef<DOMSnapshot | null>(null);
  const checkedKeyRef = useRef(false);
  const lastPromptRef = useRef("");
  const turnCountRef = useRef(0);
  const completedActionsRef = useRef<string[]>([]);

  // Check API key on mount - only show api-key-needed if no key stored
  useEffect(() => {
    if (!chrome.runtime?.id) {
      setError("Extension context invalidated. Please refresh this page (F5).");
      setPhase("error");
      return;
    }
    if (checkedKeyRef.current) return;
    checkedKeyRef.current = true;
    chrome.runtime
      .sendMessage({ type: "GET_API_KEY" })
      .then((res) => {
        if (!res?.key) {
          setPhase("api-key-needed");
        }
      })
      .catch(() => {
        setError("Extension was reloaded. Please refresh this page (F5).");
        setPhase("error");
      });
  }, []);

  const execute = useCallback(
    async (prompt: string, isContinuation = false) => {
      try {
        lastPromptRef.current = prompt;

        if (!isContinuation) {
          turnCountRef.current = 0;
          completedActionsRef.current = [];
        }
        turnCountRef.current++;

        if (turnCountRef.current > 10) {
          throw new Error(
            "Task exceeded maximum turns (10). Stopping to prevent infinite loop.",
          );
        }

        // Phase 1: Extract DOM
        setPhase("extracting");
        if (!isContinuation) setError("");
        if (!isContinuation) setSteps([]);
        if (!isContinuation) setReasoning("");
        setWarnings([]);

        const snapshot = extractDOMSnapshot();
        snapshotRef.current = snapshot;
        const domText = serializeSnapshot(snapshot);

        if (snapshot.elements.length === 0) {
          setError("No interactive elements found on this page.");
          setPhase("error");
          return;
        }

        // Build context about what's already been done
        const completedContext = completedActionsRef.current.length > 0
          ? `\n\n## ALREADY COMPLETED (DO NOT REPEAT THESE ACTIONS):\n${completedActionsRef.current.map(a => `- ${a}`).join("\n")}\n\nIMPORTANT: The page may have changed since these actions. Generate new steps based on the current DOM snapshot above.`
          : "";

        // Phase 2: Get plan from AI
        setPhase("planning");

        if (!chrome.runtime?.id) {
          throw new Error(
            "Extension context invalidated. Please refresh this page (F5).",
          );
        }

        const fullPrompt = prompt + completedContext;
        
        const response = await chrome.runtime.sendMessage({
          type: "PLAN_ACTIONS",
          dom: domText,
          prompt: fullPrompt,
        });

        if (response.error) {
          if (response.error === "API_KEY_MISSING") {
            setPhase("api-key-needed");
            return;
          }
          setError(response.error);
          setPhase("error");
          return;
        }

        let plan: ActionPlan;
        try {
          plan = parseAIResponse(response.data);
        } catch (parseErr) {
          setError(
            `Failed to parse AI response: ${(parseErr as Error).message}`,
          );
          setPhase("error");
          return;
        }

        setReasoning(plan.reasoning);
        if (plan.warnings?.length) setWarnings(plan.warnings);

        if (plan.steps.length === 0) {
          setError(
            "The AI couldn't determine actions for this task. " +
              plan.reasoning,
          );
          setPhase("error");
          return;
        }

        setSteps(plan.steps.map((s) => ({ step: s, status: "pending" })));

      // Route all execution to the component-based runner in App.tsx.
      // This ensures we can handle multi-turn "isComplete: false" tasks properly.
      setTask({
        steps: plan.steps as any,
        isComplete: plan.isComplete,
        snapshot: snapshot,
      });
      setPhase("executing");
      } catch (err) {
        setError((err as Error).message);
        setPhase("error");
      }
    },
    [],
  );

  const addCompletedAction = useCallback((action: string) => {
    if (!completedActionsRef.current.includes(action)) {
      completedActionsRef.current.push(action);
    }
  }, []);

  const continueAutomation = useCallback(() => {
    if (lastPromptRef.current) {
      execute(lastPromptRef.current, true);
    }
  }, [execute]);

  const reset = useCallback(() => {
    setPhase("idle");
    setSteps([]);
    setReasoning("");
    setError("");
    setWarnings([]);
    setTask(null);
  }, []);

  return {
    phase,
    setPhase,
    setSteps,
    steps,
    reasoning,
    error,
    warnings,
    execute,
    reset,
    task,
    continueAutomation,
    addCompletedAction,
  };
}
