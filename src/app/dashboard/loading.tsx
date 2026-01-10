import { PageSkeleton, PageHeaderSkeleton, StatsGridSkeleton, TableSkeleton } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <StatsGridSkeleton />
      <div className="grid md:grid-cols-2 gap-6">
        <TableSkeleton rows={4} />
        <TableSkeleton rows={4} />
      </div>
    </PageSkeleton>
  );
}
