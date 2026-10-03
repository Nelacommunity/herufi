"use client";

import { cn, formatPrice } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

export function PriceDisplay({ price, compareAt, size = "md", showBadge, className }: {
  price: number; compareAt?: number | null; size?: "sm" | "md" | "lg"; showBadge?: boolean; className?: string;
}) {
  const { t } = useI18n();
  const discounted = compareAt != null && compareAt > price;
  const pct = discounted ? Math.floor(((compareAt - price) / compareAt) * 100) : 0;
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span className={cn("font-semibold tabular-nums", discounted && "text-sale", size === "lg" ? "text-2xl sm:text-3xl" : size === "sm" ? "text-sm" : "text-[15px]")}>
        <span className="sr-only">{discounted ? t.product.salePrice : t.product.price} </span>
        {formatPrice(price)}
      </span>
      {discounted && (
        <>
          <span className={cn("text-subtle line-through tabular-nums", size === "lg" ? "text-lg" : "text-sm")}>
            <span className="sr-only">{t.product.originalPrice} </span>{formatPrice(compareAt)}
          </span>
          {showBadge && <span className="rounded-full bg-sale-soft px-2 py-0.5 text-xs font-semibold text-sale">{fmt(t.product.save, { n: pct })}</span>}
        </>
      )}
    </div>
  );
}
