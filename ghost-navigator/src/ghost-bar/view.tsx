import { SearchBar, ResultList, StatusBar, Footer } from "../components";
import { useGhostBarController } from "./controller";

export default function GhostBar() {
  const {
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
  } = useGhostBarController();

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 pointer-events-none font-sans ${isCentered ? "flex items-start justify-center" : ""}`}
      style={{
        zIndex: 2147483647,
        ...(isCentered ? { paddingTop: `${position.y}px` } : {}),
      }}
    >
      <div
        ref={barRef}
        onMouseDown={onDragStart}
        className="ghost-bar-wrapper rounded-2xl overflow-hidden pointer-events-auto cursor-grab"
        style={
          isCentered
            ? {}
            : {
                position: "absolute",
                left: `${position.x}px`,
                top: `${position.y}px`,
              }
        }
      >
        <SearchBar
          ref={inputRef}
          query={query}
          onSearch={handleSearch}
          onKeyDown={handleKeyDown}
        />
        <ResultList
          results={results}
          builtinSuggestions={builtinSuggestions}
          selectedIdx={selectedIdx}
          onCommandClick={handleCommandClick}
          onResultSelect={handleResultSelect}
          onResultHover={setSelectedIdx}
        />
        <StatusBar message={statusMsg} />
        {!statusMsg && <Footer />}
      </div>
    </div>
  );
}
