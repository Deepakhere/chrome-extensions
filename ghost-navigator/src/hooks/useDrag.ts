import { useState, useEffect, useRef, useCallback } from "react";

export function useDrag(initialY = 80) {
  const [position, setPosition] = useState({ x: -1, y: initialY });
  const isDragging = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragOffsetRef.current) return;
    e.preventDefault();
    isDragging.current = true;
    setPosition({
      x: e.clientX - dragOffsetRef.current.x,
      y: e.clientY - dragOffsetRef.current.y,
    });
  }, []);

  const onMouseUp = useCallback(() => {
    dragOffsetRef.current = null;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    setTimeout(() => { isDragging.current = false; }, 0);
  }, [onMouseMove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // If first drag, snapshot current centered position
    if (position.x === -1) {
      setPosition({ x: rect.left, y: rect.top });
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [position.x, onMouseMove, onMouseUp]);

  const isCentered = position.x === -1;

  return { position, isCentered, isDragging, barRef, onDragStart };
}
