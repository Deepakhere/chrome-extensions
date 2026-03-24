import type { DOMElement, DOMSnapshot } from "./types";

const INTERACTIVE_SELECTORS = [
  // Basic form elements
  "button",
  "a[href]",
  "input:not([type=hidden])",
  "textarea",
  "select",
  // All ARIA roles
  "[role=button]",
  "[role=link]",
  "[role=menuitem]",
  "[role=tab]",
  "[role=checkbox]",
  "[role=radio]",
  "[role=switch]",
  "[role=combobox]",
  "[role=option]",
  "[role=gridcell]",
  "[role=menuitemcheckbox]",
  "[role=menuitemradio]",
  "[role=treeitem]",
  "[role=slider]",
  "[role=alert]",
  "[role=status]",
  "[role=dialog]",
  "[role=modal]",
  "[role=textbox]",
  "[role=searchbox]",
  "[role=listbox]",
  "[role=progressbar]",
  // Interactive attributes
  "[contenteditable=true]",
  "[onclick]",
  "[ondblclick]",
  "[tabindex]:not([tabindex='-1'])",
  // Other elements
  "video",
  "audio",
  "summary",
  "details",
  "label",
  "fieldset",
  "legend",
  "optgroup",
  "option",
  // Common modal/container classes (fallback)
  "[class*='modal']",
  "[class*='dialog']",
  "[class*='popup']",
  "[class*='overlay']",
  "[id*='modal']",
  "[id*='dialog']",
].join(", ");

const MAX_ELEMENTS = 500;

function isVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  )
    return false;
  
  // Check if element has size
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 && rect.height < 2) return false;
  
  // Allow fixed position elements (common for modals)
  if (style.position === "fixed" || style.position === "absolute") {
    // But still check if it's actually on screen
    if (rect.top > window.innerHeight || rect.bottom < 0 || 
        rect.left > window.innerWidth || rect.right < 0) {
      return false;
    }
    return true;
  }
  
  // For regular elements, check offsetParent
  if (el.offsetParent === null) return false;
  
  return true;
}

function getElementText(el: HTMLElement): string {
  // Priority: aria-label > textContent > placeholder > title > alt
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel.trim().slice(0, 80);

  const textContent = el.textContent?.trim();
  if (textContent && textContent.length <= 80) return textContent;
  if (textContent) return textContent.slice(0, 80) + "...";

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.placeholder || el.name || "";
  }

  return el.getAttribute("title") || (el as HTMLImageElement).alt || "";
}

function generateSelector(el: HTMLElement): string {
  // 1. ID
  if (el.id) {
    try {
      const escaped = CSS.escape(el.id);
      if (document.querySelectorAll(`#${escaped}`).length === 1) {
        return `#${escaped}`;
      }
    } catch {
      /* ignore */
    }
  }

  // 2. data-testid
  const testId = el.getAttribute("data-testid");
  if (testId) {
    const sel = `[data-testid="${CSS.escape(testId)}"]`;
    if (document.querySelectorAll(sel).length === 1) return sel;
  }

  // 3. Build path walking up
  const parts: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current !== document.body) {
    let part = current.tagName.toLowerCase();

    // Add distinguishing attributes
    if (current.id) {
      part = `${part}#${CSS.escape(current.id)}`;
      parts.unshift(part);
      break;
    }

    const name = current.getAttribute("name");
    if (name) {
      part += `[name="${CSS.escape(name)}"]`;
    } else if (current.className && typeof current.className === "string") {
      const classes = current.className
        .split(/\s+/)
        .filter(
          (c) =>
            c &&
            !c.startsWith("hover:") &&
            !c.startsWith("focus:") &&
            c.length < 30,
        )
        .slice(0, 2);
      if (classes.length) {
        part += "." + classes.map((c) => CSS.escape(c)).join(".");
      }
    }

    // Add nth-of-type if not unique
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (s) => s.tagName === current!.tagName,
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        part += `:nth-of-type(${index})`;
      }
    }

    parts.unshift(part);
    current = current.parentElement;

    // Check if current path is unique
    const selector = parts.join(" > ");
    try {
      if (document.querySelectorAll(selector).length === 1) return selector;
    } catch {
      /* continue building */
    }
  }

  const finalSelector = parts.join(" > ");
  try {
    if (document.querySelectorAll(finalSelector).length === 1)
      return finalSelector;
  } catch {
    /* fallback */
  }

  // Fallback: XPath-style with full tag path
  return finalSelector || el.tagName.toLowerCase();
}

function isInsideGhostPilot(el: HTMLElement): boolean {
  let current: Node | null = el;
  while (current) {
    if (current instanceof HTMLElement && current.id === "ghostpilot-root")
      return true;
    current = current.parentNode;
    if (current instanceof ShadowRoot) current = current.host;
  }
  return false;
}

export function extractDOMSnapshot(): DOMSnapshot {
  const allElements = document.querySelectorAll(INTERACTIVE_SELECTORS);
  const extracted: DOMElement[] = [];
  let idCounter = 0;

  // Prioritize viewport elements
  const viewport = {
    top: 0,
    left: 0,
    bottom: window.innerHeight,
    right: window.innerWidth,
  };

  const candidates: { el: HTMLElement; inViewport: boolean }[] = [];

  allElements.forEach((node) => {
    const el = node as HTMLElement;
    if (isInsideGhostPilot(el)) return;
    if (!isVisible(el)) return;

    const rect = el.getBoundingClientRect();
    const inViewport =
      rect.top < viewport.bottom &&
      rect.bottom > viewport.top &&
      rect.left < viewport.right &&
      rect.right > viewport.left;

    candidates.push({ el, inViewport });
  });

  // Sort: viewport elements first
  candidates.sort((a, b) => (b.inViewport ? 1 : 0) - (a.inViewport ? 1 : 0));

  for (const { el } of candidates.slice(0, MAX_ELEMENTS)) {
    const text = getElementText(el);
    const tag = el.tagName.toLowerCase();
    const selector = generateSelector(el);

    const attributes: Record<string, string> = {};
    const observedAttrs = [
      "name",
      "placeholder",
      "href",
      "data-testid",
      "aria-label",
      "aria-expanded",
      "aria-checked",
      "aria-haspopup",
      "aria-invalid",
      "aria-required",
      "aria-errormessage",
      "title",
      "for",
      "role",
    ];
    for (const attr of observedAttrs) {
      const val = el.getAttribute(attr);
      if (val) attributes[attr] = val.slice(0, 100);
    }

    const domEl: DOMElement = {
      id: `el-${idCounter++}`,
      tag,
      text,
      selector,
      isVisible: true,
      isDisabled:
        el.hasAttribute("disabled") ||
        el.getAttribute("aria-disabled") === "true",
      attributes,
    };

    // Type-specific properties
    if (el instanceof HTMLInputElement) {
      domEl.type = el.type;
      if (el.type !== "password") domEl.value = el.value;
      if (el.type === "checkbox" || el.type === "radio") {
        domEl.checked = el.checked;
      }
    }
    if (el instanceof HTMLTextAreaElement) {
      domEl.type = "textarea";
      domEl.value = el.value;
    }
    if (el instanceof HTMLSelectElement) {
      domEl.options = Array.from(el.options).map((o) => o.text || o.value);
      domEl.value = el.value;
    }

    const role = el.getAttribute("role");
    if (role) domEl.role = role;

    extracted.push(domEl);
  }

  return {
    url: window.location.href,
    title: document.title,
    elements: extracted,
    timestamp: Date.now(),
  };
}
