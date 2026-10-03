import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-lg", className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
      <Skeleton className="mt-4 h-3 w-16" />
      <Skeleton className="mt-2 h-4 w-3/4" />
      <Skeleton className="mt-3 h-4 w-20" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6", className)} role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}
