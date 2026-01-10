import { PageSkeleton, PageHeaderSkeleton, StatsGridSkeleton, ListSkeleton, Skeleton } from "@/components/Skeleton";

export default function TreasuresLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <StatsGridSkeleton />

      {/* Tabs skeleton */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      <ListSkeleton items={5} />
    </PageSkeleton>
  );
}
