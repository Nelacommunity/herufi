"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

type Side = "right" | "left" | "bottom" | "center" | "top";

const panel: Record<Side, string> = {
  right: "inset-y-0 right-0 h-full w-full max-w-md animate-slide-in-right sm:rounded-l-2xl",
  left: "inset-y-0 left-0 h-full w-[88%] max-w-sm animate-slide-in-left",
  bottom: "inset-x-0 bottom-0 max-h-[88dvh] w-full animate-slide-up rounded-t-3xl pb-safe",
  top: "inset-0 h-dvh w-full animate-fade-in sm:inset-auto sm:left-1/2 sm:top-[7vh] sm:h-auto sm:max-h-[82vh] sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:animate-scale-in sm:rounded-2xl sm:overflow-hidden",
  center: "left-1/2 top-[8vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 animate-scale-in rounded-2xl",
};

let openCount = 0;

/** Accessible modal panel: portal, scroll lock, Escape to close, focus restore, basic focus trap. */
export function Sheet({ open, onClose, side = "right", title, children, className, hideHeader, footer }: {
  open: boolean; onClose: () => void; side?: Side; title: string; children: ReactNode; className?: string; hideHeader?: boolean; footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    openCount++;
    document.documentElement.style.overflow = "hidden";
    const focusables = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])') ?? []);
    requestAnimationFrame(() => {
      const auto = ref.current?.querySelector<HTMLElement>("[data-autofocus]");
      (auto ?? focusables()[0] ?? ref.current)?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "Tab") {
        const els = focusables();
        if (!els.length) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (--openCount === 0) document.documentElement.style.overflow = "";
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn("absolute flex flex-col bg-background shadow-[var(--shadow-overlay)] outline-none", panel[side], className)}
      >
        {side === "bottom" && <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border-strong" aria-hidden />}
        {!hideHeader && (
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <button onClick={onClose} className="-mr-2 grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-surface-2" aria-label={t.common.close}>
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="shrink-0 border-t border-border bg-background px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
