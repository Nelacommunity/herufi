"use client";

import { Star } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("relative inline-flex", className)} aria-hidden>
      <span className="flex text-border-strong">
        {Array.from({ length: 5 }, (_, i) => <Star key={i} style={{ width: size, height: size }} className="fill-current" />)}
      </span>
      <span className="absolute inset-0 flex overflow-hidden text-star" style={{ width: `${(Math.max(0, Math.min(5, value)) / 5) * 100}%` }}>
        {Array.from({ length: 5 }, (_, i) => <Star key={i} style={{ width: size, height: size }} className="shrink-0 fill-current" />)}
      </span>
    </span>
  );
}

export function Rating({ value, count, size = 14, className, showValue = true }: { value: number; count?: number; size?: number; className?: string; showValue?: boolean }) {
  const { t } = useI18n();
  if (!count) return <span className={cn("text-xs text-subtle", className)}>{t.product.noReviews}</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <Stars value={value} size={size} />
      <span className="sr-only">{fmt(t.product.ratedAria, { value: value.toFixed(1), count })}</span>
      {showValue && <span aria-hidden className="font-medium tabular-nums">{value.toFixed(1)}</span>}
      {count != null && <span aria-hidden className="text-muted tabular-nums">({count.toLocaleString("en-US")})</span>}
    </span>
  );
}
