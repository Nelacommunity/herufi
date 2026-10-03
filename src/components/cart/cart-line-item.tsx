"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark, ShoppingBag, X } from "lucide-react";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { useStore } from "@/providers/store-provider";
import type { CartLine } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

export function CartLineItem({ line, compact, onNavigate }: { line: CartLine; compact?: boolean; onNavigate?: () => void }) {
  const { setQuantity, removeLine, setSavedForLater } = useStore();
  const { t } = useI18n();
  const c = t.cart;
  const variantLabel = line.variantLabel?.replace(/^([^:]+):/, (_, n: string) => `${t.optionNames[n] ?? n}:`);
  const soldOut = line.maxQuantity <= 0;
  const total = line.unitPrice * line.quantity;

  return (
    <li className="flex gap-4 py-5 animate-fade-in">
      <Link href={`/products/${line.slug}`} onClick={onNavigate} className={cn("relative shrink-0 overflow-hidden rounded-xl bg-surface-2", compact ? "h-24 w-20" : "h-32 w-28 sm:h-36 sm:w-32")}>
        {line.image && <Image src={line.image} alt={line.name} fill sizes="128px" className="object-cover" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted">{line.brand}</p>
            <Link href={`/products/${line.slug}`} onClick={onNavigate} className="line-clamp-2 font-medium leading-snug hover:underline">{line.name}</Link>
            {variantLabel && <p className="mt-0.5 text-sm text-muted">{variantLabel}</p>}
          </div>
          <div className="text-right">
            <p className="font-medium tabular-nums">{formatPrice(total)}</p>
            {line.compareAtPrice && line.compareAtPrice > line.unitPrice && (
              <p className="text-xs text-subtle line-through tabular-nums">{formatPrice(line.compareAtPrice * line.quantity)}</p>
            )}
            {line.quantity > 1 && <p className="text-xs text-muted tabular-nums">{fmt(c.each, { price: formatPrice(line.unitPrice) })}</p>}
          </div>
        </div>

        {soldOut ? (
          <p className="mt-2 text-sm font-medium text-sale">{c.soldOutRemove}</p>
        ) : line.quantity >= line.maxQuantity && line.maxQuantity < 10 ? (
          <p className="mt-2 text-xs text-warning">{fmt(c.onlyLeft, { n: line.maxQuantity })}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          {line.savedForLater ? (
            <button onClick={() => setSavedForLater(line.productId, line.variantId, false)} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
              <ShoppingBag className="h-4 w-4" /> {c.moveToBag}
            </button>
          ) : (
            <QuantitySelector size="sm" value={line.quantity} max={Math.max(1, line.maxQuantity)} onChange={(v) => setQuantity(line.productId, line.variantId, v)} />
          )}
          <div className="flex items-center gap-1">
            {!line.savedForLater && !compact && (
              <button onClick={() => setSavedForLater(line.productId, line.variantId, true)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm text-muted hover:bg-surface-2 hover:text-foreground">
                <Bookmark className="h-4 w-4" /> {c.saveForLater}
              </button>
            )}
            <button onClick={() => removeLine(line.productId, line.variantId)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm text-muted hover:bg-surface-2 hover:text-foreground" aria-label={fmt(c.removeAria, { name: line.name })}>
              <X className="h-4 w-4" /> {!compact && t.common.remove}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
