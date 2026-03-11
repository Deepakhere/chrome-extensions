import { forwardRef } from "react";

interface SearchBarProps {
  query: string;
  onSearch: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ query, onSearch, onKeyDown }, ref) => {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="ghost-icon w-9.5 h-9.5 rounded-xl flex items-center justify-center text-lg shrink-0 select-none">
          👻
        </div>
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="ghost-search-input-wrap flex-1"
        >
          <input
            ref={ref}
            autoFocus
            className="w-full h-full bg-transparent border-0 outline-none text-xs text-slate-700 cursor-text"
            placeholder="Type anything... I'll find and execute it on the page."
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>
    );
  },
);

SearchBar.displayName = "SearchBar";
export default SearchBar;
