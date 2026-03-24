import type { DOMSnapshot } from "./types";

const INTERACTIVE_TAGS = [
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "details",
  "summary",
  "label",
  "fieldset",
  "legend",
];

const INTERACTIVE_ROLES = [
  "button",
  "link",
  "menuitem",
  "tab",
  "checkbox",
  "radio",
  "switch",
  "combobox",
  "option",
  "gridcell",
  "treeitem",
  "slider",
  "spinbutton",
  "textbox",
  "searchbox",
  "menuitemcheckbox",
];

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

function getElementText(el: HTMLElement): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.placeholder || el.name || el.getAttribute("aria-label") || "";
  }
  const text = el.textContent?.trim() || "";
  const aria = el.getAttribute("aria-label") || "";
  return text.slice(0, 100) || aria;
}

function getElementLabel(el: HTMLElement): string {
  const ariaLabel = el.getAttribute("aria-label") || "";
  const ariaLabelledby = el.getAttribute("aria-labelledby");
  if (ariaLabelledby) {
    const labelEl = document.getElementById(ariaLabelledby);
    return (labelEl?.textContent || "") + " " + ariaLabel;
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const label = el.placeholder || el.name || "";
    if (label) return label;
  }
  if (el instanceof HTMLLabelElement) {
    return el.textContent?.trim() || "";
  }
  const labelEl = el.closest("label");
  if (labelEl) {
    return labelEl.textContent?.trim() || "";
  }
  return ariaLabel;
}

function matchesByText(el: HTMLElement, searchText: string): boolean {
  const text = getElementText(el).toLowerCase();
  const label = getElementLabel(el).toLowerCase();
  const search = searchText.toLowerCase();

  const content =
    el instanceof HTMLInputElement
      ? (el as HTMLInputElement).value
      : el.textContent;
  const value = (content || "").toLowerCase();

  return (
    text.includes(search) ||
    label.includes(search) ||
    value.includes(search) ||
    (el.getAttribute("title")?.toLowerCase().includes(search) ?? false) ||
    (el.getAttribute("aria-label")?.toLowerCase().includes(search) ?? false) ||
    (el.getAttribute("name")?.toLowerCase().includes(search) ?? false) ||
    (el.getAttribute("id")?.toLowerCase().includes(search) ?? false)
  );
}

export function findElementById(
  elementId: string,
  snapshot: DOMSnapshot,
): HTMLElement | null {
  const domEl = snapshot.elements.find((el) => el.id === elementId);
  if (!domEl) return null;

  try {
    const el = document.querySelector(domEl.selector);
    if (el && el instanceof HTMLElement && isVisible(el)) {
      return el;
    }
  } catch {
    // Selector may be invalid
  }

  // Fallback: Try to find by partial ID match or text
  return findElementByText(elementId.replace("el-", ""));
}

export function findElementByText(
  searchText: string,
  action: string = "click",
): HTMLElement | null {
  if (!searchText) return null;

  const search = searchText.toLowerCase().trim();

  // Build selector for interactive elements
  const selectors = [
    ...INTERACTIVE_TAGS.map((t) => t),
    ...INTERACTIVE_ROLES.map((r) => `[role="${r}"]`),
    "[onclick]",
    '[tabindex]:not([tabindex="-1"])',
    "a[href]",
  ];

  let bestMatch: HTMLElement | null = null;
  let bestScore = 0;

  for (const selector of selectors) {
    try {
      const candidates = document.querySelectorAll(selector);
      for (const el of candidates) {
        if (!(el instanceof HTMLElement)) continue;
        if (!isVisible(el)) continue;

        let score = 0 as number;

        // Exact match gets highest score
        const text = getElementText(el).toLowerCase();
        const label = getElementLabel(el).toLowerCase();

        if (text === search || label === search) {
          score = 100;
        } else if (text.includes(search) || label.includes(search)) {
          score = 50;
        } else {
          continue;
        }

        // Prefer elements that are closer to viewport center
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const viewportCenterX = window.innerWidth / 2;
        const viewportCenterY = window.innerHeight / 2;
        const distance = Math.sqrt(
          Math.pow(centerX - viewportCenterX, 2) +
            Math.pow(centerY - viewportCenterY, 2),
        );
        const viewportScore = Math.max(0, 50 - distance / 50);
        score += viewportScore;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = el;
        }
      }
    } catch {
      continue;
    }
  }

  return bestMatch;
}

export function findInputByLabel(
  labelText: string,
): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  if (!labelText) return null;
  const search = labelText.toLowerCase().trim();

  // Strategy 1: label[for]
  const labels = document.querySelectorAll("label[for]");
  for (const label of labels) {
    if (label.textContent?.toLowerCase().includes(search)) {
      const forId = label.getAttribute("for");
      const input = forId ? document.getElementById(forId) : null;
      if (
        input &&
        (input instanceof HTMLInputElement ||
          input instanceof HTMLTextAreaElement ||
          input instanceof HTMLSelectElement)
      ) {
        return input;
      }
    }
  }

  // Strategy 2: label > input
  const labelParents = document.querySelectorAll("label");
  for (const label of labelParents) {
    if (label.textContent?.toLowerCase().includes(search)) {
      const input = label.querySelector("input, textarea, select");
      if (
        input &&
        (input instanceof HTMLInputElement ||
          input instanceof HTMLTextAreaElement ||
          input instanceof HTMLSelectElement)
      ) {
        return input;
      }
    }
  }

  // Strategy 3: aria-label
  const ariaInputs = document.querySelectorAll("[aria-label]");
  for (const el of ariaInputs) {
    if (el.getAttribute("aria-label")?.toLowerCase().includes(search)) {
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
      ) {
        return el;
      }
    }
  }

  // Strategy 4: placeholder
  const placeholderInputs = document.querySelectorAll(
    "input[placeholder], textarea[placeholder]",
  );
  for (const el of placeholderInputs) {
    if (el.getAttribute("placeholder")?.toLowerCase().includes(search)) {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        return el;
      }
    }
  }

  // Strategy 5: name attribute
  const nameInputs = document.querySelectorAll(
    "input[name], textarea[name], select[name]",
  );
  for (const el of nameInputs) {
    if (el.getAttribute("name")?.toLowerCase().includes(search)) {
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
      ) {
        return el;
      }
    }
  }

  return null;
}

export function findButtonByText(text: string): HTMLElement | null {
  return findElementByText(text, "click");
}

export function findAllVisibleInputs(): HTMLElement[] {
  const inputs = document.querySelectorAll("input, textarea, select");
  return Array.from(inputs).filter(
    (el) => el instanceof HTMLElement && isVisible(el),
  ) as HTMLElement[];
}

export function scrollToElement(el: HTMLElement): void {
  el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
}
