"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useStore } from "@/providers/store-provider";
import type { ProductSummary } from "@/lib/types";
import { isInStock } from "@/lib/queries/shared";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

/** Card-level add to bag. Products with options reveal an inline option picker. */
export function QuickAdd({ product }: { product: ProductSummary }) {
  const { addToCart } = useStore();
  const [picking, setPicking] = useState(false);
  const { t } = useI18n();
  const option = product.variants[0] ? (t.optionNames[product.variants[0].name] ?? product.variants[0].name).toLowerCase() : "";
  const inStock = isInStock(product);

  if (!inStock) return null;

  if (picking && product.variants.length) {
    return (
      <div className="absolute inset-x-2 bottom-2 z-10 rounded-xl bg-surface/95 p-2.5 shadow-[var(--shadow-lift)] backdrop-blur animate-scale-in" onClick={(e) => e.preventDefault()}>
        <div className="mb-2 flex items-center justify-between px-0.5">
          <span className="text-xs font-medium">{fmt(t.product.selectOption, { option })}</span>
          <button type="button" onClick={(e) => { e.preventDefault(); setPicking(false); }} className="grid h-6 w-6 place-items-center rounded-full hover:bg-surface-2" aria-label={t.product.closeOptions}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {product.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              disabled={v.stock_quantity <= 0}
              onClick={(e) => { e.preventDefault(); addToCart(product, v, 1); setPicking(false); }}
              className="min-w-10 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-foreground hover:bg-foreground hover:text-background disabled:text-subtle disabled:line-through disabled:hover:border-border-strong disabled:hover:bg-transparent"
            >
              {v.value}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        if (product.variants.length) setPicking(true);
        else addToCart(product, null, 1);
      }}
      className={cn(
        "absolute bottom-3 right-3 z-10 flex h-10 items-center gap-1.5 rounded-full bg-white/95 px-3.5 text-sm font-medium text-neutral-900 shadow-sm backdrop-blur transition-all duration-300 hover:bg-white active:scale-95",
        "lg:translate-y-2 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:focus-visible:translate-y-0 lg:focus-visible:opacity-100",
      )}
      aria-label={fmt(t.product.quickAddAria, { name: product.name })}
    >
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">{t.product.quickAdd}</span>
    </button>
  );
}
