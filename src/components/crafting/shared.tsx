"use client";

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  color?: "accent" | "success";
}

export function SliderInput({ label, value, onChange, min, max, color = "accent" }: SliderInputProps) {
  const colorClass = color === "success" ? "text-success" : "text-accent";
  const accentClass = color === "success" ? "accent-success" : "accent-accent";

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className={`${colorClass} font-semibold`}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={`w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer ${accentClass}`}
      />
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: "accent" | "success" | "warning" | "danger" | "info";
}

export function StatBox({ label, value, sub, color = "accent" }: StatBoxProps) {
  const colorClasses = {
    accent: "text-accent",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    info: "text-info",
  };

  return (
    <div className="bg-bg-tertiary rounded-lg p-3 text-center">
      <div className={`text-xl font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
      {sub && <div className="text-xs text-text-muted mt-1">{sub}</div>}
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="p-12 text-center">
      <div className="animate-spin text-4xl">&#9881;</div>
    </div>
  );
}

export function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-12 text-center">
      <div className="text-6xl mb-4 opacity-20">{icon}</div>
      <h3 className="text-lg text-text-secondary mb-2">{title}</h3>
      <p className="text-text-muted text-sm">{description}</p>
    </div>
  );
}
