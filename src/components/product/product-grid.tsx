import { ProductCard } from "@/components/product/product-card";
import type { ProductSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductGrid({ products, className, priorityCount = 0, columns = 4 }: {
  products: ProductSummary[]; className?: string; priorityCount?: number; columns?: 3 | 4;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3", columns === 4 && "lg:grid-cols-4", "lg:gap-x-6 lg:gap-y-12", className)}>
      {products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < priorityCount} />)}
    </div>
  );
}

/** Horizontal, swipeable rail on mobile; grid on desktop. */
export function ProductRail({ products }: { products: ProductSummary[] }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:-mx-6 sm:gap-5 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} className="w-[68%] shrink-0 snap-start sm:w-[40%] md:w-[30%] lg:w-auto" sizes="(min-width: 1024px) 22vw, (min-width: 640px) 40vw, 68vw" />
      ))}
    </div>
  );
}
