"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, CreditCard, Loader2, Lock, ShoppingBag, Smartphone } from "lucide-react";
import { useStore } from "@/providers/store-provider";
import { getPaymentStatus, placeOrder, startPayment } from "@/actions/checkout";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";
import { readCoupon, useDeliveryPreference, useQuote, writeCoupon } from "@/components/checkout/use-quote";
import { ShippingOptions } from "@/components/shipping/shipping-options";
import { quoteFor, resolveMethod } from "@/lib/shipping";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MOBILE_MONEY, TZ_REGIONS } from "@/lib/constants";
import { isTzMobile, type AddressInput } from "@/lib/validation";
import type { Address } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

type Step = 1 | 2 | 3 | 4 | 5;
type PayKind = "mobile" | "card";

const emptyAddress: AddressInput = { full_name: "", line1: "", line2: "", city: "", region: "Dar es Salaam", postal_code: "", country: "TZ", phone: "" };

export function CheckoutClient({ email: initialEmail, addresses, signedIn }: {
  email: string | null; addresses: Address[]; signedIn: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const c = t.checkout;
  const { ready, activeLines, subtotal, clearCart, applyQuote } = useStore();
  const [step, setStep] = useState<Step>(initialEmail ? 2 : 1);
  const [done, setDone] = useState<Set<Step>>(new Set(initialEmail ? [1] : []));
  const [email, setEmail] = useState(initialEmail ?? "");
  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];
  const [addressId, setAddressId] = useState<string | "new">(defaultAddress?.id ?? "new");
  const [address, setAddress] = useState<AddressInput>(emptyAddress);
  const [saveAddress, setSaveAddress] = useState(true);
  const [preferred, setPreferred] = useDeliveryPreference();
  const [payKind, setPayKind] = useState<PayKind>("mobile");
  const [provider, setProvider] = useState<(typeof MOBILE_MONEY)[number]>("M-Pesa");
  const [mobile, setMobile] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Content depending on the coupon only renders after the store is ready (client-side), so this can't mismatch.
  const [coupon, setCoupon] = useState(() => (typeof window === "undefined" ? "" : readCoupon()));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [placing, startPlacing] = useTransition();
  const [summaryOpen, setSummaryOpen] = useState(false);
  // Set once the order exists; payment can then be retried without placing a second order.
  const [pending, setPending] = useState<{ orderNumber: string; waiting: boolean; timedOut: boolean } | null>(null);
  const attempt = useRef(0);

  // Options don't depend on the chosen method, so switching method re-prices instantly (see quoteFor).
  const { quote: baseQuote, loading } = useQuote(activeLines, "standard", coupon);
  const options = baseQuote?.shipping_options ?? [];
  const delivery = resolveMethod(options, preferred);
  const quote = baseQuote ? quoteFor(baseQuote, delivery) : null;
  useEffect(() => { if (quote) applyQuote(quote.lines); }, [quote, applyQuote]);

  const shippingAddress: AddressInput | null = useMemo(() => {
    if (addressId !== "new") {
      const a = addresses.find((x) => x.id === addressId);
      return a ? { full_name: a.full_name, line1: a.line1, line2: a.line2 ?? "", city: a.city, region: a.region ?? "", postal_code: a.postal_code ?? "", country: a.country, phone: a.phone ?? "" } : null;
    }
    return address;
  }, [addressId, address, addresses]);

  // Only a display label is stored on the order; card details are entered on Snippe's hosted page, never here.
  const payment = useMemo(() => payKind === "mobile"
    ? { brand: provider, last4: mobile.replace(/\D/g, "").slice(-4), exp_month: 12, exp_year: 2099, name: shippingAddress?.full_name ?? "" }
    : { brand: "Card", last4: "", exp_month: 12, exp_year: 2099, name: shippingAddress?.full_name ?? "" },
  [payKind, provider, mobile, shippingAddress]);

  function complete(s: Step) {
    setDone((d) => new Set(d).add(s));
    setStep((Math.min(5, s + 1)) as Step);
    setErrors({});
    requestAnimationFrame(() => document.getElementById(`step-${Math.min(5, s + 1)}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function validateContact() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErrors({ email: c.errors.email });
    complete(1);
  }

  function validateAddress() {
    if (addressId !== "new") return complete(2);
    const e: Record<string, string> = {};
    if (address.full_name.trim().length < 2) e.full_name = c.errors.name;
    if (address.line1.trim().length < 3) e.line1 = c.errors.street;
    if (address.city.trim().length < 2) e.city = c.errors.city;
    if (!isTzMobile(address.phone ?? "")) e.phone = c.errors.phone;
    if (Object.keys(e).length) return setErrors(e);
    complete(2);
  }

  function validatePayment() {
    const e: Record<string, string> = {};
    if (payKind === "mobile") {
      if (!isTzMobile(mobile)) e.mobile = c.errors.mobile;
    } else if (!isTzMobile(shippingAddress?.phone ?? "")) {
      e.phone = c.errors.phone;
    }
    if (Object.keys(e).length) return setErrors(e);
    complete(4);
  }

  async function pay(orderNumber: string) {
    attempt.current += 1;
    const attemptId = `${Date.now().toString(36)}${attempt.current}`.slice(-10);
    const res = await startPayment({ orderNumber, email: email.trim(), kind: payKind, phone: payKind === "mobile" ? mobile : (shippingAddress?.phone ?? ""), attemptId });
    if (!res.ok) { setPending((p) => p && { ...p, waiting: false }); setSubmitError(res.error); return; }
    if (payKind === "card") {
      if (!res.data?.paymentUrl) { setSubmitError(c.errors.generic); return; }
      window.location.assign(res.data.paymentUrl);
      return;
    }
    setPending({ orderNumber, waiting: true, timedOut: false });
  }

  function submit() {
    if (!shippingAddress || !payment) return;
    setSubmitError(null);
    startPlacing(async () => {
      // Retrying after a failed payment start reuses the order that already exists.
      let orderNumber = pending?.orderNumber;
      if (!orderNumber) {
        const res = await placeOrder({
          items: activeLines.map((l) => ({ product_id: l.productId, variant_id: l.variantId, quantity: l.quantity })),
          email: email.trim(),
          address: shippingAddress,
          delivery,
          payment,
          coupon: quote?.coupon_code ?? undefined,
          saveAddress: signedIn && addressId === "new" && saveAddress,
        });
        if (!res.ok) { setSubmitError(res.error); return; }
        orderNumber = res.data!.orderNumber;
        writeCoupon(null);
        clearCart();
        setPending({ orderNumber, waiting: false, timedOut: false });
      }
      await pay(orderNumber);
    });
  }

  // Mobile money: poll our own order row (updated by the signed webhook) until it settles.
  const waitingFor = pending?.waiting ? pending.orderNumber : null;
  useEffect(() => {
    if (!waitingFor) return;
    let stopped = false;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const status = await getPaymentStatus(waitingFor, email);
      if (stopped) return;
      if (status === "paid" || status === "failed") { router.replace(`/checkout/success?order=${encodeURIComponent(waitingFor)}`); return; }
      if (Date.now() - started > 120_000) { setPending((p) => p && { ...p, waiting: false, timedOut: true }); return; }
      timer = setTimeout(tick, 3000);
    };
    timer = setTimeout(tick, 3000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [waitingFor, email, router]);

  if (!ready) {
    return <div className="grid gap-10 lg:grid-cols-[1fr_420px]"><div className="space-y-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div><Skeleton className="h-96 rounded-[1.5rem]" /></div>;
  }
  if (!activeLines.length) {
    return <EmptyState icon={<ShoppingBag />} title={t.cart.empty} description={c.emptyDesc} action={<Link href="/products" className={buttonVariants({ size: "lg" })}>{t.common.continueShopping}</Link>} />;
  }

  const blocked = activeLines.some((l) => l.maxQuantity <= 0 || l.quantity > l.maxQuantity);
  const chosen = options.find((o) => o.method === delivery);
  const methodLabel = t.shipping.methods[delivery]?.label ?? delivery;
  // "... {terms}, {refunds} and {privacy}." → text with three links.
  const agree = c.agree.split(/(\{terms\}|\{refunds\}|\{privacy\})/);
  const agreeLinks: Record<string, [string, string]> = { "{terms}": ["/help/terms", c.termsLink], "{refunds}": ["/help/refunds", c.refundsLink], "{privacy}": ["/help/privacy", c.privacyLink] };

  const summary = (
    <CheckoutSummary quote={quote} loading={loading} shippingLabel={`${t.summary.shipping} (${methodLabel})`} fallbackSubtotal={subtotal} coupon={coupon} onCoupon={(code) => { setCoupon(code); writeCoupon(code || null); }}>
      <ul className="max-h-80 space-y-4 overflow-y-auto border-t border-border-strong pt-5">
        {activeLines.map((l) => (
          <li key={`${l.productId}:${l.variantId}`} className="flex items-center gap-3">
            <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-3">
              {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />}
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">{l.quantity}</span>
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="block truncate font-medium">{l.name}</span>
              {l.variantLabel && <span className="block text-muted">{l.variantLabel}</span>}
            </span>
            <span className="text-sm tabular-nums">{formatPrice(l.unitPrice * l.quantity)}</span>
          </li>
        ))}
      </ul>
    </CheckoutSummary>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:gap-14">
      {/* Mobile summary toggle */}
      <div className="lg:hidden">
        <button onClick={() => setSummaryOpen((o) => !o)} className="flex w-full items-center justify-between rounded-2xl bg-surface-2 px-5 py-4" aria-expanded={summaryOpen}>
          <span className="flex items-center gap-2 text-sm font-medium"><ShoppingBag className="h-4 w-4" /> {summaryOpen ? c.hideSummary : c.showSummary} <ChevronDown className={cn("h-4 w-4 transition-transform", summaryOpen && "rotate-180")} /></span>
          <span className="font-semibold tabular-nums">{formatPrice(quote ? quote.total : subtotal)}</span>
        </button>
        {summaryOpen && <div className="mt-3 animate-fade-in">{summary}</div>}
      </div>

      <div className="space-y-3">
        <StepCard id={1} step={step} done={done} title={c.steps.contact} editLabel={t.common.edit} onEdit={() => setStep(1)} summary={<p>{email}</p>}>
          <Field label={c.email} htmlFor="email" error={errors.email} hint={c.emailHint}>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} onKeyDown={(e) => e.key === "Enter" && validateContact()} />
          </Field>
          {!signedIn && <p className="mt-4 text-sm text-muted">{c.haveAccount} <Link href="/login?next=/checkout" className="font-medium text-foreground underline underline-offset-4">{t.common.signIn}</Link> {c.signInFaster}</p>}
          <Button size="lg" className="mt-6 w-full sm:w-auto" onClick={validateContact}>{c.continueAddress}</Button>
        </StepCard>

        <StepCard id={2} step={step} done={done} title={c.steps.address} editLabel={t.common.edit} onEdit={() => setStep(2)}
          summary={shippingAddress && <p>{shippingAddress.full_name}, {shippingAddress.line1}{shippingAddress.line2 ? `, ${shippingAddress.line2}` : ""}, {shippingAddress.city}{shippingAddress.region ? `, ${shippingAddress.region}` : ""} · {shippingAddress.phone}</p>}>
          {addresses.length > 0 && (
            <div className="mb-6 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={c.savedAddresses}>
              {addresses.map((a) => (
                <OptionCard key={a.id} selected={addressId === a.id} onSelect={() => setAddressId(a.id)}>
                  <p className="font-medium">{a.label}{a.is_default && <span className="ml-2 text-xs text-muted">{t.common.default}</span>}</p>
                  <p className="mt-1 text-sm text-muted">{a.full_name}<br />{a.line1}, {a.city}</p>
                </OptionCard>
              ))}
              <OptionCard selected={addressId === "new"} onSelect={() => setAddressId("new")}><p className="font-medium">{c.useNewAddress}</p></OptionCard>
            </div>
          )}
          {addressId === "new" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2" label={c.fullName} htmlFor="full_name" error={errors.full_name}>
                <Input id="full_name" autoComplete="name" value={address.full_name} onChange={(e) => setAddress({ ...address, full_name: e.target.value })} aria-invalid={Boolean(errors.full_name)} />
              </Field>
              <Field className="sm:col-span-2" label={c.phone} htmlFor="phone" error={errors.phone} hint={c.phoneHint}>
                <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="07XX XXX XXX" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} aria-invalid={Boolean(errors.phone)} />
              </Field>
              <Field className="sm:col-span-2" label={c.street} htmlFor="line1" error={errors.line1}>
                <Input id="line1" autoComplete="address-line1" placeholder="Mikocheni B, Plot 123" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} aria-invalid={Boolean(errors.line1)} />
              </Field>
              <Field className="sm:col-span-2" label={c.line2} optional htmlFor="line2">
                <Input id="line2" autoComplete="address-line2" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
              </Field>
              <Field label={c.city} htmlFor="city" error={errors.city}>
                <Input id="city" autoComplete="address-level2" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} aria-invalid={Boolean(errors.city)} />
              </Field>
              <Field label={c.region} htmlFor="region">
                <Select id="region" autoComplete="address-level1" value={address.region} onChange={(e) => setAddress({ ...address, region: e.target.value })}>
                  {TZ_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label={c.postcode} optional htmlFor="postal_code">
                <Input id="postal_code" autoComplete="postal-code" value={address.postal_code} onChange={(e) => setAddress({ ...address, postal_code: e.target.value })} />
              </Field>
              <Field label={c.country} htmlFor="country">
                <Input id="country" value="Tanzania" disabled readOnly />
              </Field>
              {signedIn && <Checkbox className="sm:col-span-2" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} label={c.saveAddress} />}
            </div>
          )}
          <Button size="lg" className="mt-6 w-full sm:w-auto" onClick={validateAddress}>{c.continueShipping}</Button>
        </StepCard>

        <StepCard id={3} step={step} done={done} title={c.steps.delivery} editLabel={t.common.edit} onEdit={() => setStep(3)} summary={<p>{methodLabel}{chosen && ` · ${fmt(t.shipping.days, { min: chosen.eta_min, max: chosen.eta_max })} · ${chosen.price === 0 ? t.common.free : formatPrice(chosen.price)}`}</p>}>
          <p className="mb-4 text-sm text-muted">{t.shipping.subtitle}</p>
          <ShippingOptions options={options} selected={delivery} onSelect={setPreferred} loading={loading} />
          <p className="mt-4 text-sm text-muted">{t.shipping.allInclude}</p>
          <Button size="lg" className="mt-6 w-full sm:w-auto" disabled={!quote?.shipping_available} onClick={() => complete(3)}>{c.continuePayment}</Button>
        </StepCard>

        <StepCard id={4} step={step} done={done} title={c.steps.payment} editLabel={t.common.edit} onEdit={() => setStep(4)}
          summary={payment && <p className="flex items-center gap-2">{payKind === "mobile" ? <Smartphone className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />} {payKind === "mobile" ? fmt(c.endingIn, { brand: payment.brand, last4: payment.last4 }) : c.card}</p>}>
          <p className="mb-5 flex items-center gap-2 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
            <Lock className="h-4 w-4 shrink-0" /> {c.demoNote}
          </p>
          <div className="mb-6 grid grid-cols-2 rounded-full bg-surface-2 p-1 text-sm font-medium" role="tablist">
            {(["mobile", "card"] as const).map((k) => (
              <button key={k} role="tab" aria-selected={payKind === k} onClick={() => { setPayKind(k); setErrors({}); }}
                className={cn("flex items-center justify-center gap-2 rounded-full py-2.5 transition-all", payKind === k ? "bg-surface shadow-sm" : "text-muted")}>
                {k === "mobile" ? <Smartphone className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                {k === "mobile" ? c.mobileMoney : c.card}
              </button>
            ))}
          </div>

          {payKind === "mobile" ? (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium">{c.provider}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={c.provider}>
                  {MOBILE_MONEY.map((m) => (
                    <button key={m} type="button" role="radio" aria-checked={provider === m} onClick={() => setProvider(m)}
                      className={cn("rounded-xl border px-3 py-3 text-sm font-semibold transition-all", provider === m ? "border-foreground ring-1 ring-foreground" : "border-border-strong hover:border-muted")}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <Field label={c.mobileNumber} htmlFor="mobile" error={errors.mobile} hint={c.mobileHint}>
                <Input id="mobile" type="tel" inputMode="tel" autoComplete="tel" placeholder="07XX XXX XXX" value={mobile} onChange={(e) => setMobile(e.target.value)} aria-invalid={Boolean(errors.mobile)} />
              </Field>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="flex items-start gap-2 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted"><CreditCard className="mt-0.5 h-4 w-4 shrink-0" /> {c.payment.cardNote}</p>
              {errors.phone && <p className="text-sm text-sale" role="alert">{errors.phone}</p>}
            </div>
          )}
          <Button size="lg" className="mt-6 w-full sm:w-auto" onClick={validatePayment}>{c.reviewOrder}</Button>
        </StepCard>

        <StepCard id={5} step={step} done={done} title={c.steps.review} editLabel={t.common.edit} onEdit={() => setStep(5)}>
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {activeLines.map((l) => (
              <li key={`${l.productId}:${l.variantId}`} className="flex items-center gap-4 p-4">
                <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">{l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />}</span>
                <span className="min-w-0 flex-1 text-sm"><span className="block font-medium">{l.name}</span><span className="text-muted">{[l.variantLabel, fmt(c.qty, { n: l.quantity })].filter(Boolean).join(" · ")}</span></span>
                <span className="text-sm font-medium tabular-nums">{formatPrice(l.unitPrice * l.quantity)}</span>
              </li>
            ))}
          </ul>
          {blocked && <p className="mt-4 text-sm text-sale">{c.unavailable} <Link href="/cart" className="underline">{c.updateBag}</Link>.</p>}
          {submitError && <p className="mt-4 rounded-xl bg-sale-soft px-4 py-3 text-sm text-sale" role="alert">{submitError}</p>}
          {pending?.waiting && (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-accent-soft px-4 py-4 text-sm text-accent" role="status">
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
              <div><p className="font-semibold">{c.payment.waitingTitle}</p><p className="mt-1">{fmt(c.payment.waitingBody, { phone: mobile })}</p></div>
            </div>
          )}
          {pending?.timedOut && (
            <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm" role="status">
              {c.payment.timeout}{" "}
              <Link href={`/checkout/success?order=${encodeURIComponent(pending.orderNumber)}`} className="font-medium underline underline-offset-4">{c.payment.checkStatus}</Link>
            </p>
          )}
          <Button size="lg" className="mt-6 h-14 w-full text-base" loading={placing || Boolean(pending?.waiting)} disabled={blocked || !quote || loading || !quote.shipping_available} onClick={submit}>
            <Lock className="h-4 w-4" /> {pending ? c.payment.retry : c.placeOrder}{quote ? ` · ${formatPrice(quote.total)}` : ""}
          </Button>
          <p className="mt-3 text-center text-xs text-muted">
            {agree.map((part, i) => agreeLinks[part] ? <Link key={i} href={agreeLinks[part][0]} className="underline">{agreeLinks[part][1]}</Link> : part)}
          </p>
        </StepCard>
      </div>

      <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">{summary}</aside>
    </div>
  );
}

function StepCard({ id, step, done, title, summary, onEdit, editLabel, children }: {
  id: Step; step: Step; done: Set<Step>; title: string; summary?: ReactNode; onEdit: () => void; editLabel: string; children: ReactNode;
}) {
  const open = step === id;
  const isDone = done.has(id) && !open;
  const locked = !open && !done.has(id);
  return (
    <section id={`step-${id}`} className={cn("scroll-mt-24 rounded-[1.25rem] border p-5 transition-colors duration-300 sm:p-7", open ? "border-foreground/80 bg-surface shadow-[var(--shadow-soft)]" : "border-border")} aria-current={open ? "step" : undefined}>
      <div className="flex items-center justify-between gap-4">
        <h2 className={cn("flex items-center gap-3 text-lg font-semibold", locked && "text-subtle")}>
          <span className={cn("grid h-7 w-7 place-items-center rounded-full text-xs", isDone ? "bg-success text-white" : open ? "bg-foreground text-background" : "bg-surface-2 text-subtle")}>
            {isDone ? <Check className="h-4 w-4" /> : id}
          </span>
          {title}
        </h2>
        {isDone && <button onClick={onEdit} className="text-sm font-medium underline-offset-4 hover:underline">{editLabel}</button>}
      </div>
      {isDone && summary && <div className="mt-2 pl-10 text-sm text-muted">{summary}</div>}
      {open && <div className="mt-6 animate-fade-in">{children}</div>}
    </section>
  );
}

function OptionCard({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect}
      className={cn("flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200", selected ? "border-foreground ring-1 ring-foreground" : "border-border-strong hover:border-muted")}>
      <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors", selected ? "border-foreground bg-foreground" : "border-border-strong")}>
        {selected && <span className="h-2 w-2 rounded-full bg-background" />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}
