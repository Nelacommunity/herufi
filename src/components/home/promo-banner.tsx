import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { Dictionary } from "@/i18n/dictionaries";

const u = (id: string, w = 1800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Editorial split: magazine-style story with a pull quote rather than a banner ad. */
export function PromoBanner({ t }: { t: Dictionary }) {
  const h = t.home;
  return (
    <section className="container-page">
      <div className="grid overflow-hidden rounded-[2rem] bg-surface-2 lg:grid-cols-2">
        <div className="relative min-h-[380px] lg:min-h-[620px]">
          <Image src={u("1600210492486-724fe5c67fb0")} alt={h.promoAlt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
        <div className="flex flex-col justify-between gap-12 p-8 sm:p-12 lg:p-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{h.promoEyebrow}</p>
          <div>
            <h2 className="text-balance text-[clamp(2.5rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.03em]">
              {h.promoTitle} <span className="font-display font-normal italic">{h.promoTitleAccent}</span>
            </h2>
            <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-muted">
              {h.promoBody}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/categories/home" className={buttonVariants({ size: "lg", className: "group" })}>
                {h.promoCta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/categories/kitchen" className={buttonVariants({ size: "lg", variant: "ghost" })}>{h.promoKitchen}</Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 border-t border-border-strong pt-8 text-sm">
            {h.promoStats.map((s) => <div key={s.label}><p className="text-2xl font-semibold tracking-tight">{s.value}</p><p className="text-muted">{s.label}</p></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}
