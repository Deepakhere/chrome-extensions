import { useState, useEffect, useCallback, useRef } from "react";
import { GhostModal } from "../components/GhostModal";
import {
  AutomationService,
  type AutomationTask,
} from "../services/AutomationService";

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAutomating, setIsAutomating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const abortControllerRef = useRef<boolean>(false);

  // Main controller for multi-step live automation
  const runAutomation = async (task: AutomationTask) => {
    if (isAutomating) return;
    setIsAutomating(true);
    setCurrentStep(0);
    abortControllerRef.current = false;

    for (let i = 0; i < task.steps.length; i++) {
      if (abortControllerRef.current) break;
      setCurrentStep(i + 1);
      const step = task.steps[i];

      // Fill all fields in this step if they exist
      if (step.fields) {
        for (const [label, value] of Object.entries(step.fields)) {
          const success = await AutomationService.fillField(label, value);
          if (!success) {
            console.warn(`GhostPilot: Could not find or fill field: ${label}`);
          }
        }
      }

      // Click the transition button if defined
      if (step.action) {
        const clicked = await AutomationService.clickButton(step.action);
        if (clicked) {
          await AutomationService.waitForNextStep();
        }
      }
    }

    setIsAutomating(false);
  };

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
      onClose={handleClose}
      isAutomating={isAutomating}
      currentStep={currentStep}
      onStartAutomation={runAutomation}
    />
  );
}
