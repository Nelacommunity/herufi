"use client";

import { Anchor } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

export function FreeShippingMeter({ subtotal, threshold }: { subtotal: number; threshold: number }) {
  const { t } = useI18n();
  const remaining = Math.max(0, threshold - subtotal);
  const pct = Math.min(100, (subtotal / threshold) * 100);
  const [before, after] = t.cart.awayFromFree.split("{amount}");
  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <p className="flex items-center gap-2 text-sm">
        <Anchor className="h-4 w-4 shrink-0" />
        {remaining > 0 ? (
          <span>{before}<strong className="font-semibold">{formatPrice(remaining)}</strong>{after}</span>
        ) : (
          <span className="font-medium">{t.cart.unlockedFree}</span>
        )}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-[var(--ease-out-expo)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
