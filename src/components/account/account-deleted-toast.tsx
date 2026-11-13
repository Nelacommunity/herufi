"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useStore } from "@/providers/store-provider";
import { useI18n } from "@/i18n/client";

/** After account deletion the shopper lands on /?account=deleted: confirm it and clear local data. */
export function AccountDeletedToast() {
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const { ready, clearCart } = useStore();
  const deleted = params.get("account") === "deleted";
  useEffect(() => {
    if (!deleted || !ready) return;
    clearCart();
    try { localStorage.clear(); } catch { /* private mode */ }
    toast.success(t.account.settings.delete.done);
    router.replace("/");
  }, [deleted, ready, clearCart, router, t]);
  return null;
}
