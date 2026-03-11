import type { ActionPlan, DOMSnapshot, StepStatus } from "./types";
import { resolveElement } from "./element-resolver";
import { executeAction } from "./action-executor";
import { highlightElement, removeHighlight } from "./highlighter";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wait for DOM to settle after an action (e.g. SPA navigation, dynamic content) */
async function waitForDomSettle(timeout = 500): Promise<void> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout>;
    let observer: MutationObserver | null = null;

    const done = () => {
      if (observer) observer.disconnect();
      clearTimeout(timer);
      resolve();
    };

    // Resolve immediately if no mutations happen within timeout
    timer = setTimeout(done, timeout);

    try {
      observer = new MutationObserver(() => {
        // DOM is still changing - reset timer
        clearTimeout(timer);
        timer = setTimeout(done, 200);
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    } catch {
      // If MutationObserver fails, just wait the timeout
      clearTimeout(timer);
      setTimeout(resolve, timeout);
    }
  });
}

/** Retry element resolution with small delays (for SPAs that re-render) */
async function resolveElementWithRetry(
  elementId: string,
  snapshot: DOMSnapshot,
  retries = 3,
  delayMs = 300
): Promise<HTMLElement | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const el = resolveElement(elementId, snapshot);
    if (el) return el;
    if (attempt < retries - 1) await delay(delayMs);
  }
  return null;
}

export async function runActionPlan(
  plan: ActionPlan,
  snapshot: DOMSnapshot,
  onStepUpdate: (index: number, status: StepStatus, error?: string) => void
): Promise<void> {
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    onStepUpdate(i, "running");

    try {
      // For "wait" action, no element needed
      if (step.action === "wait") {
        await delay(parseInt(step.value || "1000", 10));
        onStepUpdate(i, "done");
        continue;
      }

      // Resolve element with retry for dynamic pages
      const el = await resolveElementWithRetry(step.elementId, snapshot);
      if (!el) {
        throw new Error(
          `Could not find element "${step.elementId}" on the page. It may have been removed or changed.`
        );
      }

      // Ensure element is in viewport
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
        // Some elements may not support scrollIntoView
        try { el.scrollIntoView(true); } catch { /* ignore */ }
      }
      await delay(300);

      // Highlight the element
      try {
        highlightElement(el, `Step ${step.step}: ${step.description}`);
      } catch { /* highlighting is non-critical */ }
      await delay(400);

      // Execute the action
      await executeAction(step.action, el, step.value);

      // Wait for DOM to settle after action (handles SPA re-renders, animations)
      await waitForDomSettle(500);

      try { removeHighlight(); } catch { /* non-critical */ }
      onStepUpdate(i, "done");

      // Small pause between steps for visual feedback
      await delay(200);
    } catch (err) {
      try { removeHighlight(); } catch { /* non-critical */ }
      onStepUpdate(i, "error", (err as Error).message);
      // Mark remaining steps as skipped
      for (let j = i + 1; j < plan.steps.length; j++) {
        onStepUpdate(j, "skipped");
      }
      return;
    }
  }
}
