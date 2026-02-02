import { query } from "./core";
import { getItem, getRecipe, getAllItems } from "./items";
import type {
  Item,
  CraftingNode,
  MaterialResult,
  CraftingSettings,
  AdvancedMaterialResult,
  CraftingPrediction,
  AdvancedCalculationResult,
  SkillGrindStep,
} from "../types";
import {
  calculateSuccessChance,
  getItemDifficulty,
  predictSkillGain,
  generateSkillPath,
  calculateSweetSpotQL,
} from "../wurm-formulas";

// ========== CALCULATOR FUNCTIONS ==========

export function formatQuantity(qty: number): string {
  if (Number.isInteger(qty)) return qty.toString();
  return qty.toFixed(2).replace(/\.?0+$/, "");
}

export async function calculateBaseMaterials(
  itemId: number,
  quantity: number = 1
): Promise<Map<number, number>> {
  const item = await getItem(itemId);
  if (!item) return new Map();

  if (item.is_base_material) {
    return new Map([[itemId, quantity]]);
  }

  const recipe = await getRecipe(itemId);
  if (recipe.length === 0) {
    return new Map([[itemId, quantity]]);
  }

  const materials = new Map<number, number>();

  for (const ingredient of recipe) {
    const needed = ingredient.quantity * quantity;
    const subMaterials = await calculateBaseMaterials(
      ingredient.ingredient_item_id,
      needed
    );

    for (const [matId, matQty] of subMaterials) {
      materials.set(matId, (materials.get(matId) || 0) + matQty);
    }
  }

  return materials;
}

export async function buildCraftingTree(
  itemId: number,
  quantity: number = 1,
  depth: number = 0
): Promise<CraftingNode | null> {
  const item = await getItem(itemId);
  if (!item) return null;

  const node: CraftingNode = {
    id: itemId,
    name: item.name,
    skill: item.skill,
    quantity,
    is_base: Boolean(item.is_base_material),
    depth,
    children: [],
  };

  if (item.is_base_material || depth > 10) {
    return node;
  }

  const recipe = await getRecipe(itemId);
  for (const ingredient of recipe) {
    const child = await buildCraftingTree(
      ingredient.ingredient_item_id,
      ingredient.quantity * quantity,
      depth + 1
    );
    if (child) {
      node.children.push(child);
    }
  }

  return node;
}

