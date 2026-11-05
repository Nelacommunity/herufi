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

/** Days of the month a consolidated batch leaves the China warehouse. Mirrors next_ship_date() in SQL. */
export const SHIP_DAYS = [14, 28];
/** An order must be placed at least this many days before a batch to join it. */
export const SHIP_CUTOFF_DAYS = 12;
const SHIP_TZ = "Africa/Dar_es_Salaam";

/** Today's date in Tanzania as a UTC-midnight Date (date-only arithmetic, no DST in EAT). */
function tzToday(at: Date) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: SHIP_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(at).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** The batch an order placed at `at` ships with, as YYYY-MM-DD. */
export function nextShipDate(at = new Date()) {
  const today = tzToday(at);
  for (let i = 0; i < 3; i++) {
    for (const day of SHIP_DAYS) {
      const batch = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + i, day));
      if (today.getTime() <= batch.getTime() - SHIP_CUTOFF_DAYS * 864e5) return batch.toISOString().slice(0, 10);
    }
  }
  throw new Error("unreachable");
}

/** The most recent batch date on or before today (YYYY-MM-DD): the one staff should be dispatching. */
export function currentBatchDate(at = new Date()) {
  const today = tzToday(at);
  const y = today.getUTCFullYear(), m = today.getUTCMonth(), d = today.getUTCDate();
  const batch = d >= SHIP_DAYS[1] ? Date.UTC(y, m, SHIP_DAYS[1]) : d >= SHIP_DAYS[0] ? Date.UTC(y, m, SHIP_DAYS[0]) : Date.UTC(y, m - 1, SHIP_DAYS[1]);
  return new Date(batch).toISOString().slice(0, 10);
}

/** The next batch date strictly after today (YYYY-MM-DD): the shipment the warehouse is filling now. */
export function upcomingBatchDate(at = new Date()) {
  const today = tzToday(at);
  const y = today.getUTCFullYear(), m = today.getUTCMonth(), d = today.getUTCDate();
  const batch = d < SHIP_DAYS[0] ? Date.UTC(y, m, SHIP_DAYS[0]) : d < SHIP_DAYS[1] ? Date.UTC(y, m, SHIP_DAYS[1]) : Date.UTC(y, m + 1, SHIP_DAYS[0]);
  return new Date(batch).toISOString().slice(0, 10);
}

/** The batch dates after `from` (YYYY-MM-DD), for rescheduling an order. */
export function batchDatesAfter(from: string, count = 4) {
  const out: string[] = [];
  const [y, m] = from.split("-").map(Number);
  for (let i = 0; out.length < count; i++) {
    for (const day of SHIP_DAYS) {
      const d = new Date(Date.UTC(y, m - 1 + i, day)).toISOString().slice(0, 10);
      if (d > from && out.length < count) out.push(d);
    }
  }
  return out;
}

/** Last day an order can be placed to make the batch on `shipDate`. */
export function shipCutoff(shipDate: string) {
  return new Date(Date.parse(shipDate) - SHIP_CUTOFF_DAYS * 864e5).toISOString().slice(0, 10);
}

/** Format a date-only (YYYY-MM-DD) value without the viewer's timezone shifting it a day. */
export function formatShipDate(date: string, intlLocale: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat(intlLocale, { ...opts, timeZone: "UTC" }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
}
