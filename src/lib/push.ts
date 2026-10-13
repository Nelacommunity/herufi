import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * Sends new in-app notifications (migration 0013) to shoppers' phones through the Expo push service.
 * Uses the service-role key, so it only ever runs on the server. Each notification is claimed (pushed_at set)
 * before sending, so overlapping runs never send it twice.
 */
type Row = { id: number; user_id: string; kind: string; product_id: string | null; data: Record<string, unknown> };
type Token = { token: string; user_id: string; locale: "en" | "sw" };

const tsh = (n: unknown) => `TSh ${Math.round(Number(n) || 0).toLocaleString("en-US")}`;

const TEXT: Record<"en" | "sw", Record<string, (d: Record<string, unknown>) => { title: string; body: string }>> = {
  en: {
    price_drop: (d) => ({ title: "Price drop on a saved item", body: `${d.name} is now ${tsh(d.new_price)} (was ${tsh(d.old_price)}).` }),
    back_in_stock: (d) => ({ title: "Back in stock", body: `${d.name} is available again.` }),
    group_joined: (d) => ({ title: "Someone joined your group", body: `${d.joined} of ${d.size} people are in for ${d.name}.` }),
    group_complete: (d) => ({ title: "Your group is complete!", body: `You can now buy ${d.name} for ${tsh(d.price)}.` }),
    checkin_reward: (d) => ({ title: "Streak reward unlocked", body: `Use code ${d.code} on your next order.` }),
  },
  sw: {
    price_drop: (d) => ({ title: "Bei imeshuka", body: `${d.name} sasa ni ${tsh(d.new_price)} (ilikuwa ${tsh(d.old_price)}).` }),
    back_in_stock: (d) => ({ title: "Imerudi dukani", body: `${d.name} inapatikana tena.` }),
    group_joined: (d) => ({ title: "Mtu amejiunga na kikundi chako", body: `Watu ${d.joined} kati ya ${d.size} wamejiunga kwa ${d.name}.` }),
    group_complete: (d) => ({ title: "Kikundi chako kimekamilika!", body: `Sasa unaweza kununua ${d.name} kwa ${tsh(d.price)}.` }),
    checkin_reward: (d) => ({ title: "Zawadi ya mfululizo", body: `Tumia msimbo ${d.code} kwenye oda yako ijayo.` }),
  },
};

/** Where the app opens when the notification is tapped. */
function urlFor(n: Row) {
  if (n.kind === "group_joined" || n.kind === "group_complete") return `/group/${n.data.code}`;
  if (n.kind === "checkin_reward") return "/account/rewards";
  return n.data.slug ? `/product/${n.data.slug}` : "/notifications";
}

export async function sendPendingPushes(): Promise<{ sent: number; skipped?: string }> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !SUPABASE_URL) return { sent: 0, skipped: "SUPABASE_SERVICE_ROLE_KEY is not set" };
  const db = createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const since = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const { data: pending, error } = await db.from("notifications").select("id")
    .is("pushed_at", null).gt("created_at", since).order("created_at").limit(300);
  if (error) throw new Error(error.message);
  if (!pending?.length) return { sent: 0 };

  const { data: claimed, error: claimError } = await db.from("notifications")
    .update({ pushed_at: new Date().toISOString() })
    .in("id", pending.map((p) => p.id)).is("pushed_at", null)
    .select("id, user_id, kind, product_id, data");
  if (claimError) throw new Error(claimError.message);
  const rows = (claimed ?? []) as Row[];
  if (!rows.length) return { sent: 0 };

  const { data: tokens } = await db.from("push_tokens").select("token, user_id, locale")
    .in("user_id", [...new Set(rows.map((r) => r.user_id))]);
  const byUser = new Map<string, Token[]>();
  for (const t of (tokens ?? []) as Token[]) byUser.set(t.user_id, [...(byUser.get(t.user_id) ?? []), t]);

  const messages = rows.flatMap((n) => (byUser.get(n.user_id) ?? []).map((t) => {
    const text = (TEXT[t.locale] ?? TEXT.en)[n.kind]?.(n.data);
    return text ? { to: t.token, sound: "default", title: text.title, body: text.body, data: { url: urlFor(n) } } : null;
  })).filter((m): m is NonNullable<typeof m> => m !== null);

  let sent = 0;
  const dead: string[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) },
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(15_000),
      });
      const json = (await res.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null;
      (json?.data ?? []).forEach((ticket, j) => {
        if (ticket.status === "ok") sent++;
        else if (ticket.details?.error === "DeviceNotRegistered") dead.push(chunk[j].to);
      });
    } catch (e) {
      console.error("[push] Expo request failed", e);
    }
  }
  if (dead.length) await db.from("push_tokens").delete().in("token", dead);
  return { sent };
}
