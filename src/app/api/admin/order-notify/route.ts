import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { orderSms, sendSms } from "@/lib/sms";

/**
 * Called by the Herufi Admin app right after staff change an order's status there. The portal updates the order
 * itself (row-level security applies), so this is where the customer SMS is sent. The caller must be staff with
 * orders.update, and the order must really have just moved to the status they claim, so it can't be used to spam.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const { data: profile } = await db.from("profiles").select("role, status, permissions").eq("user_id", user.id).maybeSingle();
  if (!can(profile, "orders.update")) return NextResponse.json({ ok: false }, { status: 403 });

  const body = await request.json().catch(() => null) as { order_id?: string; from?: string; to?: string } | null;
  const text = body?.to ? orderSms[body.to as keyof typeof orderSms] : undefined;
  if (!body?.order_id || !body.to || body.from === body.to || !text || body.to === "paid") {
    return NextResponse.json({ ok: true, sent: false });
  }

  const { data: order } = await createAdminClient().from("orders")
    .select("order_number, status, updated_at, shipping_address").eq("id", body.order_id).maybeSingle();
  const fresh = order && Date.now() - new Date(order.updated_at).getTime() < 2 * 60_000;
  if (!order || order.status !== body.to || !fresh) return NextResponse.json({ ok: true, sent: false });

  const sent = await sendSms((order.shipping_address as { phone?: string }).phone, text(order.order_number), order.order_number);
  return NextResponse.json({ ok: true, sent });
}
