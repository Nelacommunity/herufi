import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("font-display text-[28px] leading-none tracking-tight", className)} aria-label="Herufi home">
      Herufi<span className="text-accent">.</span>
    </Link>
  );
}
