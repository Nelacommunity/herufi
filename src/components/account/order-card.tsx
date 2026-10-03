"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { OrderStatusBadge } from "@/components/account/order-status";
import { useI18n } from "@/i18n/client";
import { fmt, plural } from "@/i18n/config";
import type { Order } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/utils";

export function OrderCard({ order }: { order: Order }) {
  const { t, locale } = useI18n();
  const count = order.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <Link href={`/account/orders/${order.order_number}`} className="group block rounded-2xl border border-border p-5 transition-all duration-300 hover:border-border-strong hover:shadow-[var(--shadow-soft)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{fmt(t.account.order, { number: order.order_number })}</p>
          <p className="mt-0.5 text-sm text-muted">{fmt(t.account.placed, { date: formatDate(order.created_at, "short", locale), items: plural(t.common.items, count) })}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex -space-x-3">
          {order.items.slice(0, 4).map((i) => (
            <span key={i.id} className="relative h-14 w-12 overflow-hidden rounded-lg bg-surface-2 ring-2 ring-background">
              {i.image_url && <Image src={i.image_url} alt={i.product_name} fill sizes="48px" className="object-cover" />}
            </span>
          ))}
          {order.items.length > 4 && <span className="grid h-14 w-12 place-items-center rounded-lg bg-surface-2 text-xs font-medium ring-2 ring-background">+{order.items.length - 4}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold tabular-nums">{formatPrice(order.total)}</span>
          <ChevronRight className="h-4 w-4 text-subtle transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
