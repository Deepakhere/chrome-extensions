import type { ParsedElement } from "../core";

interface ResultItemProps {
  result: ParsedElement;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
}

export default function ResultItem({ result, isSelected, onSelect, onHover }: ResultItemProps) {
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`ghost-result-item flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer mb-px transition-colors ${isSelected ? "selected" : ""}`}
    >
      <span className="text-sm shrink-0 w-5 text-center">{result.icon}</span>
      <span className="flex-1 text-[13px] font-normal text-slate-700 truncate">{result.text}</span>
      {result.hidden && (
        <span className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded shrink-0">hidden</span>
      )}
      {isSelected && (
        <span className="text-[10px] text-violet-400 shrink-0">↵</span>
      )}
    </div>
  );
}
