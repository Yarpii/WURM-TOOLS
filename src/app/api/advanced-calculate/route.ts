import { NextRequest, NextResponse } from "next/server";
import {
  calculateAdvancedMaterials,
  getSkillGrindingPath,
  findOptimalTrainingItem,
  calculateBatchEfficiency,
  getItem,
} from "@/lib/database";
import type { CraftingSettings } from "@/lib/types";
import {
  calculateSuccessChance,
  getSuccessCategory,
  predictCraftingQuality,
  calculateCraftingTime,
  calculateToolWear,
  predictSkillGain,
  calculateMaterialWaste,
} from "@/lib/wurm-formulas";

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

  // Generate prediction summary using proper Wurm formulas
  const difficulty = item.difficulty || 20;
  const playerSkill = settings.playerSkill || 50;
  const toolQL = settings.toolQL || 50;
  const materialQL = settings.materialQL || 50;
  const baseTime = item.base_time || 10;

  // Success chance using The Curve and proper tool/material bonuses
  const successChance = calculateSuccessChance({
    skill: playerSkill,
    difficulty,
    toolQL,
    materialQL,
    parentSkillBonus: settings.parentSkill || 0,
  });
  const successCategory = getSuccessCategory(successChance);

  // Quality prediction using Gaussian skill check model
  const quality = predictCraftingQuality(playerSkill, toolQL, materialQL, difficulty);

  // Time calculation with skill, tool QL, and WoA modifiers
  const totalActions = result.totalCraftingSteps * quantity;
  const timeResult = calculateCraftingTime(
    "default_create",
    totalActions,
    playerSkill,
    toolQL,
    quality.averageQL,
    settings.windOfAges || 0
  );

  // Material waste based on actual success rate
  const wasteResult = calculateMaterialWaste(quantity, 1, successChance);
  const failureRate = 100 - successChance;
  const wasteMultiplier = wasteResult.expectedQuantity / Math.max(1, quantity);

  // Tool wear using proper formula (accounts for difficulty, tool QL, CoC)
  const toolWearResult = calculateToolWear(
    totalActions,
    toolQL,
    difficulty,
    settings.circleOfCunning || 0
  );

  // Skill gain using proper formula (accounts for sweet spot, action time, skill decay)
  const skillGainResult = predictSkillGain(
    playerSkill,
    difficulty,
    timeResult.modifiedTimeSeconds,
    totalActions,
    settings.hasSleepBonus || false
  );
  // Apply Circle of Cunning bonus to skill gain
  const cocBonus = settings.circleOfCunning ? 1 + (settings.circleOfCunning / 100) : 1;
  const totalSkillGain = skillGainResult.totalGain * cocBonus;
  const newSkillLevel = Math.min(100, playerSkill + totalSkillGain);

  const prediction = {
    successChance,
    successLabel: successCategory.label,
    averageQL: quality.averageQL,
    minQL: quality.minQL,
    maxQL: quality.maxQL,
    totalTime: timeResult.totalTimeSeconds,
    totalTimeFormatted: timeResult.totalTimeFormatted,
    timePerItem: timeResult.modifiedTimeSeconds,
    wasteMultiplier,
    failureRate,
    repairsNeeded: toolWearResult.repairsNeeded,
    totalSkillGain,
    newSkillLevel,
    isOptimalDifficulty: skillGainResult.isOptimalDifficulty,
    actionsToNextLevel: skillGainResult.actionsToNextLevel,
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
      item.category ?? undefined
    );
  }

  return NextResponse.json({
    item: {
      id: item.id,
      name: item.name,
      category: item.category
    },
    quantity,
    settings,
    prediction,
    // Map result fields to expected frontend names
    baseMaterials: result.materials,
    expectedMaterials: result.materials,
    totalCraftingSteps: result.totalCraftingSteps,
    predictions: result.predictions,
    summary: result.summary,
    skillPath: result.skillPath || []
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
              category: optimalItem.category
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
