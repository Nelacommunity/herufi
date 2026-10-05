"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCoupon, saveCoupon } from "@/actions/admin";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { cn, formatDate, formatPrice } from "@/lib/utils";

export type CouponStats = { id: string; orders: number; revenue: number; discount_given: number; last_order_at: string | null; assigned_admin_name: string | null };
export type Coupon = {
  id: string; code: string; description: string | null; type: "percentage" | "fixed"; value: number; min_subtotal: number;
  expires_at: string | null; usage_limit: number | null; used_count: number; is_active: boolean; assigned_admin_id: string | null;
  stats?: CouponStats;
};
export type StaffOption = { user_id: string; full_name: string | null; email: string | null; role: string };

function couponState(c: Coupon) {
  if (!c.is_active) return { label: "Inactive", cls: "bg-surface-2 text-muted" };
  if (c.expires_at && new Date(c.expires_at) < new Date()) return { label: "Expired", cls: "bg-sale-soft text-sale" };
  if (c.usage_limit && c.used_count >= c.usage_limit) return { label: "Used up", cls: "bg-sale-soft text-sale" };
  return { label: "Active", cls: "bg-accent-soft text-success" };
}

export function CouponManager({ coupons, canManage, isSuper, me, staff }: {
  coupons: Coupon[]; canManage: boolean; isSuper: boolean; me: { user_id: string; name: string }; staff: StaffOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [pending, start] = useTransition();
  const editable = (c: Coupon) => canManage && (isSuper || c.assigned_admin_id === me.user_id);

  // Sales by staff member (who brought in the most orders through their codes).
  const byStaff = new Map<string, { name: string; orders: number; revenue: number; codes: number }>();
  for (const c of coupons) {
    const key = c.assigned_admin_id ?? "none";
    const s = byStaff.get(key) ?? { name: c.stats?.assigned_admin_name ?? "Unassigned", orders: 0, revenue: 0, codes: 0 };
    s.orders += Number(c.stats?.orders ?? 0); s.revenue += Number(c.stats?.revenue ?? 0); s.codes++;
    byStaff.set(key, s);
  }
  const leaderboard = [...byStaff.values()].sort((a, b) => b.revenue - a.revenue);

  return (
    <>
      {canManage && <div className="mb-6 flex justify-end"><Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Create discount</Button></div>}

      {(isSuper || canManage) && leaderboard.length > 0 && (
        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {leaderboard.slice(0, 8).map((s) => (
            <div key={s.name} className="rounded-2xl border border-border bg-surface p-4">
              <p className="truncate text-sm font-medium">{s.name}</p>
              <p className="mt-2 text-xl font-semibold tabular-nums">{formatPrice(s.revenue)}</p>
              <p className="text-xs text-muted">{s.orders} orders · {s.codes} code{s.codes === 1 ? "" : "s"}</p>
            </div>
          ))}
        </section>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-5 py-3 font-medium">Code</th><th className="py-3 font-medium">Assigned to</th><th className="py-3 font-medium">Discount</th><th className="py-3 font-medium">Orders</th><th className="py-3 font-medium">Revenue</th><th className="py-3 font-medium">Expires</th><th className="py-3 font-medium">Status</th><th className="px-5 py-3" /></tr>
          </thead>
          <tbody>
            {coupons.map((c) => {
              const s = couponState(c);
              return (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3"><p className="font-mono font-semibold">{c.code}</p><p className="text-xs text-muted">{c.description}</p></td>
                  <td className="py-3">{c.assigned_admin_id === me.user_id ? <span className="font-medium">You</span> : c.stats?.assigned_admin_name ?? <span className="text-muted">Unassigned</span>}</td>
                  <td className="py-3">{c.type === "percentage" ? `${Number(c.value)}% off` : `${formatPrice(c.value)} off`}{Number(c.min_subtotal) > 0 && <span className="block text-xs text-muted">Min. {formatPrice(c.min_subtotal)}</span>}</td>
                  <td className="py-3 tabular-nums"><Link href={`/admin/discounts/${encodeURIComponent(c.code)}`} className="underline-offset-2 hover:underline">{c.stats?.orders ?? 0}</Link>{c.usage_limit ? <span className="text-xs text-muted"> / {c.usage_limit} limit</span> : null}</td>
                  <td className="py-3 tabular-nums">{formatPrice(c.stats?.revenue ?? 0)}{Number(c.stats?.discount_given ?? 0) > 0 && <span className="block text-xs text-muted">−{formatPrice(c.stats!.discount_given)} given</span>}</td>
                  <td className="py-3 text-muted">{c.expires_at ? formatDate(c.expires_at) : "Never"}</td>
                  <td className="py-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", s.cls)}>{s.label}</span></td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <Link href={`/admin/discounts/${encodeURIComponent(c.code)}`} className="mr-1 text-xs text-muted hover:text-foreground">Orders</Link>
                    {editable(c) && <>
                      <Button size="icon-sm" variant="ghost" onClick={() => setEditing(c)} aria-label={`Edit ${c.code}`}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon-sm" variant="ghost" className="text-sale" disabled={pending} aria-label={`Delete ${c.code}`} onClick={() => {
                        if (!window.confirm(`Delete ${c.code}? Its order history stays on past orders.`)) return;
                        start(async () => { const r = await deleteCoupon(c.id); if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.error); });
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </>}
                  </td>
                </tr>
              );
            })}
            {!coupons.length && <tr><td colSpan={8} className="px-5 py-16 text-center text-muted">{canManage ? "No discount codes yet." : "No discount codes are assigned to you yet."}</td></tr>}
          </tbody>
        </table>
      </div>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Create discount" : "Edit discount"}>
        {editing !== null && <CouponForm coupon={editing === "new" ? null : editing} isSuper={isSuper} me={me} staff={staff} onDone={() => { setEditing(null); router.refresh(); }} />}
      </Sheet>
    </>
  );
}

