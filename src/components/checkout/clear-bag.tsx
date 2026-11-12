"use client";

import { useEffect } from "react";
import { useStore } from "@/providers/store-provider";
import { writeCoupon } from "@/components/checkout/use-quote";

/** Empties the bag once the order placed in this browser is confirmed paid (card payments land here). */
export function ClearBag() {
  const { ready, clearCart } = useStore();
  useEffect(() => {
    if (!ready) return;
    writeCoupon(null);
    clearCart();
  }, [ready, clearCart]);
  return null;
}
