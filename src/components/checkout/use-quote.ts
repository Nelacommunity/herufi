"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CartLine, DeliveryMethod, Quote } from "@/lib/types";

const COUPON_KEY = "herufi:coupon";

export function readCoupon() {
  try { return sessionStorage.getItem(COUPON_KEY) ?? ""; } catch { return ""; }
}
export function writeCoupon(code: string | null) {
  try { if (code) sessionStorage.setItem(COUPON_KEY, code); else sessionStorage.removeItem(COUPON_KEY); } catch {}
}

/** Authoritative pricing from the quote_order database function, debounced. */
export function useQuote(lines: CartLine[], delivery: DeliveryMethod, coupon: string) {
  const [result, setResult] = useState<{ key: string; quote: Quote | null; error: string | null } | null>(null);
  const items = useMemo(() => lines.map((l) => ({ product_id: l.productId, variant_id: l.variantId, quantity: l.quantity })), [lines]);
  const key = JSON.stringify([items, delivery, coupon]);

  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data, error } = await createClient().rpc("quote_order", { items, delivery_method: delivery, coupon_code: coupon || null });
      if (cancelled) return;
      if (error) setResult((r) => ({ key, quote: r?.quote ?? null, error: "We couldn't update your totals. Please refresh." }));
      else {
        const q = data as Quote;
        setResult({ key, error: null, quote: { ...q, subtotal: Number(q.subtotal), discount: Number(q.discount), shipping: Number(q.shipping), tax: Number(q.tax), total: Number(q.total) } });
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!items.length) return { quote: null, loading: false, error: null };
  // Keep showing the previous quote while a new one loads.
  return { quote: result?.quote ?? null, loading: result?.key !== key, error: result?.error ?? null };
}
