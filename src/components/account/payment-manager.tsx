"use client";

import { useState, useTransition } from "react";
import { CreditCard, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addPaymentMethod, deletePaymentMethod, setDefaultPaymentMethod } from "@/actions/account";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { cardBrand, luhn } from "@/lib/validation";
import type { PaymentMethod } from "@/lib/types";
import { useI18n } from "@/i18n/client";

export function PaymentManager({ methods }: { methods: PaymentMethod[] }) {
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const { t } = useI18n();
  const p = t.account.payments;

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">{p.title}</h2>
        {methods.length > 0 && <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> {p.add}</Button>}
      </div>
      <p className="mt-2 flex items-center gap-2 text-sm text-muted"><Lock className="h-4 w-4 shrink-0" /> {p.onlyStore}</p>
      {methods.length ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {methods.map((m) => {
            const expired = new Date(m.exp_year, m.exp_month) <= new Date();
            return (
              <div key={m.id} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-700 p-5 text-white shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between"><span className="text-sm font-semibold uppercase tracking-wider">{m.brand}</span>{m.is_default && <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs">{t.common.default}</span>}</div>
                <p className="mt-8 font-mono text-lg tracking-[0.2em]">•••• •••• •••• {m.last4}</p>
                <div className="mt-3 flex items-end justify-between text-xs text-white/70">
                  <span>{m.cardholder_name}</span>
                  <span className={expired ? "font-semibold text-red-300" : ""}>{expired ? p.expired : p.exp} {String(m.exp_month).padStart(2, "0")}/{String(m.exp_year).slice(-2)}</span>
                </div>
                <div className="mt-4 flex gap-1 border-t border-white/15 pt-3">
                  {!m.is_default && <Button size="xs" variant="ghost" className="text-white hover:bg-white/10" disabled={pending} onClick={() => start(async () => { await setDefaultPaymentMethod(m.id); })}>{t.common.setAsDefault}</Button>}
                  <Button size="xs" variant="ghost" className="text-white hover:bg-white/10" disabled={pending} onClick={() => start(async () => { const r = await deletePaymentMethod(m.id); if (r.ok) toast.success(r.message); else toast.error(r.error); })}><Trash2 className="h-3.5 w-3.5" /> {t.common.remove}</Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<CreditCard />} title={p.empty} description={p.emptyDesc} action={<Button size="lg" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> {p.add}</Button>} />
      )}
      <Sheet open={adding} onClose={() => setAdding(false)} title={p.addTitle}>{adding && <CardForm onDone={() => setAdding(false)} />}</Sheet>
    </>
  );
}

function CardForm({ onDone }: { onDone: () => void }) {
  const [card, setCard] = useState({ number: "", exp: "", name: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const { t } = useI18n();
  const c = t.checkout;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    const [m, y] = card.exp.split("/").map((s) => Number(s.trim()));
    if (!luhn(card.number)) err.number = c.errors.cardNumber;
    if (!m || m > 12 || !y || new Date(2000 + y, m) <= new Date()) err.exp = c.errors.expiry;
    if (card.name.trim().length < 2) err.name = c.errors.cardName;
    setErrors(err);
    if (Object.keys(err).length) return;
    start(async () => {
      const r = await addPaymentMethod({ brand: cardBrand(card.number), last4: card.number.replace(/\D/g, "").slice(-4), exp_month: m, exp_year: 2000 + y, cardholder_name: card.name.trim() });
      if (r.ok) { toast.success(r.message); onDone(); } else toast.error(r.error);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 p-5 sm:p-6">
      <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">{t.account.payments.demo}</p>
      <Field label={c.cardNumber} htmlFor="number" error={errors.number}><Input id="number" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim() })} /></Field>
      <Field label={c.expiry} htmlFor="exp" error={errors.exp}><Input id="exp" inputMode="numeric" autoComplete="cc-exp" placeholder="MM / YY" value={card.exp} onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 4); setCard({ ...card, exp: d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d }); }} /></Field>
      <Field label={c.nameOnCard} htmlFor="cc-name" error={errors.name}><Input id="cc-name" autoComplete="cc-name" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} /></Field>
      <Button type="submit" size="lg" loading={pending}>{t.account.payments.saveCard}</Button>
    </form>
  );
}
