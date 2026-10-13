"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { joinGroup } from "@/actions/group";
import { Button } from "@/components/ui/button";

export function JoinGroupButton({ code, label }: { code: string; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button size="lg" className="w-full" disabled={pending} onClick={() => start(async () => {
      const r = await joinGroup(code);
      if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.error);
    })}>{label}</Button>
  );
}
