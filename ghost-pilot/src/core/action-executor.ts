import type { ActionType } from "./types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getCenter(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function firePointerAndMouse(
  el: HTMLElement,
  eventType: string,
  opts: MouseEventInit
) {
  try {
    el.dispatchEvent(
      new PointerEvent(`pointer${eventType}`, { ...opts, bubbles: true, cancelable: true })
    );
  } catch { /* some elements don't support pointer events */ }
  try {
    el.dispatchEvent(
      new MouseEvent(`mouse${eventType}`, { ...opts, bubbles: true, cancelable: true })
    );
  } catch { /* fallback silently */ }
}

function fireKeyboardEvents(el: HTMLElement, char: string): void {
  try {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent("keypress", { key: char, bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true, cancelable: true }));
  } catch { /* ignore keyboard event errors */ }
}

function safeFocus(el: HTMLElement): void {
  try {
    el.focus();
  } catch {
    // Some elements (e.g. SVG) may not support focus
    try {
      el.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
      el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    } catch { /* ignore */ }
  }
}

function simulateClick(el: HTMLElement): void {
  const { x, y } = getCenter(el);
  const opts: MouseEventInit = {
    clientX: x,
    clientY: y,
    button: 0,
    view: window,
  };

  firePointerAndMouse(el, "over", opts);
  firePointerAndMouse(el, "enter", opts);
  firePointerAndMouse(el, "down", opts);
  safeFocus(el);
  firePointerAndMouse(el, "up", opts);
  el.dispatchEvent(
    new MouseEvent("click", { ...opts, bubbles: true, cancelable: true })
  );

  // Some elements need a direct .click() call (e.g. links, buttons in shadow DOM)
  if (typeof el.click === "function") {
    try { el.click(); } catch { /* ignore */ }
  }
}

/** Type into a standard input or textarea */
function simulateTypeInput(el: HTMLElement, value: string): void {
  const inputEl = el as HTMLInputElement | HTMLTextAreaElement;

  // Get native setter to bypass React/Vue controlled component interception
  const nativeInputSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;
  const nativeTextareaSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;

  const setter =
    el instanceof HTMLTextAreaElement ? nativeTextareaSetter : nativeInputSetter;

  try {
    if (setter) {
      // Clear
      setter.call(inputEl, "");
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      // Set new value
      setter.call(inputEl, value);
    } else {
      inputEl.value = value;
    }
  } catch {
    // Fallback if native setter fails
    inputEl.value = value;
  }

  // Fire events that React/Vue/Angular expect
  inputEl.dispatchEvent(new Event("input", { bubbles: true }));
  inputEl.dispatchEvent(new Event("change", { bubbles: true }));

  // Also dispatch InputEvent for modern frameworks
  try {
    inputEl.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: value,
      })
    );
  } catch { /* older browsers may not support InputEvent */ }

  // Fire keyboard events per character
  for (const char of value) {
    fireKeyboardEvents(inputEl, char);
  }
}

/** Type into a contenteditable rich text editor */
function simulateTypeContentEditable(el: HTMLElement, value: string): void {
  // Click first to ensure the editor is active and focused
  simulateClick(el);

  // Select all existing content
  const selection = window.getSelection();
  if (selection) {
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch { /* ignore selection errors */ }
  }

  // Delete existing content if present
  if (el.textContent) {
    try { document.execCommand("delete", false); } catch { /* ignore */ }
  }

  // Method 1: execCommand insertText (works with most editors like TinyMCE, CKEditor, Quill)
  let inserted = false;
  try {
    inserted = document.execCommand("insertText", false, value);
  } catch { /* execCommand may throw in some contexts */ }

  if (!inserted) {
    // Method 2: Use InputEvent with insertText inputType
    try {
      // Place cursor at end
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      // Create a text node and insert it
      el.textContent = "";
      const textNode = document.createTextNode(value);
      el.appendChild(textNode);

      // Fire InputEvent
      el.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: value,
        })
      );

      // Move cursor to end
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch {
      // Method 3: Last resort - set innerHTML directly
      el.textContent = value;
    }
  }

  // Fire change-like events that editors may listen for
  try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch { /* ignore */ }
  try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch { /* ignore */ }

  // Fire keyboard events per character for editors that rely on them
  for (const char of value) {
    fireKeyboardEvents(el, char);
  }
}

