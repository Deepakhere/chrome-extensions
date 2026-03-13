export interface AutomationStep {
  fields: Record<string, string>;
  action: string;
}

export interface AutomationTask {
  steps: AutomationStep[];
}

/**
 * AutomationService handles the low-level DOM interactions
 * for the AI browser agent.
 */
export class AutomationService {
  private static delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Finds an input field by trying to match its label text or attributes,
   * including searching inside Shadow DOMs.
   */
  static async fillField(labelHint: string, value: string): Promise<boolean> {
    const findInRoot = (
      root: Document | ShadowRoot,
    ): (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) | null => {
      const inputs = Array.from(
        root.querySelectorAll<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >("input, textarea, select"),
      );

      for (const el of inputs) {
        const id = el.id;
        const labelText = id
          ? root.querySelector<HTMLLabelElement>(`label[for="${id}"]`)
              ?.textContent
          : null;

        // Safely access placeholder only if it exists on the element type
        const placeholder =
          el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
            ? el.placeholder
            : "";

        const name = el.name || "";
        const ariaLabel = el.getAttribute("aria-label") || "";

        const matches = [labelText, placeholder, name, ariaLabel].some(
          (text) =>
            text && text.toLowerCase().includes(labelHint.toLowerCase()),
        );

        if (matches) return el;
      }

      // Check shadow roots of all elements in this root
      const allElements = root.querySelectorAll("*");
      for (const el of Array.from(allElements)) {
        if (el.shadowRoot) {
          const found = findInRoot(el.shadowRoot);
          if (found) return found;
        }
      }
      return null;
    };

    const element = findInRoot(document);

    if (element) {
      element.focus();

      if (element instanceof HTMLSelectElement) {
        const targetOption = Array.from(element.options).find(
          (opt) =>
            opt.text.toLowerCase().includes(value.toLowerCase()) ||
            opt.value.toLowerCase().includes(value.toLowerCase()),
        );
        if (targetOption) element.value = targetOption.value;
      } else {
        element.value = value;
      }

      // Comprehensive Event Emulation for modern frameworks
      element.dispatchEvent(new Event("focus", { bubbles: true }));
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.dispatchEvent(new Event("blur", { bubbles: true }));

      await this.delay(100); // Small delay to mimic human behavior
      return true;
    }
    return false;
  }

  /**
   * Clicks a button by text content, including searching inside Shadow DOMs.
   */
  static async clickButton(text: string): Promise<boolean> {
    const findButton = (root: Document | ShadowRoot): HTMLElement | null => {
      const selectors =
        'button, a, input[type="submit"], input[type="button"], [role="button"]';
      const buttons = Array.from(root.querySelectorAll<HTMLElement>(selectors));

      const target = buttons.find(
        (btn) =>
          btn.textContent?.toLowerCase().includes(text.toLowerCase()) ||
          (btn instanceof HTMLInputElement &&
            btn.value.toLowerCase().includes(text.toLowerCase())) ||
          btn
            .getAttribute("aria-label")
            ?.toLowerCase()
            .includes(text.toLowerCase()),
      );

      if (target) return target;

      const allElements = root.querySelectorAll("*");
      for (const el of Array.from(allElements)) {
        if (el.shadowRoot) {
          const found = findButton(el.shadowRoot);
          if (found) return found;
        }
      }
      return null;
    };

    const target = findButton(document);

    if (target) {
      target.click();
      return true;
    }
    return false;
  }

  /**
   * Navigation Resilience: Waits for DOM changes or a timeout.
   */
  static async waitForNextStep(timeout = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        observer.disconnect();
        resolve(true);
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(false);
      }, timeout);
    });
  }
}
