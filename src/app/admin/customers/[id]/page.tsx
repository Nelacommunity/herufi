import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CustomerStatusToggle } from "@/components/admin/customer-status-toggle";
import { OrderStatusBadge } from "@/components/account/order-status";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Customer" };

export default async function AdminCustomerDetail({ params }: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: c }, { data: orders }, me] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("orders").select("id, order_number, total, status, created_at, items:order_items(quantity)").eq("user_id", id).order("created_at", { ascending: false }),
    getUser(),
  ]);
  if (!c) notFound();
  const valid = (orders ?? []).filter((o) => o.status !== "cancelled");
  const spent = valid.reduce((n, o) => n + Number(o.total), 0);
  const card = "rounded-2xl border border-border bg-surface p-5";

  return (
    <>
      <Link href="/admin/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Customers</Link>
      <AdminPageHeader title={c.full_name ?? c.email ?? "Customer"} description={`${c.email} · joined ${formatDate(c.created_at, "long")}`}
        actions={me?.id !== c.user_id ? <CustomerStatusToggle userId={c.user_id} status={c.status} /> : undefined} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={card}><p className="text-sm text-muted">Orders</p><p className="mt-2 text-2xl font-semibold">{orders?.length ?? 0}</p></div>
        <div className={card}><p className="text-sm text-muted">Total spent</p><p className="mt-2 text-2xl font-semibold tabular-nums">{formatPrice(spent)}</p></div>
        <div className={card}><p className="text-sm text-muted">Average order</p><p className="mt-2 text-2xl font-semibold tabular-nums">{formatPrice(valid.length ? spent / valid.length : 0)}</p></div>
        <div className={card}><p className="text-sm text-muted">Account</p><p className={`mt-2 text-2xl font-semibold capitalize ${c.status === "suspended" ? "text-sale" : ""}`}>{c.status}</p></div>
      </div>
      <section className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <h2 className="px-5 pt-5 font-semibold">Order history</h2>
        <table className="mt-3 w-full min-w-[560px] text-sm">
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="px-5 py-3"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_number}</Link></td>
                <td className="py-3 text-muted">{formatDate(o.created_at)}</td>
                <td className="py-3 text-muted">{(o.items as { quantity: number }[]).reduce((n, i) => n + i.quantity, 0)} items</td>
                <td className="py-3"><OrderStatusBadge status={o.status} /></td>
                <td className="px-5 py-3 text-right font-medium tabular-nums">{formatPrice(o.total)}</td>
              </tr>
            ))}
            {!orders?.length && <tr><td className="px-5 py-10 text-center text-muted">No orders yet.</td></tr>}
          </tbody>
        </table>
      </section>
      <section className={`${card} mt-6 text-sm`}>
        <h2 className="font-semibold">Profile</h2>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div><dt className="text-muted">Phone</dt><dd>{c.phone ?? "—"}</dd></div>
          <div><dt className="text-muted">Marketing emails</dt><dd>{c.marketing_opt_in ? "Subscribed" : "Not subscribed"}</dd></div>
          <div><dt className="text-muted">Role</dt><dd className="capitalize">{c.role}</dd></div>
        </dl>
      </section>
    </>
  );
}
