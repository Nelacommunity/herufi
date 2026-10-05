import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { OrderStatusBadge } from "@/components/account/order-status";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { StaffHome } from "@/components/admin/staff-home";
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/lib/constants";
import type { OrderStatus } from "@/lib/types";
import { cn, formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Overview" };

type Metrics = {
  revenue: number; revenue_prev: number; orders: number; orders_prev: number; customers: number; new_customers: number;
  products: number; low_stock: number; aov: number; repeat_rate: number; cart_to_order: number;
  daily: { day: string; revenue: number; orders: number }[];
  status_breakdown: Partial<Record<OrderStatus, number>>;
  top_products: { name: string; units: number; revenue: number }[];
};

function Delta({ now, prev }: { now: number; prev: number }) {
  if (!prev) return null;
  const pct = ((now - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", up ? "text-success" : "text-sale")}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(pct).toFixed(0)}%
      <span className="sr-only">{up ? "increase" : "decrease"} vs previous 30 days</span>
    </span>
  );
}

export default async function AdminOverview({ searchParams }: PageProps<"/admin">) {
  const { profile } = await requireAdmin();
  const denied = (await searchParams).denied === "1";
  if (!can(profile, "analytics.view")) return <StaffHome profile={profile} denied={denied} />;
  const supabase = await createClient();
  const [{ data: m, error }, recent, lowStock] = await Promise.all([
    supabase.rpc("admin_metrics", { days: 30 }),
    supabase.from("orders").select("id, order_number, email, total, status, created_at").order("created_at", { ascending: false }).limit(6),
    supabase.from("products").select("id, name, stock_quantity").eq("is_active", true).lt("stock_quantity", 10).order("stock_quantity").limit(6),
  ]);
  if (error || !m) throw new Error(error?.message ?? "Could not load metrics");
  const metrics = m as Metrics;
  const totalOrders = Object.values(metrics.status_breakdown).reduce((a, b) => a + (b ?? 0), 0) || 1;

  const tiles = [
    { label: "Revenue", value: formatPrice(metrics.revenue), delta: <Delta now={Number(metrics.revenue)} prev={Number(metrics.revenue_prev)} />, note: "Last 30 days" },
    { label: "Orders", value: metrics.orders.toLocaleString(), delta: <Delta now={metrics.orders} prev={metrics.orders_prev} />, note: "Last 30 days" },
    { label: "Average order value", value: formatPrice(metrics.aov), note: "Excludes cancelled" },
    { label: "Customers", value: metrics.customers.toLocaleString(), note: `${metrics.new_customers} new this month` },
    { label: "Active products", value: metrics.products.toLocaleString(), note: `${metrics.low_stock} low on stock` },
    { label: "Repeat purchase rate", value: `${metrics.repeat_rate}%`, note: "Customers with 2+ orders" },
    { label: "Cart-to-order rate", value: `${metrics.cart_to_order}%`, note: "Signed-in shoppers with a bag" },
  ];

  return (
    <>
      {denied && <p className="mb-6 rounded-xl bg-sale-soft px-4 py-3 text-sm text-sale">You don&apos;t have permission to open that page.</p>}
      <AdminPageHeader title="Overview" description="How the store is performing over the last 30 days." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <div key={t.label} className={cn("rounded-2xl border border-border bg-surface p-5", i === 0 && "col-span-2 lg:col-span-1")}>
            <p className="text-sm text-muted">{t.label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{t.value}</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-subtle">{t.delta}{t.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="mb-6 flex items-baseline justify-between"><h2 className="font-semibold">Daily revenue</h2><span className="text-sm text-muted">{formatPrice(metrics.revenue)} total</span></div>
          <RevenueChart data={metrics.daily.map((d) => ({ ...d, revenue: Number(d.revenue) }))} />
        </section>
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-semibold">Orders by status</h2>
          <ul className="mt-5 space-y-3.5">
            {ORDER_STATUSES.map((s) => {
              const n = metrics.status_breakdown[s] ?? 0;
              return (
                <li key={s}>
                  <Link href={`/admin/orders?status=${s}`} className="group block">
                    <div className="flex justify-between text-sm"><span className="group-hover:underline">{ORDER_STATUS_LABEL[s]}</span><span className="tabular-nums text-muted">{n}</span></div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-foreground/80" style={{ width: `${(n / totalOrders) * 100}%` }} /></div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Recent orders</h2><Link href="/admin/orders" className="text-sm text-muted hover:text-foreground">View all</Link></div>
          <div className="-mx-5 overflow-x-auto sm:-mx-6">
            <table className="w-full min-w-[520px] text-sm">
              <tbody>
                {(recent.data ?? []).map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="py-3 pl-5 sm:pl-6"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_number}</Link><p className="text-xs text-muted">{o.email}</p></td>
                    <td className="py-3 text-muted">{formatDate(o.created_at)}</td>
                    <td className="py-3"><OrderStatusBadge status={o.status} /></td>
                    <td className="py-3 pr-5 text-right font-medium tabular-nums sm:pr-6">{formatPrice(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-semibold">Top products</h2>
            <ol className="mt-4 space-y-3 text-sm">
              {metrics.top_products.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3"><span className="w-4 text-subtle tabular-nums">{i + 1}</span><span className="min-w-0 flex-1 truncate">{p.name}</span><span className="tabular-nums text-muted">{formatPrice(p.revenue)}</span></li>
              ))}
              {!metrics.top_products.length && <li className="text-muted">No sales yet.</li>}
            </ol>
          </section>
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-warning" /> Low stock</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {(lowStock.data ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3"><Link href={`/admin/products/${p.id}`} className="truncate hover:underline">{p.name}</Link><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", p.stock_quantity === 0 ? "bg-sale-soft text-sale" : "bg-surface-2")}>{p.stock_quantity === 0 ? "Out" : p.stock_quantity}</span></li>
              ))}
              {!lowStock.data?.length && <li className="text-muted">Everything is well stocked.</li>}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
