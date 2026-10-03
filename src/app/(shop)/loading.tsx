import { Skeleton, ProductGridSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page pt-10" role="status" aria-label="Loading">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className="space-y-5"><Skeleton className="h-7 w-32 rounded-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-14 w-48 rounded-full" /></div>
        <Skeleton className="aspect-[5/4] rounded-[1.75rem]" />
      </div>
      <ProductGridSkeleton className="mt-20" />
    </div>
  );
}
