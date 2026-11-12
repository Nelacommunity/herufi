"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/actions/account";
import { LocationPicker } from "@/components/account/location-picker";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { useStore } from "@/providers/store-provider";
import { TZ_REGIONS } from "@/lib/constants";
import type { Address } from "@/lib/types";
import { useI18n } from "@/i18n/client";

export function WelcomeForm({ next, email, defaults }: {
  next: string;
  email: string;
  defaults: { full_name: string; phone: string; address: Address | null };
}) {
  const [state, action, pending] = useActionState(completeOnboarding, null);
  const { t } = useI18n();
  const { signOut } = useStore();
  const router = useRouter();
  const o = t.onboarding;
  const c = t.checkout;
  const a = defaults.address;
  const e = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">{o.title}</h1>
      <p className="mt-2 text-pretty text-muted">{o.desc}</p>

      <form action={action} className="mt-8 grid gap-4">
        <input type="hidden" name="next" value={next} />
        <Field label={c.fullName} htmlFor="full_name" error={e?.full_name?.[0]}>
          <Input id="full_name" name="full_name" autoComplete="name" defaultValue={defaults.full_name} required minLength={2} />
        </Field>
        <Field label={c.phone} htmlFor="phone" hint={o.phoneHint} error={e?.phone?.[0]}>
          <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="07XX XXX XXX" defaultValue={defaults.phone} required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={o.region} htmlFor="region">
            <Select id="region" name="region" defaultValue={a?.region || "Dar es Salaam"}>
              {TZ_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label={o.city} htmlFor="city" error={e?.city?.[0]}>
            <Input id="city" name="city" autoComplete="address-level2" defaultValue={a?.city ?? ""} required />
          </Field>
        </div>
        <Field label={o.area} htmlFor="line1" error={e?.line1?.[0]}>
          <Input id="line1" name="line1" autoComplete="address-line1" placeholder={o.areaPlaceholder} defaultValue={a?.line1 ?? ""} required />
        </Field>
        <Field label={o.landmark} optional htmlFor="line2">
          <Input id="line2" name="line2" autoComplete="address-line2" placeholder={o.landmarkPlaceholder} defaultValue={a?.line2 ?? ""} />
        </Field>
        <LocationPicker defaultLat={a?.latitude} defaultLng={a?.longitude} />
        {state && !state.ok && <p className="text-sm text-sale" role="alert">{state.error}</p>}
        <Button type="submit" size="lg" className="mt-2 w-full" loading={pending}>{o.submit}</Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {email} · {o.notYou}{" "}
        <button type="button" className="font-medium text-foreground underline underline-offset-4" onClick={async () => { await signOut(); router.push("/"); router.refresh(); }}>
          {t.common.signOut}
        </button>
      </p>
    </div>
  );
}
