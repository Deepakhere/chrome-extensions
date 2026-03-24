import type { DOMElement, DOMSnapshot } from "./types";

function serializeElement(el: DOMElement): string {
  let line = `[${el.id}] ${el.tag}`;

  if (el.type) line += `[type=${el.type}]`;
  if (el.role) line += `[role=${el.role}]`;

  // Key attributes
  if (el.attributes.name) line += ` name="${el.attributes.name}"`;
  if (el.attributes.placeholder)
    line += ` placeholder="${el.attributes.placeholder}"`;
  if (el.attributes.href) line += ` href="${el.attributes.href.slice(0, 60)}"`;

  // Text content
  if (el.text) line += ` "${el.text}"`;

  // State
  const states: string[] = [];
  if (el.isDisabled) states.push("disabled");
  if (el.value) states.push(`value="${el.value.slice(0, 40)}"`);
  if (el.checked !== undefined)
    states.push(el.checked ? "checked" : "unchecked");
  if (el.options)
    states.push(
      `options=[${el.options
        .slice(0, 10)
        .map((o) => `"${o}"`)
        .join(",")}]`,
    );

  if (states.length) line += ` {${states.join(", ")}}`;

  return line;
}

export function serializeSnapshot(snapshot: DOMSnapshot): string {
  const lines: string[] = [
    `Page: "${snapshot.title}" (${snapshot.url})`,
    "",
    `Interactive Elements (${snapshot.elements.length}):`,
  ];

  for (const el of snapshot.elements) {
    lines.push(serializeElement(el));
  }

  return lines.join("\n");
}
