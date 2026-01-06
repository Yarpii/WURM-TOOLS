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
      item.category
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
              successChance: result.prediction.successChance,
              averageQL: result.prediction.averageQL,
              totalTime: result.prediction.totalTimeFormatted,
              failureRate: result.prediction.failureRate,
              totalSkillGain: result.prediction.totalSkillGain
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
