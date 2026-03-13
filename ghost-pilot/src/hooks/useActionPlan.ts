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
import { runActionPlan } from "../core/action-runner";
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

  // Check API key on mount - only show api-key-needed if no key stored
  useEffect(() => {
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

  const execute = useCallback(async (prompt: string) => {
    try {
      // Phase 1: Extract DOM
      setPhase("extracting");
      setError("");
      setSteps([]);
      setReasoning("");
      setWarnings([]);

      const snapshot = extractDOMSnapshot();
      snapshotRef.current = snapshot;
      const domText = serializeSnapshot(snapshot);

      if (snapshot.elements.length === 0) {
        setError("No interactive elements found on this page.");
        setPhase("error");
        return;
      }

      // Phase 2: Get plan from AI
      setPhase("planning");

      const response = await chrome.runtime.sendMessage({
        type: "PLAN_ACTIONS",
        dom: domText,
        prompt,
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
        setError(`Failed to parse AI response: ${(parseErr as Error).message}`);
        setPhase("error");
        return;
      }

      setReasoning(plan.reasoning);
      if (plan.warnings?.length) setWarnings(plan.warnings);

      if (plan.steps.length === 0) {
        setError(
          "The AI couldn't determine actions for this task. " + plan.reasoning,
        );
        setPhase("error");
        return;
      }

      setSteps(plan.steps.map((s) => ({ step: s, status: "pending" })));

      // Determine if this is a multi-step/live task
      const isLiveTask = plan.steps.some(
        (s) => (s as any).fields || (s as any).action,
      );

      if (isLiveTask) {
        setTask({ steps: plan.steps as any });
        setPhase("executing");
        // We do NOT set phase to 'done' here; the Live Runner in App.tsx
        // will manage the UI state via the isAutomating prop.
      } else {
        setPhase("executing");
        await runActionPlan(plan, snapshot, (index, status, err) => {
          setSteps((prev) =>
            prev.map((s, i) =>
              i === index ? { ...s, status, error: err } : s,
            ),
          );
        });
        setPhase("done");
      }
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setSteps([]);
    setReasoning("");
    setError("");
    setWarnings([]);
    setTask(null);
  }, []);

  return { phase, steps, reasoning, error, warnings, execute, reset, task };
}
