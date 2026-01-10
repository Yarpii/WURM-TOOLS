import { PageSkeleton, PageHeaderSkeleton, StatsGridSkeleton, TableSkeleton, Skeleton } from "@/components/Skeleton";

export default function AdminLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <StatsGridSkeleton />

      {/* Tabs skeleton */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-32" />
      </div>

      <TableSkeleton rows={10} />
    </PageSkeleton>
  );
}
