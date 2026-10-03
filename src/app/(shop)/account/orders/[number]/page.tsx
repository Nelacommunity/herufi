import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard, MapPin, Truck } from "lucide-react";
import { OrderStatusBadge, OrderTimeline } from "@/components/account/order-status";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import type { Order } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/account/orders/[number]">) {
  const { number } = await params;
  const { t } = await getI18n();
  return { title: fmt(t.account.order, { number }) };
}

export default async function OrderDetailPage({ params }: PageProps<"/account/orders/[number]">) {
  const { number } = await params;
  const [supabase, { t, locale }] = await Promise.all([createClient(), getI18n()]);
  const a = t.account;
  const { data } = await supabase.from("orders").select("*, items:order_items(*)").eq("order_number", decodeURIComponent(number)).maybeSingle();
  if (!data) notFound();
  const order = data as Order;
  const delivery = t.checkout.deliveryMethods[order.delivery_method];
  const addr = order.shipping_address;

  return (
    <div className="space-y-8">
      <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {a.allOrders}</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{fmt(a.order, { number: order.order_number })}</h2>
          <p className="mt-1 text-muted">{fmt(a.placedOn, { date: formatDate(order.created_at, "long", locale) })}</p>
        </div>
        <OrderStatusBadge status={order.status} className="text-sm" />
      </div>
      <div className="rounded-2xl border border-border p-5 sm:p-6"><OrderTimeline status={order.status} /></div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface-2 p-5 text-sm"><MapPin className="h-5 w-5" /><p className="mt-3 font-medium">{a.shippingAddress}</p><p className="mt-1 text-muted">{addr.full_name}<br />{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />{addr.city}{addr.region ? `, ${addr.region}` : ""} {addr.postal_code}{addr.phone && <><br />{addr.phone}</>}</p></div>
        <div className="rounded-2xl bg-surface-2 p-5 text-sm"><Truck className="h-5 w-5" /><p className="mt-3 font-medium">{delivery?.label ?? order.delivery_method}</p><p className="mt-1 text-muted">{delivery?.eta}</p></div>
        <div className="rounded-2xl bg-surface-2 p-5 text-sm"><CreditCard className="h-5 w-5" /><p className="mt-3 font-medium">{a.payment}</p><p className="mt-1 text-muted">{fmt(t.checkout.endingIn, { brand: order.payment_method?.brand ?? "", last4: order.payment_method?.last4 ?? "••••" })}<br />{a.paymentStatus[order.payment_status] ?? order.payment_status}</p></div>
      </div>

      <div className="rounded-2xl border border-border">
        <ul className="divide-y divide-border">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 p-4 sm:p-5">
              <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">{i.image_url && <Image src={i.image_url} alt="" fill sizes="64px" className="object-cover" />}</span>
              <div className="min-w-0 flex-1">
                {i.product_slug ? <Link href={`/products/${i.product_slug}`} className="font-medium hover:underline">{i.product_name}</Link> : <p className="font-medium">{i.product_name}</p>}
                <p className="text-sm text-muted">{[i.variant, fmt(t.checkout.qty, { n: i.quantity }), fmt(a.eachPrice, { price: formatPrice(i.price) })].filter(Boolean).join(" · ")}</p>
              </div>
              <p className="font-medium tabular-nums">{formatPrice(i.price * i.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-border p-5 text-sm">
          <div className="flex justify-between"><dt className="text-muted">{t.summary.subtotal}</dt><dd className="tabular-nums">{formatPrice(order.subtotal)}</dd></div>
          {Number(order.discount) > 0 && <div className="flex justify-between text-success"><dt>{t.summary.discount} {order.coupon_code && `(${order.coupon_code})`}</dt><dd className="tabular-nums">−{formatPrice(order.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">{t.summary.shipping}</dt><dd className="tabular-nums">{Number(order.shipping) === 0 ? t.common.free : formatPrice(order.shipping)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">{t.summary.tax}</dt><dd className="tabular-nums">{formatPrice(order.tax)}</dd></div>
          <div className="flex justify-between border-t border-border pt-3 text-base font-semibold"><dt>{t.summary.total}</dt><dd className="tabular-nums">{formatPrice(order.total)}</dd></div>
        </dl>
      </div>
      <p className="text-sm text-muted">{a.needHelp} <Link href="/help/contact" className="font-medium text-foreground underline underline-offset-4">{a.contactSupport}</Link> {a.orReadOur} <Link href="/help/returns" className="font-medium text-foreground underline underline-offset-4">{a.readReturns}</Link>.</p>
    </div>
  );
}
