import { PageSkeleton, PageHeaderSkeleton, StatsGridSkeleton, TableSkeleton, Skeleton } from "@/components/Skeleton";

export default function MarketLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <StatsGridSkeleton />

      {/* Filters skeleton */}
      <div className="flex gap-4 mb-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      <TableSkeleton rows={8} />
    </PageSkeleton>
  );
}
