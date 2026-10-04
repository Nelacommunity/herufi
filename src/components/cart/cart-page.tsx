"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Anchor, Lock, ShoppingBag } from "lucide-react";
import { useStore } from "@/providers/store-provider";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { FreeShippingMeter } from "@/components/cart/free-shipping-meter";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";
import { readCoupon, useDeliveryPreference, useQuote, writeCoupon } from "@/components/checkout/use-quote";
import { ShippingOptions } from "@/components/shipping/shipping-options";
import { quoteFor, resolveMethod } from "@/lib/shipping";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt, plural } from "@/i18n/config";

export function CartPage() {
  const { ready, activeLines, savedLines, itemCount, subtotal, applyQuote } = useStore();
  const { t } = useI18n();
  const c = t.cart;
  // Content depending on the coupon only renders after the store is ready (client-side), so this can't mismatch.
  const [coupon, setCoupon] = useState(() => (typeof window === "undefined" ? "" : readCoupon()));
  const { quote: baseQuote, loading, error } = useQuote(activeLines, "standard", coupon);
  useEffect(() => { if (baseQuote) applyQuote(baseQuote.lines); }, [baseQuote, applyQuote]);
  const [preferred, setPreferred] = useDeliveryPreference();
  const options = baseQuote?.shipping_options ?? [];
  const delivery = resolveMethod(options, preferred);
  const quote = baseQuote ? quoteFor(baseQuote, delivery) : null;
  // Free sea shipping is applied automatically; show it, or how far away it is when there's a minimum order.
  const sea = options.find((o) => o.method === "sea" && o.available);
  const seaFree = Boolean(sea?.free && sea.list_price > 0);
  const showMeter = Boolean(sea && !sea.free && sea.free_over != null && sea.free_over > 0);

  const blocked = activeLines.some((l) => l.maxQuantity <= 0 || l.quantity > l.maxQuantity);

  if (!ready) {
    return (
      <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">{Array.from({ length: 3 }, (_, i) => <div key={i} className="flex gap-4"><Skeleton className="h-36 w-32 rounded-xl" /><div className="flex-1 space-y-3"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-8 w-28 rounded-full" /></div></div>)}</div>
        <Skeleton className="h-80 rounded-[1.5rem]" />
      </div>
    );
  }

  if (!activeLines.length && !savedLines.length) {
    return (
      <EmptyState
        icon={<ShoppingBag />}
        title={c.empty}
        description={c.emptyDesc}
        action={<><Link href="/products?sort=popular" className={buttonVariants({ size: "lg" })}>{c.shopBestSellers}</Link><Link href="/wishlist" className={buttonVariants({ size: "lg", variant: "secondary" })}>{c.viewWishlist}</Link></>}
      />
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
      <div>
        {activeLines.length > 0 ? (
          <>
            {seaFree && (
              <p className="flex items-center gap-2 rounded-2xl bg-success/10 p-4 text-sm font-medium text-success">
                <Anchor className="h-4 w-4 shrink-0" /> {c.unlockedFree}
                {delivery !== "sea" && <button onClick={() => setPreferred("sea")} className="ml-auto shrink-0 underline underline-offset-4">{t.shipping.methods.sea.label}</button>}
              </p>
            )}
            {showMeter && <FreeShippingMeter subtotal={quote ? quote.subtotal - quote.discount : subtotal} threshold={sea!.free_over!} />}
            <ul className="mt-2 divide-y divide-border border-b border-border">
              {activeLines.map((l) => <CartLineItem key={`${l.productId}:${l.variantId}`} line={l} />)}
            </ul>
          </>
        ) : (
          <div className="rounded-2xl bg-surface-2 p-8 text-center">
            <p className="font-medium">{c.nothingInBag}</p>
            <p className="mt-1 text-sm text-muted">{c.moveSavedBack}</p>
          </div>
        )}

        {savedLines.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-semibold">{c.savedForLater} <span className="text-muted">({savedLines.length})</span></h2>
            <ul className="mt-2 divide-y divide-border">
              {savedLines.map((l) => <CartLineItem key={`${l.productId}:${l.variantId}`} line={l} />)}
            </ul>
          </section>
        )}
      </div>

      {activeLines.length > 0 && (
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <CheckoutSummary
            quote={quote}
            loading={loading}
            fallbackSubtotal={subtotal}
            coupon={coupon}
            onCoupon={(c) => { setCoupon(c); writeCoupon(c || null); }}
            shippingLabel={`${t.summary.shipping} (${t.shipping.methods[delivery]?.label ?? delivery})`}
          >
            {options.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-sm font-medium">{t.shipping.method}</p>
                <ShippingOptions options={options} selected={delivery} onSelect={setPreferred} loading={loading} compact />
              </div>
            )}
            {error && <p className="mb-3 text-sm text-sale">{error}</p>}
            {blocked && <p className="mb-3 text-sm text-sale">{c.unavailable}</p>}
            <Link href="/checkout" aria-disabled={blocked} className={cn(buttonVariants({ size: "lg", className: "h-14 w-full text-base" }), blocked && "pointer-events-none opacity-50")}>
              <Lock className="h-4 w-4" /> {fmt(c.checkoutItems, { items: plural(t.common.items, itemCount) })}
            </Link>
            <p className="mt-4 text-center text-xs text-muted">{c.secureNote}</p>
          </CheckoutSummary>
        </aside>
      )}
    </div>
  );
}
