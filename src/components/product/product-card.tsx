"use client";

import Image from "next/image";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PriceDisplay } from "@/components/product/price-display";
import { Rating } from "@/components/product/rating";
import { WishlistButton } from "@/components/product/wishlist-button";
import { QuickAdd } from "@/components/product/quick-add";
import { isInStock } from "@/lib/queries/shared";
import type { ProductSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductCard({ product, priority, sizes = "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw", className }: {
  product: ProductSummary; priority?: boolean; sizes?: string; className?: string;
}) {
  const { t } = useI18n();
  const [primary, secondary] = product.images;
  const inStock = isInStock(product);
  const colorCount = product.variants.filter((v) => v.name === "Color").length;

  return (
    <article className={cn("group relative", className)}>
      <Link href={`/products/${product.slug}`} className="block" aria-label={product.name}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2">
          {primary ? (
            <Image
              src={primary.image_url}
              alt={primary.alt_text || product.name}
              fill
              sizes={sizes}
              priority={priority}
              className={cn(
                "object-cover transition-[transform,opacity] duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]",
                secondary && "lg:group-hover:opacity-0",
                !inStock && "opacity-60",
              )}
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-subtle">{t.product.noImage}</div>
          )}
          {secondary && (
            <Image
              src={secondary.image_url}
              alt=""
              fill
              sizes={sizes}
              loading="lazy"
              className="hidden object-cover opacity-0 transition-[transform,opacity] duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04] lg:block lg:group-hover:opacity-100"
            />
          )}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {!inStock ? (
              <Badge tone="glass">{t.product.soldOut}</Badge>
            ) : product.discount_percent > 0 ? (
              <Badge tone="sale">−{product.discount_percent}%</Badge>
            ) : product.is_new ? (
              <Badge tone="glass">{t.product.new}</Badge>
            ) : null}
          </div>
        </div>
      </Link>
      <WishlistButton productId={product.id} name={product.name} className="absolute right-3 top-3 z-10" />
      <QuickAdd product={product} />

      <div className="mt-3.5 space-y-1 px-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium uppercase tracking-[0.08em] text-muted">{product.brand}</p>
          {colorCount > 1 && <p className="shrink-0 text-xs text-muted">{fmt(t.product.colors, { n: colorCount })}</p>}
        </div>
        <h3 className="line-clamp-2 text-[15px] font-medium leading-snug">
          <Link href={`/products/${product.slug}`} className="hover:underline hover:underline-offset-4" tabIndex={-1}>{product.name}</Link>
        </h3>
        <Rating value={product.rating} count={product.review_count} size={12} className="text-xs" />
        <PriceDisplay price={product.price} compareAt={product.compare_at_price} className="pt-1" />
      </div>
    </article>
  );
}
