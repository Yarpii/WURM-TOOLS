import { NextRequest, NextResponse } from "next/server";
import {
  calculateAdvancedMaterials,
  getSkillGrindingPath,
  findOptimalTrainingItem,
  calculateBatchEfficiency,
  getItem,
} from "@/lib/database";
import type { CraftingSettings } from "@/lib/types";

/**
 * Advanced Crafting Calculator API
 *
 * GET /api/advanced-calculate
 *
 * Query Parameters:
 * - item: Item ID (required)
 * - qty: Quantity to craft (default: 1)
 * - skill: Player skill level (default: 50)
 * - toolQL: Tool quality (default: 50)
 * - materialQL: Material quality (default: 50)
 * - sleepBonus: Has sleep bonus active (default: false)
 * - parentSkill: Parent skill level (default: 0)
 * - woa: Wind of Ages enchant power (default: 0)
 * - coc: Circle of Cunning power (default: 0)
 * - includeSkillPath: Include skill grinding path (default: false)
 * - targetSkill: Target skill for grinding path (default: skill + 20)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Required parameter
  const itemId = parseInt(searchParams.get("item") || "0");
  if (!itemId) {
    return NextResponse.json(
      { error: "Missing required parameter: item" },
      { status: 400 }
    );
  }

  // Check if item exists
  const item = await getItem(itemId);
  if (!item) {
    return NextResponse.json(
      { error: "Item not found" },
      { status: 404 }
    );
  }

  // Optional parameters with defaults
  const quantity = Math.max(1, Math.min(10000, parseInt(searchParams.get("qty") || "1")));

  // Crafting settings
  const settings: Partial<CraftingSettings> = {
    playerSkill: Math.max(1, Math.min(100, parseFloat(searchParams.get("skill") || "50"))),
    toolQL: Math.max(1, Math.min(100, parseFloat(searchParams.get("toolQL") || "50"))),
    materialQL: Math.max(1, Math.min(100, parseFloat(searchParams.get("materialQL") || "50"))),
    hasSleepBonus: searchParams.get("sleepBonus") === "true",
    parentSkill: Math.max(0, Math.min(100, parseFloat(searchParams.get("parentSkill") || "0"))),
    windOfAges: Math.max(0, Math.min(100, parseFloat(searchParams.get("woa") || "0"))),
    circleOfCunning: Math.max(0, Math.min(100, parseFloat(searchParams.get("coc") || "0"))),
  };

  // Calculate advanced materials
  const result = await calculateAdvancedMaterials(itemId, quantity, settings as CraftingSettings);

  if (!result) {
    return NextResponse.json(
      { error: "Failed to calculate materials" },
      { status: 500 }
    );
  }

  // Generate prediction summary for the frontend
  const difficulty = item.difficulty || 20;
  const playerSkill = settings.playerSkill || 50;
  const toolQL = settings.toolQL || 50;
  const materialQL = settings.materialQL || 50;

  // Calculate success chance
  const successChance = Math.min(100, Math.max(1, 50 + (playerSkill - difficulty)));

  // Success label
  const getSuccessLabel = (chance: number): string => {
    if (chance >= 90) return "Very Easy";
    if (chance >= 70) return "Easy";
    if (chance >= 50) return "Moderate";
    if (chance >= 30) return "Difficult";
    return "Very Hard";
  };

  // Quality calculations
  const averageQL = Math.min(100, playerSkill * 0.6 + toolQL * 0.2 + materialQL * 0.2);
  const minQL = Math.max(1, averageQL * 0.5);
  const maxQL = Math.min(100, averageQL * 1.3);

  // Time calculations
  const baseTime = item.base_time_seconds || 10;
  const totalActions = result.totalCraftingSteps * quantity;
  const woaModifier = settings.windOfAges ? 1 - (settings.windOfAges / 200) : 1;
  const timePerItem = baseTime * woaModifier;
  const totalTime = totalActions * timePerItem;

  // Format time
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  // Waste and failure calculations
  const failureRate = 100 - successChance;
  const wasteMultiplier = 1 + (failureRate / 100) * 0.5;

  // Tool repairs (rough estimate: 1 repair per 100 actions at avg skill)
  const repairsNeeded = Math.ceil(totalActions / (100 + playerSkill));

  // Skill gain calculations
  const skillDiff = difficulty - playerSkill;
  const gainPerAction = Math.max(0.001, 0.1 * Math.max(0, 1 + skillDiff / 50) * (settings.hasSleepBonus ? 3 : 1));
  const cocBonus = settings.circleOfCunning ? 1 + (settings.circleOfCunning / 100) : 1;
  const totalSkillGain = gainPerAction * totalActions * cocBonus;
  const newSkillLevel = Math.min(100, playerSkill + totalSkillGain);

  // Optimal difficulty check (skill - 20 to skill + 10 is optimal for training)
  const isOptimalDifficulty = difficulty >= playerSkill - 20 && difficulty <= playerSkill + 10;

  // Actions to next level
  const nextLevel = Math.ceil(playerSkill);
  const skillNeeded = nextLevel - playerSkill;
  const actionsToNextLevel = gainPerAction > 0 ? Math.ceil(skillNeeded / gainPerAction) : 999;

  const prediction = {
    successChance,
    successLabel: getSuccessLabel(successChance),
    averageQL,
    minQL,
    maxQL,
    totalTime,
    totalTimeFormatted: formatTime(totalTime),
    timePerItem,
    wasteMultiplier,
    failureRate,
    repairsNeeded,
    totalSkillGain,
    newSkillLevel,
    isOptimalDifficulty,
    actionsToNextLevel,
  };

  // Optionally include skill grinding path
  const includeSkillPath = searchParams.get("includeSkillPath") === "true";
  if (includeSkillPath) {
    const targetSkill = Math.min(
      100,
      parseFloat(searchParams.get("targetSkill") || String((settings.playerSkill || 50) + 20))
    );

    result.skillPath = await getSkillGrindingPath(
      targetSkill,
      settings.playerSkill || 50,
      item.categories?.[0]
    );
  }

  return NextResponse.json({
    item: {
      id: item.id,
      name: item.name,
      categories: item.categories
    },
    quantity,
    settings,
    prediction,
    ...result
  });
}

/**
 * POST /api/advanced-calculate
 *
 * Batch calculation or special operations
 *
 * Body:
 * {
 *   action: "optimal-training" | "batch-efficiency" | "compare-items",
 *   skill: number,
 *   category?: string,
 *   items?: number[],
 *   batchSize?: number,
 *   inventorySlots?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "optimal-training": {
        const skill = Math.max(1, Math.min(100, body.skill || 50));
        const category = body.category || undefined;
        const optimalItem = await findOptimalTrainingItem(skill, category);

        return NextResponse.json({
          action: "optimal-training",
          skill,
          category,
          recommendation: optimalItem ? {
            item: {
              id: optimalItem.id,
              name: optimalItem.name,
              categories: optimalItem.categories
            },
            isOptimal: true
          } : null
        });
      }

      case "batch-efficiency": {
        const itemId = body.itemId;
        const batchSize = Math.max(1, Math.min(1000, body.batchSize || 10));

        if (!itemId) {
          return NextResponse.json(
            { error: "Missing itemId for batch-efficiency calculation" },
            { status: 400 }
          );
        }

        const batchSettings: CraftingSettings = {
          playerSkill: Math.max(1, Math.min(100, body.skill || 50)),
          toolQL: Math.max(1, Math.min(100, body.toolQL || 50)),
          materialQL: Math.max(1, Math.min(100, body.materialQL || 50)),
          hasSleepBonus: body.sleepBonus === true,
          parentSkill: Math.max(0, Math.min(100, body.parentSkill || 0)),
          windOfAges: Math.max(0, Math.min(100, body.woa || 0)),
          circleOfCunning: Math.max(0, Math.min(100, body.coc || 0)),
        };

        const efficiency = await calculateBatchEfficiency(itemId, batchSize, batchSettings);

        return NextResponse.json({
          action: "batch-efficiency",
          itemId,
          batchSize,
          settings: batchSettings,
          ...efficiency
        });
      }

      case "compare-items": {
        const items = body.items as number[];
        const skill = Math.max(1, Math.min(100, body.skill || 50));
        const quantity = Math.max(1, body.quantity || 1);

        if (!items || items.length === 0) {
          return NextResponse.json(
            { error: "Missing items array for comparison" },
            { status: 400 }
          );
        }

        const settings: Partial<CraftingSettings> = {
          playerSkill: skill,
          toolQL: body.toolQL || 50,
          materialQL: body.materialQL || 50
        };

        const comparisons = await Promise.all(items.map(async (itemId) => {
          const result = await calculateAdvancedMaterials(itemId, quantity, settings as CraftingSettings);
          const item = await getItem(itemId);

          return {
            itemId,
            itemName: item?.name || "Unknown",
            result: result ? {
              successProbability: result.summary.successProbability,
              estimatedTime: result.summary.estimatedTime,
              totalMaterials: result.summary.totalMaterials,
              expectedWaste: result.summary.expectedWaste,
              craftingSteps: result.totalCraftingSteps
            } : null
          };
        }));

        return NextResponse.json({
          action: "compare-items",
          skill,
          quantity,
          comparisons
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
