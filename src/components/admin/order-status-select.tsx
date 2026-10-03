"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOrderStatus } from "@/actions/admin";
import { Select } from "@/components/ui/input";
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/lib/constants";
import type { OrderStatus } from "@/lib/types";

export function OrderStatusSelect({ id, status }: { id: string; status: OrderStatus }) {
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Select aria-label="Order status" value={value} disabled={pending} className="h-11 w-48"
      onChange={(e) => {
        const next = e.target.value as OrderStatus;
        if (next === "cancelled" && !window.confirm("Cancel this order and mark the payment as refunded?")) return;
        const prev = value;
        setValue(next);
        start(async () => {
          const r = await updateOrderStatus(id, next);
          if (r.ok) { toast.success(r.message); router.refresh(); } else { toast.error(r.error); setValue(prev); }
        });
      }}>
      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
    </Select>
  );
}
