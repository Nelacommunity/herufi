import { Skeleton, ProductGridSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page pt-6 sm:pt-10">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mb-8 mt-6 h-12 w-64" />
      <div className="grid gap-14 lg:grid-cols-[240px_1fr]">
        <div className="hidden space-y-6 lg:block">
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" /></div>)}
        </div>
        <div>
          <Skeleton className="h-4 w-24" />
          <ProductGridSkeleton count={9} className="mt-8 md:grid-cols-3 lg:grid-cols-3" />
        </div>
      </div>
    </div>
  );
}
