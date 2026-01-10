import { PageSkeleton, PageHeaderSkeleton, ListSkeleton, Skeleton } from "@/components/Skeleton";

export default function MembersLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />

      {/* Search skeleton */}
      <div className="mb-6">
        <Skeleton className="h-10 w-64" />
      </div>

      <ListSkeleton items={8} />
    </PageSkeleton>
  );
}
