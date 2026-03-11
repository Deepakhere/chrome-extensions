import type { ActionPlan, DOMSnapshot, StepStatus } from "./types";
import { resolveElement } from "./element-resolver";
import { executeAction } from "./action-executor";
import { highlightElement, removeHighlight } from "./highlighter";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

      const el = resolveElement(step.elementId, snapshot);
      if (!el) {
        throw new Error(
          `Could not find element "${step.elementId}" on the page. It may have been removed or changed.`
        );
      }

      // Scroll element into view
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      await delay(300);

      // Highlight the element
      highlightElement(el, `Step ${step.step}: ${step.description}`);
      await delay(500);

      // Execute the action
      await executeAction(step.action, el, step.value);
      await delay(400);

      removeHighlight();
      onStepUpdate(i, "done");

      // Wait for page to settle after action
      await delay(300);
    } catch (err) {
      removeHighlight();
      onStepUpdate(i, "error", (err as Error).message);
      // Don't break - mark remaining as skipped
      for (let j = i + 1; j < plan.steps.length; j++) {
        onStepUpdate(j, "skipped");
      }
      return;
    }
  }
}
