"use client";

import { Check, Circle, Ship, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt, INTL_LOCALE } from "@/i18n/config";
import { formatShipDate } from "@/lib/shipping";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const tone: Record<OrderStatus, string> = {
  pending: "bg-surface-2 text-muted",
  confirmed: "bg-accent-soft text-accent",
  processing: "bg-[#fff4e0] text-warning dark:bg-[#33240c]",
  shipped: "bg-[#e6effc] text-[#1d4ed8] dark:bg-[#14223d] dark:text-[#8fb4ff]",
  delivered: "bg-accent-soft text-success",
  cancelled: "bg-sale-soft text-sale",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", tone[status], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {t.status[status]}
    </span>
  );
}

const FLOW: OrderStatus[] = ["confirmed", "processing", "shipped", "delivered"];

/** pending → confirmed → packed (in the China warehouse) → in transit (batch has left) → delivered. */
export function OrderTimeline({ status, shipDate }: { status: OrderStatus; shipDate?: string }) {
  const { t, locale } = useI18n();
  if (status === "cancelled") {
    return <p className="flex items-center gap-2 rounded-xl bg-sale-soft px-4 py-3 text-sm font-medium text-sale"><X className="h-4 w-4" /> {t.account.cancelledNote}</p>;
  }
  const current = status === "pending" ? -1 : FLOW.indexOf(status);
  const batch = shipDate && formatShipDate(shipDate, INTL_LOCALE[locale], { day: "numeric", month: "long" });
  return (
    <>
    <ol className="grid grid-cols-4 gap-2">
      {FLOW.map((s, i) => {
        const reached = i <= current;
        return (
          <li key={s} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", reached ? "bg-foreground text-background" : "border border-border-strong text-subtle")}>
                {reached ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2 fill-current" />}
              </span>
              {i < FLOW.length - 1 && <span className={cn("h-0.5 flex-1 rounded-full", i < current ? "bg-foreground" : "bg-border")} />}
            </div>
            <span className={cn("text-xs font-medium sm:text-sm", reached ? "text-foreground" : "text-subtle")}>{t.status[s]}</span>
            <span className="hidden text-xs text-subtle sm:block">{t.statusHint[s]}</span>
          </li>
        );
      })}
    </ol>
    {batch && status !== "delivered" && (
      <p className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-sm text-muted">
        <Ship className="mt-0.5 h-4 w-4 shrink-0" />
        {fmt(status === "shipped" ? t.account.shippedOn : t.account.shipsOn, { date: batch })}
      </p>
    )}
    </>
  );
}
