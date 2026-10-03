import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, description, href, linkLabel = "View all", className }: {
  eyebrow?: string; title: string; description?: string; href?: string; linkLabel?: string; className?: string;
}) {
  return (
    <div className={cn("mb-8 flex items-end justify-between gap-6 sm:mb-10", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">{eyebrow}</p>}
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
        {description && <p className="mt-3 text-pretty text-muted sm:text-lg">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="group hidden shrink-0 items-center gap-1.5 text-sm font-medium sm:inline-flex">
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
