import Link from "next/link";
import { Search, Ship } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { OrderStatusBadge } from "@/components/account/order-status";
import { DispatchBatchButton } from "@/components/admin/ship-batch";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { currentBatchDate, formatShipDate, shipCutoff, upcomingBatchDate } from "@/lib/shipping";
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/lib/constants";
import type { OrderStatus } from "@/lib/types";
import { cn, formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Orders" };
const PER_PAGE = 25;

export default async function AdminOrders({ searchParams }: PageProps<"/admin/orders">) {
  const { profile } = await requirePermission("orders.view");
  const sp = await searchParams;
  const status = ORDER_STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : null;
  const q = typeof sp.q === "string" ? sp.q.trim().replace(/[%,()]/g, "").slice(0, 80) : "";
  const batch = typeof sp.batch === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.batch) ? sp.batch : null;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let query = supabase.from("orders").select("id, order_number, email, total, status, payment_status, created_at, ship_date, shipping_address, items:order_items(quantity)", { count: "exact" })
    .order("created_at", { ascending: false }).range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (status) query = query.eq("status", status);
  if (batch) query = query.eq("ship_date", batch);
  if (q) query = query.or(`order_number.ilike.%${q}%,email.ilike.%${q}%`);

  // Batch board: the batch due now (dispatch it) and the one the warehouse is filling.
  const due = currentBatchDate();
  const upcoming = upcomingBatchDate();
  const n = (b: ReturnType<typeof supabase.from>) => b.select("id", { count: "exact", head: true });
  const [{ data, count }, ready, late, packed, awaiting] = await Promise.all([
    query,
    n(supabase.from("orders")).eq("status", "processing").lte("ship_date", due),
    n(supabase.from("orders")).in("status", ["pending", "confirmed"]).lte("ship_date", due),
    n(supabase.from("orders")).eq("status", "processing").eq("ship_date", upcoming),
    n(supabase.from("orders")).in("status", ["pending", "confirmed"]).eq("ship_date", upcoming),
  ]);
  const day = (d: string) => formatShipDate(d, "en-GB", { weekday: "short", day: "numeric", month: "short" });
  const pages = Math.ceil((count ?? 0) / PER_PAGE);
  const href = (o: Record<string, string | number | null>) => {
    const p = new URLSearchParams();
    const merged = { status, batch, q: q || null, page: null, ...o };
    Object.entries(merged).forEach(([k, v]) => v != null && v !== "" && p.set(k, String(v)));
    return `/admin/orders${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <AdminPageHeader title="Orders" description={`${count ?? 0} orders`} />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {(ready.count ?? 0) + (late.count ?? 0) > 0 && (
          <section className="rounded-2xl border border-foreground bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Due now</p>
            <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold"><Ship className="h-5 w-5" /> {day(due)} batch</h2>
            <p className="mt-2 text-sm text-muted"><strong className="text-foreground">{ready.count ?? 0} packed</strong> ready to leave · <strong className="text-foreground">{late.count ?? 0}</strong> not in the warehouse yet (they move to the next batch)</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {can(profile, "orders.update") && <DispatchBatchButton date={due} ready={ready.count ?? 0} waiting={late.count ?? 0} />}
              <Link href={href({ batch: due, status: null })} className={buttonVariants({ variant: "secondary", size: "sm" })}>View orders</Link>
            </div>
          </section>
        )}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Next shipment</p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold"><Ship className="h-5 w-5" /> {day(upcoming)} batch</h2>
          <p className="mt-2 text-sm text-muted"><strong className="text-foreground">{packed.count ?? 0} packed</strong> in the warehouse · <strong className="text-foreground">{awaiting.count ?? 0}</strong> awaiting arrival</p>
          <p className="mt-1 text-xs text-subtle">Orders placed until {day(shipCutoff(upcoming))} join this batch; later ones ship with the following one.</p>
          <Link href={href({ batch: upcoming, status: null })} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-4")}>View orders</Link>
        </section>
      </div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[null, ...ORDER_STATUSES].map((s) => (
            <Link key={s ?? "all"} href={href({ status: s })} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", status === s ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground")}>{s ? ORDER_STATUS_LABEL[s] : "All"}</Link>
          ))}
          {batch && <Link href={href({ batch: null })} className="shrink-0 rounded-full border border-foreground px-3.5 py-1.5 text-sm">Batch {day(batch)} ✕</Link>}
        </div>
        <form className="relative lg:w-72">
          {status && <input type="hidden" name="status" value={status} />}
          {batch && <input type="hidden" name="batch" value={batch} />}
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Order number or email" className="h-10 w-full rounded-full border border-border-strong bg-surface pl-10 pr-4 text-sm outline-none focus:border-foreground" />
        </form>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-5 py-3 font-medium">Order</th><th className="py-3 font-medium">Date</th><th className="py-3 font-medium">Customer</th><th className="py-3 font-medium">Items</th><th className="py-3 font-medium">Ships</th><th className="py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Total</th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                <td className="px-5 py-3"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_number}</Link></td>
                <td className="py-3 text-muted">{formatDate(o.created_at)}</td>
                <td className="py-3"><p>{(o.shipping_address as { full_name?: string })?.full_name}</p><p className="text-xs text-muted">{o.email}</p></td>
                <td className="py-3 tabular-nums">{(o.items as { quantity: number }[]).reduce((n, i) => n + i.quantity, 0)}</td>
                <td className="py-3 text-muted"><Link href={href({ batch: o.ship_date })} className="hover:underline">{day(o.ship_date)}</Link></td>
                <td className="py-3"><OrderStatusBadge status={o.status} /></td>
                <td className="px-5 py-3 text-right font-medium tabular-nums">{formatPrice(o.total)}</td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={7} className="px-5 py-16 text-center text-muted">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-muted">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={href({ page: page - 1 })} className={buttonVariants({ variant: "secondary", size: "sm" })}>Previous</Link>}
            {page < pages && <Link href={href({ page: page + 1 })} className={buttonVariants({ variant: "secondary", size: "sm" })}>Next</Link>}
          </div>
        </div>
      )}
    </>
  );
}
