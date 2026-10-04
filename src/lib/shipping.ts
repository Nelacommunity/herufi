import type { DeliveryMethod, Quote, ShippingOption } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function normalizeOptions(raw: any[] | null | undefined): ShippingOption[] {
  return (raw ?? []).map((o) => ({
    method: o.method,
    available: Boolean(o.available),
    blocked_by: o.blocked_by ?? [],
    price: Number(o.price),
    list_price: Number(o.list_price ?? o.price),
    free: Boolean(o.free),
    chargeable: Number(o.chargeable),
    unit: o.unit,
    rate: Number(o.rate),
    min_charge: Number(o.min_charge),
    free_over: o.free_over == null ? null : Number(o.free_over),
    free_max_kg: o.free_max_kg == null ? null : Number(o.free_max_kg),
    free_max_cbm: o.free_max_cbm == null ? null : Number(o.free_max_cbm),
    eta_min: Number(o.eta_min),
    eta_max: Number(o.eta_max),
    weight_kg: Number(o.weight_kg),
    volume_cbm: Number(o.volume_cbm),
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** The chosen method if available, otherwise the first available one (cheapest-first order is not assumed). */
export function resolveMethod(options: ShippingOption[], preferred: DeliveryMethod): DeliveryMethod {
  if (!options.length) return preferred;
  const ok = options.find((o) => o.method === preferred && o.available);
  return ok ? preferred : (options.find((o) => o.available)?.method ?? preferred);
}

/**
 * Re-price a quote for another shipping method without a round trip: shipping_options
 * don't depend on the chosen method, and VAT is charged on goods only.
 * place_order recomputes everything server-side.
 */
export function quoteFor(quote: Quote, method: DeliveryMethod) {
  if (!quote.shipping_options.length) return quote; // database without per-method pricing (pre-0006)
  const option = quote.shipping_options.find((o) => o.method === method);
  const shipping = option?.price ?? quote.shipping;
  return {
    ...quote,
    delivery_method: method,
    shipping,
    shipping_list: option?.list_price ?? shipping,
    shipping_available: option?.available ?? false,
    total: quote.subtotal - quote.discount + quote.tax + shipping,
  };
}

/** ETA as a calendar range, e.g. "14 Oct – 18 Oct". */
export function etaRange(min: number, max: number, intlLocale: string, from = new Date()) {
  const f = new Intl.DateTimeFormat(intlLocale, { month: "short", day: "numeric" });
  const add = (n: number) => { const d = new Date(from); d.setDate(d.getDate() + n); return d; };
  return `${f.format(add(min))} – ${f.format(add(max))}`;
}
