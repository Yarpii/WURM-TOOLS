import { NextRequest, NextResponse } from "next/server";
import {
  getSkillGrindingPath,
  findOptimalTrainingItem,
  findOptimalTrainingItems,
  getItem,
  getAllItems,
  getMaterialsList,
} from "@/lib/database";
import {
  calculateEffectiveSkill,
  calculateMaxCreationQL,
  calculateSweetSpotQL,
  calculateCraftingTime,
  predictSkillGain,
  generateSkillPath,
  SKILL_TREE,
} from "@/lib/wurm-formulas";

/**
 * Skill Optimizer API
 *
 * Provides advanced skill analysis and optimization recommendations
 */

/**
 * GET /api/skill-optimizer
 *
 * Query Parameters:
 * - skill: Current skill level (required)
 * - targetSkill: Target skill level (default: skill + 20)
 * - category: Filter items by category (optional)
 * - itemId: Specific item to analyze (optional)
 * - toolQL: Tool quality for calculations (default: 50)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const currentSkill = parseFloat(searchParams.get("skill") || "0");
  if (!currentSkill && currentSkill !== 0) {
    return NextResponse.json(
      { error: "Missing required parameter: skill" },
      { status: 400 }
    );
  }

  const clampedSkill = Math.max(1, Math.min(99, currentSkill));
  const targetSkill = Math.min(100, parseFloat(searchParams.get("targetSkill") || String(clampedSkill + 20)));
  const category = searchParams.get("category") || undefined;
  const itemId = searchParams.get("itemId") ? parseInt(searchParams.get("itemId")!) : undefined;
  const toolQL = Math.max(1, Math.min(100, parseFloat(searchParams.get("toolQL") || "50")));

  // Calculate skill metrics
  const effectiveSkill = calculateEffectiveSkill(clampedSkill);
  const maxCreationQL = calculateMaxCreationQL(clampedSkill);
  const sweetSpotQL = calculateSweetSpotQL(clampedSkill);

  // Find optimal training items
  const optimalItem = await findOptimalTrainingItem(clampedSkill, category);
  const optimalItems = await findOptimalTrainingItems(clampedSkill, category, 10);

  // Generate skill path
  const skillPath = generateSkillPath(clampedSkill, targetSkill, toolQL);

  // Calculate total resources needed for path using decompiled time formulas
  let totalActions = 0;
  let totalTime = 0;

  for (const step of skillPath) {
    totalActions += step.actionsNeeded;
    totalTime += step.estimatedTimeSeconds;
  }

  // Format total time
  const hours = Math.floor(totalTime / 3600);
  const minutes = Math.floor((totalTime % 3600) / 60);
  const formattedTotalTime = hours > 0
    ? `${hours}h ${minutes}m`
    : `${minutes}m`;

  // If specific item requested, get detailed path
  let itemSpecificPath = null;
  if (itemId) {
    const item = await getItem(itemId);
    if (item) {
      itemSpecificPath = await getSkillGrindingPath(targetSkill, clampedSkill, item.category ?? undefined);
    }
  }

  return NextResponse.json({
    currentSkill: clampedSkill,
    targetSkill,
    toolQL,

    // Skill metrics
    metrics: {
      effectiveSkill: Math.round(effectiveSkill * 10) / 10,
      maxCreationQL: Math.round(maxCreationQL * 10) / 10,
      sweetSpotQL: Math.round(sweetSpotQL * 10) / 10,
      sweetSpotRange: {
        min: Math.round(sweetSpotQL),
        max: Math.round(sweetSpotQL + 10)
      }
    },

    // Optimal item for training (single best)
    optimalItem: optimalItem ? {
      id: optimalItem.id,
      name: optimalItem.name,
      category: optimalItem.category
    } : null,

    // Multiple optimal items for training
    optimalItems,

    // General skill path
    skillPath: skillPath.map(step => ({
      from: step.skillRange.from,
      to: step.skillRange.to,
      targetQL: step.targetQL,
      actionsNeeded: step.actionsNeeded,
      successRate: step.successRate,
      description: step.description
    })),

    // Totals
    summary: {
      totalActions,
      totalTime: formattedTotalTime,
      skillGain: targetSkill - clampedSkill
    },

    // Item-specific path if requested
    itemSpecificPath
  });
}

/**
 * POST /api/skill-optimizer
 *
 * Advanced skill planning operations
 *
 * Body:
 * {
 *   action: "full-plan" | "compare-methods" | "time-to-target",
 *   currentSkill: number,
 *   targetSkill: number,
 *   availableItems?: number[],
 *   hoursPerDay?: number,
 *   hasSleepBonus?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const currentSkill = Math.max(1, Math.min(99, body.currentSkill || 50));
    const targetSkill = Math.min(100, body.targetSkill || currentSkill + 20);
    const toolQL = body.toolQL || 50;

    switch (action) {
      case "full-plan": {
        // Generate a comprehensive training plan
        const hoursPerDay = body.hoursPerDay || 2;
        const hasSleepBonus = body.hasSleepBonus || false;

        // Find best items for each skill range
        const ranges: { from: number; to: number; item: { id: number; name: string; category: string } | null }[] = [];

        for (let skill = currentSkill; skill < targetSkill; skill += 5) {
          const endSkill = Math.min(skill + 5, targetSkill);
          const optimal = await findOptimalTrainingItem(skill);

          ranges.push({
            from: skill,
            to: endSkill,
            item: optimal ? { id: optimal.id, name: optimal.name, category: optimal.category ?? "misc" } : null
          });
        }

        // Calculate estimated time using decompiled formulas
        const skillPath = generateSkillPath(currentSkill, targetSkill, toolQL);
        let totalActions = 0;
        let totalSeconds = 0;
        skillPath.forEach(step => {
          totalActions += step.actionsNeeded;
          totalSeconds += step.estimatedTimeSeconds;
        });

        const totalHours = totalSeconds / 3600;
        const daysNeeded = Math.ceil(totalHours / hoursPerDay);

        // Sleep bonus doubles gains, so halves time
        const adjustedDays = hasSleepBonus ? Math.ceil(daysNeeded / 2) : daysNeeded;

        return NextResponse.json({
          action: "full-plan",
          currentSkill,
          targetSkill,
          hoursPerDay,
          hasSleepBonus,

          plan: {
            ranges: ranges.map(r => ({
              skillRange: `${r.from} - ${r.to}`,
              recommendedItem: r.item ? {
                id: r.item.id,
                name: r.item.name,
                category: r.item.category
              } : null
            })),

            estimates: {
              totalActions,
              totalHours: Math.round(totalHours * 10) / 10,
              daysNeeded: adjustedDays,
              disclaimer: "Estimates based on average conditions. Actual time may vary."
            }
          }
        });
      }

      case "compare-methods": {
        // Compare different training methods
        const methods = [
          { name: "Create new items", multiplier: 1.0 },
          { name: "Improve items (sweet spot)", multiplier: 2.0 },
          { name: "Improve + Sleep Bonus", multiplier: 4.0 },
          { name: "Create + Sleep Bonus", multiplier: 2.0 }
        ];

        const baseSkillGain = predictSkillGain(currentSkill, currentSkill + 10, 10, 100, false);
        const baseActionsNeeded = Math.ceil((targetSkill - currentSkill) / baseSkillGain.totalGain * 100);

        // Calculate time per action using decompiled formula (includes +3s base)
        const timePerAction = calculateCraftingTime(
          "default_create", 1, currentSkill, toolQL
        ).modifiedTimeSeconds;

        return NextResponse.json({
          action: "compare-methods",
          currentSkill,
          targetSkill,

          comparison: methods.map(method => ({
            method: method.name,
            multiplier: method.multiplier,
            estimatedActions: Math.ceil(baseActionsNeeded / method.multiplier),
            estimatedHours: Math.round((baseActionsNeeded / method.multiplier * timePerAction) / 3600 * 10) / 10,
            recommendation: method.multiplier >= 2.0 ? "Recommended" : "Standard"
          }))
        });
      }

      case "time-to-target": {
        // Calculate time to reach target skill using decompiled formulas
        const path = generateSkillPath(currentSkill, targetSkill, toolQL);

        let totalActions = 0;
        let totalTimeSeconds = 0;
        const breakdown: { skill: number; actions: number; cumulativeHours: number }[] = [];

        path.forEach(step => {
          totalActions += step.actionsNeeded;
          totalTimeSeconds += step.estimatedTimeSeconds;
          breakdown.push({
            skill: step.skillRange.to,
            actions: step.actionsNeeded,
            cumulativeHours: Math.round(totalTimeSeconds / 3600 * 10) / 10
          });
        });

        return NextResponse.json({
          action: "time-to-target",
          currentSkill,
          targetSkill,

          result: {
            totalActions,
            totalHours: Math.round(totalTimeSeconds / 3600 * 10) / 10,
            breakdown
          }
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
