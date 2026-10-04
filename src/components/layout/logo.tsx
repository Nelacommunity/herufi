import Link from "next/link";
import { LOGO_PATH, LOGO_VIEWBOX } from "@/components/layout/logo-path";
import { cn } from "@/lib/utils";

/** The bag mark. Inherits colour (black on light, light on dark) and scales with font-size. */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} className={cn("h-[1.2em] w-auto shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path fill="currentColor" fillRule="evenodd" d={LOGO_PATH} />
    </svg>
  );
}

/** Mark + wordmark. Size it with a text-* class; the mark keeps its proportion to the word. */
export function Logo({ className, markOnly }: { className?: string; markOnly?: boolean }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-[0.3em] text-[26px] leading-none text-foreground", className)} aria-label="Herufi, home">
      <LogoMark className="transition-transform duration-300 ease-[var(--ease-spring)] group-hover:-rotate-6" />
      {!markOnly && <span className="font-display tracking-tight">herufi</span>}
    </Link>
  );
}
