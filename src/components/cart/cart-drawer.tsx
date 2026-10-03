"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { FreeShippingMeter } from "@/components/cart/free-shipping-meter";
import { useStore } from "@/providers/store-provider";
import { formatPrice } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt, plural } from "@/i18n/config";

export function CartDrawer() {
  const { cartOpen, closeCart, activeLines, itemCount, subtotal } = useStore();
  const blocked = activeLines.some((l) => l.maxQuantity <= 0);
  const { t } = useI18n();
  const c = t.cart;

  return (
    <Sheet
      open={cartOpen}
      onClose={closeCart}
      title={itemCount ? fmt(c.yourBagCount, { n: itemCount }) : c.yourBag}
      footer={activeLines.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-muted">{c.subtotal}</span>
            <span className="text-lg font-semibold tabular-nums">{formatPrice(subtotal)}</span>
          </div>
          <p className="text-xs text-muted">{c.drawerNote}</p>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/cart" onClick={closeCart} className={buttonVariants({ variant: "secondary", size: "lg" })}>{c.viewBag}</Link>
            <Link href={blocked ? "/cart" : "/checkout"} onClick={closeCart} className={buttonVariants({ size: "lg" })}>{c.checkout}</Link>
          </div>
        </div>
      )}
    >
      {activeLines.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center px-8 py-16 text-center">
          <div className="mb-5 grid h-20 w-20 place-items-center rounded-full bg-surface-2"><ShoppingBag className="h-8 w-8 stroke-[1.5]" /></div>
          <p className="font-display text-3xl">{c.empty}</p>
          <p className="mt-2 text-muted">{c.emptyDrawer}</p>
          <Link href="/products" onClick={closeCart} className={buttonVariants({ className: "mt-8", size: "lg" })}>{c.startShopping}</Link>
        </div>
      ) : (
        <div className="px-5 pt-4 sm:px-6">
          <FreeShippingMeter subtotal={subtotal} />
          <p className="sr-only">{plural(t.common.items, itemCount)}</p>
          <ul className="divide-y divide-border">
            {activeLines.map((l) => <CartLineItem key={`${l.productId}:${l.variantId}`} line={l} compact onNavigate={closeCart} />)}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
