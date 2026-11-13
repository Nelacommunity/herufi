"use client";

import { useTransition } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { resendOrderEmail } from "@/actions/admin";
import { Button } from "@/components/ui/button";

const LABEL: Record<string, string> = {
  confirmed: "Payment confirmed",
  processing: "Packed in China",
  shipped: "Shipped to Tanzania",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export type OrderEmailRow = { event: string; status: string; attempts: number; last_error: string | null; sent_at: string | null; created_at: string };

/** Order update emails sent to the customer (order_notifications), with "Send again". */
export function OrderEmails({ orderId, rows, canResend, className }: { orderId: string; rows: OrderEmailRow[]; canResend: boolean; className?: string }) {
  const [pending, start] = useTransition();
  const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Dar_es_Salaam", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className={className}>
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4" /> Customer emails</h2>
      {rows.length ? (
        <ul className="mt-3 space-y-3 text-sm">
          {rows.map((r) => (
            <li key={r.event}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{LABEL[r.event] ?? r.event}</span>
                <span className={r.status === "sent" ? "text-success" : r.status === "failed" ? "text-sale" : "text-muted"}>
                  {r.status === "sent" ? `Sent ${r.sent_at ? when(r.sent_at) : ""}` : r.status === "failed" ? "Failed" : "Sending…"}
                </span>
              </div>
              {r.status === "failed" && r.last_error && <p className="mt-0.5 text-xs text-muted">{r.last_error}</p>}
              {canResend && (
                <Button size="xs" variant="ghost" className="-ml-3 mt-0.5" disabled={pending}
                  onClick={() => start(async () => { const res = await resendOrderEmail(orderId, r.event); if (res.ok) toast.success(res.message); else toast.error(res.error); })}>
                  Send again
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">No emails yet. The customer is emailed when the payment is confirmed and at each status change.</p>
      )}
    </div>
  );
}
