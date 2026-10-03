import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Package, Truck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import type { Order } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { robots: { index: false } };

export default async function SuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  const { order: orderParam } = await searchParams;
  const orderNumber = typeof orderParam === "string" ? orderParam.slice(0, 32) : null;
  const [user, { t }] = await Promise.all([getUser(), getI18n()]);
  const s = t.checkout.success;

  // Signed-in shoppers see the full order (RLS only returns their own orders).
  let order: Order | null = null;
  if (user && orderNumber) {
    const supabase = await createClient();
    const { data } = await supabase.from("orders").select("*, items:order_items(*)").eq("order_number", orderNumber).maybeSingle();
    order = data as Order | null;
  }
  const delivery = order ? t.checkout.deliveryMethods[order.delivery_method] : undefined;
  const [bodyBefore, bodyAfter] = s.body.split("{number}");

  return (
    <div className="container-page max-w-3xl py-12 sm:py-20">
      <div className="text-center animate-fade-up">
        <CheckCircle2 className="mx-auto h-16 w-16 stroke-[1.25] text-success" />
        <h1 className="mt-6 font-display text-5xl tracking-tight sm:text-6xl">{s.title}</h1>
        <p className="mt-4 text-lg text-muted">{bodyBefore}{orderNumber && <strong className="font-semibold text-foreground">{orderNumber}</strong>}{bodyAfter}</p>
      </div>

      {order && (
        <div className="mt-12 rounded-[1.5rem] border border-border p-6 animate-fade-up sm:p-8" style={{ animationDelay: "120ms" }}>
          <div className="grid gap-6 border-b border-border pb-6 text-sm sm:grid-cols-2">
            <div className="flex gap-3"><Truck className="h-5 w-5 shrink-0" /><div><p className="font-medium">{fmt(s.deliveryLabel, { method: delivery?.label ?? "" })}</p><p className="text-muted">{delivery?.eta}</p></div></div>
            <div className="flex gap-3"><Package className="h-5 w-5 shrink-0" /><div><p className="font-medium">{s.shippingTo}</p><p className="text-muted">{order.shipping_address.full_name}, {order.shipping_address.line1}, {order.shipping_address.city}</p></div></div>
          </div>
          <ul className="divide-y divide-border">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-4 py-4">
                <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">{i.image_url && <Image src={i.image_url} alt="" fill sizes="56px" className="object-cover" />}</span>
                <span className="flex-1 text-sm"><span className="block font-medium">{i.product_name}</span><span className="text-muted">{[i.variant, fmt(t.checkout.qty, { n: i.quantity })].filter(Boolean).join(" · ")}</span></span>
                <span className="text-sm tabular-nums">{formatPrice(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t.summary.subtotal}</dt><dd>{formatPrice(order.subtotal)}</dd></div>
            {Number(order.discount) > 0 && <div className="flex justify-between text-success"><dt>{t.summary.discount} ({order.coupon_code})</dt><dd>−{formatPrice(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">{t.summary.shipping}</dt><dd>{Number(order.shipping) === 0 ? t.common.free : formatPrice(order.shipping)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t.summary.tax}</dt><dd>{formatPrice(order.tax)}</dd></div>
            <div className="flex justify-between pt-2 text-base font-semibold"><dt>{t.summary.total}</dt><dd>{formatPrice(order.total)}</dd></div>
          </dl>
        </div>
      )}

      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        {user ? (
          <Link href={orderNumber ? `/account/orders/${orderNumber}` : "/account/orders"} className={buttonVariants({ size: "lg" })}>{s.track}</Link>
        ) : (
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>{s.createAccount}</Link>
        )}
        <Link href="/products" className={buttonVariants({ size: "lg", variant: "secondary" })}>{t.common.continueShopping}</Link>
      </div>
    </div>
  );
}
