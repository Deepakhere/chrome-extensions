import type { DOMSnapshot } from "./types";

export function resolveElement(
  elementId: string,
  snapshot: DOMSnapshot
): HTMLElement | null {
  const entry = snapshot.elements.find((e) => e.id === elementId);
  if (!entry) return null;

  // Try CSS selector first
  try {
    const el = document.querySelector(entry.selector) as HTMLElement | null;
    if (el) return el;
  } catch {
    // Invalid selector, fall through
  }

  // Fallback: match by tag + text content
  const candidates = document.querySelectorAll(entry.tag);
  for (const candidate of candidates) {
    const el = candidate as HTMLElement;
    const text = el.textContent?.trim() || "";
    if (text && entry.text && text.includes(entry.text.replace("...", ""))) {
      return el;
    }
  }

  // Fallback: match by attributes
  if (entry.attributes.name) {
    const el = document.querySelector(
      `${entry.tag}[name="${entry.attributes.name}"]`
    ) as HTMLElement | null;
    if (el) return el;
  }

  if (entry.attributes.placeholder) {
    const el = document.querySelector(
      `${entry.tag}[placeholder="${entry.attributes.placeholder}"]`
    ) as HTMLElement | null;
    if (el) return el;
  }

  return null;
}
