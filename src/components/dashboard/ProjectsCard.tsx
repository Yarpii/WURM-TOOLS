"use client";

import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { DashboardStats } from "./types";
import { Skeleton } from "@/components/Skeleton";

interface ProjectsCardProps {
  projects: DashboardStats["projects"] | null;
  loading?: boolean;
}

export function ProjectsCardSkeleton() {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="flex items-center gap-4 mb-3">
        <Skeleton className="h-9 w-8" />
        <Skeleton className="h-4 w-10" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    </div>
  );
}

export default function ProjectsCard({ projects, loading }: ProjectsCardProps) {
  if (loading || !projects) return <ProjectsCardSkeleton />;

  const isEmpty = projects.total === 0;

  return (
    <section className="bg-bg-secondary rounded-xl border border-border p-6" aria-label="Projects summary">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-accent" aria-hidden="true" />
          Projects
        </h3>
        <Link href="/projects" className="text-accent text-sm hover:underline">View all</Link>
      </div>

      {isEmpty ? (
        <div className="text-center py-4">
          <ClipboardList className="w-8 h-8 text-text-muted/50 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-text-muted mb-3">No projects yet</p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Start a project
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-3xl font-bold text-text-primary" aria-label={`${projects.in_progress} active projects`}>{projects.in_progress}</div>
            <div className="text-sm text-text-muted">active</div>
          </div>
          {projects.active_projects.length > 0 ? (
            <div className="space-y-2" role="list" aria-label="Active projects">
              {projects.active_projects.slice(0, 2).map((project) => (
                <div key={project.id} className="space-y-1" role="listitem">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-primary truncate">{project.name}</span>
                    <span className="text-text-muted">{project.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden" role="progressbar" aria-valuenow={project.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${project.name} progress`}>
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-text-muted">
              {projects.completed} completed &middot; {projects.total_items} items
            </div>
          )}
        </>
      )}
    </section>
  );
}