/** Main type handler - routes to correct strategy */
function simulateType(el: HTMLElement, value: string): void {
  safeFocus(el);

  // Check if this is a contenteditable element (rich text editor)
  if (el.isContentEditable && !(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
    simulateTypeContentEditable(el, value);
    return;
  }

  // Standard input/textarea
  simulateTypeInput(el, value);
}

function simulateSelect(el: HTMLElement, value: string): void {
  const selectEl = el as HTMLSelectElement;
  safeFocus(el);

  // Find the matching option
  const options = Array.from(selectEl.options);
  const match =
    options.find((o) => o.value === value) ||
    options.find((o) => o.text.toLowerCase().includes(value.toLowerCase()));

  if (match) {
    try {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLSelectElement.prototype,
        "value"
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(selectEl, match.value);
      } else {
        selectEl.value = match.value;
      }
    } catch {
      selectEl.value = match.value;
    }
  } else {
    throw new Error(`Could not find option matching "${value}"`);
  }

  selectEl.dispatchEvent(new Event("change", { bubbles: true }));
  selectEl.dispatchEvent(new Event("input", { bubbles: true }));
}

function simulateCheck(el: HTMLElement, checked: boolean): void {
  const inputEl = el as HTMLInputElement;
  if (inputEl.checked !== checked) {
    simulateClick(el);
    // Force if click didn't toggle the checkbox
    if (inputEl.checked !== checked) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "checked"
      )?.set;

      try {
        if (nativeSetter) {
          nativeSetter.call(inputEl, checked);
        } else {
          inputEl.checked = checked;
        }
      } catch {
        inputEl.checked = checked;
      }

      inputEl.dispatchEvent(new Event("change", { bubbles: true }));
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      try {
        inputEl.dispatchEvent(new Event("click", { bubbles: true }));
      } catch { /* ignore */ }
    }
  }
}

function simulateHover(el: HTMLElement): void {
  const { x, y } = getCenter(el);
  const opts: MouseEventInit = { clientX: x, clientY: y, view: window };
  firePointerAndMouse(el, "over", opts);
  firePointerAndMouse(el, "enter", opts);
  firePointerAndMouse(el, "move", opts);
}

function simulateKeyPress(el: HTMLElement, key: string): void {
  safeFocus(el);
  const opts: KeyboardEventInit = { key, bubbles: true, cancelable: true };

  // Handle special keys
  if (key === "Enter") {
    opts.keyCode = 13;
    opts.code = "Enter";
  } else if (key === "Escape") {
    opts.keyCode = 27;
    opts.code = "Escape";
  } else if (key === "Tab") {
    opts.keyCode = 9;
    opts.code = "Tab";
  } else if (key === "Backspace") {
    opts.keyCode = 8;
    opts.code = "Backspace";
  } else if (key === "ArrowDown") {
    opts.keyCode = 40;
    opts.code = "ArrowDown";
  } else if (key === "ArrowUp") {
    opts.keyCode = 38;
    opts.code = "ArrowUp";
  } else if (key === "ArrowLeft") {
    opts.keyCode = 37;
    opts.code = "ArrowLeft";
  } else if (key === "ArrowRight") {
    opts.keyCode = 39;
    opts.code = "ArrowRight";
  }

  el.dispatchEvent(new KeyboardEvent("keydown", opts));
  el.dispatchEvent(new KeyboardEvent("keypress", opts));
  el.dispatchEvent(new KeyboardEvent("keyup", opts));

  // For Enter key, also submit if inside a form
  if (key === "Enter" && el.closest("form")) {
    const form = el.closest("form");
    if (form) {
      try { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); } catch { /* ignore */ }
    }
  }
}

export async function executeAction(
  action: ActionType,
  el: HTMLElement,
  value?: string
): Promise<void> {
  switch (action) {
    case "click":
      simulateClick(el);
      break;

    case "type":
      if (value === undefined || value === null) throw new Error("Type action requires a value");
      simulateType(el, value);
      break;

    case "select":
      if (!value) throw new Error("Select action requires a value");
      simulateSelect(el, value);
      break;

    case "check":
      simulateCheck(el, true);
      break;

    case "uncheck":
      simulateCheck(el, false);
      break;

    case "clear":
      simulateType(el, "");
      break;

    case "scroll-to":
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      await delay(500);
      break;

    case "hover":
      simulateHover(el);
      break;

    case "wait":
      await delay(parseInt(value || "1000", 10));
      break;

    case "press-key":
      if (!value) throw new Error("Press-key action requires a key value");
      simulateKeyPress(el, value);
      break;

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
