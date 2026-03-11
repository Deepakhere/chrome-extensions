export type { ParsedElement, BuiltinCommand, ElementAction } from "./types";
export { SELECTORS, BUILTIN_COMMANDS } from "./constants";
export { parsePageComponents } from "./parser";
export { executeAction, executeSmartAction, highlightElement } from "./executor";
export { fuzzyScore } from "./fuzzy";
export { parseNLCommand, scoreNLResults } from "./nlp";
export type { NLPResult } from "./nlp";
