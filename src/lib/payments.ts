import "server-only";
import { after } from "next/server";
import { notifyOrder } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSnippePayment } from "@/lib/snippe";

export type PaymentState = "paid" | "pending" | "failed" | "not_found" | "error";

/**
 * The payment state of an order, for the success page and checkout polling.
 *
 * The signed webhook is the normal way an order becomes paid. If the order is still pending and a
 * payment was started, Snippe is asked directly (authenticated with our API key) and the result is
 * applied through the same settle_order_payment() the webhook uses, so a missed or rejected webhook
 * can't leave a paid order stuck. Never reports "paid" for an order it can't read.
 */
export async function checkOrderPayment(orderNumber: string, email?: string): Promise<PaymentState> {
  let db: ReturnType<typeof createAdminClient>;
  try {
    db = createAdminClient();
  } catch (err) {
    console.error("Payments: SUPABASE_SERVICE_ROLE_KEY is not set", err);
    return "error";
  }

  let query = db.from("orders").select("id, payment_status, payment_reference, total").eq("order_number", orderNumber.slice(0, 32));
  if (email) query = query.eq("email", email.trim().toLowerCase());
  const { data: order, error } = await query.maybeSingle();
  if (error) {
    console.error("Payments: could not read order", orderNumber, error);
    return "error";
  }
  if (!order) return "not_found";
  if (order.payment_status === "paid") return "paid";
  if (order.payment_status === "failed" || order.payment_status === "refunded") return "failed";
  if (!order.payment_reference) return "pending";

  const remote = await getSnippePayment(order.payment_reference);
  if (!remote || remote.status === "pending") return "pending";

  if (remote.status === "completed") {
    // Only settle when the amount Snippe collected matches the order (when Snippe reports it).
    if (remote.amount != null && Math.round(remote.amount) !== Math.round(Number(order.total))) {
      console.error("Payments: amount mismatch", orderNumber, remote.amount, order.total);
      return "pending";
    }
    const { data, error: settleError } = await db.rpc("settle_order_payment", { p_reference: order.payment_reference, p_outcome: "paid" });
    if (settleError) { console.error("Payments: settle (paid) failed", orderNumber, settleError); return "pending"; }
    if (data === "paid") after(() => notifyOrder(order.id, "confirmed"));
    return data === "paid" || data === "already_paid" ? "paid" : "failed";
  }

  const { error: settleError } = await db.rpc("settle_order_payment", { p_reference: order.payment_reference, p_outcome: "failed" });
  if (settleError) { console.error("Payments: settle (failed) failed", orderNumber, settleError); return "pending"; }
  return "failed";
}

/** httpOnly cookie holding the order number this browser last placed (and may still owe payment on). */
export const PENDING_ORDER_COOKIE = "herufi_pending_order";

/**
 * The shopper is checking out again after a failed, cancelled or abandoned payment: give back the
 * stock held by their previous unpaid order. Snippe is asked first, so an order that was in fact
 * paid is marked paid instead of being cancelled.
 */
export async function releaseUnpaidOrder(orderNumber: string): Promise<PaymentState | "cancelled"> {
  try {
    const state = await checkOrderPayment(orderNumber);
    if (state !== "pending") return state;
    const { error } = await createAdminClient().rpc("cancel_unpaid_order", { p_order_number: orderNumber });
    if (error) { console.error("Payments: could not release unpaid order", orderNumber, error); return "error"; }
    return "cancelled";
  } catch (err) {
    console.error("Payments: could not release unpaid order", orderNumber, err);
    return "error";
  }
}

const TEN_MINUTES = 10 * 60_000;

/**
 * Removes failed orders so they don't clutter the dashboard and order lists:
 * 1. releases unpaid checkouts where no payment started within 10 minutes (expire_unpaid_orders),
 * 2. asks Snippe about orders still waiting after 10 minutes (settling them paid or failed),
 * 3. deletes orders that failed more than 10 minutes ago, unless Snippe shows the payment as
 *    completed (then it's recorded as a late payment for staff) or still open (then it waits).
 * Best effort and bounded; never throws.
 */
export async function cleanUpFailedOrders(limit = 20): Promise<{ deleted: number }> {
  let deleted = 0;
  try {
    const db = createAdminClient();
    const cutoff = new Date(Date.now() - TEN_MINUTES).toISOString();
    await db.rpc("expire_unpaid_orders");

    const { data: waiting } = await db.from("orders").select("order_number")
      .eq("payment_status", "pending").eq("status", "pending").not("payment_reference", "is", null)
      .lt("created_at", cutoff).order("created_at").limit(limit);
    for (const o of waiting ?? []) await checkOrderPayment(o.order_number);

    const { data: failed } = await db.from("orders").select("id, order_number, payment_reference")
      .eq("payment_status", "failed").eq("status", "cancelled")
      .lt("updated_at", cutoff).order("updated_at").limit(limit);
    for (const o of failed ?? []) {
      if (o.payment_reference) {
        const remote = await getSnippePayment(o.payment_reference);
        if (!remote || remote.status === "pending") continue; // unknown or still open: never delete
        if (remote.status === "completed") {
          await db.rpc("settle_order_payment", { p_reference: o.payment_reference, p_outcome: "paid" });
          console.error("Payments: failed order was paid after all; kept for staff to refund", o.order_number);
          continue;
        }
      }
      const { data: ok, error } = await db.rpc("delete_failed_order", { p_order_id: o.id });
      if (error) console.error("Payments: could not delete failed order", o.order_number, error);
      else if (ok) deleted++;
    }
  } catch (err) {
    console.error("Payments: clean-up failed", err);
  }
  return { deleted };
}

/** Runs the clean-up but gives up waiting after `ms`, so a slow Snippe never stalls a page. */
export async function cleanUpFailedOrdersQuickly(ms = 4000) {
  await Promise.race([cleanUpFailedOrders(), new Promise((r) => setTimeout(r, ms))]);
}
