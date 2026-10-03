import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Star } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { ProductSummary } from "@/lib/types";

const u = (id: string, w = 1400) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

function FloatingTag({ product, className }: { product?: ProductSummary; className: string }) {
  if (!product) return null;
  return (
    <Link
      href={`/products/${product.slug}`}
      className={`absolute z-10 flex items-center gap-3 rounded-2xl bg-white/90 p-2 pr-4 text-neutral-900 shadow-[var(--shadow-lift)] backdrop-blur-md transition-transform duration-300 hover:-translate-y-0.5 ${className}`}
    >
      <span className="relative h-11 w-11 overflow-hidden rounded-xl bg-neutral-100">
        {product.images[0] && <Image src={product.images[0].image_url} alt="" fill sizes="44px" className="object-cover" />}
      </span>
      <span className="text-xs leading-tight">
        <span className="block max-w-36 truncate font-medium">{product.name}</span>
        <span className="text-neutral-500">{formatPrice(product.price)}</span>
      </span>
    </Link>
  );
}

export function Hero({ spotlight, t }: { spotlight: ProductSummary[]; t: Dictionary }) {
  const h = t.home;
  return (
    <section className="container-page pb-16 pt-6 sm:pt-10 lg:pb-24 lg:pt-12">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <div className="stagger max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {h.badge}
          </p>
          <h1 className="mt-6 text-balance text-[clamp(2.6rem,6.4vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.035em]">
            {h.heroLine1}
            <span className="mt-1 block font-display text-[1.08em] font-normal italic tracking-[-0.02em] text-muted">{h.heroLine2}</span>
          </h1>
          <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-muted">
            {h.heroBody}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/products" className={buttonVariants({ size: "lg", className: "group h-14 px-8 text-base" })}>
              {t.common.shopNow} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="#collections" className={buttonVariants({ size: "lg", variant: "secondary", className: "h-14 px-8 text-base" })}>
              {h.exploreCollections}
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-6 text-sm text-muted">
            <div className="flex items-center gap-2">
              <span className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} className="h-4 w-4 fill-star text-star" />)}</span>
              <span><strong className="font-semibold text-foreground">4.8</strong> {h.trust}</span>
            </div>
            <span className="hidden h-4 w-px bg-border sm:block" />
            <span className="hidden items-center gap-1.5 sm:flex"><ShieldCheck className="h-4 w-4" /> {h.customsIncluded}</span>
          </div>
        </div>

        <div className="relative grid grid-cols-5 grid-rows-2 gap-3 animate-fade-in sm:gap-4 lg:h-[640px]" style={{ animationDelay: "120ms" }}>
          <div className="relative col-span-3 row-span-2 aspect-[3/4] overflow-hidden rounded-[1.75rem] bg-surface-2 lg:aspect-auto">
            <Image src={u("1539533018447-63fcce2678e3", 1200)} alt={h.heroCoatAlt} fill priority sizes="(min-width: 1024px) 32vw, 60vw" className="object-cover" />
          </div>
          <div className="relative col-span-2 overflow-hidden rounded-[1.75rem] bg-surface-2">
            <Image src={u("1618366712010-f4ae9c647dcb", 800)} alt={h.heroHeadphonesAlt} fill priority sizes="(min-width: 1024px) 22vw, 40vw" className="object-cover" />
          </div>
          <div className="relative col-span-2 overflow-hidden rounded-[1.75rem] bg-surface-2">
            <Image src={u("1572726729207-a78d6feb18d7", 800)} alt={h.heroCandlesAlt} fill sizes="(min-width: 1024px) 22vw, 40vw" className="object-cover" />
          </div>
          <FloatingTag product={spotlight[0]} className="bottom-5 left-4 hidden sm:flex" />
          <FloatingTag product={spotlight[1]} className="right-4 top-[42%] hidden lg:flex" />
        </div>
      </div>
    </section>
  );
}
