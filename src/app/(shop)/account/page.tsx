import Link from "next/link";
import { Heart, Package, Sparkles } from "lucide-react";
import { ProfileForm } from "@/components/account/profile-form";
import { OrderCard } from "@/components/account/order-card";
import { getProfile, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.account.nav.profile };
}

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const user = await requireUser("/account");
  const [profile, supabase, sp, { t, locale }] = await Promise.all([getProfile(), createClient(), searchParams, getI18n()]);
  const a = t.account;
  const [orders, wishlist] = await Promise.all([
    supabase.from("orders").select("*, items:order_items(*)", { count: "exact" }).order("created_at", { ascending: false }).limit(3),
    supabase.from("wishlist_items").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: a.stats.orders, value: orders.count ?? 0, href: "/account/orders", icon: Package },
    { label: a.stats.saved, value: wishlist.count ?? 0, href: "/wishlist", icon: Heart },
    { label: a.stats.memberSince, value: profile ? formatDate(profile.created_at, "short", locale) : "—", icon: Sparkles },
  ];

  return (
    <div className="space-y-10">
      {sp.password === "updated" && <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">{a.passwordUpdated}</p>}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => {
          const inner = (<><s.icon className="h-5 w-5 text-muted" /><p className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">{s.value}</p><p className="text-sm text-muted">{s.label}</p></>);
          return s.href ? <Link key={s.label} href={s.href} className="rounded-2xl bg-surface-2 p-4 transition-colors hover:bg-surface-3 sm:p-5">{inner}</Link> : <div key={s.label} className="rounded-2xl bg-surface-2 p-4 sm:p-5">{inner}</div>;
        })}
      </div>

      {profile && <ProfileForm profile={profile} email={user.email ?? ""} />}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{a.recentOrders}</h2>
          {(orders.count ?? 0) > 0 && <Link href="/account/orders" className="text-sm font-medium underline-offset-4 hover:underline">{t.common.viewAll}</Link>}
        </div>
        {orders.data?.length ? (
          <div className="space-y-3">{(orders.data as Order[]).map((o) => <OrderCard key={o.id} order={o} />)}</div>
        ) : (
          <div className="rounded-2xl bg-surface-2 p-8 text-center"><p className="font-medium">{a.noOrders}</p><p className="mt-1 text-sm text-muted">{a.noOrdersDesc}</p><Link href="/products" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">{t.cart.startShopping}</Link></div>
        )}
      </section>
    </div>
  );
}
