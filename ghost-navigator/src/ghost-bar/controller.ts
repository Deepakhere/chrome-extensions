import { useRef, useCallback, useState } from "react";
import type { ParsedElement, ElementAction } from "../core";
import {
  BUILTIN_COMMANDS,
  parsePageComponents,
  executeAction,
  executeSmartAction,
  highlightElement,
  fuzzyScore,
  parseNLCommand,
  scoreNLResults,
} from "../core";
import { useGhostToggle, useDrag } from "../hooks";

// Match command only on exact keyword or full alias match
function matchCommand(query: string) {
  const q = query.toLowerCase().trim();
  return BUILTIN_COMMANDS.find(
    (cmd) =>
      q === cmd.keyword ||
      cmd.aliases.some((alias) => q === alias) ||
      q.includes(cmd.keyword),
  );
}

// Filter suggestions: show commands that start with or contain query
function filterSuggestions(query: string) {
  if (query.length < 2) return [];
  const q = query.toLowerCase();
  return BUILTIN_COMMANDS.filter(
    (cmd) =>
      cmd.keyword.includes(q) ||
      cmd.aliases.some((alias) => alias.includes(q)),
  );
}

export function useGhostBarController() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ParsedElement[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");

  const handleOpen = useCallback(() => {
    setQuery("");
    setResults([]);
    setSelectedIdx(0);
    setStatusMsg("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const { isOpen, close } = useGhostToggle(handleOpen);
  const { position, isCentered, isDragging, barRef, onDragStart } = useDrag();

  // Track NLP action override for the current search
  const nlpActionRef = useRef<ElementAction | null>(null);

  // Live search — normal fuzzy first, NLP fallback if no results
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setSelectedIdx(0);
    nlpActionRef.current = null;

    if (value.length < 2) {
      setResults([]);
      return;
    }

    const components = parsePageComponents();

    // Step 1: Standard fuzzy search (existing behavior)
    const scored = components
      .map((c) => ({
        ...c,
        score: fuzzyScore(value, c.text) + (c.hidden ? -15 : 0),
      }))
      .filter((c) => c.score > 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    if (scored.length > 0) {
      setResults(scored);
      return;
    }

    // Step 2: NLP fallback — parse as natural language command
    const nlp = parseNLCommand(value);
    if (nlp.isNLCommand && nlp.targetQuery.length >= 2) {
      nlpActionRef.current = nlp.action;
      const nlpResults = scoreNLResults(nlp, components);
      setResults(nlpResults);
      return;
    }

    setResults([]);
  }, []);

  // Execute action on Enter
  const handleAction = useCallback(() => {
    const q = query.toLowerCase().trim();
    if (!q) return;

    // If there are element results, ALWAYS prioritize the selected element
    if (results.length > 0) {
      const target = results[selectedIdx];
      // Use NLP action override if available, otherwise element's default action
      const action = nlpActionRef.current || target.action;
      highlightElement(target.el);
      executeSmartAction(action, target.el);
      const verb = action === "navigate" ? "Opening"
        : action === "focus" ? "Focused"
        : action === "toggle" ? "Toggled"
        : action === "expand" ? "Expanded"
        : action === "click" ? "Clicked"
        : "Navigated to";
      setStatusMsg(`${target.icon} ${verb}: "${target.text.slice(0, 40)}"`);
      setTimeout(() => close(), 600);
      return;
    }

    // No element results — try built-in command
    const builtin = matchCommand(q);
    if (builtin) {
      executeAction(builtin.action);
      setStatusMsg(`${builtin.icon} ${builtin.label}`);
      setTimeout(() => close(), 600);
      return;
    }

    setStatusMsg("No match found. Try a different keyword.");
    setTimeout(() => setStatusMsg(""), 2000);
  }, [query, results, selectedIdx, close]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleAction();
      } else if (e.key === "Tab" && results.length > 0) {
        e.preventDefault();
        const target = results[selectedIdx];
        target.el.scrollIntoView({ behavior: "smooth", block: "center" });
        highlightElement(target.el);
      }
    },
    [results, selectedIdx, handleAction],
  );

  // Click on a result item
  const handleResultSelect = useCallback(
    (index: number) => {
      if (isDragging.current) return;
      setSelectedIdx(index);
      const target = results[index];
      const action = nlpActionRef.current || target.action;
      highlightElement(target.el);
      executeSmartAction(action, target.el);
      const verb = action === "navigate" ? "Opening"
        : action === "focus" ? "Focused"
        : action === "toggle" ? "Toggled"
        : action === "click" ? "Clicked"
        : "Navigated to";
      setStatusMsg(`${target.icon} ${verb}: "${target.text.slice(0, 40)}"`);
      setTimeout(() => close(), 600);
    },
    [results, isDragging, close],
  );

  // Click on a command suggestion
  const handleCommandClick = useCallback(
    (keyword: string) => {
      const cmd = matchCommand(keyword);
      if (cmd) {
        executeAction(cmd.action);
        setStatusMsg(`${cmd.icon} ${cmd.label}`);
        setTimeout(() => close(), 600);
      }
    },
    [close],
  );

  const builtinSuggestions = filterSuggestions(query);

  return {
    isOpen,
    query,
    results,
    selectedIdx,
    statusMsg,
    builtinSuggestions,
    position,
    isCentered,
    barRef,
    inputRef,
    onDragStart,
    handleSearch,
    handleKeyDown,
    handleResultSelect,
    handleCommandClick,
    setSelectedIdx,
  };
}
