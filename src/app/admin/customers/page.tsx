import Link from "next/link";
import { Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDate, formatPrice, initials } from "@/lib/utils";

export const metadata = { title: "Customers" };

export default async function AdminCustomers({ searchParams }: PageProps<"/admin/customers">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().replace(/[%,()]/g, "").slice(0, 80) : "";
  const supabase = await createClient();
  let query = supabase.from("profiles").select("user_id, full_name, email, role, status, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(100);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  const { data: customers, count } = await query;
  const ids = (customers ?? []).map((c) => c.user_id);
  const { data: orders } = ids.length ? await supabase.from("orders").select("user_id, total, created_at").in("user_id", ids).neq("status", "cancelled") : { data: [] };
  const stats = new Map<string, { n: number; spent: number; last: string }>();
  for (const o of orders ?? []) {
    const s = stats.get(o.user_id) ?? { n: 0, spent: 0, last: o.created_at };
    s.n++; s.spent += Number(o.total); if (o.created_at > s.last) s.last = o.created_at;
    stats.set(o.user_id, s);
  }

  return (
    <>
      <AdminPageHeader title="Customers" description={`${count ?? 0} registered accounts`} />
      <form className="relative mb-5 max-w-sm">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder="Search name or email" className="h-10 w-full rounded-full border border-border-strong bg-surface pl-10 pr-4 text-sm outline-none focus:border-foreground" />
      </form>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-5 py-3 font-medium">Customer</th><th className="py-3 font-medium">Joined</th><th className="py-3 font-medium">Orders</th><th className="py-3 font-medium">Total spent</th><th className="px-5 py-3 font-medium">Status</th></tr>
          </thead>
          <tbody>
            {(customers ?? []).map((c) => {
              const s = stats.get(c.user_id);
              return (
                <tr key={c.user_id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                  <td className="px-5 py-3">
                    <Link href={`/admin/customers/${c.user_id}`} className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-xs font-semibold">{initials(c.full_name, c.email)}</span>
                      <span><span className="block font-medium hover:underline">{c.full_name ?? "—"}{c.role === "admin" && <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase">Admin</span>}</span><span className="text-xs text-muted">{c.email}</span></span>
                    </Link>
                  </td>
                  <td className="py-3 text-muted">{formatDate(c.created_at)}</td>
                  <td className="py-3 tabular-nums">{s?.n ?? 0}</td>
                  <td className="py-3 tabular-nums">{formatPrice(s?.spent ?? 0)}</td>
                  <td className="px-5 py-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", c.status === "active" ? "bg-accent-soft text-success" : "bg-sale-soft text-sale")}>{c.status === "active" ? "Active" : "Suspended"}</span></td>
                </tr>
              );
            })}
            {!customers?.length && <tr><td colSpan={5} className="px-5 py-16 text-center text-muted">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
