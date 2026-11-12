import type { Metadata } from "next";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/env";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Payments setup" };
export const dynamic = "force-dynamic";

/** ISO timestamp n days ago (kept outside the component: reading the clock isn't a pure render step). */
function daysAgo(n: number) {
  return new Date(Date.now() - n * 864e5).toISOString();
}

type Check = { label: string; ok: boolean | null; detail: string };

/** Staff-only health check for the Snippe setup: shows what's missing without revealing any secret. */
export default async function PaymentsCheckPage() {
  await requireAdmin();
  const checks: Check[] = [];
  const webhookUrl = process.env.SNIPPE_WEBHOOK_URL || `${SITE_URL}/api/snippe/webhook`;

  checks.push({
    label: "Site address (NEXT_PUBLIC_SITE_URL)",
    ok: SITE_URL.startsWith("https://") && !SITE_URL.includes("localhost"),
    detail: `${SITE_URL}. Snippe sends payment results to ${webhookUrl}, which must be public https.`,
  });

  // Snippe API key: a read-only call (account balance) proves it is accepted.
  const apiKey = process.env.SNIPPE_API_KEY;
  if (!apiKey) {
    checks.push({ label: "Snippe API key (SNIPPE_API_KEY)", ok: false, detail: "Not set. Payments can't start." });
  } else {
    const res = await fetch("https://api.snippe.sh/v1/payments/balance", { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store", signal: AbortSignal.timeout(8000) }).catch(() => null);
    checks.push({
      label: "Snippe API key (SNIPPE_API_KEY)",
      ok: res?.ok ?? false,
      detail: !res ? "Snippe could not be reached from the server." : res.ok ? `Accepted by Snippe (key starts ${apiKey.slice(0, 6)}…).` : `Rejected by Snippe (HTTP ${res.status}). Create a new key in Snippe → Settings → API Keys.`,
    });
  }

  const secret = process.env.SNIPPE_WEBHOOK_SECRET;
  checks.push({
    label: "Webhook secret (SNIPPE_WEBHOOK_SECRET)",
    ok: secret ? (secret.includes("your-") ? false : true) : false,
    detail: !secret ? "Not set: every payment notification from Snippe is rejected, so orders stay pending." : secret.includes("your-") ? "Still the example value from .env.example." : `Set (${secret.length} characters). Must match Snippe → Settings → Webhook Secret exactly.`,
  });

  // Service-role key + migration 0016: expire_unpaid_orders() is granted only to service_role.
  let db: ReturnType<typeof createAdminClient> | null = null;
  try { db = createAdminClient(); } catch { /* reported below */ }
  if (!db) {
    checks.push({ label: "Supabase service role key (SUPABASE_SERVICE_ROLE_KEY)", ok: false, detail: "Not set. The app can't read or update payment status." });
  } else {
    const { error } = await db.rpc("expire_unpaid_orders");
    const missingFn = error?.code === "PGRST202" || /could not find the function|does not exist/i.test(error?.message ?? "");
    checks.push({
      label: "Supabase service role key (SUPABASE_SERVICE_ROLE_KEY)",
      ok: !error || missingFn ? (missingFn ? null : true) : false,
      detail: !error ? "Works." : missingFn ? "Couldn't verify until migration 0016 is applied." : /permission denied/i.test(error.message) ? "This is not the service role key (it looks like the anon/public key). Copy the service_role key from Supabase → Settings → API." : error.message,
    });
    checks.push({ label: "Database migration 0016 (Snippe payments)", ok: !missingFn, detail: missingFn ? "Not applied. Run pnpm db:migrate:prod." : "Applied." });
    const { error: locErr } = await db.from("addresses").select("latitude").limit(1);
    checks.push({ label: "Database migration 0017 (address location)", ok: !locErr, detail: locErr ? "Not applied: the profile form can't save. Run pnpm db:migrate:prod." : "Applied." });
  }

  // Recent activity: shows whether payments start and whether Snippe's notifications arrive.
  const since = daysAgo(7);
  const [orders, events] = db ? await Promise.all([
    db.from("orders").select("order_number, total, payment_status, payment_reference, status, created_at").eq("payment_provider", "snippe").gte("created_at", since).order("created_at", { ascending: false }).limit(15),
    db.from("snippe_webhook_events").select("event_type, received_at").gte("received_at", since).order("received_at", { ascending: false }).limit(10),
  ]) : [null, null];

  const icon = (ok: boolean | null) => ok === null ? <CircleAlert className="h-5 w-5 shrink-0 text-muted" /> : ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <XCircle className="h-5 w-5 shrink-0 text-sale" />;

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments setup</h1>
        <p className="mt-1 text-sm text-muted">Checks the Snippe configuration on this server. No secret values are shown.</p>
      </div>

      <ul className="divide-y divide-border rounded-2xl border border-border">
        {checks.map((c) => (
          <li key={c.label} className="flex gap-3 p-4">
            {icon(c.ok)}
            <div><p className="font-medium">{c.label}</p><p className="mt-0.5 text-sm text-muted">{c.detail}</p></div>
          </li>
        ))}
      </ul>

      <section>
        <h2 className="font-semibold">Snippe orders in the last 7 days</h2>
        <p className="mt-1 text-sm text-muted">&ldquo;No payment started&rdquo; means Snippe rejected the request (see the server logs for the reason). &ldquo;Waiting&rdquo; for a long time means Snippe&apos;s notifications aren&apos;t arriving.</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-surface-2"><tr><th className="px-4 py-2.5">Order</th><th className="px-4 py-2.5">Total</th><th className="px-4 py-2.5">Payment</th><th className="px-4 py-2.5">Placed</th></tr></thead>
            <tbody>
              {(orders?.data ?? []).map((o) => (
                <tr key={o.order_number} className="border-t border-border">
                  <td className="px-4 py-2.5 font-medium">{o.order_number}</td>
                  <td className="px-4 py-2.5 tabular-nums">{formatPrice(o.total)}</td>
                  <td className="px-4 py-2.5">{o.payment_status === "pending" ? (o.payment_reference ? "Waiting for Snippe" : "No payment started") : o.payment_status === "paid" && o.status === "cancelled" ? "Paid after cancel: refund it" : o.payment_status}</td>
                  <td className="px-4 py-2.5 text-muted">{new Date(o.created_at).toLocaleString("en-GB", { timeZone: "Africa/Dar_es_Salaam" })}</td>
                </tr>
              ))}
              {!orders?.data?.length && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">No Snippe orders yet{orders?.error ? ` (${orders.error.message})` : ""}.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-semibold">Notifications received from Snippe (last 7 days)</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {(events?.data ?? []).map((e, i) => <li key={i}><span className="font-medium">{e.event_type}</span> <span className="text-muted">· {new Date(e.received_at).toLocaleString("en-GB", { timeZone: "Africa/Dar_es_Salaam" })}</span></li>)}
          {!events?.data?.length && <li className="text-muted">None. If payments were made, Snippe&apos;s notifications are being rejected or not sent: check the webhook secret.</li>}
        </ul>
      </section>
    </div>
  );
}
