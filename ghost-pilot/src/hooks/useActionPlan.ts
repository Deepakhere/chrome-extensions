import { useState, useCallback, useRef, useEffect } from "react";
import type { PlanPhase, StepState, DOMSnapshot, ActionPlan } from "../core/types";
import { extractDOMSnapshot } from "../core/dom-extractor";
import { serializeSnapshot } from "../core/dom-serializer";
import { parseAIResponse } from "../ai/response-parser";
import { runActionPlan } from "../core/action-runner";

export function useActionPlan() {
  const [phase, setPhase] = useState<PlanPhase>("idle");
  const [steps, setSteps] = useState<StepState[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const snapshotRef = useRef<DOMSnapshot | null>(null);
  const checkedKeyRef = useRef(false);

  // Check API key on mount - only show api-key-needed if no key stored
  useEffect(() => {
    if (checkedKeyRef.current) return;
    checkedKeyRef.current = true;
    chrome.runtime.sendMessage({ type: "GET_API_KEY" }).then((res) => {
      if (!res?.key) {
        setPhase("api-key-needed");
      }
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
        setError("The AI couldn't determine actions for this task. " + plan.reasoning);
        setPhase("error");
        return;
      }

      setSteps(plan.steps.map((s) => ({ step: s, status: "pending" })));

      // Phase 3: Execute
      setPhase("executing");

      await runActionPlan(plan, snapshot, (index, status, err) => {
        setSteps((prev) =>
          prev.map((s, i) => (i === index ? { ...s, status, error: err } : s))
        );
      });

      setPhase("done");
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
  }, []);

  return { phase, steps, reasoning, error, warnings, execute, reset };
}