export async function getMaterialsList(
  itemId: number,
  quantity: number
): Promise<MaterialResult[]> {
  const materials = await calculateBaseMaterials(itemId, quantity);
  const results: MaterialResult[] = [];

  for (const [matId, qty] of materials) {
    const item = await getItem(matId);
    if (item) {
      results.push({
        id: item.id,
        name: item.name,
        skill: item.skill,
        quantity: qty,
        formatted: formatQuantity(qty),
        is_base: Boolean(item.is_base_material),
      });
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getDirectIngredients(
  itemId: number,
  quantity: number = 1
): Promise<MaterialResult[]> {
  const recipe = await getRecipe(itemId);
  const results: MaterialResult[] = [];

  for (const ingredient of recipe) {
    const item = await getItem(ingredient.ingredient_item_id);
    if (item) {
      const qty = ingredient.quantity * quantity;
      results.push({
        id: item.id,
        name: item.name,
        skill: item.skill,
        quantity: qty,
        formatted: formatQuantity(qty),
        is_base: Boolean(item.is_base_material),
      });
    }
  }

  return results;
}

export async function buildShallowCraftingTree(
  itemId: number,
  quantity: number = 1
): Promise<CraftingNode | null> {
  const item = await getItem(itemId);
  if (!item) return null;

  const node: CraftingNode = {
    id: itemId,
    name: item.name,
    skill: item.skill,
    quantity,
    is_base: Boolean(item.is_base_material),
    depth: 0,
    children: [],
  };

  const recipe = await getRecipe(itemId);
  for (const ingredient of recipe) {
    const ingredientItem = await getItem(ingredient.ingredient_item_id);
    if (ingredientItem) {
      node.children.push({
        id: ingredientItem.id,
        name: ingredientItem.name,
        skill: ingredientItem.skill,
        quantity: ingredient.quantity * quantity,
        is_base: Boolean(ingredientItem.is_base_material),
        depth: 1,
        children: [],
      });
    }
  }

  return node;
}

// ========== ADVANCED CRAFTING CALCULATIONS ==========

export async function calculateAdvancedMaterials(
  itemId: number,
  quantity: number,
  settings: CraftingSettings
): Promise<AdvancedCalculationResult> {
  const item = await getItem(itemId);
  if (!item) {
    return {
      materials: [],
      totalCraftingSteps: 0,
      predictions: [],
      summary: {
        estimatedTime: 0,
        totalMaterials: 0,
        uniqueMaterials: 0,
        expectedWaste: 0,
        successProbability: 1,
      },
    };
  }

  const baseMaterials = await getMaterialsList(itemId, quantity);
  const advancedMaterials: AdvancedMaterialResult[] = [];

  for (const material of baseMaterials) {
    // Calculate waste factor based on skill vs difficulty
    const difficulty = item.difficulty || 20;
    const skillDiff = settings.playerSkill - difficulty;
    // Simplified waste calculation: higher skill = less waste
    const wasteMultiplier = Math.max(0, Math.min(1, (50 - skillDiff) / 100));
    const expectedQuantity = material.quantity * (1 + wasteMultiplier);
    const worstCaseQuantity = material.quantity * (1 + wasteMultiplier * 1.5);

    advancedMaterials.push({
      ...material,
      expectedQuantity,
      expectedFormatted: formatQuantity(expectedQuantity),
      worstCaseQuantity,
      worstCaseFormatted: formatQuantity(worstCaseQuantity),
    });
  }

  const craftingTree = await buildCraftingTree(itemId, quantity);
  const predictions: CraftingPrediction[] = [];
  let totalSteps = 0;

  if (craftingTree) {
    const collectPredictions = async (node: CraftingNode) => {
      if (!node.is_base) {
        totalSteps++;
        const nodeItem = await getItem(node.id);
        const difficulty = nodeItem?.difficulty || getItemDifficulty(node.name);

        // Simplified success chance calculation
        const successChance = Math.min(100, Math.max(1, 50 + (settings.playerSkill - difficulty)));

        predictions.push({
          itemName: node.name,
          quantity: node.quantity,
          successChance,
          qualityPrediction: Math.min(100, settings.playerSkill * 0.8 + settings.toolQL * 0.2),
          estimatedTime: (nodeItem?.base_time || 10) * node.quantity,
          expectedAttempts: node.quantity / (successChance / 100),
        });
      }

      for (const child of node.children) {
        await collectPredictions(child);
      }
    };

    await collectPredictions(craftingTree);
  }

  const totalTime = predictions.reduce((sum, p) => sum + p.estimatedTime, 0);
  const avgSuccess = predictions.length > 0
    ? predictions.reduce((sum, p) => sum + p.successChance, 0) / predictions.length
    : 1;

  return {
    materials: advancedMaterials,
    totalCraftingSteps: totalSteps,
    predictions,
    summary: {
      estimatedTime: totalTime,
      totalMaterials: advancedMaterials.reduce((sum, m) => sum + m.expectedQuantity, 0),
      uniqueMaterials: advancedMaterials.length,
      expectedWaste: advancedMaterials.reduce(
        (sum, m) => sum + (m.expectedQuantity - m.quantity),
        0
      ),
      successProbability: avgSuccess,
    },
  };
}

export async function getSkillGrindingPath(
  targetSkill: number,
  currentSkill: number,
  preferredCategory?: string
): Promise<SkillGrindStep[]> {
  const pathSteps = generateSkillPath(currentSkill, targetSkill);

  const steps: SkillGrindStep[] = [];
  let skill = currentSkill;

  // Find items that match the preferred category
  const items = preferredCategory
    ? (await getAllItems()).filter(i => i.category === preferredCategory)
    : await getAllItems();

  for (const step of pathSteps) {
    // Find a suitable item for this skill range
    const suitableItem = items.find(i => {
      const diff = i.difficulty || 20;
      return diff >= step.targetQL - 10 && diff <= step.targetQL + 10;
    }) || items[0];

    if (!suitableItem) continue;

    const difficulty = suitableItem.difficulty || getItemDifficulty(suitableItem.name);
    // Use default action time of 10 seconds and 1 action
    const skillGainPrediction = predictSkillGain(skill, difficulty, 10, 1, false);
    const gainPerItem = skillGainPrediction.gainPerAction || 0.01;
    const itemsNeeded = Math.ceil((step.skillRange.to - skill) / gainPerItem);

    steps.push({
      itemName: suitableItem.name,
      itemId: suitableItem.id,
      startSkill: skill,
      targetSkill: Math.min(skill + gainPerItem * itemsNeeded, targetSkill),
      estimatedItems: Math.min(itemsNeeded, 100),
      skillGainPerItem: gainPerItem,
      difficulty,
    });

    skill += gainPerItem * itemsNeeded;
    if (skill >= targetSkill) break;
  }

  return steps;
}

export async function findOptimalTrainingItem(
  currentSkill: number,
  preferredCategory?: string
): Promise<Item | null> {
  const items = await getAllItems();
  let bestItem: Item | null = null;
  let bestScore = -1;

  const optimalDifficulty = currentSkill + 15;

  for (const item of items) {
    if (preferredCategory && item.category !== preferredCategory) continue;

    const difficulty = item.difficulty || getItemDifficulty(item.name);
    const difficultyDelta = Math.abs(difficulty - optimalDifficulty);
    const score = 100 - difficultyDelta;

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestItem;
}

export async function findOptimalTrainingItems(
  currentSkill: number,
  preferredCategory?: string,
  limit: number = 10
): Promise<{ id: number; name: string; category: string; difficulty: number; successChance: number; isInSweetSpot: boolean }[]> {
  const items = await getAllItems();
  const sweetSpotQL = calculateSweetSpotQL(currentSkill);
  const optimalDifficulty = currentSkill + 15;

  const scoredItems: { item: Item; score: number; difficulty: number; successChance: number; isInSweetSpot: boolean }[] = [];

  for (const item of items) {
    if (preferredCategory && item.category !== preferredCategory) continue;

    const difficulty = item.difficulty || getItemDifficulty(item.name);
    const difficultyDelta = Math.abs(difficulty - optimalDifficulty);
    const score = 100 - difficultyDelta;

    const successChance = calculateSuccessChance({
      skill: currentSkill,
      difficulty,
      toolQL: 50,
      materialQL: 50
    });

    const isInSweetSpot = difficulty >= sweetSpotQL && difficulty <= sweetSpotQL + 10;

    scoredItems.push({ item, score, difficulty, successChance: Math.round(successChance), isInSweetSpot });
  }

  // Sort by score (highest first) and take top items
  scoredItems.sort((a, b) => b.score - a.score);

  return scoredItems.slice(0, limit).map(({ item, difficulty, successChance, isInSweetSpot }) => ({
    id: item.id,
    name: item.name,
    category: item.category ?? "misc",
    difficulty,
    successChance,
    isInSweetSpot
  }));
}

export async function calculateBatchEfficiency(
  itemId: number,
  batchSize: number,
  settings: CraftingSettings
): Promise<{
  singleItemTime: number;
  batchTime: number;
  efficiency: number;
  materialsPerItem: MaterialResult[];
  totalMaterials: MaterialResult[];
}> {
  const item = await getItem(itemId);
  if (!item) {
    return {
      singleItemTime: 0,
      batchTime: 0,
      efficiency: 0,
      materialsPerItem: [],
      totalMaterials: [],
    };
  }

  const baseTime = item.base_time || 10;
  // Simplified time calculation based on skill
  const skillMod = Math.max(0.5, 1 - (settings.playerSkill / 200));
  const singleItemTime = baseTime * skillMod;
  const batchTime = singleItemTime * batchSize * 0.95;

  const materialsPerItem = await getMaterialsList(itemId, 1);
  const totalMaterials = await getMaterialsList(itemId, batchSize);

  return {
    singleItemTime,
    batchTime,
    efficiency: (singleItemTime * batchSize) / batchTime,
    materialsPerItem,
    totalMaterials,
  };
}
