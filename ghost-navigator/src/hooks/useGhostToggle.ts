import { useState, useEffect, useCallback, useRef } from "react";

export function useGhostToggle(onOpen?: () => void) {
  const [isOpen, setIsOpen] = useState(false);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  const open = useCallback(() => {
    setIsOpen(true);
    onOpenRef.current?.();
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) onOpenRef.current?.();
      return !prev;
    });
  }, []);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [toggle, close]);

  return { isOpen, open, close, toggle };
}
