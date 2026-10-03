import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-surface-2 text-foreground",
  inverse: "bg-foreground text-background",
  sale: "bg-sale text-white",
  saleSoft: "bg-sale-soft text-sale",
  accent: "bg-accent-soft text-accent",
  outline: "border border-border-strong text-muted",
  glass: "bg-white/85 text-neutral-900 backdrop-blur",
};

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: keyof typeof tones; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]", tones[tone], className)}>
      {children}
    </span>
  );
}
