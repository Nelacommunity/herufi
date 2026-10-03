"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCoupon, saveCoupon } from "@/actions/admin";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { cn, formatDate, formatPrice } from "@/lib/utils";

export type Coupon = {
  id: string; code: string; description: string | null; type: "percentage" | "fixed"; value: number; min_subtotal: number;
  expires_at: string | null; usage_limit: number | null; used_count: number; is_active: boolean;
};

function couponState(c: Coupon) {
  if (!c.is_active) return { label: "Inactive", cls: "bg-surface-2 text-muted" };
  if (c.expires_at && new Date(c.expires_at) < new Date()) return { label: "Expired", cls: "bg-sale-soft text-sale" };
  if (c.usage_limit && c.used_count >= c.usage_limit) return { label: "Used up", cls: "bg-sale-soft text-sale" };
  return { label: "Active", cls: "bg-accent-soft text-success" };
}

export function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <div className="mb-6 flex justify-end"><Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Create discount</Button></div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-5 py-3 font-medium">Code</th><th className="py-3 font-medium">Discount</th><th className="py-3 font-medium">Usage</th><th className="py-3 font-medium">Expires</th><th className="py-3 font-medium">Status</th><th className="px-5 py-3" /></tr>
          </thead>
          <tbody>
            {coupons.map((c) => {
              const s = couponState(c);
              return (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3"><p className="font-mono font-semibold">{c.code}</p><p className="text-xs text-muted">{c.description}</p></td>
                  <td className="py-3">{c.type === "percentage" ? `${Number(c.value)}% off` : `${formatPrice(c.value)} off`}{Number(c.min_subtotal) > 0 && <span className="block text-xs text-muted">Min. {formatPrice(c.min_subtotal)}</span>}</td>
                  <td className="py-3 tabular-nums">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                  <td className="py-3 text-muted">{c.expires_at ? formatDate(c.expires_at) : "Never"}</td>
                  <td className="py-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", s.cls)}>{s.label}</span></td>
                  <td className="px-5 py-3 text-right">
                    <Button size="icon-sm" variant="ghost" onClick={() => setEditing(c)} aria-label={`Edit ${c.code}`}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon-sm" variant="ghost" className="text-sale" disabled={pending} aria-label={`Delete ${c.code}`} onClick={() => {
                      if (!window.confirm(`Delete ${c.code}?`)) return;
                      start(async () => { const r = await deleteCoupon(c.id); if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.error); });
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              );
            })}
            {!coupons.length && <tr><td colSpan={6} className="px-5 py-16 text-center text-muted">No discount codes yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Create discount" : "Edit discount"}>
        {editing !== null && <CouponForm coupon={editing === "new" ? null : editing} onDone={() => { setEditing(null); router.refresh(); }} />}
      </Sheet>
    </>
  );
}

function CouponForm({ coupon, onDone }: { coupon: Coupon | null; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveCoupon, null);
  const [type, setType] = useState(coupon?.type ?? "percentage");
  useEffect(() => { if (state?.ok) { toast.success(state.message); onDone(); } }, [state, onDone]);
  return (
    <form action={action} className="grid gap-4 p-5 sm:p-6">
      <input type="hidden" name="id" value={coupon?.id ?? ""} />
      <Field label="Code" htmlFor="code" hint="Customers enter this at checkout."><Input id="code" name="code" required defaultValue={coupon?.code} className="font-mono uppercase" onChange={(e) => (e.target.value = e.target.value.toUpperCase())} /></Field>
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
