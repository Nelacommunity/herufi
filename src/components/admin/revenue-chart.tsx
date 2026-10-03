"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";

type Day = { day: string; revenue: number; orders: number };

/** Single-series daily revenue bars with a per-bar hover tooltip and an accessible table fallback. */
export function RevenueChart({ data }: { data: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => Number(d.revenue)));
  // Round the axis up to a tidy step (TSh 1M, 5M, 10M…).
  const step = 10 ** Math.max(3, Math.floor(Math.log10(max)));
  const nice = Math.ceil(max / step) * step || step;
  const ticks = [0, nice / 2, nice];
  const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const h = hover != null ? data[hover] : null;

  return (
    <figure>
      <div className="relative flex h-64 gap-3">
        <div className="flex w-16 shrink-0 flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-subtle" aria-hidden>
          {[...ticks].reverse().map((t) => <span key={t}>{formatPrice(t, { compact: true })}</span>)}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between" aria-hidden>
            {ticks.map((t) => <div key={t} className="border-t border-dashed border-border" />)}
          </div>
          <div className="absolute inset-x-0 bottom-6 top-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => (
              <div key={d.day} className="group relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)}>
                <div
                  className="w-full rounded-t-[4px] bg-accent transition-opacity duration-150"
                  style={{ height: `${Math.max(Number(d.revenue) > 0 ? 1.5 : 0, (Number(d.revenue) / nice) * 100)}%`, opacity: hover == null || hover === i ? 1 : 0.35 }}
                />
              </div>
            ))}
          </div>
          {h && hover != null && (
            <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-[var(--shadow-lift)]"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}>
              <p className="font-medium">{fmtDay(h.day)}</p>
              <p className="mt-0.5 tabular-nums text-muted"><span className="font-semibold text-foreground">{formatPrice(h.revenue)}</span> · {h.orders} orders</p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-subtle" aria-hidden>
            <span>{data[0] && fmtDay(data[0].day)}</span>
            <span>{data[Math.floor(data.length / 2)] && fmtDay(data[Math.floor(data.length / 2)].day)}</span>
            <span>{data.at(-1) && fmtDay(data.at(-1)!.day)}</span>
          </div>
        </div>
      </div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted hover:text-foreground">View as table</summary>
        <table className="mt-3 w-full text-left">
          <thead><tr className="text-muted"><th className="py-1 font-medium">Day</th><th className="py-1 text-right font-medium">Orders</th><th className="py-1 text-right font-medium">Revenue</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.day} className="border-t border-border"><td className="py-1">{fmtDay(d.day)}</td><td className="py-1 text-right tabular-nums">{d.orders}</td><td className="py-1 text-right tabular-nums">{formatPrice(d.revenue)}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}
