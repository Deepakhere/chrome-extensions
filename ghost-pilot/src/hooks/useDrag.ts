import { useState, useRef, useCallback, useEffect } from "react";

interface Position {
  x: number;
  y: number;
}

export function useDrag(barRef: React.RefObject<HTMLDivElement | null>) {
  // x === -1 means "centered"
  const [position, setPosition] = useState<Position>({ x: -1, y: 80 });
  const dragOffsetRef = useRef<Position | null>(null);
  const isDragging = useRef(false);

  const isCentered = position.x === -1;

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      // Don't drag from interactive elements
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (["input", "textarea", "button", "select"].includes(tag)) return;

      const bar = barRef.current;
      if (!bar) return;

      const rect = bar.getBoundingClientRect();

      // Snapshot position on first drag
      if (position.x === -1) {
        setPosition({ x: rect.left, y: rect.top });
      }

      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      isDragging.current = true;
    },
    [barRef, position.x],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragOffsetRef.current) return;
      setPosition({
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      });
    };

    const onMouseUp = () => {
      dragOffsetRef.current = null;
      setTimeout(() => {
        isDragging.current = false;
      }, 50);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return { position, isCentered, onDragStart, isDragging };
}
