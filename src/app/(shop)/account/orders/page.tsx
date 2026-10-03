import Link from "next/link";
import { Package } from "lucide-react";
import { OrderCard } from "@/components/account/order-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { ORDER_STATUSES } from "@/lib/constants";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import type { Order, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.account.nav.orders };
}

export default async function OrdersPage({ searchParams }: PageProps<"/account/orders">) {
  const { status } = await searchParams;
  const filter = ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : null;
  const [supabase, { t }] = await Promise.all([createClient(), getI18n()]);
  let query = supabase.from("orders").select("*, items:order_items(*)").order("created_at", { ascending: false }).limit(50);
  if (filter) query = query.eq("status", filter);
  const { data } = await query;
  const orders = (data ?? []) as Order[];

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">{t.account.nav.orders}</h2>
      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        {[null, ...ORDER_STATUSES].map((s) => (
          <Link key={s ?? "all"} href={s ? `/account/orders?status=${s}` : "/account/orders"}
            className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors", filter === s ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground")}>
            {s ? t.status[s] : t.account.all}
          </Link>
        ))}
      </div>
      {orders.length ? (
        <div className="mt-6 space-y-3">{orders.map((o) => <OrderCard key={o.id} order={o} />)}</div>
      ) : (
        <EmptyState icon={<Package />} title={filter ? fmt(t.account.noStatusOrders, { status: t.status[filter].toLowerCase() }) : t.account.noOrders} description={t.account.noOrdersFull}
          action={<Link href="/products" className={buttonVariants({ size: "lg" })}>{t.cart.startShopping}</Link>} />
      )}
    </div>
  );
}
