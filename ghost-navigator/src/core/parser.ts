import type { ParsedElement, ElementAction } from "./types";
import { SELECTORS } from "./constants";

function getElementIcon(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute("role") || "";
  const type = (el as HTMLInputElement).type || "";

  if (tag === "a") return "🔗";
  if (tag === "button" || role === "button") return "🔘";
  if ((tag === "input" && type === "checkbox") || role === "checkbox") return "☑️";
  if (tag === "input" && type === "radio") return "🔘";
  if (tag === "input" && ["text", "email", "password", "search", "url", "tel", "number"].includes(type)) return "✏️";
  if (tag === "input" && type === "submit") return "📤";
  if (tag === "input" && type === "file") return "📎";
  if (tag === "input" && type === "range") return "🎚️";
  if (tag === "input" && type === "date") return "📅";
  if (tag === "textarea") return "📝";
  if (tag === "select") return "📋";
  if (tag === "form") return "📄";
  if (tag === "img") return "🖼️";
  if (tag === "video") return "🎬";
  if (tag === "audio") return "🔊";
  if (tag === "details" || tag === "summary") return "📂";
  if (tag === "dialog") return "💬";
  if (tag === "nav") return "🧭";
  if (/^h[1-6]$/.test(tag)) return "📌";
  if (tag === "table") return "📊";
  if (tag === "label") return "🏷️";
  if (role === "tab") return "📑";
  if (role === "menuitem") return "▸";
  if (role === "switch") return "🔀";
  if (role === "slider") return "🎚️";
  if (role === "progressbar") return "📊";
  if (role === "alert") return "⚠️";
  return "▸";
}

function getCategory(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute("role") || "";
  if (tag === "a") return "Link";
  if (tag === "button" || role === "button") return "Button";
  if (tag === "input" || tag === "textarea" || tag === "select") return "Input";
  if (tag === "form") return "Form";
  if (tag === "img" || tag === "video" || tag === "audio") return "Media";
  if (tag === "nav") return "Navigation";
  if (/^h[1-6]$/.test(tag)) return "Heading";
  if (tag === "table") return "Table";
  if (tag === "details" || tag === "summary") return "Expandable";
  if (tag === "dialog") return "Dialog";
  if (tag === "label") return "Label";
  if (role === "tab") return "Tab";
  if (role === "menuitem") return "Menu";
  return "Element";
}

function inferAction(el: HTMLElement): ElementAction {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute("role") || "";
  const type = (el as HTMLInputElement).type || "";

  if (tag === "a") return "navigate";
  if (tag === "details" || tag === "summary") return "expand";
  if (tag === "input" || tag === "textarea" || tag === "select") return "focus";
  if (role === "switch" || role === "checkbox" || (tag === "input" && (type === "checkbox" || type === "radio"))) return "toggle";
  if (tag === "button" || role === "button" || role === "tab" || role === "menuitem") return "click";
  if (/^h[1-6]$/.test(tag) || tag === "table" || tag === "img" || tag === "nav") return "scroll-to";
  return "click";
}

function extractText(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();

  // For inputs, prefer placeholder/label
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return el.getAttribute("aria-label")
      || (el as HTMLInputElement).placeholder
      || el.getAttribute("title")
      || el.getAttribute("name")
      || el.getAttribute("id")
      || "";
  }

  // For images
  if (tag === "img") {
    return el.getAttribute("alt") || el.getAttribute("title") || "";
  }

  // General: innerText first, then fallbacks
  return el.innerText?.trim().slice(0, 80)
    || el.getAttribute("aria-label")
    || (el as HTMLInputElement).placeholder
    || el.getAttribute("title")
    || el.getAttribute("alt")
    || el.getAttribute("name")
    || el.getAttribute("value")
    || el.getAttribute("id")
    || "";
}

export function parsePageComponents(): ParsedElement[] {
  let elements: NodeListOf<Element>;
  try {
    elements = document.querySelectorAll(SELECTORS.join(", "));
  } catch {
    // Fallback if any selector is invalid
    elements = document.querySelectorAll("button, a[href], input, textarea, select, h1, h2, h3, h4, h5, h6");
  }

  const seen = new Set<HTMLElement>();
  const parsed: ParsedElement[] = [];

  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (seen.has(htmlEl)) return;
    seen.add(htmlEl);

    // Skip our own ghost-navigator
    if (htmlEl.closest("#ghost-navigator-root")) return;

    const hidden =
      htmlEl.offsetParent === null &&
      htmlEl.style.position !== "fixed" &&
      htmlEl.style.position !== "sticky";

    const text = extractText(htmlEl);
    if (!text) return;

    parsed.push({
      text,
      icon: getElementIcon(htmlEl),
      category: getCategory(htmlEl),
      action: inferAction(htmlEl),
      hidden,
      el: htmlEl,
    });
  });

  return parsed;
}
