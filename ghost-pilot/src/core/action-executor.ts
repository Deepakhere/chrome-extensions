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
  el.dispatchEvent(
    new PointerEvent(`pointer${eventType}`, { ...opts, bubbles: true, cancelable: true })
  );
  el.dispatchEvent(
    new MouseEvent(`mouse${eventType}`, { ...opts, bubbles: true, cancelable: true })
  );
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
  el.focus();
  firePointerAndMouse(el, "up", opts);
  el.dispatchEvent(
    new MouseEvent("click", { ...opts, bubbles: true, cancelable: true })
  );
}

function simulateType(el: HTMLElement, value: string): void {
  el.focus();

  const inputEl = el as HTMLInputElement | HTMLTextAreaElement;

  // Clear existing value
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

  if (setter) {
    setter.call(inputEl, "");
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));

    // Set new value
    setter.call(inputEl, value);
  } else {
    inputEl.value = value;
  }

  // Fire events React/Vue/Angular expect
  inputEl.dispatchEvent(new Event("input", { bubbles: true }));
  inputEl.dispatchEvent(new Event("change", { bubbles: true }));

  // Also fire keyboard events for frameworks that listen to them
  for (const char of value) {
    inputEl.dispatchEvent(
      new KeyboardEvent("keydown", { key: char, bubbles: true })
    );
    inputEl.dispatchEvent(
      new KeyboardEvent("keypress", { key: char, bubbles: true })
    );
    inputEl.dispatchEvent(
      new KeyboardEvent("keyup", { key: char, bubbles: true })
    );
  }
}

function simulateSelect(el: HTMLElement, value: string): void {
  const selectEl = el as HTMLSelectElement;
  el.focus();

  // Find the matching option
  const options = Array.from(selectEl.options);
  const match =
    options.find((o) => o.value === value) ||
    options.find((o) => o.text.toLowerCase().includes(value.toLowerCase()));

  if (match) {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLSelectElement.prototype,
      "value"
    )?.set;

    if (nativeSetter) {
      nativeSetter.call(selectEl, match.value);
    } else {
      selectEl.value = match.value;
    }
  }

  selectEl.dispatchEvent(new Event("change", { bubbles: true }));
  selectEl.dispatchEvent(new Event("input", { bubbles: true }));
}

function simulateCheck(el: HTMLElement, checked: boolean): void {
  const inputEl = el as HTMLInputElement;
  if (inputEl.checked !== checked) {
    simulateClick(el);
    // Force if click didn't work
    if (inputEl.checked !== checked) {
      inputEl.checked = checked;
      inputEl.dispatchEvent(new Event("change", { bubbles: true }));
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
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
  el.focus();
  const opts: KeyboardEventInit = { key, bubbles: true, cancelable: true };
  el.dispatchEvent(new KeyboardEvent("keydown", opts));
  el.dispatchEvent(new KeyboardEvent("keypress", opts));
  el.dispatchEvent(new KeyboardEvent("keyup", opts));
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
      if (!value) throw new Error("Type action requires a value");
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
