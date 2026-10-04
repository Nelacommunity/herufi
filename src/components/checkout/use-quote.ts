"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CartLine, DeliveryMethod, Quote } from "@/lib/types";
import { normalizeOptions } from "@/lib/shipping";

const COUPON_KEY = "herufi:coupon";
const DELIVERY_KEY = "herufi:delivery";
const listeners = new Set<() => void>();

/** The shopper's preferred shipping method, shared by the product page, cart and checkout. */
export function useDeliveryPreference(): [DeliveryMethod, (m: DeliveryMethod) => void] {
  const value = useSyncExternalStore(
    (cb) => { listeners.add(cb); window.addEventListener("storage", cb); return () => { listeners.delete(cb); window.removeEventListener("storage", cb); }; },
    () => { try { return (localStorage.getItem(DELIVERY_KEY) as DeliveryMethod | null) ?? "sea"; } catch { return "sea"; } },
    () => "sea" as DeliveryMethod,
  );
  const set = useCallback((m: DeliveryMethod) => {
    try { localStorage.setItem(DELIVERY_KEY, m); } catch {}
    listeners.forEach((l) => l());
  }, []);
  return [["standard", "express", "sea"].includes(value) ? value : "sea", set];
}

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
        setResult({ key, error: null, quote: {
          ...q,
          subtotal: Number(q.subtotal), discount: Number(q.discount), shipping: Number(q.shipping), tax: Number(q.tax), total: Number(q.total),
          shipping_available: q.shipping_available ?? true,
          shipping_options: normalizeOptions(q.shipping_options),
        } });
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!items.length) return { quote: null, loading: false, error: null };
  // Keep showing the previous quote while a new one loads.
  return { quote: result?.quote ?? null, loading: result?.key !== key, error: result?.error ?? null };
}
