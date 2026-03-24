import { useState, useEffect, useCallback, useRef } from "react";
import { GhostModal } from "../components/GhostModal";
import {
  AutomationService,
  type AutomationTask,
} from "../services/AutomationService";
import { useActionPlan } from "../hooks/useActionPlan";
import {
  findElementById,
  findElementByText,
  findInputByLabel,
} from "../core/element-finder";
import type { PlannedAction } from "../core/types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isVisible(el: HTMLElement): boolean {
  if (el.offsetParent === null && getComputedStyle(el).position !== "fixed")
    return false;
  const style = getComputedStyle(el);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  )
    return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 3 || rect.height < 3) return false;
  return true;
}

async function findElementWithRetry(
  step: PlannedAction,
  snapshot: AutomationTask["snapshot"],
  retries = 3,
  delayMs = 500,
): Promise<HTMLElement | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      console.log(`Retry ${attempt + 1}/${retries} for element...`);
      await delay(delayMs * attempt);
    }

    let element: HTMLElement | null = null;
    const { action, elementId, value, description } = step;

    // Strategy 1: Direct element ID from snapshot
    if (elementId) {
      element = findElementById(elementId, snapshot!);
    }

    // Strategy 2: CSS selector from snapshot element
    if (!element && elementId?.startsWith("el-")) {
      const domEl = snapshot?.elements.find((e) => e.id === elementId);
      if (domEl?.selector) {
        try {
          element = document.querySelector(domEl.selector) as HTMLElement;
          if (element && !isVisible(element)) element = null;
        } catch {}
      }
    }

    // Strategy 3: Text-based search from description
    if (!element && description) {
      const textToFind = description
        .replace(
          /^(click|type into|fill|select|check|uncheck|hover|scroll to|double click|right click)\s+/i,
          "",
        )
        .trim();

      if (
        action === "click" ||
        action === "double-click" ||
        action === "right-click"
      ) {
        element = findElementByText(textToFind);
      } else if (action === "type" || action === "select") {
        element = findInputByLabel(textToFind || elementId || "");
      }
    }

    // Strategy 4: Element ID without el- prefix
    if (!element && elementId) {
      const searchId = elementId.replace("el-", "");
      element = findElementByText(searchId);
    }

    // Strategy 5: Direct query by name/placeholder/aria
    if (!element && elementId) {
      const selectors = [
        `[name="${elementId.replace("el-", "")}"]`,
        `[aria-label*="${elementId.replace("el-", "")}"]`,
        `[placeholder*="${elementId.replace("el-", "")}"]`,
      ];
      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          if (el && el instanceof HTMLElement && isVisible(el)) {
            element = el;
            break;
          }
        } catch {}
      }
    }

    if (element) return element;
  }
  return null;
}

