"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantitySelector({ value, onChange, min = 1, max = 99, size = "md", className, label = "Quantity" }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; size?: "sm" | "md"; className?: string; label?: string;
}) {
  const btn = cn("grid place-items-center rounded-full transition-colors hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent", size === "sm" ? "h-8 w-8" : "h-11 w-11");
  return (
    <div className={cn("inline-flex items-center rounded-full border border-border-strong bg-surface", className)} role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        <Minus className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
      <span className={cn("text-center font-medium tabular-nums", size === "sm" ? "w-7 text-sm" : "w-9")} aria-live="polite">{value}</span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </div>
  );
}
