"use client";

import Link from "next/link";
import { BarChart3, Target, Plus } from "lucide-react";
import { DashboardStats } from "./types";
import { Skeleton } from "@/components/Skeleton";

interface SkillProgressCardProps {
  skills: DashboardStats["skills"] | null;
  loading?: boolean;
}

export function SkillProgressCardSkeleton() {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-7 h-7 rounded" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="flex justify-between mb-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SkillProgressCard({ skills, loading }: SkillProgressCardProps) {
  if (loading || !skills) return <SkillProgressCardSkeleton />;

  const isEmpty = skills.total === 0;

  return (
    <section className="bg-bg-secondary rounded-xl border border-border p-6" aria-label="Skill progress">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-accent" aria-hidden="true" />
          <h3 className="font-semibold text-text-primary">Skill Progress</h3>
        </div>
        <Link href="/skills" className="text-accent text-sm hover:underline">View all</Link>
      </div>

      {isEmpty ? (
        <div className="text-center py-6">
          <Target className="w-10 h-10 text-text-muted/30 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-text-muted mb-3">No skill goals set</p>
          <Link
            href="/skills"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Track your skills
          </Link>
        </div>
      ) : skills.closest_to_goal.length > 0 ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-text-muted mb-2">
            <span>{skills.at_goal} at goal</span>
            <span>{skills.total} tracking</span>
          </div>
          <div role="list" aria-label="Skills closest to goal">
            {skills.closest_to_goal.map((skill) => (
              <div key={skill.id} className="space-y-1 mb-3 last:mb-0" role="listitem">
                <div className="flex justify-between text-sm">
                  <span className="text-text-primary font-medium">{skill.skill_name}</span>
                  <span className="text-text-muted">
                    {skill.current_level.toFixed(1)} &rarr; {skill.target_level}
                  </span>
                </div>
                <div
                  className="h-2 bg-bg-tertiary rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={skill.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${skill.skill_name} progress: ${skill.progress}%`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-accent to-accent-hover transition-all"
                    style={{ width: `${skill.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-text-muted">{skills.at_goal} of {skills.total} skills at goal</p>
        </div>
      )}
    </section>
  );
}
