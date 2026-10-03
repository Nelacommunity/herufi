"use client";

import { useTransition } from "react";
import { clearRecentlyViewed } from "@/actions/account";
import { Button } from "@/components/ui/button";

export function ClearViewedButton({ label }: { label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" size="sm" loading={pending} onClick={() => start(async () => {
      try { localStorage.removeItem("herufi:viewed:v1"); } catch {}
      await clearRecentlyViewed();
    })}>{label}</Button>
  );
}
