"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useStore } from "@/providers/store-provider";
import { createClient } from "@/lib/supabase/client";
import { fetchProductsByIds, isInStock } from "@/lib/queries/shared";
import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ProductSummary } from "@/lib/types";
import { useI18n } from "@/i18n/client";
import { fmt, plural } from "@/i18n/config";

export function WishlistPage() {
  const { ready, wishlist, user, toggleWishlist, addToCart } = useStore();
  const { t } = useI18n();
  const w = t.wishlist;
  const [products, setProducts] = useState<ProductSummary[] | null>(null);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);
  const key = wishlist.join(",");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    fetchProductsByIds(createClient(), wishlist)
      .then((p) => { if (!cancelled) { setProducts(p); setError(false); } })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);

  if (error) return <EmptyState title={w.loadError} description={w.loadErrorDesc} action={<Button onClick={() => location.reload()}>{t.common.tryAgain}</Button>} />;
  if (!ready || products === null) return <ProductGridSkeleton count={4} />;
  const visible = products.filter((p) => wishlist.includes(p.id));

  if (!visible.length) {
    return (
      <EmptyState
        icon={<Heart />}
        title={w.empty}
        description={<>{w.emptyDesc}{!user && <> <Link href="/login?next=/wishlist" className="font-medium text-foreground underline underline-offset-4">{t.common.signIn}</Link> {w.emptySignIn}</>}</>}
        action={<Link href="/products?sort=popular" className={buttonVariants({ size: "lg" })}>{w.discover}</Link>}
      />
    );
  }

  return (
    <>
      <p className="mb-8 text-muted">{plural(w.count, visible.length)}{!user && <> · <Link href="/login?next=/wishlist" className="font-medium text-foreground underline underline-offset-4">{t.common.signIn}</Link> {w.signInSync}</>}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
        {visible.map((p) => {
          const inStock = isInStock(p);
          const variant = p.variants.find((v) => v.id === choice[p.id]) ?? null;
          const option = p.variants[0] ? (t.optionNames[p.variants[0].name] ?? p.variants[0].name).toLowerCase() : "";
          return (
            <div key={p.id} className="flex flex-col">
              <ProductCard product={p} />
              <div className="mt-4 space-y-2">
                {p.variants.length > 0 && inStock && (
                  <select aria-label={fmt(w.choose, { option })} value={choice[p.id] ?? ""} onChange={(e) => setChoice({ ...choice, [p.id]: e.target.value })}
                    className="h-10 w-full rounded-full border border-border-strong bg-surface px-4 text-sm outline-none focus:border-foreground">
                    <option value="">{fmt(w.select, { option })}</option>
                    {p.variants.map((v) => <option key={v.id} value={v.id} disabled={v.stock_quantity <= 0}>{v.value}{v.stock_quantity <= 0 ? ` ${w.soldOutOption}` : ""}</option>)}
                  </select>
                )}
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" disabled={!inStock || (p.variants.length > 0 && !variant)} onClick={() => addToCart(p, variant, 1)}>
                    <ShoppingBag className="h-4 w-4" /> {inStock ? t.product.addToBag : t.product.soldOut}
                  </Button>
                  <Button size="icon-sm" variant="secondary" className="h-9 w-9" onClick={() => toggleWishlist(p.id)} aria-label={fmt(t.product.removeFromWishlist, { name: p.name })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
