import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailConfigured, sendEmail } from "@/lib/email";
import { buildOrderEmail, type EmailOrder, type OrderEvent } from "@/lib/order-emails";
import { getShippingRates } from "@/lib/queries/catalog";
import { formatShipDate, orderArrival } from "@/lib/shipping";
import { INTL_LOCALE, isLocale } from "@/i18n/config";
import { SITE_URL } from "@/lib/env";

/** Give up on an email after this many failed attempts. */
const MAX_ATTEMPTS = 5;

/**
 * Sends one order update email (at most once per order + event).
 *
 * The row in order_notifications is created first, so a second trigger for the same event
 * (e.g. the Snippe webhook and the status check both confirming a payment) is a no-op, and
 * failures stay visible to staff and are retried by /api/cron/notifications.
 * `force` re-sends even if it was already sent (staff "Send again").
 * Never throws: email problems must not break checkout or admin actions.
 */
export async function notifyOrder(orderId: string, event: OrderEvent, opts: { force?: boolean } = {}): Promise<void> {
  try {
    if (!emailConfigured()) {
      console.warn("Email: RESEND_API_KEY / EMAIL_FROM not set; skipping", event, orderId);
      return;
    }
    const db = createAdminClient();

    await db.from("order_notifications").upsert({ order_id: orderId, event, channel: "email" }, { onConflict: "order_id,event,channel", ignoreDuplicates: true });
    const { data: row } = await db.from("order_notifications").select("id, status, attempts").eq("order_id", orderId).eq("event", event).eq("channel", "email").maybeSingle();
    if (!row) return;
    if (!opts.force && (row.status === "sent" || row.attempts >= MAX_ATTEMPTS)) return;

    const { data: order } = await db.from("orders")
      .select("id, order_number, email, user_id, locale, status, ship_date, delivery_method, payment_status, total, subtotal, discount, shipping, tax, shipping_address, items:order_items(product_name, variant, quantity, price)")
      .eq("id", orderId).maybeSingle();
    if (!order?.email) return;

    const locale = isLocale(order.locale) ? order.locale : "sw";
    const intl = INTL_LOCALE[locale];
    const rates = await getShippingRates().catch(() => []);
    // An arrival estimate only makes sense while the order is still on its way.
    const arrival = event === "delivered" || event === "cancelled" ? null : orderArrival({ ...order, status: "shipped" }, rates, intl);
    const shipDate = order.ship_date ? formatShipDate(order.ship_date, intl, { weekday: "long", day: "numeric", month: "long" }) : null;
    // Guests can't open the account page; the order status page works for them.
    const link = order.user_id
      ? `${SITE_URL}/account/orders/${encodeURIComponent(order.order_number)}`
      : `${SITE_URL}/checkout/success?order=${encodeURIComponent(order.order_number)}`;

    const email = buildOrderEmail(event, locale, order as unknown as EmailOrder, { shipDate, arrival, link });
    const result = await sendEmail({
      to: order.email,
      ...email,
      idempotencyKey: opts.force ? `${orderId}-${event}-${Date.now()}` : `${orderId}-${event}`,
    });

    await db.from("order_notifications").update(result.ok
      ? { status: "sent", sent_at: new Date().toISOString(), provider_id: result.id, last_error: null, attempts: row.attempts + 1 }
      : { status: "failed", last_error: result.error.slice(0, 500), attempts: result.retryable ? row.attempts + 1 : MAX_ATTEMPTS },
    ).eq("id", row.id);
    if (!result.ok) console.error("Email: order update failed", order.order_number, event, result.error);
  } catch (err) {
    console.error("Email: notifyOrder crashed", orderId, event, err);
  }
}

/** Retries emails that failed or never went out (called by the daily Vercel cron). */
export async function retryPendingNotifications(limit = 50): Promise<{ retried: number }> {
  const db = createAdminClient();
  const { data } = await db.from("order_notifications")
    .select("order_id, event")
    .neq("status", "sent").lt("attempts", MAX_ATTEMPTS)
    .lt("created_at", new Date(Date.now() - 5 * 60_000).toISOString())
    .order("created_at").limit(limit);
  for (const n of data ?? []) await notifyOrder(n.order_id, n.event as OrderEvent);
  return { retried: data?.length ?? 0 };
}
