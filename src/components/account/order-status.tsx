"use client";

import { Check, Circle, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
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

export function OrderTimeline({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  if (status === "cancelled") {
    return <p className="flex items-center gap-2 rounded-xl bg-sale-soft px-4 py-3 text-sm font-medium text-sale"><X className="h-4 w-4" /> {t.account.cancelledNote}</p>;
  }
  const current = status === "pending" ? -1 : FLOW.indexOf(status);
  return (
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
          </li>
        );
      })}
    </ol>
  );
}
