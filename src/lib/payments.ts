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
export async function releaseUnpaidOrder(orderNumber: string): Promise<void> {
  try {
    const state = await checkOrderPayment(orderNumber);
    if (state !== "pending") return;
    const { error } = await createAdminClient().rpc("cancel_unpaid_order", { p_order_number: orderNumber });
    if (error) console.error("Payments: could not release unpaid order", orderNumber, error);
  } catch (err) {
    console.error("Payments: could not release unpaid order", orderNumber, err);
  }
}
