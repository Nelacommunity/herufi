import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
