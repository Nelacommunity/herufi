"use client";

import { Plane } from "lucide-react";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

export function FreeShippingMeter({ subtotal }: { subtotal: number }) {
  const { t } = useI18n();
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const pct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const [before, after] = t.cart.awayFromFree.split("{amount}");
  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <p className="flex items-center gap-2 text-sm">
        <Plane className="h-4 w-4 shrink-0" />
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
