"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Anchor, Plane, Rocket } from "lucide-react";
import { toast } from "sonner";
import { saveShippingRate } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/input";
import type { ShippingRate } from "@/lib/types";

const META = {
  standard: { label: "Air cargo", icon: Plane, unit: "per kg" },
  express: { label: "Express air", icon: Rocket, unit: "per kg" },
  sea: { label: "Sea freight", icon: Anchor, unit: "per m³" },
} as const;

export function ShippingRateForm({ rate }: { rate: ShippingRate }) {
  const [state, action, pending] = useActionState(saveShippingRate, null);
  const router = useRouter();
  useEffect(() => {
    if (!state) return;
    if (state.ok) { toast.success(state.message); router.refresh(); } else toast.error(state.error);
  }, [state, router]);
  const meta = META[rate.method];
  const Icon = meta.icon;
  const byKg = rate.method !== "sea";
  const id = (k: string) => `${rate.method}-${k}`;

  return (
    <form action={action} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <input type="hidden" name="method" value={rate.method} />
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-semibold"><span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2"><Icon className="h-4 w-4" /></span>{meta.label}</h2>
        <Checkbox name="is_active" defaultChecked={rate.is_active} label="Offered" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Rate, TSh ${meta.unit}`} htmlFor={id("rate")}><Input id={id("rate")} name="rate" inputMode="decimal" required defaultValue={rate.rate_per_kg ?? rate.rate_per_cbm ?? 0} /></Field>
        <Field label="Minimum charge (TSh)" htmlFor={id("min")}><Input id={id("min")} name="min_charge" inputMode="decimal" required defaultValue={rate.min_charge} /></Field>
        {byKg ? (
          <Field label="Volumetric kg per m³" htmlFor={id("vol")} hint="167 = 6000 cm³/kg, 200 = 5000 cm³/kg"><Input id={id("vol")} name="volumetric_kg_per_cbm" inputMode="decimal" required defaultValue={rate.volumetric_kg_per_cbm} /></Field>
        ) : (
          <input type="hidden" name="volumetric_kg_per_cbm" value={rate.volumetric_kg_per_cbm} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min days" htmlFor={id("emin")}><Input id={id("emin")} name="eta_min_days" inputMode="numeric" required defaultValue={rate.eta_min_days} /></Field>
          <Field label="Max days" htmlFor={id("emax")}><Input id={id("emax")} name="eta_max_days" inputMode="numeric" required defaultValue={rate.eta_max_days} /></Field>
        </div>
        {!byKg && (
          <>
            <Field label="Free shipping over (TSh)" htmlFor={id("free")} optional hint="0 = free on every order · empty = always charged"><Input id={id("free")} name="free_over" inputMode="decimal" defaultValue={rate.free_over ?? ""} /></Field>
            <Field label="Free up to (m³)" htmlFor={id("freecbm")} optional hint="Optional cap for bulky orders · empty = no limit"><Input id={id("freecbm")} name="free_max_cbm" inputMode="decimal" defaultValue={rate.free_max_cbm ?? ""} /></Field>
          </>
        )}
      </div>
      <Button type="submit" className="mt-5" loading={pending}>Save {meta.label.toLowerCase()}</Button>
    </form>
  );
}
