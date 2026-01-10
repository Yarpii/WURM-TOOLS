import { PageSkeleton, PageHeaderSkeleton, ListSkeleton, Skeleton } from "@/components/Skeleton";

export default function AlliancesLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />

      {/* Action buttons skeleton */}
      <div className="flex gap-4 mb-6">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      <ListSkeleton items={4} />
    </PageSkeleton>
  );
}
