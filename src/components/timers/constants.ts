import {
  Moon,
  BatteryCharging,
  Wheat,
  PawPrint,
  BookOpen,
  Brain,
  Timer,
  Package,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TimerType } from "@/lib/types";

export interface TimerTypeInfo {
  value: TimerType;
  label: string;
  icon: LucideIcon;
  color: string;
}

export const TIMER_TYPES: TimerTypeInfo[] = [
  { value: "sleep_bonus", label: "Sleep Bonus", icon: Moon, color: "#22c55e" },
  { value: "fatigue", label: "Fatigue", icon: BatteryCharging, color: "#3b82f6" },
  { value: "crop", label: "Crop", icon: Wheat, color: "#eab308" },
  { value: "animal", label: "Animal", icon: PawPrint, color: "#a855f7" },
  { value: "sermon", label: "Sermon", icon: BookOpen, color: "#ef4444" },
  { value: "meditation", label: "Meditation", icon: Brain, color: "#6366f1" },
  { value: "cooldown", label: "Cooldown", icon: Timer, color: "#14b8a6" },
  { value: "bulk", label: "Bulk", icon: Package, color: "#f97316" },
  { value: "custom", label: "Custom", icon: Settings, color: "#6b7280" },
];

export function getTimerTypeInfo(type: string): TimerTypeInfo {
  return TIMER_TYPES.find((t) => t.value === type) || TIMER_TYPES[TIMER_TYPES.length - 1];
}
