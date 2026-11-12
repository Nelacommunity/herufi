"use client";

import { Anchor, CalendarCheck, Plane, Rocket } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt, INTL_LOCALE } from "@/i18n/config";
import { arrivalRange, formatShipDate, nextShipDate } from "@/lib/shipping";
import type { DeliveryMethod } from "@/lib/types";

const ICONS: Record<DeliveryMethod, typeof Plane> = { standard: Plane, express: Rocket, sea: Anchor };
const ORDER: DeliveryMethod[] = ["express", "standard", "sea"];

/**
 * "Estimated arrival in Tanzania" on the product page: a date range per shipping method, counted
 * from the next batch leaving China. Dates are worked out in the browser so a cached page never
 * shows yesterday's estimate.
 */
export function ArrivalEstimate({ options }: { options: { method: DeliveryMethod; eta_min: number; eta_max: number }[] }) {
  const { t, locale } = useI18n();
  const s = t.shipping;
  if (!options.length) return null;
  const intl = INTL_LOCALE[locale];
  const shipDate = nextShipDate();
  const sorted = [...options].sort((a, b) => ORDER.indexOf(a.method) - ORDER.indexOf(b.method));

  return (
    <div className="mt-5 rounded-2xl border border-border p-4" suppressHydrationWarning>
      <p className="flex items-center gap-2 text-sm font-semibold"><CalendarCheck className="h-4 w-4" /> {s.estimateTitle}</p>
      <ul className="mt-3 space-y-1.5 text-sm">
        {sorted.map((o) => {
          const Icon = ICONS[o.method];
          return (
            <li key={o.method} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-muted"><Icon className="h-4 w-4" /> {s.methods[o.method]?.label ?? o.method}</span>
              <span className="font-medium tabular-nums" suppressHydrationWarning>{arrivalRange(shipDate, o.eta_min, o.eta_max, intl)}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted" suppressHydrationWarning>{fmt(s.estimateNote, { date: formatShipDate(shipDate, intl) })}</p>
    </div>
  );
}
