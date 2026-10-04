"use client";

import { Anchor, Plane, Rocket } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt, INTL_LOCALE } from "@/i18n/config";
import { etaRange } from "@/lib/shipping";
import type { DeliveryMethod, ShippingOption } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const ICONS: Record<DeliveryMethod, typeof Plane> = { standard: Plane, express: Rocket, sea: Anchor };

/**
 * Radio list of shipping methods with live prices. Unavailable methods stay visible
 * (so shoppers understand why) but can't be selected.
 */
export function ShippingOptions({ options, selected, onSelect, loading, single, compact, className }: {
  options: ShippingOption[];
  selected: DeliveryMethod;
  onSelect: (m: DeliveryMethod) => void;
  loading?: boolean;
  /** Pricing a single product (changes the "not available" wording). */
  single?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const s = t.shipping;

  if (!options.length) {
    return (
      <div className={cn("space-y-2", className)} role="status" aria-label={s.calculating}>
        {[0, 1, 2].map((i) => <Skeleton key={i} className={cn("w-full rounded-xl", compact ? "h-14" : "h-[76px]")} />)}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label={s.method} aria-busy={loading} className={cn("space-y-2 transition-opacity", loading && "opacity-60", className)}>
      {options.map((o) => {
        const Icon = ICONS[o.method];
        const label = s.methods[o.method]?.label ?? o.method;
        const isSelected = selected === o.method && o.available;
        const basis = o.unit === "kg"
          ? fmt(s.perKg, { weight: o.chargeable, rate: formatPrice(o.rate) })
          : fmt(s.perCbm, { volume: o.chargeable, rate: formatPrice(o.rate) });
        const atMinimum = o.list_price > 0 && o.list_price === o.min_charge;
        const free = o.price === 0 && o.available;
        const promo = free && o.free && o.list_price > 0;
        return (
          <button
            key={o.method}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={!o.available}
            onClick={() => onSelect(o.method)}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border text-left transition-all duration-200",
              compact ? "p-3" : "p-4",
              isSelected ? "border-foreground ring-1 ring-foreground" : "border-border-strong hover:border-muted",
              !o.available && "cursor-not-allowed border-dashed opacity-60 hover:border-border-strong",
            )}
          >
            <span className={cn("grid shrink-0 place-items-center rounded-full", compact ? "h-8 w-8" : "h-10 w-10", isSelected ? "bg-foreground text-background" : "bg-surface-2")}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="flex items-center gap-2 font-medium">
                  {label}
                  {promo && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">{s.freeBadge}</span>}
                </span>
                <span className={cn("font-semibold tabular-nums", free && "text-success")}>
                  {promo && <span className="mr-1.5 text-sm font-normal text-subtle line-through" aria-label={fmt(s.wasPrice, { amount: formatPrice(o.list_price) })}>{formatPrice(o.list_price)}</span>}
                  {!o.available ? <span className="text-sm font-medium text-muted">{s.unavailable}</span> : free ? t.common.free : formatPrice(o.price)}
                </span>
              </span>
              <span className="mt-0.5 block text-sm text-muted">
                {fmt(s.days, { min: o.eta_min, max: o.eta_max })}
                <span suppressHydrationWarning> · {fmt(s.arrives, { range: etaRange(o.eta_min, o.eta_max, INTL_LOCALE[locale]) })}</span>
              </span>
              {o.available ? (
                !compact && (
                  <span className="mt-1 block text-xs text-subtle">
                    {s.methods[o.method]?.desc} · {basis}{atMinimum && ` (${s.minCharge})`}
                  </span>
                )
              ) : (
                <span className="mt-1 block text-xs font-medium text-sale">
                  {single ? s.unavailableItem : fmt(s.unavailableFor, { names: o.blocked_by.join(", ") })}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