async function waitForDomStable(timeout = 2000): Promise<void> {
  return new Promise((resolve) => {
    let lastMutation = Date.now();
    let observer: MutationObserver | null = null;

    const done = () => {
      if (observer) observer.disconnect();
      resolve();
    };

    try {
      observer = new MutationObserver(() => {
        lastMutation = Date.now();
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    } catch {}

    setTimeout(done, timeout);

    const check = setInterval(() => {
      if (Date.now() - lastMutation >= 300 || !observer) {
        clearInterval(check);
        done();
      }
    }, 100);
  });
}

async function executeStep(
  step: PlannedAction,
  snapshot: AutomationTask["snapshot"],
  abortRef: React.MutableRefObject<boolean>,
): Promise<void> {
  if (!snapshot) {
    throw new Error("No DOM snapshot available");
  }

  const { action, elementId, value, description } = step;
  console.log(`Executing: ${action} on ${elementId} with value: ${value}`);

  if (action === "wait") {
    await delay(parseInt(value || "1000", 10));
    return;
  }

  const element = await findElementWithRetry(step, snapshot);

  if (!element) {
    throw new Error(`Could not find element: ${elementId || description}`);
  }

  if (!isVisible(element)) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    await delay(500);
  }

  AutomationService.indicateAction(
    element,
    `${action} ${description || elementId || ""}`,
  );

  switch (action) {
    case "click": {
      element.focus();
      element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      element.click();

      // Wait longer for modals/popups to appear
      const clickText = (description || elementId || "").toLowerCase();
      const likelyOpensModal =
        clickText.includes("create") ||
        clickText.includes("new") ||
        clickText.includes("add") ||
        clickText.includes("edit") ||
        clickText.includes("settings") ||
        clickText.includes("submit") ||
        clickText.includes("save") ||
        clickText.includes("open");

      if (likelyOpensModal) {
        await delay(1500); // Wait for modal to appear
      }
      await waitForDomStable();
      break;
    }

    case "double-click": {
      element.focus();
      element.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      await waitForDomStable();
      break;
    }

    case "right-click": {
      element.focus();
      element.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
      await delay(300);
      break;
    }

    case "type": {
      const input = element as HTMLInputElement | HTMLTextAreaElement;
      input.focus();

      // Clear existing value
      input.select();

      const nativeSetter = Object.getOwnPropertyDescriptor(
        input instanceof HTMLInputElement
          ? window.HTMLInputElement.prototype
          : window.HTMLTextAreaElement.prototype,
        "value",
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(input, value || "");
      } else {
        input.value = value || "";
      }

      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.blur();
      break;
    }

    case "select": {
      const select = element as HTMLSelectElement;
      const optionValue = value?.toLowerCase() || "";
      const option = Array.from(select.options).find(
        (o) =>
          o.text?.toLowerCase().includes(optionValue) ||
          o.value.toLowerCase().includes(optionValue),
      );
      if (option) {
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
      break;
    }

    case "check": {
      const checkbox = element as HTMLInputElement;
      if (!checkbox.checked) {
        checkbox.click();
      }
      break;
    }

    case "uncheck": {
      const checkbox = element as HTMLInputElement;
      if (checkbox.checked) {
        checkbox.click();
      }
      break;
    }

    case "hover": {
      element.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await delay(500);
      element.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
      break;
    }

    case "scroll-to": {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      await delay(300);
      break;
    }

    case "press-key": {
      const key = value || "Enter";
      const ctrlKey = description?.toLowerCase().includes("ctrl") || false;
      const shiftKey = description?.toLowerCase().includes("shift") || false;

      element.dispatchEvent(
        new KeyboardEvent("keydown", {
          key,
          bubbles: true,
          ctrlKey,
          shiftKey,
        }),
      );
      element.dispatchEvent(
        new KeyboardEvent("keyup", {
          key,
          bubbles: true,
          ctrlKey,
          shiftKey,
        }),
      );
      break;
    }

    case "clear": {
      const input = element as HTMLInputElement | HTMLTextAreaElement;
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      break;
    }

    case "drag": {
      const targetX = element.getBoundingClientRect().left;
      const targetY = element.getBoundingClientRect().top;

      element.dispatchEvent(new DragEvent("dragstart", { bubbles: true }));
      await delay(100);

      const dropZone = document.elementFromPoint(targetX + 10, targetY + 10);
      if (dropZone) {
        dropZone.dispatchEvent(new DragEvent("dragover", { bubbles: true }));
        dropZone.dispatchEvent(new DragEvent("drop", { bubbles: true }));
      }
      break;
    }
  }

  // Wait for any page transitions
  await delay(800);
}

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const abortControllerRef = useRef<boolean>(false);
  const isRunningRef = useRef<boolean>(false);
  const lastTaskRef = useRef<AutomationTask | null>(null);
  const lastExecutedStepRef = useRef<string>("");
  const repeatCountRef = useRef<number>(0);
  const rescanCountRef = useRef<number>(0);
  const lastDomSnapshotRef = useRef<string>("");

  const actionPlan = useActionPlan();

  const runAutomation = useCallback(
    async (task: AutomationTask, prompt?: string) => {
      if (isRunningRef.current) return;

      // Don't restart if same task and we have a prompt (continuation)
      if (lastTaskRef.current === task && prompt) {
        // This is a continuation, just proceed
      } else if (lastTaskRef.current === task) {
        return; // Same task without new prompt, skip
      }

      console.log("GhostPilot: Starting automation task", task);
      isRunningRef.current = true;
      lastTaskRef.current = task;
      setIsExecuting(true);
      setCurrentStep(0);
      abortControllerRef.current = false;
      repeatCountRef.current = 0;

      // Reset rescan count only for new tasks
      if (!isRunningRef.current || task !== lastTaskRef.current) {
        rescanCountRef.current = 0;
      }

      try {
        for (let i = 0; i < task.steps.length; i++) {
          if (abortControllerRef.current) {
            console.log("GhostPilot: Automation aborted by user.");
            break;
          }

          setCurrentStep(i + 1);
          const step = task.steps[i] as unknown as PlannedAction;

          actionPlan.setSteps((prev) =>
            prev.map((s, idx) => (i === idx ? { ...s, status: "running" } : s)),
          );

          console.log(`GhostPilot: Executing step ${i + 1}`, step);

          // Track step to detect loops
          const stepKey =
            `${step.action}-${step.elementId || step.description}`.toLowerCase();
          if (stepKey === lastExecutedStepRef.current) {
            repeatCountRef.current++;
            console.log(
              `GhostPilot: Repeated step detected (${repeatCountRef.current}x)`,
            );
          } else {
            repeatCountRef.current = 0;
          }
          lastExecutedStepRef.current = stepKey;

          // Stop if same step repeated 3 times
          if (repeatCountRef.current >= 3) {
            throw new Error(
              "Detected infinite loop - same action repeated. The modal may not have the expected elements.",
            );
          }

          try {
            await executeStep(step, task.snapshot, abortControllerRef);

            // Track completed action
            const actionDesc = `${step.action}: ${step.description || step.elementId}`;
            actionPlan.addCompletedAction?.(actionDesc);

            actionPlan.setSteps((prev) =>
              prev.map((s, idx) => (i === idx ? { ...s, status: "done" } : s)),
            );
          } catch (stepError) {
            actionPlan.setSteps((prev) =>
              prev.map((s, idx) =>
                i === idx
                  ? {
                      ...s,
                      status: "error",
                      error: (stepError as Error).message,
                    }
                  : s,
              ),
            );

            // Try to continue with next step if it's a "continue on error" scenario
            const continueAnyway = step.description
              ?.toLowerCase()
              .includes("optional");
            if (!continueAnyway) {
              throw stepError;
            }
            console.warn(
              `Step failed but continuing: ${(stepError as Error).message}`,
            );
          }

          await delay(600);
        }

        // After completing all steps, check if we need to continue (page changed)
        if (task.isComplete === false && !abortControllerRef.current) {
          rescanCountRef.current++;
          console.log(
            `GhostPilot: Re-scan attempt ${rescanCountRef.current}/3`,
          );

          // Stop after 3 re-scans to prevent infinite loops
          if (rescanCountRef.current >= 3) {
            console.log("GhostPilot: Max re-scan limit reached. Stopping.");
            actionPlan.setPhase("done");
            return;
          }

          console.log("GhostPilot: Task not complete, re-scanning page...");
          await delay(1000); // Give page time to fully render new content
          actionPlan.continueAutomation();
        } else if (!abortControllerRef.current) {
          actionPlan.setPhase("done");
        }
      } catch (error) {
        if (error instanceof Error && error.message === "Aborted") {
          console.log("GhostPilot: Automation stopped by user.");
        } else {
          console.error("GhostPilot: Automation execution error:", error);
          actionPlan.setPhase("error");
        }
      } finally {
        isRunningRef.current = false;
        setIsExecuting(false);
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
        isExecuting ||
        actionPlan.phase === "extracting" ||
        actionPlan.phase === "planning"
      }
      currentStep={currentStep}
      onStartAutomation={runAutomation}
    />
  );
}