function CouponForm({ coupon, isSuper, me, staff, onDone }: { coupon: Coupon | null; isSuper: boolean; me: { user_id: string; name: string }; staff: StaffOption[]; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveCoupon, null);
  const [type, setType] = useState(coupon?.type ?? "percentage");
  useEffect(() => { if (state?.ok) { toast.success(state.message); onDone(); } }, [state, onDone]);
  return (
    <form action={action} className="grid gap-4 p-5 sm:p-6">
      <input type="hidden" name="id" value={coupon?.id ?? ""} />
      <Field label="Code" htmlFor="code" hint="Customers enter this at checkout."><Input id="code" name="code" required defaultValue={coupon?.code} className="font-mono uppercase" onChange={(e) => (e.target.value = e.target.value.toUpperCase())} /></Field>
      {isSuper ? (
        <Field label="Assigned to" htmlFor="assigned_admin_id" hint="Orders placed with this code count towards this staff member.">
          <Select id="assigned_admin_id" name="assigned_admin_id" defaultValue={coupon?.assigned_admin_id ?? me.user_id}>
            {staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.user_id === me.user_id ? `Me (${s.full_name ?? s.email})` : s.full_name ?? s.email}{s.role === "super_admin" ? " · super admin" : ""}</option>)}
          </Select>
        </Field>
      ) : <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">This code will be assigned to you ({me.name}).</p>}
      <Field label="Description" htmlFor="description" optional><Input id="description" name="description" defaultValue={coupon?.description ?? ""} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type" htmlFor="type"><Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as "percentage" | "fixed")}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></Select></Field>
        <Field label={type === "percentage" ? "Percent off" : "Amount off (TSh)"} htmlFor="value"><Input id="value" name="value" inputMode="decimal" required defaultValue={coupon?.value} /></Field>
        <Field label="Minimum spend (TSh)" htmlFor="min_subtotal"><Input id="min_subtotal" name="min_subtotal" inputMode="decimal" defaultValue={coupon?.min_subtotal ?? 0} /></Field>
        <Field label="Usage limit" htmlFor="usage_limit" optional><Input id="usage_limit" name="usage_limit" inputMode="numeric" defaultValue={coupon?.usage_limit ?? ""} placeholder="Unlimited" /></Field>
      </div>
      <Field label="Expires on" htmlFor="expires_at" optional><Input id="expires_at" name="expires_at" type="date" defaultValue={coupon?.expires_at?.slice(0, 10) ?? ""} /></Field>
      <Checkbox name="is_active" defaultChecked={coupon?.is_active ?? true} label="Active" />
      {state && !state.ok && <p className="text-sm text-sale">{state.error}</p>}
      <Button type="submit" size="lg" loading={pending}>Save discount</Button>
    </form>
  );
}
