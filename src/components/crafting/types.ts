import type { MaterialResult } from "@/lib/types";

export type Tab = "calculator" | "advanced" | "optimizer" | "tree" | "session";
export type CalcMode = "calculate" | "reverse";
export type MaterialMode = "easy" | "full";
export type ViewMode = "expected" | "base" | "worstCase";

export interface AdvancedMaterialResult extends MaterialResult {
  expectedQuantity: number;
  expectedFormatted: string;
  worstCaseQuantity: number;
  worstCaseFormatted: string;
}

export interface CraftingPrediction {
  successChance: number;
  successLabel: string;
  averageQL: number;
  minQL: number;
  maxQL: number;
  totalTimeFormatted: string;
  timePerItem: number;
  failureRate: number;
  wasteMultiplier: number;
  repairsNeeded: number;
  totalSkillGain: number;
  newSkillLevel: number;
  actionsToNextLevel: number;
  isOptimalDifficulty: boolean;
}

export interface AdvancedResult {
  item: {
    id: number;
    name: string;
    difficulty?: number | null;
    skill_type?: string | null;
    base_time?: number | null;
    tool_type?: string | null;
  };
  quantity: number;
  baseMaterials: AdvancedMaterialResult[];
  expectedMaterials: AdvancedMaterialResult[];
  prediction: CraftingPrediction;
  skillPath?: SkillGrindStep[];
}

export interface SkillGrindStep {
  skillFrom: number;
  skillTo: number;
  targetQL: number;
  actionsNeeded: number;
  successRate: number;
  description: string;
  materialsNeeded: number;
  timeEstimate: string;
}

export interface SkillMetrics {
  effectiveSkill: number;
  maxCreationQL: number;
  sweetSpotQL: number;
  sweetSpotRange: { min: number; max: number };
}

export interface OptimalItem {
  id: number;
  name: string;
  category: string;
  difficulty: number;
  successChance: number;
  isInSweetSpot: boolean;
}

export interface SkillPathStep {
  from: number;
  to: number;
  targetQL: number;
  actionsNeeded: number;
  successRate: number;
  description: string;
}

export interface OptimizerResult {
  currentSkill: number;
  targetSkill: number;
  metrics: SkillMetrics;
  optimalItems: OptimalItem[];
  skillPath: SkillPathStep[];
  summary: {
    totalActions: number;
    totalTime: string;
    skillGain: number;
  };
}

// Shared UI component props
export interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface StatBoxProps {
  label: string;
  value: string | number;
  subtext?: string;
  color?: "accent" | "success" | "warning" | "info";
}
