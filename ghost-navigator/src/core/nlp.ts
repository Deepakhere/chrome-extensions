import type { ElementAction, ParsedElement } from "./types";
import { fuzzyScore } from "./fuzzy";

// Action verb mappings → what the user wants to do
const ACTION_VERBS: Record<string, ElementAction> = {
  // Click actions
  click: "click",
  tap: "click",
  press: "click",
  hit: "click",
  submit: "click",
  // Navigate actions
  go: "navigate",
  goto: "navigate",
  navigate: "navigate",
  open: "navigate",
  visit: "navigate",
  follow: "navigate",
  // Focus actions
  focus: "focus",
  select: "focus",
  type: "focus",
  fill: "focus",
  enter: "focus",
  write: "focus",
  edit: "focus",
  // Toggle actions
  toggle: "toggle",
  switch: "toggle",
  check: "toggle",
  uncheck: "toggle",
  enable: "toggle",
  disable: "toggle",
  turn: "toggle",
  // Expand actions
  expand: "expand",
  collapse: "expand",
  show: "expand",
  hide: "expand",
  reveal: "expand",
  // Scroll actions
  scroll: "scroll-to",
  find: "scroll-to",
  locate: "scroll-to",
  jump: "scroll-to",
  look: "scroll-to",
};

// Prepositions and filler words to strip
const FILLER_WORDS = new Set([
  "the", "a", "an", "to", "on", "in", "at", "for", "that", "this",
  "into", "onto", "with", "and", "of", "its", "it", "please", "can",
  "you", "me", "my", "i", "want", "need", "would", "like", "page",
  "field", "where", "is", "there", "here",
]);

// Category hints — boost elements matching these keywords
const CATEGORY_HINTS: Record<string, string[]> = {
  button: ["Button"],
  btn: ["Button"],
  link: ["Link"],
  input: ["Input"],
  form: ["Form"],
  heading: ["Heading"],
  title: ["Heading"],
  image: ["Media"],
  picture: ["Media"],
  photo: ["Media"],
  video: ["Media"],
  menu: ["Menu", "Navigation"],
  nav: ["Navigation"],
  tab: ["Tab"],
  dropdown: ["Input"],
  checkbox: ["Element"],
  dialog: ["Dialog"],
  modal: ["Dialog"],
  table: ["Table"],
};

export interface NLPResult {
  action: ElementAction | null;
  targetQuery: string;
  categoryHint: string | null;
  isNLCommand: boolean;
}

/**
 * Parse a natural language command into action + target.
 * Examples:
 *   "click submit button" → { action: "click", target: "submit" }
 *   "go to about page"    → { action: "navigate", target: "about" }
 *   "fill email input"    → { action: "focus", target: "email" }
 *   "scroll to pricing"   → { action: "scroll-to", target: "pricing" }
 */
export function parseNLCommand(query: string): NLPResult {
  const words = query.toLowerCase().trim().split(/\s+/);
  if (words.length < 2) {
    return { action: null, targetQuery: query, categoryHint: null, isNLCommand: false };
  }

  // Check if first word (or first two words) is an action verb
  let action: ElementAction | null = null;
  let verbLen = 0;

  // Try two-word verbs first: "go to", "scroll to", "jump to", "turn on/off"
  if (words.length >= 3) {
    const twoWord = words[0] + " " + words[1];
    if (twoWord === "go to" || twoWord === "jump to" || twoWord === "scroll to" ||
        twoWord === "look at" || twoWord === "look for" || twoWord === "navigate to") {
      action = ACTION_VERBS[words[0]];
      verbLen = 2;
    } else if ((twoWord === "turn on" || twoWord === "turn off") ) {
      action = "toggle";
      verbLen = 2;
    }
  }

  // Single-word verb
  if (!action && ACTION_VERBS[words[0]]) {
    action = ACTION_VERBS[words[0]];
    verbLen = 1;
  }

  if (!action) {
    return { action: null, targetQuery: query, categoryHint: null, isNLCommand: false };
  }

  // Extract target: everything after the verb, minus filler words
  const targetWords = words.slice(verbLen).filter((w) => !FILLER_WORDS.has(w));
  if (targetWords.length === 0) {
    return { action: null, targetQuery: query, categoryHint: null, isNLCommand: false };
  }

  // Check for category hints in target words
  let categoryHint: string | null = null;
  const meaningfulWords: string[] = [];
  for (const w of targetWords) {
    if (CATEGORY_HINTS[w]) {
      categoryHint = CATEGORY_HINTS[w][0];
    } else {
      meaningfulWords.push(w);
    }
  }

  // If all words were category hints, use them as the query too
  const targetQuery = meaningfulWords.length > 0 ? meaningfulWords.join(" ") : targetWords.join(" ");

  return { action, targetQuery, categoryHint, isNLCommand: true };
}

/**
 * Score elements against an NLP-parsed command.
 * Uses fuzzy matching on target query, with bonuses for category matches
 * and the ability to override the element's default action.
 */
export function scoreNLResults(
  nlp: NLPResult,
  elements: ParsedElement[],
): (ParsedElement & { score: number; overrideAction?: ElementAction })[] {
  return elements
    .map((el) => {
      let score = fuzzyScore(nlp.targetQuery, el.text);

      // Category match bonus
      if (nlp.categoryHint && el.category === nlp.categoryHint) {
        score += 15;
      }

      // Penalty for hidden
      if (el.hidden) score -= 15;

      // Also match against category name for broad queries like "click button"
      if (nlp.targetQuery) {
        const catScore = fuzzyScore(nlp.targetQuery, el.category);
        if (catScore > score) score = catScore;
      }

      return {
        ...el,
        score,
        // Override the element's default action with what the user asked
        overrideAction: nlp.action || undefined,
      };
    })
    .filter((el) => el.score > 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}
