/**
 * Database Module - MySQL/MariaDB
 *
 * This module provides database functions for the WURM-TOOLS application.
 * All functions are async and use the MySQL connection pool.
 */

// Re-export unified query functions from db/core
export { query, getClient, withTransaction, getMySQLPool, closeConnections } from "./db/core";
export type { QueryResult, DbClient } from "./db/core";

import { query, withTransaction } from "./db/core";

import type {
  Item,
  Recipe,
  RecipeWithNames,
  CraftingNode,
  MaterialResult,
  CraftableResult,
  ImportStats,
  CsvPreviewResult,
  CraftingSettings,
  AdvancedMaterialResult,
  CraftingPrediction,
  AdvancedCalculationResult,
  SkillGrindStep,
  MarketOrder,
  CreateOrderInput,
  OrderType,
  OrderStatus,
  Merchant,
  CreateMerchantInput,
  MerchantCategory,
  Alliance,
  AllianceMember,
  AllianceInvite,
  AllianceRole,
  InviteStatus,
  CreateAllianceInput,
  UpdateAllianceInput,
  PriceHistory,
  PriceAnalytics,
  TrendingItem,
  PriceAlert,
  CreatePriceAlertInput,
  Project,
  ProjectItem,
  ProjectMaterial,
  ProjectStatus,
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectItemInput,
  TradeMatch,
  MatchStatus,
  UserRating,
  UserReputation,
  CreateRatingInput,
  BarterSuggestion,
  MapLocation,
  LocationType,
  WurmServer,
  CreateLocationInput,
  UpdateLocationInput,
  Achievement,
  UserAchievement,
  UserXP,
  LeaderboardEntry,
  AchievementCategory,
  DiscordWebhook,
  CreateWebhookInput,
  DiscordEmbed,
  ProspectPage,
  Prospect,
  ProspectWithPage,
  ProspectStats,
  ProspectStatus,
  ProspectPriority,
  CreateProspectPageInput,
  UpdateProspectPageInput,
  CreateProspectInput,
  UpdateProspectInput,
  RecipeSubmission,
  RecipeSubmissionStatus,
  CreateRecipeSubmissionInput,
  ReviewRecipeSubmissionInput,
} from "./types";
import {
  calculateSuccessChance,
  getSuccessCategory,
  predictCraftingQuality,
  calculateMaterialWaste,
  calculateCraftingTime,
  calculateToolWear,
  predictSkillGain,
  generateSkillPath,
  getItemDifficulty,
} from "./wurm-formulas";

// ========== PAGINATION TYPES ==========

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// SECURITY: Default and maximum limits to prevent DoS
const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;

function validatePagination(params?: PaginationParams): { offset: number; limit: number; page: number } {
  const page = Math.max(1, Math.floor(params?.page || 1));
  const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Math.floor(params?.limit || DEFAULT_PAGE_LIMIT)));
  const offset = (page - 1) * limit;
  return { offset, limit, page };
}

// ========== QUERY FUNCTIONS ==========

export async function getAllItems(): Promise<Item[]> {
  const result = await query<Item>("SELECT * FROM items ORDER BY name");
  return result.rows;
}

export async function getItemsPaginated(params?: PaginationParams): Promise<PaginatedResult<Item>> {
  const { offset, limit, page } = validatePagination(params);

  const countResult = await query<{ count: number }>("SELECT COUNT(*) as count FROM items");
  const total = countResult.rows[0]?.count || 0;

  const dataResult = await query<Item>("SELECT * FROM items ORDER BY name LIMIT ? OFFSET ?", [limit, offset]);

  return {
    data: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getItem(id: number): Promise<Item | undefined> {
  const result = await query<Item>("SELECT * FROM items WHERE id = ?", [id]);
  return result.rows[0];
}

export async function getItemByName(name: string): Promise<Item | undefined> {
  const result = await query<Item>("SELECT * FROM items WHERE LOWER(name) = LOWER(?)", [name]);
  return result.rows[0];
}

export async function searchItems(searchQuery: string): Promise<Item[]> {
  const result = await query<Item>(
    "SELECT * FROM items WHERE LOWER(name) LIKE LOWER(?) ORDER BY name",
    [`%${searchQuery}%`]
  );
  return result.rows;
}

export async function getCategories(): Promise<string[]> {
  const result = await query<{ category: string }>(
    "SELECT DISTINCT category FROM items ORDER BY category"
  );
  return result.rows.map((r) => r.category);
}

export async function getRecipe(itemId: number): Promise<Recipe[]> {
  const result = await query<Recipe>("SELECT * FROM recipes WHERE result_item_id = ?", [itemId]);
  return result.rows;
}

export async function getAllRecipes(): Promise<RecipeWithNames[]> {
  const result = await query<RecipeWithNames>(`
    SELECT
      r.*,
      ri.name as result_name,
      ii.name as ingredient_name
    FROM recipes r
    JOIN items ri ON r.result_item_id = ri.id
    JOIN items ii ON r.ingredient_item_id = ii.id
    ORDER BY ri.name, ii.name
  `);
  return result.rows;
}

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
    category: item.category,
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
        category: item.category,
        quantity: qty,
        formatted_quantity: formatQuantity(qty),
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
        category: item.category,
        quantity: qty,
        formatted_quantity: formatQuantity(qty),
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
    category: item.category,
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
        category: ingredientItem.category,
        quantity: ingredient.quantity * quantity,
        is_base: Boolean(ingredientItem.is_base_material),
        depth: 1,
        children: [],
      });
    }
  }

  return node;
}

export async function findCraftableFrom(itemId: number): Promise<CraftableResult[]> {
  const result = await query<{ result_item_id: number; quantity: number }>(
    "SELECT result_item_id, quantity FROM recipes WHERE ingredient_item_id = ?",
    [itemId]
  );

  const craftable: CraftableResult[] = [];
  for (const row of result.rows) {
    const item = await getItem(row.result_item_id);
    if (item) {
      craftable.push({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity_needed: row.quantity,
      });
    }
  }

  return craftable;
}

