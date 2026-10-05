import Link from "next/link";
import { ArrowRight, BadgePercent, FolderTree, MessageCircle, Package, Ship, ShoppingCart, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { createClient } from "@/lib/supabase/server";
import { can, canAny, PERMISSIONS, ROLE_LABEL, type StaffRole } from "@/lib/permissions";
import type { Profile } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

/** Admin home for staff without the dashboard permission: what they can do, and how their discount codes are performing. */
export async function StaffHome({ profile, denied }: { profile: Profile; denied: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_coupon_report");
  const codes = (data ?? []) as { id: string; code: string; orders: number; revenue: number; discount_given: number; assigned_admin_id: string | null }[];
  const mine = codes.filter((c) => c.assigned_admin_id === profile.user_id);
  const orders = mine.reduce((n, c) => n + Number(c.orders), 0);
  const revenue = mine.reduce((n, c) => n + Number(c.revenue), 0);
  const links = [
    { href: "/admin/orders", label: "Orders", icon: ShoppingCart, show: can(profile, "orders.view") },
    { href: "/admin/products", label: "Products", icon: Package, show: canAny(profile, "products.create", "products.edit", "products.delete", "questions.answer") },
    { href: "/admin/categories", label: "Categories", icon: FolderTree, show: can(profile, "categories.manage") },
    { href: "/admin/customers", label: "Customers", icon: Users, show: can(profile, "customers.view") },
    { href: "/admin/discounts", label: "Discounts", icon: BadgePercent, show: true },
    { href: "/admin/shipping", label: "Shipping", icon: Ship, show: can(profile, "shipping.manage") },
  ].filter((l) => l.show);
  const card = "rounded-2xl border border-border bg-surface p-5";

  return (
    <>
      {denied && <p className="mb-6 rounded-xl bg-sale-soft px-4 py-3 text-sm text-sale">You don&apos;t have permission to open that page. Ask a super admin if you need access.</p>}
      <AdminPageHeader title={`Welcome${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`} description={`${ROLE_LABEL[profile.role as StaffRole]} · ${profile.permissions.length} permission${profile.permissions.length === 1 ? "" : "s"}`} />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={card}><p className="text-sm text-muted">Your codes</p><p className="mt-2 text-2xl font-semibold">{mine.length}</p></div>
        <div className={card}><p className="text-sm text-muted">Orders from your codes</p><p className="mt-2 text-2xl font-semibold tabular-nums">{orders}</p></div>
        <div className={`${card} col-span-2`}><p className="text-sm text-muted">Revenue from your codes</p><p className="mt-2 text-2xl font-semibold tabular-nums">{formatPrice(revenue)}</p></div>
      </section>
      {mine.length > 0 && (
        <section className={`${card} mt-6`}>
          <h2 className="font-semibold">Your discount codes</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {mine.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <Link href={`/admin/discounts/${encodeURIComponent(c.code)}`} className="font-mono font-semibold hover:underline">{c.code}</Link>
                <span className="flex-1 text-muted">{c.orders} orders</span>
                <span className="tabular-nums">{formatPrice(c.revenue)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`${card} flex items-center gap-3 hover:border-foreground`}>
            <Icon className="h-5 w-5" /><span className="flex-1 font-medium">{label}</span><ArrowRight className="h-4 w-4 text-muted" />
          </Link>
        ))}
        {can(profile, "questions.answer") && (
          <div className={`${card} flex items-center gap-3 text-sm text-muted`}><MessageCircle className="h-5 w-5" /> Answer customer questions from each product&apos;s page.</div>
        )}
      </section>
      <p className="mt-6 text-xs text-subtle">Your permissions: {profile.permissions.map((p) => PERMISSIONS.find((x) => x.key === p)?.label ?? p).join(", ") || "none yet"}.</p>
    </>
  );
}
