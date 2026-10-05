import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { OrderStatusBadge } from "@/components/account/order-status";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { can } from "@/lib/permissions";
import type { OrderStatus } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Discount orders" };

type Row = { id: string; order_number: string; created_at: string; total: number; discount: number; status: OrderStatus };

export default async function DiscountOrders({ params }: PageProps<"/admin/discounts/[code]">) {
  const { profile } = await requireAdmin();
  const code = decodeURIComponent((await params).code).toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) notFound();
  const supabase = await createClient();
  const [{ data, error }, { data: coupon }] = await Promise.all([
    supabase.rpc("admin_coupon_orders", { p_code: code }),
    supabase.from("coupons").select("code, assigned_admin_id, owner:profiles!coupons_assigned_admin_id_fkey(full_name, email)").eq("code", code).maybeSingle(),
  ]);
  if (error || !coupon) notFound();
  const rows = (data ?? []) as Row[];
  const valid = rows.filter((r) => r.status !== "cancelled");
  const revenue = valid.reduce((n, r) => n + Number(r.total), 0);
  const given = valid.reduce((n, r) => n + Number(r.discount), 0);
  const owner = coupon.owner as unknown as { full_name: string | null; email: string | null } | null;
  const linkOrders = can(profile, "orders.view");
  const card = "rounded-2xl border border-border bg-surface p-5";

  return (
    <>
      <Link href="/admin/discounts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Discounts</Link>
      <AdminPageHeader title={code} description={`Assigned to ${owner?.full_name ?? owner?.email ?? "nobody"}`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={card}><p className="text-sm text-muted">Orders</p><p className="mt-2 text-2xl font-semibold tabular-nums">{valid.length}</p></div>
        <div className={card}><p className="text-sm text-muted">Revenue</p><p className="mt-2 text-2xl font-semibold tabular-nums">{formatPrice(revenue)}</p></div>
        <div className={card}><p className="text-sm text-muted">Discount given</p><p className="mt-2 text-2xl font-semibold tabular-nums">{formatPrice(given)}</p></div>
        <div className={card}><p className="text-sm text-muted">Cancelled</p><p className="mt-2 text-2xl font-semibold tabular-nums">{rows.length - valid.length}</p></div>
      </div>
      <section className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-5 py-3 font-medium">Order</th><th className="py-3 font-medium">Date</th><th className="py-3 font-medium">Status</th><th className="py-3 text-right font-medium">Discount</th><th className="px-5 py-3 text-right font-medium">Total</th></tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{linkOrders ? <Link href={`/admin/orders/${o.id}`} className="hover:underline">{o.order_number}</Link> : o.order_number}</td>
                <td className="py-3 text-muted">{formatDate(o.created_at)}</td>
                <td className="py-3"><OrderStatusBadge status={o.status} /></td>
                <td className="py-3 text-right tabular-nums text-success">−{formatPrice(o.discount)}</td>
                <td className="px-5 py-3 text-right font-medium tabular-nums">{formatPrice(o.total)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="px-5 py-16 text-center text-muted">No orders with this code yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
