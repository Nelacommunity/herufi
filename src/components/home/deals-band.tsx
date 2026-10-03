import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductRail } from "@/components/product/product-grid";
import type { ProductSummary } from "@/lib/types";
import type { Dictionary } from "@/i18n/dictionaries";
import { fmt } from "@/i18n/config";

export function DealsBand({ products, t }: { products: ProductSummary[]; t: Dictionary }) {
  if (!products.length) return null;
  const best = Math.max(...products.map((p) => p.discount_percent));
  return (
    <section className="bg-surface-2 py-16 sm:py-20">
      <div className="container-page">
        <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-sale">{t.home.dealsEyebrow}</p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
              {t.home.dealsTitle} <span className="font-display font-normal italic">{t.home.dealsTitleAccent}</span>
            </h2>
            <p className="mt-3 text-muted sm:text-lg">{fmt(t.home.dealsUpTo, { n: best })}</p>
          </div>
          <Link href="/products?deals=1" className="group inline-flex items-center gap-1.5 text-sm font-medium">
            {t.home.shopAllDeals} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <ProductRail products={products} />
      </div>
    </section>
  );
}
