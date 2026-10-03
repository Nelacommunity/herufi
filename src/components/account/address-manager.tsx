"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAddress, saveAddress, setDefaultAddress } from "@/actions/account";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { TZ_REGIONS } from "@/lib/constants";
import { useI18n } from "@/i18n/client";
import type { Address } from "@/lib/types";

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [pending, start] = useTransition();
  const { t } = useI18n();
  const a = t.account.addresses;

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">{a.title}</h2>
        {addresses.length > 0 && <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> {a.add}</Button>}
      </div>
      {addresses.length ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div key={addr.id} className="flex flex-col rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{addr.label}</p>
                {addr.is_default && <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background">{t.common.default}</span>}
              </div>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{addr.full_name}<br />{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />{addr.city}{addr.region ? `, ${addr.region}` : ""}{addr.postal_code ? ` ${addr.postal_code}` : ""}{addr.phone && <><br />{addr.phone}</>}</p>
              <div className="mt-4 flex flex-wrap gap-1 border-t border-border pt-3">
                <Button size="xs" variant="ghost" onClick={() => setEditing(addr)}><Pencil className="h-3.5 w-3.5" /> {t.common.edit}</Button>
                {!addr.is_default && <Button size="xs" variant="ghost" disabled={pending} onClick={() => start(async () => { await setDefaultAddress(addr.id); })}>{t.common.setAsDefault}</Button>}
                <Button size="xs" variant="ghost" className="text-sale" disabled={pending} onClick={() => start(async () => { const r = await deleteAddress(addr.id); if (r.ok) toast.success(r.message); else toast.error(r.error); })}><Trash2 className="h-3.5 w-3.5" /> {t.common.remove}</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<MapPin />} title={a.empty} description={a.emptyDesc} action={<Button size="lg" onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> {a.add}</Button>} />
      )}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? a.add : a.edit}>
        {editing !== null && <AddressForm address={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </>
  );
}

function AddressForm({ address, onDone }: { address: Address | null; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveAddress, null);
  const { t, locale } = useI18n();
  const c = t.checkout;
  const a = t.account.addresses;
  useEffect(() => { if (state?.ok) { toast.success(state.message); onDone(); } }, [state, onDone]);
  const e = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="grid gap-4 p-5 sm:p-6">
      <input type="hidden" name="id" value={address?.id ?? ""} />
      <Field label={a.label} htmlFor="label" hint={a.labelHint}><Input id="label" name="label" defaultValue={address?.label ?? (locale === "sw" ? "Nyumbani" : "Home")} required /></Field>
      <Field label={c.fullName} htmlFor="full_name" error={e?.full_name && c.errors.name}><Input id="full_name" name="full_name" autoComplete="name" defaultValue={address?.full_name} required /></Field>
      <Field label={c.phone} htmlFor="phone" error={e?.phone && c.errors.phone}><Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="07XX XXX XXX" defaultValue={address?.phone ?? ""} required /></Field>
      <Field label={c.street} htmlFor="line1" error={e?.line1 && c.errors.street}><Input id="line1" name="line1" autoComplete="address-line1" defaultValue={address?.line1} required /></Field>
      <Field label={c.line2} optional htmlFor="line2"><Input id="line2" name="line2" autoComplete="address-line2" defaultValue={address?.line2 ?? ""} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={c.city} htmlFor="city" error={e?.city && c.errors.city}><Input id="city" name="city" autoComplete="address-level2" defaultValue={address?.city} required /></Field>
        <Field label={c.region} htmlFor="region"><Select id="region" name="region" defaultValue={address?.region ?? "Dar es Salaam"}>{TZ_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}</Select></Field>
        <Field label={c.postcode} optional htmlFor="postal_code"><Input id="postal_code" name="postal_code" autoComplete="postal-code" defaultValue={address?.postal_code ?? ""} /></Field>
        <input type="hidden" name="country" value="TZ" />
        <Field label={c.country} htmlFor="country"><Input id="country" value="Tanzania" disabled readOnly /></Field>
      </div>
      <Checkbox name="is_default" defaultChecked={address?.is_default} label={a.useDefault} />
      {state && !state.ok && <p className="text-sm text-sale">{state.error}</p>}
      <Button type="submit" size="lg" loading={pending}>{a.saveAddress}</Button>
    </form>
  );
}
