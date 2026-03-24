import type { DOMSnapshot } from "../core/types";

let activeHighlight: { remove: () => void } | null = null;
let activeStatus: HTMLElement | null = null;

export interface AutomationStep {
  fields?: Record<string, string>;
  action?: string;
  elementId?: string;
  value?: string;
  description: string;
}

export interface AutomationTask {
  steps: AutomationStep[];
  snapshot?: DOMSnapshot;
  isComplete?: boolean;
}

export const AutomationService = {
  clearHighlights() {
    if (activeHighlight) {
      activeHighlight.remove();
      activeHighlight = null;
    }
    if (activeStatus) {
      activeStatus.remove();
      activeStatus = null;
    }
  },

  indicateAction(
    element: HTMLElement,
    message: string,
    color: string = "#8b5cf6",
  ) {
    this.clearHighlights();

    // Get element position for label placement
    const rect = element.getBoundingClientRect();
    const isInViewport = rect.top > 0 && rect.bottom < window.innerHeight;

    // Create floating label attached to element
    const label = document.createElement("div");
    Object.assign(label.style, {
      position: "fixed",
      left: `${Math.min(rect.left + rect.width / 2 - 60, window.innerWidth - 140)}px`,
      top: `${rect.top - 45}px`,
      padding: "8px 16px",
      background: color,
      color: "white",
      borderRadius: "8px",
      zIndex: "2147483647",
      fontSize: "13px",
      fontWeight: "600",
      fontFamily: "system-ui, -apple-system, sans-serif",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      pointerEvents: "none",
      transform: "translateY(10px)",
      opacity: "0",
      transition: "all 0.3s ease",
      whiteSpace: "nowrap",
    });
    label.textContent = message;
    document.body.appendChild(label);

    // Animate in
    requestAnimationFrame(() => {
      label.style.transform = "translateY(0)";
      label.style.opacity = "1";
    });

    // Create arrow pointing to element
    const arrow = document.createElement("div");
    Object.assign(arrow.style, {
      position: "fixed",
      left: `${rect.left + rect.width / 2 - 8}px`,
      top: `${rect.top - 5}px`,
      width: "0",
      height: "0",
      borderLeft: "8px solid transparent",
      borderRight: "8px solid transparent",
      borderTop: `8px solid ${color}`,
      zIndex: "2147483647",
      pointerEvents: "none",
      transform: "translateY(10px)",
      opacity: "0",
      transition: "all 0.3s ease",
    });
    document.body.appendChild(arrow);

    requestAnimationFrame(() => {
      arrow.style.transform = "translateY(0)";
      arrow.style.opacity = "1";
    });

    // Highlight the element
    const highlight = document.createElement("div");
    Object.assign(highlight.style, {
      position: "fixed",
      left: `${rect.left - 4}px`,
      top: `${rect.top - 4}px`,
      width: `${rect.width + 8}px`,
      height: `${rect.height + 8}px`,
      border: `3px solid ${color}`,
      borderRadius: "4px",
      zIndex: "2147483646",
      pointerEvents: "none",
      boxShadow: `0 0 20px ${color}40`,
      transition: "all 0.3s ease",
    });
    document.body.appendChild(highlight);

    // Scroll element into view
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    // Store references for cleanup
    activeHighlight = {
      remove: () => {
        label.remove();
        arrow.remove();
        highlight.remove();
      },
    };

    // Auto-remove after 2 seconds
    setTimeout(() => {
      if (activeHighlight) {
        label.style.opacity = "0";
        label.style.transform = "translateY(-10px)";
        arrow.style.opacity = "0";
        arrow.style.transform = "translateY(-10px)";
        highlight.style.opacity = "0";
        highlight.style.boxShadow = "none";
        setTimeout(() => {
          this.clearHighlights();
        }, 300);
      }
    }, 2000);
  },

  showStatus(message: string, type: "info" | "success" | "error" = "info") {
    this.clearHighlights();

    const colors = {
      info: "#3b82f6",
      success: "#22c55e",
      error: "#ef4444",
    };

    const status = document.createElement("div");
    Object.assign(status.style, {
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "16px 32px",
      background: "#1e293b",
      color: "white",
      borderRadius: "12px",
      zIndex: "2147483647",
      fontSize: "15px",
      fontWeight: "600",
      fontFamily: "system-ui, -apple-system, sans-serif",
      boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
      border: `2px solid ${colors[type]}`,
      display: "flex",
      alignItems: "center",
      gap: "12px",
    });

    const icon = document.createElement("span");
    icon.style.fontSize = "20px";
    if (type === "success") icon.textContent = "✓";
    else if (type === "error") icon.textContent = "✕";
    else icon.textContent = "→";

    status.appendChild(icon);
    status.appendChild(document.createTextNode(message));
    document.body.appendChild(status);
    activeStatus = status;

    setTimeout(() => {
      if (activeStatus) {
        status.style.opacity = "0";
        status.style.transform = "translateX(-50%) translateY(20px)";
        status.style.transition = "all 0.3s ease";
        setTimeout(() => status.remove(), 300);
      }
    }, 3000);
  },

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

  async waitForNextStep(delay = 1500): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delay));
  },

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
