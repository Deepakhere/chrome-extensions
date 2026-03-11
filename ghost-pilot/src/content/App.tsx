import { useState, useEffect, useCallback } from "react";
import { GhostModal } from "../components/GhostModal";

export default function App() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ALT + G
      if (e.altKey && (e.key === "g" || e.key === "G")) {
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
