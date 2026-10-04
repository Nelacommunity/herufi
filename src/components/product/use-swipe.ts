"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Horizontal swipe/drag for a slide track (mouse, touch and pen via pointer events).
 * Returns the live drag offset in px; the caller translates the track by
 * `-index * width + offset`. Resists at the ends, and reports whether the gesture
 * was a drag so the caller can ignore the click that follows it.
 */
export function useSwipe({ count, index, onChange, enabled = true }: {
  count: number; index: number; onChange: (i: number) => void; enabled?: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; width: number; id: number } | null>(null);
  const axis = useRef<"x" | "y" | null>(null);
  const moved = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!enabled || count < 2 || (e.pointerType === "mouse" && e.button !== 0)) return;
    start.current = { x: e.clientX, y: e.clientY, width: e.currentTarget.clientWidth, id: e.pointerId };
    axis.current = null;
    moved.current = false;
  }, [enabled, count]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!axis.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axis.current === "x") {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      }
    }
    if (axis.current !== "x") return; // vertical: let the page scroll
    moved.current = true;
    const atEdge = (index === 0 && dx > 0) || (index === count - 1 && dx < 0);
    setOffset(atEdge ? dx * 0.3 : dx);
  }, [index, count]);

  const end = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    start.current = null;
    if (axis.current === "x") {
      const dx = e.clientX - s.x;
      const threshold = Math.min(80, s.width * 0.18);
      if (dx < -threshold && index < count - 1) onChange(index + 1);
      else if (dx > threshold && index > 0) onChange(index - 1);
    }
    setOffset(0);
    setDragging(false);
  }, [index, count, onChange]);

  /** Call from onClickCapture to swallow the click that ends a drag. */
  const preventClickAfterDrag = useCallback((e: React.MouseEvent) => {
    if (moved.current) { e.preventDefault(); e.stopPropagation(); moved.current = false; }
  }, []);

  return {
    offset,
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end },
    preventClickAfterDrag,
  };
}
