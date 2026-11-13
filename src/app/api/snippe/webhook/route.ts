import { after, NextResponse, type NextRequest } from "next/server";
import { notifyOrder } from "@/lib/notifications";
import { verifyWebhook } from "@/lib/snippe";
import { createAdminClient } from "@/lib/supabase/admin";

const OUTCOMES: Record<string, "paid" | "failed"> = {
  "payment.completed": "paid",
  "payment.failed": "failed",
  "payment.voided": "failed",
  "payment.expired": "failed",
  "payment.cancelled": "failed",
  "payment.canceled": "failed",
  "payment.declined": "failed",
  "payment.rejected": "failed",
  "payment.denied": "failed",
};

/** The ONLY place an order becomes paid. Signature is checked against the raw body before anything is parsed. */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!verifyWebhook(raw, request.headers.get("x-webhook-timestamp"), request.headers.get("x-webhook-signature"))) {
    console.error(process.env.SNIPPE_WEBHOOK_SECRET
      ? "Snippe webhook rejected: signature or timestamp invalid (check SNIPPE_WEBHOOK_SECRET and the server clock)"
      : "Snippe webhook rejected: SNIPPE_WEBHOOK_SECRET is not set");
    return new NextResponse("Invalid webhook", { status: 400 });
  }

  let event: { id?: string; type?: string; data?: { reference?: string } };
  try { event = JSON.parse(raw); } catch { return new NextResponse("Bad payload", { status: 400 }); }

  const outcome = event.type ? OUTCOMES[event.type] : undefined;
  const reference = event.data?.reference;
  if (!event.id || !outcome || !reference) return new NextResponse("OK (ignored)", { status: 200 });

  const db = createAdminClient();
  // Dedupe: Snippe may redeliver. A unique violation means we've handled it.
  const { error: dupe } = await db.from("snippe_webhook_events").insert({ id: event.id, event_type: event.type });
  if (dupe) return new NextResponse("OK (duplicate)", { status: 200 });

  const { data: settled, error } = await db.rpc("settle_order_payment", { p_reference: reference, p_outcome: outcome });
  if (error) {
    console.error("settle_order_payment failed", reference, error);
    // Forget the event id so Snippe's retry can process it.
    await db.from("snippe_webhook_events").delete().eq("id", event.id);
    return new NextResponse("Settlement failed", { status: 500 });
  }

  if (settled === "paid") {
    const { data: order } = await db.from("orders").select("id").eq("payment_reference", reference).maybeSingle();
    if (order) after(() => notifyOrder(order.id, "confirmed"));
  }
  // Money arrived for an order that had already been cancelled (e.g. it expired first): staff must refund or reinstate it.
  if (settled === "late_payment") console.error("Snippe: payment completed for a cancelled order; refund or reinstate it", reference);
  return new NextResponse("OK", { status: 200 });
}
