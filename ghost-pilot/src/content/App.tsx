import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useActionPlan } from "../hooks/useActionPlan";
import {
  AutomationService,
  type AutomationTask,
} from "../services/AutomationService";
import { GhostModal } from "../components/GhostModal";

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAutomating, setIsAutomating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const abortControllerRef = useRef<boolean>(false);
  const isRunningRef = useRef<boolean>(false);
  const lastTaskRef = useRef<AutomationTask | null>(null);

  const actionPlan = useActionPlan();

  // Main controller for multi-step live automation
  const runAutomation = useCallback(
    async (task: AutomationTask) => {
      // Prevent re-running the exact same task object if it just finished or failed
      if (isRunningRef.current || lastTaskRef.current === task) return;

      console.log("GhostPilot: Starting automation task", task);
      isRunningRef.current = true;
      lastTaskRef.current = task;
      setIsAutomating(true);
      setCurrentStep(0);
      abortControllerRef.current = false;

      try {
        for (let i = 0; i < task.steps.length; i++) {
          if (abortControllerRef.current) {
            console.log("GhostPilot: Automation aborted by user.");
            break;
          }

          setCurrentStep(i + 1);
          const step = task.steps[i];
          console.log(`GhostPilot: Executing step ${i + 1}`, step);

          // Fill all fields in this step if they exist
          if (step.fields) {
            for (const [label, value] of Object.entries(step.fields)) {
              if (abortControllerRef.current) throw new Error("Aborted");
              const success = await AutomationService.fillField(label, value);
              if (!success) {
                console.error(
                  `GhostPilot: Required field missing: ${label}. Stopping.`,
                );
                throw new Error(`Field not found: ${label}`);
              }
              // Small delay between fields to mimic human typing/allow UI to react
              await new Promise((r) => setTimeout(r, 150));
            }
          }

          // Click the transition button if defined
          if (step.action) {
            if (abortControllerRef.current) throw new Error("Aborted");

            // Brief pause before clicking to ensure fields are processed
            await new Promise((r) => setTimeout(r, 300));

            const clicked = await AutomationService.clickButton(step.action);
            if (clicked) {
              console.log(
                `GhostPilot: Clicked ${step.action}. Waiting for UI to settle...`,
              );

              // Wait for animations/modals to finish loading
              await AutomationService.waitForStability();

              // After a click, the page state likely changed (modal opened, navigation, or validation error).
              // We stop this execution turn and trigger a fresh scan to ensure the AI sees the latest UI.
              // We only skip this if the AI explicitly said the entire request is complete.
              if (task.isComplete !== true) {
                console.log(
                  "GhostPilot: Action performed. Re-scanning to verify result and get next steps...",
                );
                actionPlan.continueAutomation();
                return; // Exit this plan; the continuation will start a new one.
              }

              await AutomationService.waitForNextStep(1000);
            } else {
              console.error(
                `GhostPilot: Failed to click action button: ${step.action}. Stopping.`,
              );
              throw new Error(`Action failed: ${step.action}`);
            }
          }
        }

        // If the task isn't explicitly complete, trigger a re-scan after finishing the steps.
        // This handles cases where the AI finished its current plan but the overall goal (like form submission)
        // needs verification (e.g. to catch validation errors or check if a new form appeared).
        if (task.isComplete !== true && !abortControllerRef.current) {
          console.log(
            "GhostPilot: Plan turn finished. Re-scanning to verify progress...",
          );
          actionPlan.continueAutomation();
        }
      } catch (error) {
        if (error instanceof Error && error.message === "Aborted") {
          console.log("GhostPilot: Automation stopped by user.");
        } else {
          console.error("GhostPilot: Automation execution error:", error);
        }
      } finally {
        isRunningRef.current = false;
        setIsAutomating(false);
        setCurrentStep(0);
      }
    },
    [actionPlan],
  );

  const handleClose = useCallback(() => {
    abortControllerRef.current = true;
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ALT + P
      if (e.altKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [toggle]);

  if (!isOpen) return null;

  return (
    <GhostModal
      {...actionPlan}
      onClose={handleClose}
      isAutomating={
        isAutomating ||
        actionPlan.phase === "extracting" ||
        actionPlan.phase === "planning"
      }
      currentStep={currentStep}
      onStartAutomation={runAutomation}
    />
  );
}
