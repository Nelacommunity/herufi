import Link from "next/link";
import { Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { OrderStatusBadge } from "@/components/account/order-status";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/lib/constants";
import type { OrderStatus } from "@/lib/types";
import { cn, formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Orders" };
const PER_PAGE = 25;

export default async function AdminOrders({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const status = ORDER_STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : null;
  const q = typeof sp.q === "string" ? sp.q.trim().replace(/[%,()]/g, "").slice(0, 80) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let query = supabase.from("orders").select("id, order_number, email, total, status, payment_status, created_at, shipping_address, items:order_items(quantity)", { count: "exact" })
    .order("created_at", { ascending: false }).range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`order_number.ilike.%${q}%,email.ilike.%${q}%`);
  const { data, count } = await query;
  const pages = Math.ceil((count ?? 0) / PER_PAGE);
  const href = (o: Record<string, string | number | null>) => {
    const p = new URLSearchParams();
    const merged = { status, q: q || null, page: null, ...o };
    Object.entries(merged).forEach(([k, v]) => v != null && v !== "" && p.set(k, String(v)));
    return `/admin/orders${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <AdminPageHeader title="Orders" description={`${count ?? 0} orders`} />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[null, ...ORDER_STATUSES].map((s) => (
            <Link key={s ?? "all"} href={href({ status: s })} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", status === s ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground")}>{s ? ORDER_STATUS_LABEL[s] : "All"}</Link>
          ))}
        </div>
        <form className="relative lg:w-72">
          {status && <input type="hidden" name="status" value={status} />}
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Order number or email" className="h-10 w-full rounded-full border border-border-strong bg-surface pl-10 pr-4 text-sm outline-none focus:border-foreground" />
        </form>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-5 py-3 font-medium">Order</th><th className="py-3 font-medium">Date</th><th className="py-3 font-medium">Customer</th><th className="py-3 font-medium">Items</th><th className="py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Total</th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                <td className="px-5 py-3"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_number}</Link></td>
                <td className="py-3 text-muted">{formatDate(o.created_at)}</td>
                <td className="py-3"><p>{(o.shipping_address as { full_name?: string })?.full_name}</p><p className="text-xs text-muted">{o.email}</p></td>
                <td className="py-3 tabular-nums">{(o.items as { quantity: number }[]).reduce((n, i) => n + i.quantity, 0)}</td>
                <td className="py-3"><OrderStatusBadge status={o.status} /></td>
                <td className="px-5 py-3 text-right font-medium tabular-nums">{formatPrice(o.total)}</td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={6} className="px-5 py-16 text-center text-muted">No orders found.</td></tr>}
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
