import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
    </div>
  );
}
