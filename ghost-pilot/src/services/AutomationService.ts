export interface AutomationStep {
  fields?: Record<string, string>;
  action?: string;
  description: string;
}

export interface AutomationTask {
  steps: AutomationStep[];
  isComplete?: boolean;
}

export const AutomationService = {
  /**
   * Highlights an element and shows a status message to make actions visible.
   */
  indicateAction(
    element: HTMLElement,
    message: string,
    color: string = "#7c3aed",
  ) {
    // 1. Highlight the element
    const originalOutline = element.style.outline;
    const originalTransition = element.style.transition;

    element.style.outline = `4px solid ${color}`;
    element.style.outlineOffset = "-2px";
    element.style.transition = "outline 0.2s ease-in-out";
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    // 2. Show floating status message at the bottom of the screen
    const status = document.createElement("div");
    Object.assign(status.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      padding: "12px 24px",
      background: "#1e293b",
      color: "white",
      borderRadius: "12px",
      zIndex: "2147483647",
      fontSize: "14px",
      fontWeight: "600",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
      border: `1px solid ${color}`,
      pointerEvents: "none",
      fontFamily: "sans-serif",
    });
    status.innerText = `GhostPilot: ${message}`;
    document.body.appendChild(status);

    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.transition = originalTransition;
      status.style.opacity = "0";
      status.style.transition = "opacity 0.5s ease-out";
      setTimeout(() => status.remove(), 500);
    }, 1500);
  },

  /**
   * Helper to poll the DOM until an element is found or timeout occurs.
   */
  async pollForElement(
    predicate: () => HTMLElement | null,
    timeout = 5000,
  ): Promise<HTMLElement | null> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = predicate();
      if (el && el.isConnected) return el;
      await new Promise((r) => setTimeout(r, 200));
    }
    return null;
  },

  async fillField(label: string, value: string): Promise<boolean> {
    console.log(`Automation: Searching for field "${label}"`);

    const findElement = () => {
      // Try finding by label text first (human-centric)
      const labels = Array.from(document.querySelectorAll("label"));
      const targetLabel = labels.find((l) =>
        l.textContent?.toLowerCase().includes(label.toLowerCase()),
      );
      if (targetLabel) {
        return (
          targetLabel.htmlFor
            ? document.getElementById(targetLabel.htmlFor)
            : targetLabel.querySelector("input, textarea")
        ) as HTMLInputElement | HTMLTextAreaElement;
      }

      const selectors = [
        `input[name="${label}" i]`,
        `input[placeholder*="${label}" i]`,
        `input[aria-label*="${label}" i]`,
        `textarea[name="${label}" i]`,
        `textarea[placeholder*="${label}" i]`,
      ];

      for (const selector of selectors) {
        const el = document.querySelector(selector) as
          | HTMLInputElement
          | HTMLTextAreaElement;
        if (el) return el;
      }
      return null;
    };

    const element = await this.pollForElement(findElement);

    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      this.indicateAction(element, `Filling "${label}"...`);
      element.focus();

      // Use native setter to bypass framework interceptors (React/Vue)
      const prototype =
        element instanceof HTMLInputElement
          ? window.HTMLInputElement.prototype
          : window.HTMLTextAreaElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(
        prototype,
        "value",
      )?.set;

      try {
        if (nativeSetter) {
          nativeSetter.call(element, value);
        } else {
          element.value = value;
        }
      } catch {
        element.value = value;
      }

      // Critical: Dispatch events so React/Vue state managers detect the change
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.blur();
      return true;
    }
    return false;
  },

  async clickButton(text: string): Promise<boolean> {
    console.log(`Automation: Searching for button "${text}"`);

    const findTarget = () => {
      const interactiveRoles =
        'button, a, input[type="button"], input[type="submit"], [role="button"], [role="gridcell"], [role="option"], [role="tab"], [role="switch"], [role="menuitem"], [type="submit"]';
      const candidates = document.querySelectorAll(interactiveRoles);

      let found = Array.from(candidates).find((el) => {
        const content = (
          (el instanceof HTMLInputElement ? el.value : el.textContent) ?? ""
        ).trim();
        const aria = el.getAttribute("aria-label") || "";
        const title = el.getAttribute("title") || "";
        const name = el.getAttribute("name") || "";

        return (
          content.toLowerCase().includes(text.toLowerCase()) ||
          aria.toLowerCase().includes(text.toLowerCase()) ||
          title.toLowerCase().includes(text.toLowerCase()) ||
          name.toLowerCase() === text.toLowerCase()
        );
      });

      // Fallback: If text is "click" or "submit", look for primary buttons
      if (
        !found &&
        (text.toLowerCase() === "click" || text.toLowerCase() === "submit")
      ) {
        found = document.querySelector(
          'button[type="submit"], button.primary, .primary-button, .btn-primary, [role="button"][type="submit"], .save-button, .submit-button',
        ) as HTMLElement;
      }

      return found as HTMLElement;
    };

    const target = await this.pollForElement(findTarget);

    if (target) {
      this.indicateAction(target, `Clicking "${text}"...`, "#10b981");
      await new Promise((r) => setTimeout(r, 200));

      // Robust click sequence to trigger all types of listeners
      target.focus();
      target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      target.click();
      return true;
    }
    return false;
  },

  async waitForNextStep(delay = 1500): Promise<void> {
    // Gives the page time to react to the click (animations, network requests)
    return new Promise((resolve) => setTimeout(resolve, delay));
  },

  /**
   * Waits for the DOM to stop changing.
   * Useful after clicking buttons that open modals or load data.
   */
  async waitForStability(timeout = 3000, idleTime = 500): Promise<void> {
    return new Promise((resolve) => {
      let lastMutation = Date.now();

      const observer = new MutationObserver(() => {
        lastMutation = Date.now();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      });

      const check = setInterval(() => {
        const now = Date.now();
        if (now - lastMutation >= idleTime || now - start >= timeout) {
          clearInterval(check);
          observer.disconnect();
          resolve();
        }
      }, 100);
      const start = Date.now();
    });
  },
};
