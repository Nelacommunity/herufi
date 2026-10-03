"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setCustomerStatus } from "@/actions/admin";
import { Button } from "@/components/ui/button";

export function CustomerStatusToggle({ userId, status }: { userId: string; status: "active" | "suspended" }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const suspend = status === "active";
  return (
    <Button variant={suspend ? "secondary" : "primary"} loading={pending} className={suspend ? "text-sale" : ""}
      onClick={() => {
        if (suspend && !window.confirm("Suspend this account? They won't be able to place orders.")) return;
        start(async () => { const r = await setCustomerStatus(userId, suspend ? "suspended" : "active"); if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.error); });
      }}>
      {suspend ? "Suspend account" : "Reactivate account"}
    </Button>
  );
}
