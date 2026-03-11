import { useState, useEffect, useCallback } from "react";
import { GhostModal } from "../components/GhostModal";

export default function App() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ALT + P
      if (e.altKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [toggle]);

  if (!isOpen) return null;

  return <GhostModal onClose={() => setIsOpen(false)} />;
}
