"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  title?: string;
  icon?: string;
  className?: string;
  glow?: boolean;
  noPadding?: boolean;
}

export default function Card({
  children,
  title,
  icon,
  className = "",
  glow = false,
  noPadding = false,
}: CardProps) {
  return (
    <div
      className={`
        bg-dark-card rounded-xl border border-gold/10
        transition-all duration-300 hover:border-gold/20
        ${glow ? "ember-glow" : ""}
        ${className}
      `}
    >
      {title && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gold/10 flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <h2 className="font-semibold text-gold text-sm sm:text-base">{title}</h2>
        </div>
      )}
      <div className={noPadding ? "" : "p-4 sm:p-6"}>
        {children}
      </div>
    </div>
  );
}

// Stat Card component for displaying metrics
interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  color?: "default" | "accent" | "success" | "warning" | "info";
  icon?: string;
}

export function StatCard({
  label,
  value,
  subValue,
  color = "default",
  icon,
}: StatCardProps) {
  const colorClasses = {
    default: "text-white",
    accent: "text-accent",
    success: "text-emerald-400",
    warning: "text-amber-400",
    info: "text-blue-400",
  };

  return (
    <div className="bg-dark-input rounded-lg p-3 sm:p-4 text-center border border-gold/5 hover:border-gold/10 transition-colors">
      {icon && <div className="text-2xl mb-1 opacity-60">{icon}</div>}
      <div className={`text-xl sm:text-2xl font-bold ${colorClasses[color]} mb-1`}>
        {value}
      </div>
      <div className="text-xs sm:text-sm text-gray-400">{label}</div>
      {subValue && (
        <div className="text-xs text-gray-500 mt-1">{subValue}</div>
      )}
    </div>
  );
}

// Progress bar component
interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  showLabel?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function ProgressBar({
  value,
  max = 100,
  color = "bg-accent",
  showLabel = true,
  label,
  size = "md",
}: ProgressBarProps) {
  const percentage = Math.min(100, (value / max) * 100);
  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{label}</span>
          {showLabel && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={`w-full bg-dark-input rounded-full ${sizeClasses[size]} overflow-hidden`}>
        <div
          className={`${color} ${sizeClasses[size]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
