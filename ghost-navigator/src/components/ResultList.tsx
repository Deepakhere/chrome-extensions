import type { ParsedElement, BuiltinCommand } from "../core";
import CommandItem from "./CommandItem";
import ResultItem from "./ResultItem";

interface ResultListProps {
  results: ParsedElement[];
  builtinSuggestions: BuiltinCommand[];
  selectedIdx: number;
  onCommandClick: (keyword: string) => void;
  onResultSelect: (index: number) => void;
  onResultHover: (index: number) => void;
}

export default function ResultList({
  results,
  builtinSuggestions,
  selectedIdx,
  onCommandClick,
  onResultSelect,
  onResultHover,
}: ResultListProps) {
  if (results.length === 0 && builtinSuggestions.length === 0) return null;

  return (
    <div className="border-t border-slate-100 max-h-[340px] overflow-y-auto p-1.5">
      {builtinSuggestions.map((cmd, i) => (
        <CommandItem
          key={`cmd-${i}`}
          command={cmd}
          onClick={() => onCommandClick(cmd.keyword)}
        />
      ))}
      {results.map((r, i) => (
        <ResultItem
          key={i}
          result={r}
          isSelected={i === selectedIdx}
          onSelect={() => onResultSelect(i)}
          onHover={() => onResultHover(i)}
        />
      ))}
    </div>
  );
}
