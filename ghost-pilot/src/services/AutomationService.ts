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
    color: string = "#6b06c9",
  ) {
    this.clearHighlights();

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Create pulsing dot indicator
    const dot = document.createElement("div");
    Object.assign(dot.style, {
      position: "fixed",
      left: `${centerX - 12}px`,
      top: `${centerY - 12}px`,
      width: "12px",
      height: "12px",
      background: color,
      borderRadius: "50%",
      zIndex: "2147483647",
      pointerEvents: "none",
      boxShadow: `0 0 0 4px ${color}40, 0 0 20px ${color}80`,
      transform: "scale(0)",
      transition: "transform 0.2s ease",
    });
    document.body.appendChild(dot);

    // Animate dot
    requestAnimationFrame(() => {
      dot.style.transform = "scale(1)";
    });

    // Add pulse animation
    const pulseKeyframes = `
      @keyframes ghostpilot-pulse {
        0% { transform: scale(1); box-shadow: 0 0 0 4px ${color}40, 0 0 20px ${color}80; }
        50% { transform: scale(1.1); box-shadow: 0 0 0 8px ${color}20, 0 0 30px ${color}60; }
        100% { transform: scale(1); box-shadow: 0 0 0 4px ${color}40, 0 0 20px ${color}80; }
      }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.textContent = pulseKeyframes;
    document.head.appendChild(styleSheet);
    dot.style.animation = "ghostpilot-pulse 1.5s ease-in-out infinite";

    // Floating label
    const label = document.createElement("div");
    Object.assign(label.style, {
      position: "fixed",
      left: `${Math.min(centerX - 80, window.innerWidth - 180)}px`,
      top: `${rect.top - 50}px`,
      padding: "10px 16px",
      background: color,
      color: "white",
      borderRadius: "8px",
      zIndex: "2147483647",
      fontSize: "13px",
      fontWeight: "600",
      fontFamily: "system-ui, -apple-system, sans-serif",
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      pointerEvents: "none",
      transform: "translateY(10px)",
      opacity: "0",
      transition: "all 0.3s ease",
      whiteSpace: "nowrap",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    });

    // Action icon
    const icon = document.createElement("span");
    icon.style.fontSize = "14px";
    icon.textContent = message.startsWith("Click")
      ? "👆"
      : message.startsWith("Typing")
        ? "⌨️"
        : message.startsWith("Selecting")
          ? "📋"
          : "✨";

    label.appendChild(icon);
    label.appendChild(document.createTextNode(message));
    document.body.appendChild(label);

    requestAnimationFrame(() => {
      label.style.transform = "translateY(0)";
      label.style.opacity = "1";
    });

    // Scroll element into view
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    // Store for cleanup
    activeHighlight = {
      remove: () => {
        dot.remove();
        label.remove();
        styleSheet.remove();
      },
    };

    // Auto-remove after 2.5 seconds
    setTimeout(() => {
      if (activeHighlight) {
        dot.style.transform = "scale(0)";
        dot.style.transition = "transform 0.3s ease";
        label.style.opacity = "0";
        label.style.transform = "translateY(-10px)";
        setTimeout(() => {
          this.clearHighlights();
        }, 300);
      }
    }, 2500);
  },

  showStatus(message: string, type: "info" | "success" | "error" = "info") {
    this.clearHighlights();

    const colors = {
      info: "#3b82f6",
      success: "#22c55e",
      error: "#ef4444",
    };

    const icons = {
      info: "⏳",
      success: "✅",
      error: "❌",
    };

    const status = document.createElement("div");
    Object.assign(status.style, {
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "16px 28px",
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
    icon.style.fontSize = "18px";
    icon.textContent = icons[type];

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
