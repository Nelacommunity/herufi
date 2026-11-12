import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Package, SearchX, Truck, XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { checkOrderPayment, PENDING_ORDER_COOKIE, type PaymentState } from "@/lib/payments";
import { ClearBag } from "@/components/checkout/clear-bag";
import { AutoRefresh } from "@/components/checkout/auto-refresh";
import { getI18n } from "@/i18n/server";
import { fmt, INTL_LOCALE } from "@/i18n/config";
import { formatShipDate } from "@/lib/shipping";
import type { Order } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { robots: { index: false } };

export default async function SuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  const { order: orderParam, cancelled } = await searchParams;
  const orderNumber = typeof orderParam === "string" ? orderParam.slice(0, 32) : null;
  const [user, { t, locale }] = await Promise.all([getUser(), getI18n()]);
  const s = t.checkout.success;

  // Payment state isn't sensitive, so guests (no RLS access) see it too. Checked first: it can
  // settle a pending order (asking Snippe directly) before the details below are read.
  const paymentStatus: PaymentState = orderNumber ? await checkOrderPayment(orderNumber) : "not_found";
  const cardCancelled = cancelled === "1" && paymentStatus === "pending";
  // Only the browser that placed this order clears its bag (not anyone opening an old link).
  const placedHere = (await cookies()).get(PENDING_ORDER_COOKIE)?.value === orderNumber;

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
      {paymentStatus === "paid" ? (
        <div className="text-center animate-fade-up">
          {placedHere && <ClearBag />}
          <CheckCircle2 className="mx-auto h-16 w-16 stroke-[1.25] text-success" />
          <h1 className="mt-6 font-display text-5xl tracking-tight sm:text-6xl">{s.title}</h1>
          <p className="mt-4 text-lg text-muted">{bodyBefore}{orderNumber && <strong className="font-semibold text-foreground">{orderNumber}</strong>}{bodyAfter}</p>
        </div>
      ) : cardCancelled ? (
        <div className="text-center animate-fade-up">
          <XCircle className="mx-auto h-16 w-16 stroke-[1.25] text-muted" />
          <h1 className="mt-6 font-display text-4xl tracking-tight sm:text-5xl">{s.cancelledTitle}</h1>
          <p className="mt-4 text-lg text-muted">{fmt(s.cancelledBody, { number: orderNumber ?? "" })}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/checkout" className={buttonVariants({ size: "lg" })}>{s.tryAgain}</Link>
            <Link href="/help/contact" className={buttonVariants({ size: "lg", variant: "secondary" })}>{s.contact}</Link>
          </div>
        </div>
      ) : paymentStatus === "pending" ? (
        <div className="text-center animate-fade-up" role="status">
          <AutoRefresh intervalMs={5000} />
          <Loader2 className="mx-auto h-16 w-16 animate-spin stroke-[1.25] text-muted" />
          <h1 className="mt-6 font-display text-4xl tracking-tight sm:text-5xl">{s.pendingTitle}</h1>
          <p className="mt-4 text-lg text-muted">{fmt(s.pendingBody, { number: orderNumber ?? "" })}</p>
        </div>
      ) : paymentStatus === "not_found" ? (
        <div className="text-center animate-fade-up">
          <SearchX className="mx-auto h-16 w-16 stroke-[1.25] text-muted" />
          <h1 className="mt-6 font-display text-4xl tracking-tight sm:text-5xl">{s.notFoundTitle}</h1>
          <p className="mt-4 text-lg text-muted">{s.notFoundBody}</p>
          <Link href={user ? "/account/orders" : "/login?next=/account/orders"} className={buttonVariants({ size: "lg", className: "mt-8" })}>{s.myOrders}</Link>
        </div>
      ) : paymentStatus === "error" ? (
        <div className="text-center animate-fade-up" role="alert">
          <AlertCircle className="mx-auto h-16 w-16 stroke-[1.25] text-muted" />
          <h1 className="mt-6 font-display text-4xl tracking-tight sm:text-5xl">{s.errorTitle}</h1>
          <p className="mt-4 text-lg text-muted">{fmt(s.errorBody, { number: orderNumber ?? "" })}</p>
          <Link href="/help/contact" className={buttonVariants({ size: "lg", variant: "secondary", className: "mt-8" })}>{s.contact}</Link>
        </div>
      ) : (
        <div className="text-center animate-fade-up">
          <XCircle className="mx-auto h-16 w-16 stroke-[1.25] text-sale" />
          <h1 className="mt-6 font-display text-4xl tracking-tight sm:text-5xl">{s.failedTitle}</h1>
          <p className="mt-4 text-lg text-muted">{fmt(s.failedBody, { number: orderNumber ?? "" })}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/checkout" className={buttonVariants({ size: "lg" })}>{s.tryAgain}</Link>
            <Link href="/help/contact" className={buttonVariants({ size: "lg", variant: "secondary" })}>{s.contact}</Link>
          </div>
        </div>
      )}

      {order && paymentStatus === "paid" && (
        <div className="mt-12 rounded-[1.5rem] border border-border p-6 animate-fade-up sm:p-8" style={{ animationDelay: "120ms" }}>
          <div className="grid gap-6 border-b border-border pb-6 text-sm sm:grid-cols-2">
            <div className="flex gap-3"><Truck className="h-5 w-5 shrink-0" /><div><p className="font-medium">{fmt(s.deliveryLabel, { method: delivery?.label ?? "" })}</p><p className="text-muted">{delivery?.eta}</p>{order.ship_date && <p className="mt-1 text-muted">{fmt(t.shipping.batch, { date: formatShipDate(order.ship_date, INTL_LOCALE[locale]) })}</p>}</div></div>
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
            {Number(order.shipping_saved ?? 0) > 0 && <p className="rounded-xl bg-success/10 px-3 py-2 text-center font-medium text-success">{fmt(t.shipping.youSaved, { amount: formatPrice(order.shipping_saved) })}</p>}
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
