import { PageSkeleton, PageHeaderSkeleton, Skeleton, TableSkeleton } from "@/components/Skeleton";

export default function CraftingLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />

      {/* Search skeleton */}
      <div className="mb-8">
        <Skeleton className="h-12 w-full max-w-xl" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Materials panel */}
        <div className="bg-bg-secondary rounded-lg p-6 border border-border">
          <Skeleton className="h-6 w-32 mb-4" />
          <TableSkeleton rows={6} />
        </div>

        {/* Crafting tree panel */}
        <div className="bg-bg-secondary rounded-lg p-6 border border-border">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-5/6 ml-6" />
            <Skeleton className="h-8 w-4/6 ml-12" />
            <Skeleton className="h-8 w-5/6 ml-6" />
          </div>
        </div>
      </div>
    </PageSkeleton>
  );
}
