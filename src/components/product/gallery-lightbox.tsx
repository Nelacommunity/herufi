"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { useSwipe } from "@/components/product/use-swipe";
import type { ProductImage } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

type View = { scale: number; x: number; y: number };
const RESET: View = { scale: 1, x: 0, y: 0 };

/** Full-screen image viewer: swipe between images, pinch / wheel / double-tap zoom, drag to pan. */
export function GalleryLightbox({ images, name, index, onIndex, onClose }: {
  images: ProductImage[]; name: string; index: number; onIndex: (i: number) => void; onClose: () => void;
}) {
  const { t } = useI18n();
  const g = t.gallery;
  const [view, setView] = useState<View>(RESET);
  const [gesturing, setGesturing] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const lastTap = useRef(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = images.length;
  const zoomed = view.scale > 1.01;

  const go = useCallback((i: number) => { setView(RESET); onIndex((i + count) % count); }, [count, onIndex]);
  const swipe = useSwipe({ count, index, onChange: go, enabled: !zoomed });

  /** Keep the zoomed image covering the stage (no empty edges). */
  const clamp = useCallback((v: View): View => {
    const el = stage.current;
    if (!el) return v;
    const maxX = ((v.scale - 1) * el.clientWidth) / 2;
    const maxY = ((v.scale - 1) * el.clientHeight) / 2;
    return { scale: v.scale, x: Math.max(-maxX, Math.min(maxX, v.x)), y: Math.max(-maxY, Math.min(maxY, v.y)) };
  }, []);

  /** Zoom to `scale`, keeping the point under (cx, cy) fixed. */
  const zoomAt = useCallback((scale: number, cx?: number, cy?: number) => {
    setView((v) => {
      const s = Math.max(1, Math.min(MAX_SCALE, scale));
      if (s === 1) return RESET;
      const el = stage.current;
      if (!el || cx == null || cy == null) return clamp({ ...v, scale: s });
      const r = el.getBoundingClientRect();
      const px = cx - r.left - r.width / 2, py = cy - r.top - r.height / 2;
      const k = s / v.scale;
      return clamp({ scale: s, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
    });
  }, [clamp]);

  // Keyboard, scroll lock, focus.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === "+" || e.key === "=") zoomAt(view.scale + 0.5);
      else if (e.key === "-") zoomAt(view.scale - 0.5);
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.documentElement.style.overflow = ""; prev?.focus?.(); };
  }, [go, index, onClose, view.scale, zoomAt]);

  // Wheel zoom needs a non-passive listener to prevent page zoom/scroll.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => {
        const s = Math.max(1, Math.min(MAX_SCALE, v.scale * Math.exp(-e.deltaY * 0.0025)));
        if (s === 1) return RESET;
        const r = el.getBoundingClientRect();
        const px = e.clientX - r.left - r.width / 2, py = e.clientY - r.top - r.height / 2;
        const k = s / v.scale;
        return clamp({ scale: s, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clamp]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
      setGesturing(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (zoomed) {
      e.currentTarget.setPointerCapture(e.pointerId);
      pan.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
      setGesturing(true);
    } else {
      swipe.handlers.onPointerDown(e);
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      zoomAt(pinch.current.scale * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist), (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    if (pan.current) {
      const p = pan.current;
      setView((v) => clamp({ ...v, x: p.vx + e.clientX - p.x, y: p.vy + e.clientY - p.y }));
      return;
    }
    swipe.handlers.onPointerMove(e);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const wasGesture = Boolean(pinch.current || pan.current);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) { pan.current = null; setGesturing(false); }
    if (!wasGesture) swipe.handlers.onPointerUp(e);

    // Double-tap (touch) toggles zoom at the tap point.
    if (e.pointerType !== "mouse" && !wasGesture && !swipe.dragging) {
      const now = Date.now();
      if (now - lastTap.current < 280) {
        if (zoomed) setView(RESET);
        else zoomAt(DOUBLE_TAP_SCALE, e.clientX, e.clientY);
        lastTap.current = 0;
      }
      else lastTap.current = now;
    }
  }

  const current = images[index];
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-neutral-950 text-white animate-fade-in" role="dialog" aria-modal="true" aria-label={`${name}: ${fmt(g.imageOf, { n: index + 1, total: count })}`}>
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="min-w-0 truncate text-sm text-white/70">
          <span className="font-medium tabular-nums text-white">{fmt(g.counter, { n: index + 1, total: count })}</span>
          {current?.alt_text && current.alt_text !== name && <span className="ml-3 hidden sm:inline">{current.alt_text}</span>}
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => zoomAt(view.scale - 1)} disabled={!zoomed} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 disabled:opacity-30" aria-label={g.zoomOut}><Minus className="h-5 w-5" /></button>
          <button onClick={() => zoomAt(view.scale + 1)} disabled={view.scale >= MAX_SCALE} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 disabled:opacity-30" aria-label={g.zoomIn}><Plus className="h-5 w-5" /></button>
          <button ref={closeRef} onClick={onClose} className="ml-2 grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label={g.close}><X className="h-5 w-5" /></button>
        </div>
      </div>

      {/* Stage */}
      <div
        ref={stage}
        className={cn("relative min-h-0 flex-1 touch-none select-none overflow-hidden", zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => (zoomed ? setView(RESET) : zoomAt(DOUBLE_TAP_SCALE, e.clientX, e.clientY))}
      >
        <div
          className={cn("flex h-full", !swipe.dragging && "transition-transform duration-500 ease-[var(--ease-out-expo)]")}
          style={{ transform: `translate3d(calc(${-index * 100}% + ${swipe.offset}px), 0, 0)` }}
        >
          {images.map((img, i) => (
            <div key={img.id} className="relative h-full w-full shrink-0" aria-hidden={i !== index}>
              {Math.abs(i - index) <= 1 && (
                <div
                  className={cn("absolute inset-0", !gesturing && "transition-transform duration-200 ease-out")}
                  style={i === index ? { transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` } : undefined}
                >
                  <Image src={img.image_url} alt={img.alt_text || name} fill sizes="100vw" quality={85} priority={i === index} draggable={false} className="pointer-events-none object-contain" />
                </div>
              )}
            </div>
          ))}
        </div>

        {count > 1 && !zoomed && (
          <>
            <button onClick={() => go(index - 1)} onPointerDown={(e) => e.stopPropagation()} className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur transition-colors hover:bg-white/20 sm:grid" aria-label={g.prev}><ChevronLeft className="h-6 w-6" /></button>
            <button onClick={() => go(index + 1)} onPointerDown={(e) => e.stopPropagation()} className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur transition-colors hover:bg-white/20 sm:grid" aria-label={g.next}><ChevronRight className="h-6 w-6" /></button>
          </>
        )}
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-white/50">
          <span className="sm:hidden">{g.hintTouch}</span><span className="hidden sm:inline">{g.hintMouse}</span>
        </p>
      </div>

      {/* Thumbnails */}
      {count > 1 && (
        <div className="shrink-0 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
          <div className="mx-auto flex max-w-full justify-center gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label={g.label}>
            {images.map((img, i) => (
              <button key={img.id} role="tab" aria-selected={i === index} aria-label={fmt(g.goTo, { n: i + 1 })} onClick={() => go(i)}
                className={cn("relative h-16 w-14 shrink-0 overflow-hidden rounded-lg transition-all duration-300", i === index ? "ring-2 ring-white" : "opacity-50 hover:opacity-90")}>
                <Image src={img.image_url} alt="" fill sizes="56px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