export async function findAllCraftableFrom(
  itemId: number,
  visited: Set<number> = new Set()
): Promise<CraftableResult[]> {
  if (visited.has(itemId)) return [];
  visited.add(itemId);

  const direct = await findCraftableFrom(itemId);
  const all: CraftableResult[] = [...direct];

  for (const item of direct) {
    const nested = await findAllCraftableFrom(item.id, visited);
    for (const nestedItem of nested) {
      if (!all.some((a) => a.id === nestedItem.id)) {
        all.push(nestedItem);
      }
    }
  }

  return all;
}

// ========== CRUD FUNCTIONS ==========

export async function addItem(
  name: string,
  category: string = "misc",
  isBaseMaterial: boolean = false,
  description: string = ""
): Promise<number> {
  await query(
    "INSERT INTO items (name, category, is_base_material, description) VALUES (?, ?, ?, ?)",
    [name, category, isBaseMaterial ? 1 : 0, description]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function updateItem(
  id: number,
  name: string,
  category: string,
  isBaseMaterial: boolean,
  description: string
): Promise<boolean> {
  const result = await query(
    "UPDATE items SET name = ?, category = ?, is_base_material = ?, description = ? WHERE id = ?",
    [name, category, isBaseMaterial ? 1 : 0, description, id]
  );
  return result.rowCount > 0;
}

export async function updateItemCraftingData(
  id: number,
  data: {
    difficulty?: number;
    skill_type?: string;
    base_time?: number;
    tool_type?: string;
  }
): Promise<boolean> {
  const fields: string[] = [];
  const values: (number | string | null)[] = [];

  if (data.difficulty !== undefined) {
    fields.push("difficulty = ?");
    values.push(data.difficulty);
  }
  if (data.skill_type !== undefined) {
    fields.push("skill_type = ?");
    values.push(data.skill_type);
  }
  if (data.base_time !== undefined) {
    fields.push("base_time = ?");
    values.push(data.base_time);
  }
  if (data.tool_type !== undefined) {
    fields.push("tool_type = ?");
    values.push(data.tool_type);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const result = await query(
    `UPDATE items SET ${fields.join(", ")} WHERE id = ?`,
    values
  );
  return result.rowCount > 0;
}

export async function deleteItem(id: number): Promise<boolean> {
  await query("DELETE FROM recipes WHERE result_item_id = ? OR ingredient_item_id = ?", [id, id]);
  const result = await query("DELETE FROM items WHERE id = ?", [id]);
  return result.rowCount > 0;
}

export async function addRecipeIngredient(
  resultId: number,
  ingredientId: number,
  quantity: number
): Promise<number | null> {
  const existing = await query<{ id: number }>(
    "SELECT id FROM recipes WHERE result_item_id = ? AND ingredient_item_id = ?",
    [resultId, ingredientId]
  );

  if (existing.rows.length > 0) return null;

  await query(
    "INSERT INTO recipes (result_item_id, ingredient_item_id, quantity) VALUES (?, ?, ?)",
    [resultId, ingredientId, quantity]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || null;
}

export async function updateRecipeIngredient(
  recipeId: number,
  quantity: number
): Promise<boolean> {
  const result = await query("UPDATE recipes SET quantity = ? WHERE id = ?", [quantity, recipeId]);
  return result.rowCount > 0;
}

export async function deleteRecipeIngredient(recipeId: number): Promise<boolean> {
  const result = await query("DELETE FROM recipes WHERE id = ?", [recipeId]);
  return result.rowCount > 0;
}

// ========== EXPORT/IMPORT FUNCTIONS ==========

export async function exportToJson(): Promise<{
  items: Item[];
  recipes: RecipeWithNames[];
}> {
  const items = await getAllItems();
  const recipes = await getAllRecipes();
  return { items, recipes };
}

export async function importFromJson(data: {
  items: Partial<Item>[];
  recipes: { result_name: string; ingredient_name: string; quantity: number }[];
}): Promise<ImportStats> {
  const stats: ImportStats = {
    items_added: 0,
    items_updated: 0,
    items_failed: 0,
    recipes_added: 0,
    recipes_updated: 0,
    recipes_failed: 0,
  };

  for (const item of data.items) {
    if (!item.name) {
      stats.items_failed++;
      continue;
    }

    try {
      const existing = await getItemByName(item.name);
      if (existing) {
        await updateItem(
          existing.id,
          item.name,
          item.category || existing.category,
          Boolean(item.is_base_material ?? existing.is_base_material),
          item.description || existing.description || ""
        );
        stats.items_updated++;
      } else {
        await addItem(
          item.name,
          item.category || "misc",
          Boolean(item.is_base_material),
          item.description || ""
        );
        stats.items_added++;
      }
    } catch {
      stats.items_failed++;
    }
  }

  for (const recipe of data.recipes) {
    try {
      const resultItem = await getItemByName(recipe.result_name);
      const ingredientItem = await getItemByName(recipe.ingredient_name);

      if (!resultItem || !ingredientItem) {
        stats.recipes_failed++;
        continue;
      }

      const added = await addRecipeIngredient(
        resultItem.id,
        ingredientItem.id,
        recipe.quantity
      );

      if (added !== null) {
        stats.recipes_added++;
      } else {
        stats.recipes_updated++;
      }
    } catch {
      stats.recipes_failed++;
    }
  }

  return stats;
}

export async function clearAllData(): Promise<void> {
  await query("DELETE FROM recipes");
  await query("DELETE FROM items");
}

export async function getStats(): Promise<{
  totalItems: number;
  totalRecipes: number;
  baseMaterials: number;
  craftableItems: number;
  categories: string[];
}> {
  const [itemsResult, recipesResult, baseResult, categoriesResult] = await Promise.all([
    query<{ count: number }>("SELECT COUNT(*) as count FROM items"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM recipes"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM items WHERE is_base_material = 1"),
    query<{ category: string }>("SELECT DISTINCT category FROM items ORDER BY category"),
  ]);

  const totalItems = itemsResult.rows[0]?.count || 0;
  const totalRecipes = recipesResult.rows[0]?.count || 0;
  const baseMaterials = baseResult.rows[0]?.count || 0;
  const categories = categoriesResult.rows.map((r) => r.category);

  return {
    totalItems,
    totalRecipes,
    baseMaterials,
    craftableItems: totalItems - baseMaterials,
    categories,
  };
}

// ========== CSV PARSING ==========

interface CsvParseResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
}

interface CsvItemRow {
  name: string;
  category?: string;
  is_base_material?: boolean | string;
  description?: string;
}

interface CsvRecipeRow {
  result_name: string;
  ingredient_name: string;
  quantity: number | string;
}

export function parseItemsCsv(csvContent: string): CsvParseResult<CsvItemRow> {
  const lines = csvContent.trim().split("\n");
  const result: CsvParseResult<CsvItemRow> = {
    success: true,
    data: [],
    errors: [],
    warnings: [],
  };

  if (lines.length < 2) {
    result.success = false;
    result.errors.push("CSV must have a header row and at least one data row");
    return result;
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIndex = headers.indexOf("name");

  if (nameIndex === -1) {
    result.success = false;
    result.errors.push('CSV must have a "name" column');
    return result;
  }

  const categoryIndex = headers.indexOf("category");
  const baseMaterialIndex = headers.indexOf("is_base_material");
  const descriptionIndex = headers.indexOf("description");

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map((v) => v.trim());
    const name = values[nameIndex];

    if (!name) {
      result.warnings.push(`Row ${i + 1}: Missing name, skipping`);
      continue;
    }

    const row: CsvItemRow = { name };

    if (categoryIndex !== -1 && values[categoryIndex]) {
      row.category = values[categoryIndex];
    }

    if (baseMaterialIndex !== -1 && values[baseMaterialIndex]) {
      const val = values[baseMaterialIndex].toLowerCase();
      row.is_base_material = val === "true" || val === "1" || val === "yes";
    }

    if (descriptionIndex !== -1 && values[descriptionIndex]) {
      row.description = values[descriptionIndex];
    }

    result.data.push(row);
  }

  return result;
}

export function parseRecipesCsv(csvContent: string): CsvParseResult<CsvRecipeRow> {
  const lines = csvContent.trim().split("\n");
  const result: CsvParseResult<CsvRecipeRow> = {
    success: true,
    data: [],
    errors: [],
    warnings: [],
  };

  if (lines.length < 2) {
    result.success = false;
    result.errors.push("CSV must have a header row and at least one data row");
    return result;
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const resultNameIndex = headers.indexOf("result_name");
  const ingredientNameIndex = headers.indexOf("ingredient_name");
  const quantityIndex = headers.indexOf("quantity");

  if (resultNameIndex === -1 || ingredientNameIndex === -1) {
    result.success = false;
    result.errors.push('CSV must have "result_name" and "ingredient_name" columns');
    return result;
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map((v) => v.trim());
    const resultName = values[resultNameIndex];
    const ingredientName = values[ingredientNameIndex];

    if (!resultName || !ingredientName) {
      result.warnings.push(`Row ${i + 1}: Missing name, skipping`);
      continue;
    }

    let quantity = 1;
    if (quantityIndex !== -1 && values[quantityIndex]) {
      const parsed = parseFloat(values[quantityIndex]);
      if (!isNaN(parsed) && parsed > 0) {
        quantity = parsed;
      }
    }

    result.data.push({
      result_name: resultName,
      ingredient_name: ingredientName,
      quantity,
    });
  }

  return result;
}

export async function importItemsFromCsv(items: CsvItemRow[]): Promise<{
  added: number;
  updated: number;
  failed: number;
}> {
  const stats = { added: 0, updated: 0, failed: 0 };

  for (const item of items) {
    try {
      const existing = await getItemByName(item.name);
      if (existing) {
        await updateItem(
          existing.id,
          item.name,
          item.category || existing.category,
          Boolean(item.is_base_material ?? existing.is_base_material),
          item.description || existing.description || ""
        );
        stats.updated++;
      } else {
        await addItem(
          item.name,
          item.category || "misc",
          Boolean(item.is_base_material),
          item.description || ""
        );
        stats.added++;
      }
    } catch {
      stats.failed++;
    }
  }

  return stats;
}

export async function importRecipesFromCsv(recipes: CsvRecipeRow[]): Promise<{
  added: number;
  skipped: number;
  failed: number;
}> {
  const stats = { added: 0, skipped: 0, failed: 0 };

  for (const recipe of recipes) {
    try {
      const resultItem = await getItemByName(recipe.result_name);
      const ingredientItem = await getItemByName(recipe.ingredient_name);

      if (!resultItem || !ingredientItem) {
        stats.failed++;
        continue;
      }

      const added = await addRecipeIngredient(
        resultItem.id,
        ingredientItem.id,
        typeof recipe.quantity === "string" ? parseFloat(recipe.quantity) : recipe.quantity
      );

      if (added !== null) {
        stats.added++;
      } else {
        stats.skipped++;
      }
    } catch {
      stats.failed++;
    }
  }

  return stats;
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
    const wasteMultiplier = calculateMaterialWaste(settings.skill, item.difficulty || 20);
    const adjustedQuantity = material.quantity * (1 + wasteMultiplier);

    advancedMaterials.push({
      ...material,
      base_quantity: material.quantity,
      adjusted_quantity: adjustedQuantity,
      waste_factor: wasteMultiplier,
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

        predictions.push({
          itemName: node.name,
          quantity: node.quantity,
          successChance: calculateSuccessChance(settings.skill, difficulty),
          qualityPrediction: predictCraftingQuality(settings.skill, difficulty),
          estimatedTime: calculateCraftingTime(
            nodeItem?.base_time || 10,
            settings.skill,
            settings.toolQuality
          ) * node.quantity,
          expectedAttempts: 1 / calculateSuccessChance(settings.skill, difficulty),
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
      totalMaterials: advancedMaterials.reduce((sum, m) => sum + m.adjusted_quantity, 0),
      uniqueMaterials: advancedMaterials.length,
      expectedWaste: advancedMaterials.reduce(
        (sum, m) => sum + (m.adjusted_quantity - m.base_quantity),
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
  const items = await getAllItems();
  const path = generateSkillPath(items, currentSkill, targetSkill, preferredCategory);

  const steps: SkillGrindStep[] = [];
  let skill = currentSkill;

  for (const item of path) {
    const difficulty = item.difficulty || getItemDifficulty(item.name);
    const skillGain = predictSkillGain(skill, difficulty);
    const itemsNeeded = Math.ceil((targetSkill - skill) / skillGain);

    steps.push({
      itemName: item.name,
      itemId: item.id,
      startSkill: skill,
      targetSkill: Math.min(skill + skillGain * itemsNeeded, targetSkill),
      estimatedItems: Math.min(itemsNeeded, 100),
      skillGainPerItem: skillGain,
      difficulty,
    });

    skill += skillGain * itemsNeeded;
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
  const singleItemTime = calculateCraftingTime(baseTime, settings.skill, settings.toolQuality);
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

// ========== MARKET ORDERS ==========

interface OrderWithUsername extends MarketOrder {
  username?: string;
}

export async function getAllOrders(filters?: {
  type?: OrderType;
  status?: OrderStatus;
  item?: string;
  userId?: number;
}): Promise<MarketOrder[]> {
  let sql = `
    SELECT o.*, u.username
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (filters?.type) {
    sql += " AND o.order_type = ?";
    params.push(filters.type);
  }
  if (filters?.status) {
    sql += " AND o.status = ?";
    params.push(filters.status);
  }
  if (filters?.item) {
    sql += " AND LOWER(o.item_name) LIKE LOWER(?)";
    params.push(`%${filters.item}%`);
  }
  if (filters?.userId) {
    sql += " AND o.user_id = ?";
    params.push(filters.userId);
  }

  sql += " ORDER BY o.created_at DESC";

  const result = await query<OrderWithUsername>(sql, params);
  return result.rows;
}

export async function getOrdersPaginated(
  params?: PaginationParams,
  filters?: {
    type?: OrderType;
    status?: OrderStatus;
    item?: string;
    userId?: number;
  }
): Promise<PaginatedResult<MarketOrder>> {
  const { offset, limit, page } = validatePagination(params);

  let countSql = "SELECT COUNT(*) as count FROM orders WHERE 1=1";
  let dataSql = `
    SELECT o.*, u.username
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE 1=1
  `;
  const countParams: (string | number)[] = [];
  const dataParams: (string | number)[] = [];

  if (filters?.type) {
    countSql += " AND order_type = ?";
    dataSql += " AND o.order_type = ?";
    countParams.push(filters.type);
    dataParams.push(filters.type);
  }
  if (filters?.status) {
    countSql += " AND status = ?";
    dataSql += " AND o.status = ?";
    countParams.push(filters.status);
    dataParams.push(filters.status);
  }
  if (filters?.item) {
    countSql += " AND LOWER(item_name) LIKE LOWER(?)";
    dataSql += " AND LOWER(o.item_name) LIKE LOWER(?)";
    countParams.push(`%${filters.item}%`);
    dataParams.push(`%${filters.item}%`);
  }
  if (filters?.userId) {
    countSql += " AND user_id = ?";
    dataSql += " AND o.user_id = ?";
    countParams.push(filters.userId);
    dataParams.push(filters.userId);
  }

  dataSql += " ORDER BY o.created_at DESC LIMIT ? OFFSET ?";
  dataParams.push(limit, offset);

  const [countResult, dataResult] = await Promise.all([
    query<{ count: number }>(countSql, countParams),
    query<OrderWithUsername>(dataSql, dataParams),
  ]);

  return {
    data: dataResult.rows,
    total: countResult.rows[0]?.count || 0,
    page,
    limit,
    totalPages: Math.ceil((countResult.rows[0]?.count || 0) / limit),
  };
}

export async function getOrderById(id: number): Promise<MarketOrder | null> {
  const result = await query<OrderWithUsername>(
    `SELECT o.*, u.username
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.id
     WHERE o.id = ?`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getUserOrders(userId: number): Promise<MarketOrder[]> {
  const result = await query<MarketOrder>(
    "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

export async function createOrder(userId: number, input: CreateOrderInput): Promise<number> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await query(
    `INSERT INTO orders (user_id, order_type, item_name, quantity, quality, price, currency, trade_for, location, notes, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.order_type,
      input.item_name,
      input.quantity,
      input.quality || null,
      input.price || null,
      input.currency || "silver",
      input.trade_for || null,
      input.location || null,
      input.notes || null,
      expiresAt.toISOString(),
    ]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function updateOrder(
  id: number,
  userId: number,
  input: Partial<CreateOrderInput>,
  isAdmin: boolean = false
): Promise<boolean> {
  const order = await getOrderById(id);
  if (!order) return false;
  if (!isAdmin && order.user_id !== userId) return false;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.item_name !== undefined) {
    fields.push("item_name = ?");
    values.push(input.item_name);
  }
  if (input.quantity !== undefined) {
    fields.push("quantity = ?");
    values.push(input.quantity);
  }
  if (input.quality !== undefined) {
    fields.push("quality = ?");
    values.push(input.quality);
  }
  if (input.price !== undefined) {
    fields.push("price = ?");
    values.push(input.price);
  }
  if (input.currency !== undefined) {
    fields.push("currency = ?");
    values.push(input.currency);
  }
  if (input.trade_for !== undefined) {
    fields.push("trade_for = ?");
    values.push(input.trade_for);
  }
  if (input.location !== undefined) {
    fields.push("location = ?");
    values.push(input.location);
  }
  if (input.notes !== undefined) {
    fields.push("notes = ?");
    values.push(input.notes);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const result = await query(`UPDATE orders SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.rowCount > 0;
}

export async function updateOrderStatus(
  id: number,
  userId: number,
  status: OrderStatus,
  isAdmin: boolean = false
): Promise<boolean> {
  const order = await getOrderById(id);
  if (!order) return false;
  if (!isAdmin && order.user_id !== userId) return false;

  const result = await query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
  return result.rowCount > 0;
}

export async function deleteOrder(id: number, userId: number, isAdmin: boolean = false): Promise<boolean> {
  const order = await getOrderById(id);
  if (!order) return false;
  if (!isAdmin && order.user_id !== userId) return false;

  const result = await query("DELETE FROM orders WHERE id = ?", [id]);
  return result.rowCount > 0;
}

export async function expireOldOrders(): Promise<number> {
  const result = await query(
    "UPDATE orders SET status = 'expired' WHERE status = 'active' AND expires_at < NOW()"
  );
  return result.rowCount;
}

export async function getOrderStats(): Promise<{
  total: number;
  active: number;
  completed: number;
  buyOrders: number;
  sellOrders: number;
  tradeOrders: number;
}> {
  const [total, active, completed, buy, sell, trade] = await Promise.all([
    query<{ count: number }>("SELECT COUNT(*) as count FROM orders"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE status = 'active'"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE order_type = 'buy'"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE order_type = 'sell'"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE order_type = 'trade'"),
  ]);

  return {
    total: total.rows[0]?.count || 0,
    active: active.rows[0]?.count || 0,
    completed: completed.rows[0]?.count || 0,
    buyOrders: buy.rows[0]?.count || 0,
    sellOrders: sell.rows[0]?.count || 0,
    tradeOrders: trade.rows[0]?.count || 0,
  };
}

// ========== MERCHANTS ==========

interface MerchantWithUsername extends Merchant {
  username?: string;
}

export async function getAllMerchants(filters?: {
  category?: MerchantCategory;
  active?: boolean;
  server?: string;
  userId?: number;
}): Promise<Merchant[]> {
  let sql = `
    SELECT m.*, u.username
    FROM merchants m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (filters?.category) {
    sql += " AND m.category = ?";
    params.push(filters.category);
  }
  if (filters?.active !== undefined) {
    sql += " AND m.is_active = ?";
    params.push(filters.active ? 1 : 0);
  }
  if (filters?.server) {
    sql += " AND m.server = ?";
    params.push(filters.server);
  }
  if (filters?.userId) {
    sql += " AND m.user_id = ?";
    params.push(filters.userId);
  }

  sql += " ORDER BY m.name";

  const result = await query<MerchantWithUsername>(sql, params);
  return result.rows;
}

export async function getMerchantsPaginated(
  params?: PaginationParams,
  filters?: { category?: MerchantCategory; active?: boolean; server?: string; userId?: number }
): Promise<PaginatedResult<Merchant>> {
  const { offset, limit, page } = validatePagination(params);
  const merchants = await getAllMerchants(filters);
  const total = merchants.length;
  const data = merchants.slice(offset, offset + limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getMerchantById(id: number): Promise<Merchant | null> {
  const result = await query<MerchantWithUsername>(
    `SELECT m.*, u.username
     FROM merchants m
     LEFT JOIN users u ON m.user_id = u.id
     WHERE m.id = ?`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getUserMerchants(userId: number): Promise<Merchant[]> {
  const result = await query<Merchant>(
    "SELECT * FROM merchants WHERE user_id = ? ORDER BY name",
    [userId]
  );
  return result.rows;
}

export async function createMerchant(userId: number, input: CreateMerchantInput): Promise<number> {
  await query(
    `INSERT INTO merchants (user_id, name, category, location, server, description, contact_info)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.name,
      input.category,
      input.location || null,
      input.server || null,
      input.description || null,
      input.contact_info || null,
    ]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function updateMerchant(
  id: number,
  userId: number,
  input: Partial<CreateMerchantInput>,
  isAdmin: boolean = false
): Promise<boolean> {
  const merchant = await getMerchantById(id);
  if (!merchant) return false;
  if (!isAdmin && merchant.user_id !== userId) return false;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.category !== undefined) {
    fields.push("category = ?");
    values.push(input.category);
  }
  if (input.location !== undefined) {
    fields.push("location = ?");
    values.push(input.location);
  }
  if (input.server !== undefined) {
    fields.push("server = ?");
    values.push(input.server);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description);
  }
  if (input.contact_info !== undefined) {
    fields.push("contact_info = ?");
    values.push(input.contact_info);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const result = await query(`UPDATE merchants SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.rowCount > 0;
}

export async function toggleMerchantActive(
  id: number,
  userId: number,
  isAdmin: boolean = false
): Promise<boolean> {
  const merchant = await getMerchantById(id);
  if (!merchant) return false;
  if (!isAdmin && merchant.user_id !== userId) return false;

  const result = await query(
    "UPDATE merchants SET is_active = NOT is_active WHERE id = ?",
    [id]
  );
  return result.rowCount > 0;
}

export async function deleteMerchant(id: number, userId: number, isAdmin: boolean = false): Promise<boolean> {
  const merchant = await getMerchantById(id);
  if (!merchant) return false;
  if (!isAdmin && merchant.user_id !== userId) return false;

  const result = await query("DELETE FROM merchants WHERE id = ?", [id]);
  return result.rowCount > 0;
}

export async function getMerchantStats(): Promise<{
  total: number;
  active: number;
  byCategory: Record<string, number>;
}> {
  const [total, active, byCategory] = await Promise.all([
    query<{ count: number }>("SELECT COUNT(*) as count FROM merchants"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM merchants WHERE is_active = 1"),
    query<{ category: string; count: number }>(
      "SELECT category, COUNT(*) as count FROM merchants GROUP BY category"
    ),
  ]);

  const categories: Record<string, number> = {};
  for (const row of byCategory.rows) {
    categories[row.category] = row.count;
  }

  return {
    total: total.rows[0]?.count || 0,
    active: active.rows[0]?.count || 0,
    byCategory: categories,
  };
}

export async function getServers(): Promise<string[]> {
  const result = await query<{ server: string }>(
    "SELECT DISTINCT server FROM merchants WHERE server IS NOT NULL ORDER BY server"
  );
  return result.rows.map((r) => r.server);
}

// ========== ALLIANCES ==========

export async function getAllAlliances(includePrivate: boolean = false): Promise<Alliance[]> {
  let sql = "SELECT * FROM alliances";
  if (!includePrivate) {
    sql += " WHERE is_public = 1";
  }
  sql += " ORDER BY name";

  const result = await query<Alliance>(sql);
  return result.rows;
}

export async function getAlliancesPaginated(params?: PaginationParams, includePrivate?: boolean): Promise<PaginatedResult<Alliance>> {
  const { offset, limit, page } = validatePagination(params);
  const alliances = await getAllAlliances(includePrivate);
  return {
    data: alliances.slice(offset, offset + limit),
    total: alliances.length,
    page,
    limit,
    totalPages: Math.ceil(alliances.length / limit),
  };
}

export async function getAllianceById(id: number): Promise<Alliance | null> {
  const result = await query<Alliance>("SELECT * FROM alliances WHERE id = ?", [id]);
  return result.rows[0] || null;
}

export async function getUserAlliance(userId: number): Promise<Alliance | null> {
  const result = await query<{ alliance_id: number }>(
    "SELECT alliance_id FROM alliance_members WHERE user_id = ?",
    [userId]
  );
  if (result.rows.length === 0) return null;
  return getAllianceById(result.rows[0].alliance_id);
}

export async function createAlliance(userId: number, input: CreateAllianceInput): Promise<number> {
  await query(
    `INSERT INTO alliances (name, description, leader_id, is_public, max_members)
     VALUES (?, ?, ?, ?, ?)`,
    [input.name, input.description || null, userId, input.is_public ? 1 : 0, input.max_members || 50]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  const allianceId = idResult.rows[0]?.id || 0;

  await query(
    "INSERT INTO alliance_members (alliance_id, user_id, role) VALUES (?, ?, 'leader')",
    [allianceId, userId]
  );

  return allianceId;
}

export async function updateAlliance(
  allianceId: number,
  userId: number,
  input: UpdateAllianceInput,
  isAdmin: boolean = false
): Promise<boolean> {
  const alliance = await getAllianceById(allianceId);
  if (!alliance) return false;
  if (!isAdmin && alliance.leader_id !== userId) return false;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description);
  }
  if (input.is_public !== undefined) {
    fields.push("is_public = ?");
    values.push(input.is_public ? 1 : 0);
  }
  if (input.max_members !== undefined) {
    fields.push("max_members = ?");
    values.push(input.max_members);
  }

  if (fields.length === 0) return false;

  values.push(allianceId);
  const result = await query(`UPDATE alliances SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.rowCount > 0;
}

export async function deleteAlliance(allianceId: number, userId: number, isAdmin: boolean = false): Promise<boolean> {
  const alliance = await getAllianceById(allianceId);
  if (!alliance) return false;
  if (!isAdmin && alliance.leader_id !== userId) return false;

  await query("DELETE FROM alliance_members WHERE alliance_id = ?", [allianceId]);
  await query("DELETE FROM alliance_invites WHERE alliance_id = ?", [allianceId]);
  const result = await query("DELETE FROM alliances WHERE id = ?", [allianceId]);
  return result.rowCount > 0;
}

export async function getAllianceMembers(allianceId: number): Promise<AllianceMember[]> {
  const result = await query<AllianceMember>(
    `SELECT am.*, u.username
     FROM alliance_members am
     JOIN users u ON am.user_id = u.id
     WHERE am.alliance_id = ?
     ORDER BY am.role, u.username`,
    [allianceId]
  );
  return result.rows;
}

export async function getAllianceMember(allianceId: number, userId: number): Promise<AllianceMember | null> {
  const result = await query<AllianceMember>(
    "SELECT * FROM alliance_members WHERE alliance_id = ? AND user_id = ?",
    [allianceId, userId]
  );
  return result.rows[0] || null;
}

// ========== ALLIANCE INVITES ==========

export async function getUserInvites(userId: number): Promise<AllianceInvite[]> {
  const result = await query<AllianceInvite>(
    `SELECT ai.*, a.name as alliance_name, u.username as invited_by_username
     FROM alliance_invites ai
     JOIN alliances a ON ai.alliance_id = a.id
     JOIN users u ON ai.invited_by = u.id
     WHERE ai.user_id = ? AND ai.status = 'pending'
     ORDER BY ai.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getAllianceInvites(allianceId: number): Promise<AllianceInvite[]> {
  const result = await query<AllianceInvite>(
    `SELECT ai.*, u.username
     FROM alliance_invites ai
     JOIN users u ON ai.user_id = u.id
     WHERE ai.alliance_id = ? AND ai.status = 'pending'
     ORDER BY ai.created_at DESC`,
    [allianceId]
  );
  return result.rows;
}

export async function createInvite(allianceId: number, userId: number, invitedBy: number): Promise<number | null> {
  // Check if user is already in an alliance
  const existingAlliance = await getUserAlliance(userId);
  if (existingAlliance) return null;

  // Check if user already has a pending invite from this alliance
  const existingInvite = await query<AllianceInvite>(
    "SELECT id FROM alliance_invites WHERE alliance_id = ? AND user_id = ? AND status = 'pending'",
    [allianceId, userId]
  );
  if (existingInvite.rows.length > 0) return null;

  // Check if alliance is full
  const alliance = await getAllianceById(allianceId);
  if (!alliance) return null;

  const members = await getAllianceMembers(allianceId);
  if (members.length >= alliance.max_members) return null;

  const result = await query(
    "INSERT INTO alliance_invites (alliance_id, user_id, invited_by, status) VALUES (?, ?, ?, 'pending')",
    [allianceId, userId, invitedBy]
  );
  return result.insertId || null;
}

export async function respondToInvite(inviteId: number, userId: number, accept: boolean): Promise<boolean> {
  // Get the invite
  const inviteResult = await query<AllianceInvite>(
    "SELECT * FROM alliance_invites WHERE id = ? AND user_id = ? AND status = 'pending'",
    [inviteId, userId]
  );
  const invite = inviteResult.rows[0];
  if (!invite) return false;

  // Check if user is already in an alliance
  const existingAlliance = await getUserAlliance(userId);
  if (existingAlliance) return false;

  if (accept) {
    // Check if alliance is full
    const alliance = await getAllianceById(invite.alliance_id);
    if (!alliance) return false;

    const members = await getAllianceMembers(invite.alliance_id);
    if (members.length >= alliance.max_members) return false;

    // Add user to alliance
    await query(
      "INSERT INTO alliance_members (alliance_id, user_id, role, invited_by) VALUES (?, ?, 'member', ?)",
      [invite.alliance_id, userId, invite.invited_by]
    );

    // Update invite status
    await query(
      "UPDATE alliance_invites SET status = 'accepted' WHERE id = ?",
      [inviteId]
    );

    // Decline all other pending invites for this user
    await query(
      "UPDATE alliance_invites SET status = 'declined' WHERE user_id = ? AND id != ? AND status = 'pending'",
      [userId, inviteId]
    );
  } else {
    // Decline the invite
    await query(
      "UPDATE alliance_invites SET status = 'declined' WHERE id = ?",
      [inviteId]
    );
  }

  return true;
}

export async function cancelInvite(inviteId: number, userId: number, isAdmin: boolean = false): Promise<boolean> {
  // Get the invite
  const inviteResult = await query<AllianceInvite>(
    "SELECT ai.*, am.role as user_role FROM alliance_invites ai LEFT JOIN alliance_members am ON ai.alliance_id = am.alliance_id AND am.user_id = ? WHERE ai.id = ? AND ai.status = 'pending'",
    [userId, inviteId]
  );
  const invite = inviteResult.rows[0];
  if (!invite) return false;

  // Check permission: must be admin, or officer/leader of the alliance
  const userRole = (invite as AllianceInvite & { user_role?: string }).user_role;
  if (!isAdmin && (!userRole || userRole === "member")) {
    return false;
  }

  const result = await query(
    "DELETE FROM alliance_invites WHERE id = ?",
    [inviteId]
  );
  return result.rowCount > 0;
}

// ========== PRICE TRACKING ==========

export async function recordPrice(
  itemName: string,
  price: number,
  orderType: OrderType
): Promise<void> {
  await query(
    "INSERT INTO price_history (item_name, price, order_type) VALUES (?, ?, ?)",
    [itemName, price, orderType]
  );
}

export async function getPriceHistory(
  itemName: string,
  days: number = 30
): Promise<PriceHistory[]> {
  const result = await query<PriceHistory>(
    `SELECT * FROM price_history
     WHERE item_name = ? AND recorded_at > DATE_SUB(NOW(), INTERVAL ? DAY)
     ORDER BY recorded_at DESC`,
    [itemName, days]
  );
  return result.rows;
}

// ========== PROJECTS ==========

export async function getUserProjects(userId: number): Promise<Project[]> {
  const result = await query<Project>(
    "SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

export async function getSharedProjects(allianceId: number): Promise<Project[]> {
  const result = await query<Project>(
    "SELECT * FROM projects WHERE alliance_id = ? AND is_shared = 1 ORDER BY created_at DESC",
    [allianceId]
  );
  return result.rows;
}

export async function getProjectById(projectId: number): Promise<Project | null> {
  const result = await query<Project>("SELECT * FROM projects WHERE id = ?", [projectId]);
  return result.rows[0] || null;
}

export async function createProject(userId: number, input: CreateProjectInput): Promise<number> {
  await query(
    `INSERT INTO projects (user_id, name, description, status, is_shared, alliance_id)
     VALUES (?, ?, ?, 'planning', ?, ?)`,
    [userId, input.name, input.description || null, input.is_shared ? 1 : 0, input.alliance_id || null]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function updateProject(
  projectId: number,
  userId: number,
  input: UpdateProjectInput
): Promise<boolean> {
  const project = await getProjectById(projectId);
  if (!project || project.user_id !== userId) return false;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (input.is_shared !== undefined) {
    fields.push("is_shared = ?");
    values.push(input.is_shared ? 1 : 0);
  }

  if (fields.length === 0) return false;

  values.push(projectId);
  const result = await query(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.rowCount > 0;
}

export async function deleteProject(projectId: number, userId: number): Promise<boolean> {
  const project = await getProjectById(projectId);
  if (!project || project.user_id !== userId) return false;

  await query("DELETE FROM project_items WHERE project_id = ?", [projectId]);
  const result = await query("DELETE FROM projects WHERE id = ?", [projectId]);
  return result.rowCount > 0;
}

export async function getProjectItems(projectId: number): Promise<ProjectItem[]> {
  const result = await query<ProjectItem>(
    "SELECT * FROM project_items WHERE project_id = ? ORDER BY id",
    [projectId]
  );
  return result.rows;
}

export async function addProjectItem(projectId: number, input: AddProjectItemInput): Promise<number> {
  await query(
    `INSERT INTO project_items (project_id, item_id, item_name, quantity_needed, quantity_completed)
     VALUES (?, ?, ?, ?, 0)`,
    [projectId, input.item_id, input.item_name, input.quantity_needed]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

// ========== MAP LOCATIONS ==========

export async function getMapLocations(filters?: {
  server?: WurmServer;
  type?: LocationType;
  userId?: number;
}): Promise<MapLocation[]> {
  let sql = "SELECT * FROM map_locations WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters?.server) {
    sql += " AND server = ?";
    params.push(filters.server);
  }
  if (filters?.type) {
    sql += " AND location_type = ?";
    params.push(filters.type);
  }
  if (filters?.userId) {
    sql += " AND user_id = ?";
    params.push(filters.userId);
  }

  sql += " ORDER BY name";

  const result = await query<MapLocation>(sql, params);
  return result.rows;
}

export async function getLocationById(id: number): Promise<MapLocation | null> {
  const result = await query<MapLocation>("SELECT * FROM map_locations WHERE id = ?", [id]);
  return result.rows[0] || null;
}

export async function createLocation(userId: number, input: CreateLocationInput): Promise<number> {
  await query(
    `INSERT INTO map_locations (user_id, name, location_type, server, x, y, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, input.name, input.location_type, input.server, input.x, input.y, input.description || null]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function updateLocation(
  id: number,
  userId: number,
  input: UpdateLocationInput,
  isAdmin: boolean = false
): Promise<boolean> {
  const location = await getLocationById(id);
  if (!location) return false;
  if (!isAdmin && location.user_id !== userId) return false;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description);
  }
  if (input.x !== undefined) {
    fields.push("x = ?");
    values.push(input.x);
  }
  if (input.y !== undefined) {
    fields.push("y = ?");
    values.push(input.y);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const result = await query(`UPDATE map_locations SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.rowCount > 0;
}

export async function deleteLocation(id: number, userId: number, isAdmin: boolean = false): Promise<boolean> {
  const location = await getLocationById(id);
  if (!location) return false;
  if (!isAdmin && location.user_id !== userId) return false;

  const result = await query("DELETE FROM map_locations WHERE id = ?", [id]);
  return result.rowCount > 0;
}

export async function verifyLocation(id: number): Promise<boolean> {
  const result = await query("UPDATE map_locations SET is_verified = 1 WHERE id = ?", [id]);
  return result.rowCount > 0;
}

// ========== ACHIEVEMENTS ==========

export async function getAchievements(): Promise<Achievement[]> {
  const result = await query<Achievement>("SELECT * FROM achievements ORDER BY category, name");
  return result.rows;
}

export function getAllAchievements(): Promise<Achievement[]> {
  return getAchievements();
}

export async function getUserAchievements(userId: number): Promise<UserAchievement[]> {
  const result = await query<UserAchievement>(
    "SELECT * FROM user_achievements WHERE user_id = ?",
    [userId]
  );
  return result.rows;
}

// ========== WEBHOOKS ==========

export async function getUserWebhooks(userId: number): Promise<DiscordWebhook[]> {
  const result = await query<DiscordWebhook>(
    "SELECT * FROM discord_webhooks WHERE user_id = ? ORDER BY name",
    [userId]
  );
  return result.rows;
}

export async function getWebhookById(id: number): Promise<DiscordWebhook | null> {
  const result = await query<DiscordWebhook>("SELECT * FROM discord_webhooks WHERE id = ?", [id]);
  return result.rows[0] || null;
}

export async function createWebhook(userId: number, input: CreateWebhookInput): Promise<number> {
  await query(
    `INSERT INTO discord_webhooks (user_id, name, webhook_url, notify_orders, notify_prices, notify_alliances)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.name,
      input.webhook_url,
      input.notify_orders ? 1 : 0,
      input.notify_prices ? 1 : 0,
      input.notify_alliances ? 1 : 0,
    ]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function deleteWebhook(id: number, userId: number): Promise<boolean> {
  const webhook = await getWebhookById(id);
  if (!webhook || webhook.user_id !== userId) return false;

  const result = await query("DELETE FROM discord_webhooks WHERE id = ?", [id]);
  return result.rowCount > 0;
}

// ========== PROSPECTS ==========

export async function getProspectPagesByUser(userId: number): Promise<ProspectPage[]> {
  const result = await query<ProspectPage>(
    "SELECT * FROM prospect_pages WHERE user_id = ? ORDER BY name",
    [userId]
  );
  return result.rows;
}

export async function getProspectPageById(id: number): Promise<ProspectPage | null> {
  const result = await query<ProspectPage>("SELECT * FROM prospect_pages WHERE id = ?", [id]);
  return result.rows[0] || null;
}

export async function createProspectPage(userId: number, input: CreateProspectPageInput): Promise<number> {
  await query(
    `INSERT INTO prospect_pages (user_id, name, description, server, grid_ref)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, input.name, input.description || null, input.server || null, input.grid_ref || null]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function getProspectsByPage(pageId: number, userId: number): Promise<Prospect[]> {
  const page = await getProspectPageById(pageId);
  if (!page || page.user_id !== userId) return [];

  const result = await query<Prospect>(
    "SELECT * FROM prospects WHERE page_id = ? ORDER BY created_at DESC",
    [pageId]
  );
  return result.rows;
}

// ========== RECIPE SUBMISSIONS ==========

export async function createRecipeSubmission(
  userId: number,
  input: CreateRecipeSubmissionInput
): Promise<number> {
  await query(
    `INSERT INTO recipe_submissions (user_id, result_name, ingredients, notes)
     VALUES (?, ?, ?, ?)`,
    [userId, input.result_name, JSON.stringify(input.ingredients), input.notes || null]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function getRecipeSubmissionById(id: number): Promise<RecipeSubmission | null> {
  const result = await query<RecipeSubmission>("SELECT * FROM recipe_submissions WHERE id = ?", [id]);
  return result.rows[0] || null;
}

export async function getUserRecipeSubmissions(userId: number): Promise<RecipeSubmission[]> {
  const result = await query<RecipeSubmission>(
    "SELECT * FROM recipe_submissions WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

export async function getAllRecipeSubmissions(
  status?: RecipeSubmissionStatus
): Promise<RecipeSubmission[]> {
  let sql = "SELECT * FROM recipe_submissions";
  const params: string[] = [];

  if (status) {
    sql += " WHERE status = ?";
    params.push(status);
  }

  sql += " ORDER BY created_at DESC";

  const result = await query<RecipeSubmission>(sql, params);
  return result.rows;
}

export async function getPendingRecipeSubmissionsCount(): Promise<number> {
  const result = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM recipe_submissions WHERE status = 'pending'"
  );
  return result.rows[0]?.count || 0;
}

export async function reviewRecipeSubmission(
  id: number,
  reviewerId: number,
  input: ReviewRecipeSubmissionInput
): Promise<boolean> {
  const result = await query(
    `UPDATE recipe_submissions
     SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_notes = ?
     WHERE id = ?`,
    [input.status, reviewerId, input.review_notes || null, id]
  );
  return result.rowCount > 0;
}

export async function deleteRecipeSubmission(id: number, userId: number, isAdmin: boolean): Promise<boolean> {
  const submission = await getRecipeSubmissionById(id);
  if (!submission) return false;
  if (!isAdmin && submission.user_id !== userId) return false;

  const result = await query("DELETE FROM recipe_submissions WHERE id = ?", [id]);
  return result.rowCount > 0;
}
