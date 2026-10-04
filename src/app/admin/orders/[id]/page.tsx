import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard, Mail, MapPin, Truck, User } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { OrderTimeline } from "@/components/account/order-status";
import { createClient } from "@/lib/supabase/server";
import en from "@/i18n/dictionaries/en";
import type { Order } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Order" };

export default async function AdminOrderDetail({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("*, items:order_items(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const order = data as Order;
  const customer = order.user_id ? (await supabase.from("profiles").select("user_id, full_name, email, status").eq("user_id", order.user_id).maybeSingle()).data : null;
  const a = order.shipping_address;
  const card = "rounded-2xl border border-border bg-surface p-5";

  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Orders</Link>
      <AdminPageHeader title={`Order ${order.order_number}`} description={`Placed ${formatDate(order.created_at, "long")} · Updated ${formatDate(order.updated_at)}`} actions={<OrderStatusSelect id={order.id} status={order.status} />} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className={card}><OrderTimeline status={order.status} /></div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <ul className="divide-y divide-border">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 p-4">
                  <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">{i.image_url && <Image src={i.image_url} alt="" fill sizes="56px" className="object-cover" />}</span>
                  <div className="min-w-0 flex-1 text-sm">
                    {i.product_id ? <Link href={`/admin/products/${i.product_id}`} className="font-medium hover:underline">{i.product_name}</Link> : <p className="font-medium">{i.product_name}</p>}
                    <p className="text-muted">{[i.variant, `${formatPrice(i.price)} × ${i.quantity}`].filter(Boolean).join(" · ")}</p>
                  </div>
                  <p className="text-sm font-medium tabular-nums">{formatPrice(i.price * i.quantity)}</p>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-border p-5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatPrice(order.subtotal)}</dd></div>
              {Number(order.discount) > 0 && <div className="flex justify-between"><dt className="text-muted">Discount ({order.coupon_code})</dt><dd className="tabular-nums text-success">−{formatPrice(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="tabular-nums">{formatPrice(order.shipping)}{Number(order.shipping_saved ?? 0) > 0 && <span className="ml-2 text-xs text-success">(free, worth {formatPrice(order.shipping_saved)})</span>}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd className="tabular-nums">{formatPrice(order.tax)}</dd></div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatPrice(order.total)}</dd></div>
            </dl>
          </div>
        </div>
        <div className="space-y-4">
          <section className={card}>
            <h2 className="flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4" /> Customer</h2>
            {customer ? (
              <Link href={`/admin/customers/${customer.user_id}`} className="mt-3 block text-sm hover:underline">{customer.full_name ?? customer.email}</Link>
            ) : <p className="mt-3 text-sm text-muted">Guest checkout</p>}
            <p className="mt-1 flex items-center gap-2 text-sm text-muted"><Mail className="h-3.5 w-3.5" /> {order.email}</p>
          </section>
          <section className={card}>
            <h2 className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4" /> Shipping address</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{a.full_name}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}{a.region ? `, ${a.region}` : ""} {a.postal_code}<br />{a.country}{a.phone && <><br />{a.phone}</>}</p>
          </section>
          <section className={card}>
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Truck className="h-4 w-4" /> Delivery</h2>
            <p className="mt-3 text-sm text-muted">{en.checkout.deliveryMethods[order.delivery_method]?.label ?? order.delivery_method} · {formatPrice(order.shipping)}</p>
          </section>
          <section className={card}>
            <h2 className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="h-4 w-4" /> Payment</h2>
            <p className="mt-3 text-sm text-muted">{order.payment_method?.brand ?? "Card"} ending in {order.payment_method?.last4 ?? "••••"}</p>
            <p className="mt-1 text-sm">Status: <span className="font-medium capitalize">{order.payment_status}</span></p>
          </section>
        </div>
      </div>
    </>
  );
}
