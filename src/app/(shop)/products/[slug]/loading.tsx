import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page pt-4 sm:pt-8" role="status" aria-label="Loading product">
      <Skeleton className="hidden h-4 w-56 sm:block" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        <div className="lg:grid lg:grid-cols-[76px_1fr] lg:gap-4">
          <div className="hidden flex-col gap-3 lg:flex">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-xl" />)}</div>
          <Skeleton className="aspect-[4/5] rounded-[1.5rem]" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-4/5" /><Skeleton className="h-4 w-40" />
          <Skeleton className="mt-6 h-8 w-32" /><Skeleton className="h-20 w-full" />
          <div className="flex gap-2 pt-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-16 rounded-full" />)}</div>
          <Skeleton className="mt-6 h-13 w-full rounded-full" /><Skeleton className="h-13 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
