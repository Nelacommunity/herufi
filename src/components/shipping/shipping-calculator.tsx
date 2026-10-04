"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeOptions, resolveMethod } from "@/lib/shipping";
import { useDeliveryPreference } from "@/components/checkout/use-quote";
import { ShippingOptions } from "@/components/shipping/shipping-options";
import { useI18n } from "@/i18n/client";
import { fmt, plural } from "@/i18n/config";
import type { Product, ShippingOption } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

/** Live shipping quote for one product at the chosen quantity. Pricing comes from the shipping_options DB function. */
export function ShippingCalculator({ product, quantity, unitPrice }: { product: Product; quantity: number; unitPrice: number }) {
  const { t } = useI18n();
  const s = t.shipping;
  const [preferred, setPreferred] = useDeliveryPreference();
  const [result, setResult] = useState<{ key: string; options: ShippingOption[]; error: boolean } | null>(null);
  const key = `${product.id}:${quantity}:${unitPrice}`;

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error } = await createClient().rpc("shipping_options", {
        items: [{ product_id: product.id, quantity }],
        discounted_subtotal: unitPrice * quantity,
      });
      if (!cancelled) setResult({ key, options: error ? [] : normalizeOptions(data), error: Boolean(error) });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key, product.id, quantity, unitPrice]);

  const options = result?.options ?? [];
  const selected = resolveMethod(options, preferred);
  const sea = options.find((o) => o.method === "sea" && o.available && o.free_over != null);

  return (
    <section className="mt-8 rounded-2xl border border-border p-4 sm:p-5" aria-labelledby="shipping-calc-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="shipping-calc-title" className="font-semibold">{s.title}</h2>
          <p className="mt-0.5 text-sm text-muted">{fmt(s.priceFor, { items: plural(t.common.items, quantity) })}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted" title={s.packageSize}>
          <Package className="h-3.5 w-3.5" />
          {product.weight_kg} kg · {product.length_cm}×{product.width_cm}×{product.height_cm} cm
        </span>
      </div>
      {result?.error ? (
        <p className="mt-4 text-sm text-sale">{s.error}</p>
      ) : (
        <ShippingOptions className="mt-4" options={options} selected={selected} onSelect={setPreferred} loading={result?.key !== key} single compact />
      )}
      <p className="mt-3 text-xs text-muted">
        {s.allInclude}
        {sea && <> {sea.free_over! > 0 ? fmt(s.freeNoteOver, { amount: formatPrice(sea.free_over) }) : s.freeNote}</>}
      </p>
    </section>
  );
}
