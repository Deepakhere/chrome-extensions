let currentOverlay: HTMLDivElement | null = null;
let currentLabel: HTMLDivElement | null = null;

export function highlightElement(el: HTMLElement, label?: string): void {
  removeHighlight();

  const rect = el.getBoundingClientRect();

  // Overlay border
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    left: `${rect.left - 3}px`,
    top: `${rect.top - 3}px`,
    width: `${rect.width + 6}px`,
    height: `${rect.height + 6}px`,
    border: "2px solid #a855f7",
    borderRadius: "6px",
    boxShadow: "0 0 16px rgba(168,85,247,0.5), inset 0 0 8px rgba(168,85,247,0.1)",
    pointerEvents: "none",
    zIndex: "2147483646",
    transition: "all 0.3s ease-out",
  });
  document.body.appendChild(overlay);
  currentOverlay = overlay;

  // Label tag
  if (label) {
    const labelEl = document.createElement("div");
    Object.assign(labelEl.style, {
      position: "fixed",
      left: `${rect.left - 3}px`,
      top: `${rect.top - 28}px`,
      padding: "2px 8px",
      backgroundColor: "#a855f7",
      color: "white",
      fontSize: "11px",
      fontFamily: "system-ui, sans-serif",
      fontWeight: "600",
      borderRadius: "4px 4px 0 0",
      pointerEvents: "none",
      zIndex: "2147483646",
      whiteSpace: "nowrap",
    });
    labelEl.textContent = label;
    document.body.appendChild(labelEl);
    currentLabel = labelEl;
  }
}

export function removeHighlight(): void {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
  if (currentLabel) {
    currentLabel.remove();
    currentLabel = null;
  }
}
