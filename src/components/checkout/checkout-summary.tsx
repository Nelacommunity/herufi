"use client";

import { useState, type ReactNode } from "react";
import { Tag, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Quote } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

function Row({ label, value, loading, className }: { label: ReactNode; value: ReactNode; loading?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{loading ? <Skeleton className="h-4 w-16" /> : value}</dd>
    </div>
  );
}

export function CheckoutSummary({ quote, loading, fallbackSubtotal, coupon, onCoupon, shippingLabel, children, className }: {
  quote: Quote | null; loading: boolean; fallbackSubtotal: number; coupon: string; onCoupon: (code: string) => void;
  shippingLabel?: string; children?: ReactNode; className?: string;
}) {
  const { t } = useI18n();
  const s = t.summary;
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const couponError = coupon && quote?.coupon_message;
  const couponText = (m: string | null | undefined) => {
    if (!m) return "";
    if (m.startsWith("min:")) return fmt(s.coupon.min, { amount: formatPrice(Number(m.slice(4))) });
    return s.coupon[m as keyof typeof s.coupon] ?? s.coupon.invalid;
  };
  const ready = Boolean(quote) && !loading;
  const saved = quote ? Math.max(0, (quote.shipping_list ?? quote.shipping) - quote.shipping) : 0;

  return (
    <div className={cn("rounded-[1.5rem] bg-surface-2 p-6 sm:p-7", className)}>
      <h2 className="text-lg font-semibold">{s.title}</h2>
      <dl className="mt-5 space-y-3 text-[15px]">
        <Row label={s.subtotal} value={formatPrice(quote?.subtotal ?? fallbackSubtotal)} loading={!quote && loading} />
        {quote && quote.discount > 0 && (
          <Row
            className="text-success"
            label={<span className="inline-flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> {s.discount} <span className="rounded bg-success/10 px-1.5 text-xs font-semibold">{quote.coupon_code}</span></span>}
            value={`−${formatPrice(quote.discount)}`}
            loading={loading}
          />
        )}
        <Row
          label={shippingLabel ?? s.shipping}
          value={quote ? (quote.shipping === 0 ? (
            <span className="flex items-center gap-1.5">
              {saved > 0 && <span className="text-sm text-subtle line-through">{formatPrice(quote.shipping_list)}</span>}
              <span className="font-medium text-success">{t.common.free}</span>
            </span>
          ) : formatPrice(quote.shipping)) : "—"}
          loading={!ready}
        />
        <Row label={s.tax} value={quote ? formatPrice(quote.tax) : "—"} loading={!ready} />
        <div className="h-px bg-border-strong" />
        <Row className="text-lg font-semibold" label={s.total} value={quote ? formatPrice(quote.total) : "—"} loading={!ready} />
        {ready && saved > 0 && (
          <p className="rounded-xl bg-success/10 px-3 py-2 text-center text-sm font-medium text-success animate-fade-in">
            {fmt(t.shipping.youSave, { amount: formatPrice(saved) })}
          </p>
        )}
      </dl>

      <div className="mt-5">
        {coupon && !couponError ? (
          <div className="flex items-center justify-between rounded-xl border border-dashed border-success/50 px-3 py-2.5 text-sm">
            <span className="flex items-center gap-2 font-medium text-success"><Tag className="h-4 w-4" /> {fmt(s.applied, { code: coupon })}</span>
            <button onClick={() => onCoupon("")} className="grid h-7 w-7 place-items-center rounded-full hover:bg-surface-3" aria-label={s.removeCode}><X className="h-4 w-4" /></button>
          </div>
        ) : showCode || couponError ? (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) onCoupon(code.trim().toUpperCase()); }}>
            <label htmlFor="coupon" className="sr-only">{s.codePlaceholder}</label>
            <input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={s.codePlaceholder} autoComplete="off"
              className="h-11 min-w-0 flex-1 rounded-full border border-border-strong bg-surface px-4 text-sm uppercase outline-none placeholder:normal-case focus:border-foreground" />
            <Button type="submit" variant="secondary" disabled={!code.trim()}>{t.common.apply}</Button>
          </form>
        ) : (
          <button onClick={() => setShowCode(true)} className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"><Tag className="h-4 w-4" /> {s.addCode}</button>
        )}
        {couponError && <p className="mt-2 text-sm text-sale" role="alert">{couponText(quote?.coupon_message)}</p>}
      </div>

      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
