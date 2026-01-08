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
  Character,
  CharacterWithStats,
  CreateCharacterInput,
  UpdateCharacterInput,
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
        formatted: formatQuantity(qty),
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
        formatted: formatQuantity(qty),
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
        item,
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

  for (const craftable of direct) {
    const nested = await findAllCraftableFrom(craftable.item.id, visited);
    for (const nestedItem of nested) {
      if (!all.some((a) => a.item.id === nestedItem.item.id)) {
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

// ========== MARKET ORDERS ==========

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

  const result = await query<MarketOrder>(sql, params);
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
    query<MarketOrder>(dataSql, dataParams),
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
  const result = await query<MarketOrder>(
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

  const result = await query<Merchant>(sql, params);
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
  const result = await query<Merchant>(
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
    `INSERT INTO merchants (user_id, name, category, location, server, description, stock_list)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.name,
      input.category,
      input.location || null,
      input.server || null,
      input.description || null,
      input.stock_list || null,
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
  if (input.stock_list !== undefined) {
    fields.push("stock_list = ?");
    values.push(input.stock_list);
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

  await query(
    "INSERT INTO alliance_invites (alliance_id, user_id, invited_by, status) VALUES (?, ?, ?, 'pending')",
    [allianceId, userId, invitedBy]
  );
  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || null;
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
    `INSERT INTO project_items (project_id, item_id, quantity, completed_quantity)
     VALUES (?, ?, ?, 0)`,
    [projectId, input.item_id, input.quantity]
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
    `INSERT INTO discord_webhooks (user_id, name, webhook_url, notify_trades, notify_matches, notify_price_alerts, notify_alliance)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.name,
      input.webhook_url,
      input.notify_trades ? 1 : 0,
      input.notify_matches ? 1 : 0,
      input.notify_price_alerts ? 1 : 0,
      input.notify_alliance ? 1 : 0,
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
    `INSERT INTO prospect_pages (user_id, name, description, color, icon)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, input.name, input.description || null, input.color || '#3b82f6', input.icon || 'folder']
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

export async function updateProspectPage(
  pageId: number,
  userId: number,
  input: UpdateProspectPageInput
): Promise<boolean> {
  const page = await getProspectPageById(pageId);
  if (!page || page.user_id !== userId) return false;

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    params.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push("description = ?");
    params.push(input.description);
  }
  if (input.color !== undefined) {
    updates.push("color = ?");
    params.push(input.color);
  }
  if (input.icon !== undefined) {
    updates.push("icon = ?");
    params.push(input.icon);
  }
  if (input.sort_order !== undefined) {
    updates.push("sort_order = ?");
    params.push(input.sort_order);
  }

  if (updates.length === 0) return true;

  updates.push("updated_at = NOW()");
  params.push(pageId);

  const result = await query(
    `UPDATE prospect_pages SET ${updates.join(", ")} WHERE id = ?`,
    params
  );
  return result.rowCount > 0;
}

export async function deleteProspectPage(pageId: number, userId: number): Promise<boolean> {
  const page = await getProspectPageById(pageId);
  if (!page || page.user_id !== userId) return false;

  // Don't allow deleting the default page if it has prospects
  if (page.is_default) {
    const prospects = await query<{ count: number }>(
      "SELECT COUNT(*) as count FROM prospects WHERE page_id = ?",
      [pageId]
    );
    if ((prospects.rows[0]?.count || 0) > 0) return false;
  }

  // Delete all prospects in this page first
  await query("DELETE FROM prospects WHERE page_id = ?", [pageId]);

  const result = await query("DELETE FROM prospect_pages WHERE id = ?", [pageId]);
  return result.rowCount > 0;
}

export async function getProspectsByUser(
  userId: number,
  limit: number = 100,
  offset: number = 0
): Promise<Prospect[]> {
  const result = await query<Prospect>(
    `SELECT p.* FROM prospects p
     JOIN prospect_pages pp ON p.page_id = pp.id
     WHERE pp.user_id = ?
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
  return result.rows;
}

export async function createProspect(userId: number, input: CreateProspectInput): Promise<number> {
  // Verify the page belongs to the user
  const page = await getProspectPageById(input.page_id);
  if (!page || page.user_id !== userId) {
    throw new Error("Invalid page");
  }

  await query(
    `INSERT INTO prospects (page_id, user_id, name, character_name, server, location, status, priority, quality_rating, skills, notes, contact_info, source, tags, custom_fields)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.page_id,
      userId,
      input.name,
      input.character_name || null,
      input.server || null,
      input.location || null,
      input.status || "potential",
      input.priority || "medium",
      input.quality_rating || 3,
      input.skills || null,
      input.notes || null,
      input.contact_info || null,
      input.source || null,
      input.tags || null,
      input.custom_fields || null,
    ]
  );
  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function searchProspects(
  userId: number,
  query_str: string,
  filters?: {
    status?: ProspectStatus;
    priority?: ProspectPriority;
    pageId?: number;
    minQuality?: number;
  }
): Promise<Prospect[]> {
  let sql = `
    SELECT p.* FROM prospects p
    JOIN prospect_pages pp ON p.page_id = pp.id
    WHERE pp.user_id = ?
  `;
  const params: (string | number)[] = [userId];

  if (query_str) {
    sql += " AND (p.name LIKE ? OR p.character_name LIKE ? OR p.notes LIKE ?)";
    const searchPattern = `%${query_str}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (filters?.status) {
    sql += " AND p.status = ?";
    params.push(filters.status);
  }

  if (filters?.priority) {
    sql += " AND p.priority = ?";
    params.push(filters.priority);
  }

  if (filters?.pageId) {
    sql += " AND p.page_id = ?";
    params.push(filters.pageId);
  }

  if (filters?.minQuality) {
    sql += " AND p.quality_rating >= ?";
    params.push(filters.minQuality);
  }

  sql += " ORDER BY p.created_at DESC LIMIT 200";

  const result = await query<Prospect>(sql, params);
  return result.rows;
}

export async function getProspectById(id: number): Promise<Prospect | null> {
  const result = await query<Prospect>("SELECT * FROM prospects WHERE id = ?", [id]);
  return result.rows[0] || null;
}

export async function updateProspect(
  prospectId: number,
  userId: number,
  input: UpdateProspectInput
): Promise<boolean> {
  const prospect = await getProspectById(prospectId);
  if (!prospect || prospect.user_id !== userId) return false;

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.page_id !== undefined) {
    updates.push("page_id = ?");
    params.push(input.page_id);
  }
  if (input.name !== undefined) {
    updates.push("name = ?");
    params.push(input.name);
  }
  if (input.character_name !== undefined) {
    updates.push("character_name = ?");
    params.push(input.character_name);
  }
  if (input.server !== undefined) {
    updates.push("server = ?");
    params.push(input.server);
  }
  if (input.location !== undefined) {
    updates.push("location = ?");
    params.push(input.location);
  }
  if (input.status !== undefined) {
    updates.push("status = ?");
    params.push(input.status);
  }
  if (input.priority !== undefined) {
    updates.push("priority = ?");
    params.push(input.priority);
  }
  if (input.quality_rating !== undefined) {
    updates.push("quality_rating = ?");
    params.push(input.quality_rating);
  }
  if (input.skills !== undefined) {
    updates.push("skills = ?");
    params.push(input.skills);
  }
  if (input.notes !== undefined) {
    updates.push("notes = ?");
    params.push(input.notes);
  }
  if (input.contact_info !== undefined) {
    updates.push("contact_info = ?");
    params.push(input.contact_info);
  }
  if (input.last_contact !== undefined) {
    updates.push("last_contact = ?");
    params.push(input.last_contact);
  }
  if (input.source !== undefined) {
    updates.push("source = ?");
    params.push(input.source);
  }
  if (input.tags !== undefined) {
    updates.push("tags = ?");
    params.push(input.tags);
  }
  if (input.custom_fields !== undefined) {
    updates.push("custom_fields = ?");
    params.push(input.custom_fields);
  }

  if (updates.length === 0) return true;

  updates.push("updated_at = NOW()");
  params.push(prospectId);

  const result = await query(
    `UPDATE prospects SET ${updates.join(", ")} WHERE id = ?`,
    params
  );
  return result.rowCount > 0;
}

export async function deleteProspect(prospectId: number, userId: number): Promise<boolean> {
  const prospect = await getProspectById(prospectId);
  if (!prospect || prospect.user_id !== userId) return false;

  const result = await query("DELETE FROM prospects WHERE id = ?", [prospectId]);
  return result.rowCount > 0;
}

export async function updateProspectLastContact(prospectId: number, userId: number): Promise<boolean> {
  const prospect = await getProspectById(prospectId);
  if (!prospect || prospect.user_id !== userId) return false;

  const result = await query(
    "UPDATE prospects SET last_contact = NOW(), updated_at = NOW() WHERE id = ?",
    [prospectId]
  );
  return result.rowCount > 0;
}

export async function getProspectStats(userId: number): Promise<ProspectStats> {
  const prospects = await query<Prospect>(
    `SELECT p.* FROM prospects p
     JOIN prospect_pages pp ON p.page_id = pp.id
     WHERE pp.user_id = ?`,
    [userId]
  );

  const stats: ProspectStats = {
    total: prospects.rows.length,
    by_status: {
      potential: 0,
      contacted: 0,
      interested: 0,
      recruited: 0,
      declined: 0,
      inactive: 0,
    },
    by_priority: {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    },
    by_quality: {},
    recent_contacts: 0,
    conversion_rate: 0,
  };

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  for (const p of prospects.rows) {
    stats.by_status[p.status]++;
    stats.by_priority[p.priority]++;
    stats.by_quality[p.quality_rating] = (stats.by_quality[p.quality_rating] || 0) + 1;

    if (p.last_contact && new Date(p.last_contact) > oneWeekAgo) {
      stats.recent_contacts++;
    }
  }

  if (stats.total > 0) {
    stats.conversion_rate = stats.by_status.recruited / stats.total;
  }

  return stats;
}

// ========== RECIPE SUBMISSIONS ==========

export async function createRecipeSubmission(
  userId: number,
  input: CreateRecipeSubmissionInput
): Promise<number> {
  await query(
    `INSERT INTO recipe_submissions (user_id, item_name, ingredients, notes)
     VALUES (?, ?, ?, ?)`,
    [userId, input.item_name, JSON.stringify(input.ingredients), input.notes || null]
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
     SET status = ?, reviewed_by = ?, reviewed_at = NOW(), admin_notes = ?
     WHERE id = ?`,
    [input.status, reviewerId, input.admin_notes || null, id]
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

// ========== ALLIANCE MANAGEMENT ==========

export async function removeMember(
  allianceId: number,
  userIdToRemove: number,
  requesterId: number,
  isAdmin: boolean = false
): Promise<boolean> {
  const alliance = await getAllianceById(allianceId);
  if (!alliance) return false;

  // Check permission: must be admin, or alliance leader/officer
  if (!isAdmin && alliance.leader_id !== requesterId) {
    const requesterMember = await getAllianceMember(allianceId, requesterId);
    if (!requesterMember || requesterMember.role === "member") return false;
  }

  // Cannot remove the leader
  if (alliance.leader_id === userIdToRemove) return false;

  const result = await query(
    "DELETE FROM alliance_members WHERE alliance_id = ? AND user_id = ?",
    [allianceId, userIdToRemove]
  );
  return result.rowCount > 0;
}

export async function updateMemberRole(
  allianceId: number,
  userId: number,
  role: AllianceRole,
  requesterId: number,
  isAdmin: boolean = false
): Promise<boolean> {
  const alliance = await getAllianceById(allianceId);
  if (!alliance) return false;

  // Only leader or admin can change roles
  if (!isAdmin && alliance.leader_id !== requesterId) return false;

  // Cannot change leader's role (must use transferLeadership)
  if (alliance.leader_id === userId) return false;

  const result = await query(
    "UPDATE alliance_members SET role = ? WHERE alliance_id = ? AND user_id = ?",
    [role, allianceId, userId]
  );
  return result.rowCount > 0;
}

export async function transferLeadership(
  allianceId: number,
  currentLeaderId: number,
  newLeaderId: number
): Promise<boolean> {
  const alliance = await getAllianceById(allianceId);
  if (!alliance) return false;

  // Verify current user is the leader
  if (alliance.leader_id !== currentLeaderId) return false;

  // Verify new leader is a member
  const newLeader = await getAllianceMember(allianceId, newLeaderId);
  if (!newLeader) return false;

  // Update alliance leader
  await query("UPDATE alliances SET leader_id = ? WHERE id = ?", [newLeaderId, allianceId]);

  // Update roles: new leader to leader, old leader to officer
  await query(
    "UPDATE alliance_members SET role = 'leader' WHERE alliance_id = ? AND user_id = ?",
    [allianceId, newLeaderId]
  );
  await query(
    "UPDATE alliance_members SET role = 'officer' WHERE alliance_id = ? AND user_id = ?",
    [allianceId, currentLeaderId]
  );

  return true;
}

// ========== PRICE ANALYTICS ==========

export async function getPriceAnalytics(itemName: string): Promise<PriceAnalytics | null> {
  // Get price stats for the item
  const statsResult = await query<{
    avg_price: number;
    min_price: number;
    max_price: number;
    total_orders: number;
    buy_orders: number;
    sell_orders: number;
  }>(
    `SELECT
      AVG(price) as avg_price,
      MIN(price) as min_price,
      MAX(price) as max_price,
      COUNT(*) as total_orders,
      SUM(CASE WHEN order_type = 'buy' THEN 1 ELSE 0 END) as buy_orders,
      SUM(CASE WHEN order_type = 'sell' THEN 1 ELSE 0 END) as sell_orders
    FROM price_history
    WHERE item_name = ?`,
    [itemName]
  );

  if (statsResult.rows.length === 0 || !statsResult.rows[0].avg_price) return null;

  const stats = statsResult.rows[0];

  // Get price change for last 24h
  const day24Result = await query<{ avg_price: number }>(
    `SELECT AVG(price) as avg_price
    FROM price_history
    WHERE item_name = ? AND recorded_at > DATE_SUB(NOW(), INTERVAL 1 DAY)`,
    [itemName]
  );
  const price24h = day24Result.rows[0]?.avg_price || stats.avg_price;

  // Get price change for last 7 days
  const day7Result = await query<{ avg_price: number }>(
    `SELECT AVG(price) as avg_price
    FROM price_history
    WHERE item_name = ? AND recorded_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    [itemName]
  );
  const price7d = day7Result.rows[0]?.avg_price || stats.avg_price;

  return {
    item_name: itemName,
    avg_price: stats.avg_price,
    min_price: stats.min_price,
    max_price: stats.max_price,
    price_change_24h: ((stats.avg_price - price24h) / price24h) * 100,
    price_change_7d: ((stats.avg_price - price7d) / price7d) * 100,
    total_orders: stats.total_orders,
    buy_orders: stats.buy_orders,
    sell_orders: stats.sell_orders,
  };
}

export async function getTrendingItems(limit: number = 10): Promise<TrendingItem[]> {
  const result = await query<{
    item_name: string;
    order_count: number;
    total_quantity: number;
    avg_price: number;
    recent_avg: number;
    old_avg: number;
  }>(
    `SELECT
      o.item_name,
      COUNT(*) as order_count,
      SUM(o.quantity) as total_quantity,
      AVG(ph.price) as avg_price,
      (SELECT AVG(price) FROM price_history WHERE item_name = o.item_name AND recorded_at > DATE_SUB(NOW(), INTERVAL 3 DAY)) as recent_avg,
      (SELECT AVG(price) FROM price_history WHERE item_name = o.item_name AND recorded_at BETWEEN DATE_SUB(NOW(), INTERVAL 7 DAY) AND DATE_SUB(NOW(), INTERVAL 3 DAY)) as old_avg
    FROM orders o
    LEFT JOIN price_history ph ON o.item_name = ph.item_name
    WHERE o.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY o.item_name
    ORDER BY order_count DESC
    LIMIT ?`,
    [limit]
  );

  return result.rows.map((row) => {
    const recentAvg = row.recent_avg || row.avg_price;
    const oldAvg = row.old_avg || row.avg_price;
    const change = oldAvg > 0 ? ((recentAvg - oldAvg) / oldAvg) * 100 : 0;

    let trend: "up" | "down" | "stable" = "stable";
    if (change > 5) trend = "up";
    else if (change < -5) trend = "down";

    return {
      item_name: row.item_name,
      order_count: row.order_count,
      total_quantity: row.total_quantity,
      avg_price: row.avg_price || 0,
      trend,
      trend_percentage: change,
    };
  });
}

export async function getBestDeals(limit: number = 10): Promise<MarketOrder[]> {
  // Find sell orders with prices below average
  const result = await query<MarketOrder>(
    `SELECT o.*, u.username
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.status = 'active'
      AND o.order_type = 'sell'
      AND o.price IS NOT NULL
      AND o.price < (
        SELECT AVG(price) * 0.9
        FROM price_history ph
        WHERE ph.item_name = o.item_name
          AND ph.recorded_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
      )
    ORDER BY (
      SELECT AVG(price) FROM price_history ph
      WHERE ph.item_name = o.item_name
    ) / o.price DESC
    LIMIT ?`,
    [limit]
  );

  return result.rows;
}

export async function getUserPriceAlerts(userId: number): Promise<PriceAlert[]> {
  const result = await query<PriceAlert>(
    "SELECT * FROM price_alerts WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

export async function createPriceAlert(
  userId: number,
  input: CreatePriceAlertInput
): Promise<number> {
  await query(
    `INSERT INTO price_alerts (user_id, item_name, target_price, \`condition\`)
     VALUES (?, ?, ?, ?)`,
    [userId, input.item_name, input.target_price, input.condition]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function deletePriceAlert(alertId: number, userId: number): Promise<boolean> {
  const result = await query(
    "DELETE FROM price_alerts WHERE id = ? AND user_id = ?",
    [alertId, userId]
  );
  return result.rowCount > 0;
}

export async function checkPriceAlerts(): Promise<number> {
  // Get all active alerts
  const alerts = await query<PriceAlert>(
    "SELECT * FROM price_alerts WHERE is_active = 1 AND triggered_at IS NULL"
  );

  let triggeredCount = 0;

  for (const alert of alerts.rows) {
    // Get recent average price
    const priceResult = await query<{ avg_price: number }>(
      `SELECT AVG(price) as avg_price
      FROM price_history
      WHERE item_name = ? AND recorded_at > DATE_SUB(NOW(), INTERVAL 1 DAY)`,
      [alert.item_name]
    );

    const avgPrice = priceResult.rows[0]?.avg_price;
    if (!avgPrice) continue;

    let triggered = false;
    if (alert.condition === "above" && avgPrice >= alert.target_price) {
      triggered = true;
    } else if (alert.condition === "below" && avgPrice <= alert.target_price) {
      triggered = true;
    }

    if (triggered) {
      await query(
        "UPDATE price_alerts SET triggered_at = NOW(), is_active = 0 WHERE id = ?",
        [alert.id]
      );
      triggeredCount++;
    }
  }

  return triggeredCount;
}

// ========== TRADE MATCHING ==========

export async function findMatches(): Promise<number> {
  // Find matching buy and sell orders
  const matches = await query<{
    buy_order_id: number;
    sell_order_id: number;
    buyer_id: number;
    seller_id: number;
    item_name: string;
    buy_quantity: number;
    sell_quantity: number;
    buy_price: number;
    sell_price: number;
  }>(
    `SELECT
      bo.id as buy_order_id,
      so.id as sell_order_id,
      bo.user_id as buyer_id,
      so.user_id as seller_id,
      bo.item_name,
      bo.quantity as buy_quantity,
      so.quantity as sell_quantity,
      bo.price as buy_price,
      so.price as sell_price
    FROM orders bo
    JOIN orders so ON LOWER(bo.item_name) = LOWER(so.item_name)
    WHERE bo.status = 'active'
      AND so.status = 'active'
      AND bo.order_type = 'buy'
      AND so.order_type = 'sell'
      AND bo.user_id != so.user_id
      AND NOT EXISTS (
        SELECT 1 FROM trade_matches tm
        WHERE tm.buy_order_id = bo.id AND tm.sell_order_id = so.id
      )`
  );

  let matchCount = 0;

  for (const match of matches.rows) {
    const quantity = Math.min(match.buy_quantity, match.sell_quantity);
    let matchScore = 50;

    // Score based on price compatibility
    if (match.buy_price && match.sell_price) {
      if (match.buy_price >= match.sell_price) {
        matchScore += 30;
      } else {
        matchScore += Math.floor((match.buy_price / match.sell_price) * 30);
      }
    }

    // Score based on quantity match
    const qtyRatio = quantity / Math.max(match.buy_quantity, match.sell_quantity);
    matchScore += Math.floor(qtyRatio * 20);

    await query(
      `INSERT INTO trade_matches (buy_order_id, sell_order_id, buyer_id, seller_id, item_name, quantity, buy_price, sell_price, match_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        match.buy_order_id,
        match.sell_order_id,
        match.buyer_id,
        match.seller_id,
        match.item_name,
        quantity,
        match.buy_price,
        match.sell_price,
        matchScore,
      ]
    );
    matchCount++;
  }

  return matchCount;
}

export async function getUserMatches(userId: number): Promise<TradeMatch[]> {
  const result = await query<TradeMatch>(
    `SELECT tm.*,
      bu.username as buyer_username,
      su.username as seller_username
    FROM trade_matches tm
    JOIN users bu ON tm.buyer_id = bu.id
    JOIN users su ON tm.seller_id = su.id
    WHERE (tm.buyer_id = ? OR tm.seller_id = ?)
      AND tm.status != 'expired'
    ORDER BY tm.created_at DESC`,
    [userId, userId]
  );
  return result.rows;
}

export async function getMatchById(matchId: number): Promise<TradeMatch | null> {
  const result = await query<TradeMatch>(
    `SELECT tm.*,
      bu.username as buyer_username,
      su.username as seller_username
    FROM trade_matches tm
    JOIN users bu ON tm.buyer_id = bu.id
    JOIN users su ON tm.seller_id = su.id
    WHERE tm.id = ?`,
    [matchId]
  );
  return result.rows[0] || null;
}

export async function updateMatchStatus(
  matchId: number,
  userId: number,
  status: MatchStatus
): Promise<boolean> {
  const match = await getMatchById(matchId);
  if (!match) return false;

  // Only buyer or seller can update status
  if (match.buyer_id !== userId && match.seller_id !== userId) return false;

  const updates: string[] = ["status = ?"];
  const params: (string | number)[] = [status];

  if (status === "contacted") {
    updates.push("contacted_at = NOW()");
  }

  params.push(matchId);
  const result = await query(
    `UPDATE trade_matches SET ${updates.join(", ")} WHERE id = ?`,
    params
  );
  return result.rowCount > 0;
}

export async function expireOldMatches(): Promise<number> {
  const result = await query(
    `UPDATE trade_matches
     SET status = 'expired'
     WHERE status = 'pending'
       AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`
  );
  return result.rowCount;
}

export async function getBarterSuggestions(userId: number): Promise<BarterSuggestion[]> {
  // Find potential barter matches: user's sell orders vs others' sell orders where items might be tradeable
  const userOrders = await query<MarketOrder>(
    `SELECT * FROM orders
     WHERE user_id = ?
       AND status = 'active'
       AND (order_type = 'trade' OR trade_for IS NOT NULL)`,
    [userId]
  );

  const suggestions: BarterSuggestion[] = [];

  for (const userOrder of userOrders.rows) {
    // Find matching orders
    const matches = await query<MarketOrder>(
      `SELECT o.*, u.username
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.user_id != ?
         AND o.status = 'active'
         AND (o.order_type = 'trade' OR o.trade_for IS NOT NULL)
         AND (
           LOWER(o.item_name) LIKE LOWER(?)
           OR LOWER(o.trade_for) LIKE LOWER(?)
         )
       LIMIT 10`,
      [userId, `%${userOrder.trade_for || ""}%`, `%${userOrder.item_name}%`]
    );

    for (const match of matches.rows) {
      let score = 50;
      let reason = "Potential barter match";

      // Check if items match each other's trade_for
      if (
        userOrder.trade_for &&
        match.item_name.toLowerCase().includes(userOrder.trade_for.toLowerCase())
      ) {
        score += 30;
        reason = `They have ${match.item_name} which you're looking for`;
      }

      if (
        match.trade_for &&
        userOrder.item_name.toLowerCase().includes(match.trade_for.toLowerCase())
      ) {
        score += 20;
        reason += `, and you have ${userOrder.item_name} which they're looking for`;
      }

      suggestions.push({
        your_order: userOrder,
        their_order: match,
        match_reason: reason,
        compatibility_score: score,
      });
    }
  }

  // Sort by score
  return suggestions.sort((a, b) => b.compatibility_score - a.compatibility_score).slice(0, 20);
}

// ========== USER RATINGS ==========

export async function createRating(raterId: number, input: CreateRatingInput): Promise<number> {
  // Prevent self-rating
  if (raterId === input.rated_user_id) {
    throw new Error("Cannot rate yourself");
  }

  // Check if already rated for this trade
  if (input.trade_match_id) {
    const existing = await query<{ id: number }>(
      "SELECT id FROM user_ratings WHERE rater_id = ? AND trade_match_id = ?",
      [raterId, input.trade_match_id]
    );
    if (existing.rows.length > 0) {
      throw new Error("Already rated this trade");
    }
  }

  await query(
    `INSERT INTO user_ratings (rater_id, rated_user_id, rating, comment, trade_match_id)
     VALUES (?, ?, ?, ?, ?)`,
    [raterId, input.rated_user_id, input.rating, input.comment || null, input.trade_match_id || null]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function getUserRatings(userId: number): Promise<UserRating[]> {
  const result = await query<UserRating>(
    `SELECT r.*,
      ru.username as rater_username,
      u.username as rated_username
    FROM user_ratings r
    JOIN users ru ON r.rater_id = ru.id
    JOIN users u ON r.rated_user_id = u.id
    WHERE r.rated_user_id = ?
    ORDER BY r.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getUserReputation(userId: number): Promise<UserReputation | null> {
  const ratingsResult = await query<{
    avg_rating: number;
    total_ratings: number;
  }>(
    `SELECT
      AVG(rating) as avg_rating,
      COUNT(*) as total_ratings
    FROM user_ratings
    WHERE rated_user_id = ?`,
    [userId]
  );

  const tradesResult = await query<{
    completed_trades: number;
    successful_matches: number;
  }>(
    `SELECT
      COUNT(DISTINCT CASE WHEN status = 'completed' THEN id END) as completed_trades,
      COUNT(DISTINCT CASE WHEN status IN ('completed', 'contacted') THEN id END) as successful_matches
    FROM trade_matches
    WHERE buyer_id = ? OR seller_id = ?`,
    [userId, userId]
  );

  const userResult = await query<{ username: string }>(
    "SELECT username FROM users WHERE id = ?",
    [userId]
  );

  if (!userResult.rows[0]) return null;

  return {
    user_id: userId,
    username: userResult.rows[0].username,
    avg_rating: ratingsResult.rows[0]?.avg_rating || 0,
    total_ratings: ratingsResult.rows[0]?.total_ratings || 0,
    completed_trades: tradesResult.rows[0]?.completed_trades || 0,
    successful_matches: tradesResult.rows[0]?.successful_matches || 0,
  };
}

// ========== ACHIEVEMENTS & XP ==========

// Achievements definitions (can be extended)
const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_order",
    name: "First Trade",
    description: "Create your first market order",
    category: "trading",
    icon: "shopping-cart",
    xp_reward: 10,
    requirement_type: "orders_created",
    requirement_value: 1,
    is_hidden: false,
  },
  {
    id: "trader_10",
    name: "Active Trader",
    description: "Create 10 market orders",
    category: "trading",
    icon: "trending-up",
    xp_reward: 50,
    requirement_type: "orders_created",
    requirement_value: 10,
    is_hidden: false,
  },
  {
    id: "merchant",
    name: "Merchant",
    description: "Create your first merchant",
    category: "trading",
    icon: "store",
    xp_reward: 25,
    requirement_type: "merchants_created",
    requirement_value: 1,
    is_hidden: false,
  },
  {
    id: "crafter",
    name: "Crafter",
    description: "Use the crafting calculator 10 times",
    category: "crafting",
    icon: "hammer",
    xp_reward: 30,
    requirement_type: "calculations_made",
    requirement_value: 10,
    is_hidden: false,
  },
  {
    id: "alliance_leader",
    name: "Alliance Leader",
    description: "Create an alliance",
    category: "community",
    icon: "users",
    xp_reward: 50,
    requirement_type: "alliances_created",
    requirement_value: 1,
    is_hidden: false,
  },
  {
    id: "social_butterfly",
    name: "Social Butterfly",
    description: "Join an alliance",
    category: "community",
    icon: "user-plus",
    xp_reward: 20,
    requirement_type: "alliances_joined",
    requirement_value: 1,
    is_hidden: false,
  },
];

export async function checkAndUpdateAchievements(userId: number): Promise<string[]> {
  const newAchievements: string[] = [];

  // Get user stats
  const ordersCount = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM orders WHERE user_id = ?",
    [userId]
  );
  const merchantsCount = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM merchants WHERE user_id = ?",
    [userId]
  );
  const alliancesCreated = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM alliances WHERE leader_id = ?",
    [userId]
  );
  const alliancesJoined = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM alliance_members WHERE user_id = ?",
    [userId]
  );

  const stats: Record<string, number> = {
    orders_created: ordersCount.rows[0]?.count || 0,
    merchants_created: merchantsCount.rows[0]?.count || 0,
    alliances_created: alliancesCreated.rows[0]?.count || 0,
    alliances_joined: alliancesJoined.rows[0]?.count || 0,
  };

  // Check each achievement
  for (const achievement of ACHIEVEMENTS) {
    // Check if already completed
    const existing = await query<UserAchievement>(
      "SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?",
      [userId, achievement.id]
    );

    const userStat = stats[achievement.requirement_type] || 0;
    const progress = Math.min(userStat, achievement.requirement_value);
    const completed = userStat >= achievement.requirement_value;

    if (existing.rows.length === 0) {
      // Create new achievement record
      await query(
        `INSERT INTO user_achievements (user_id, achievement_id, progress, completed, completed_at)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, achievement.id, progress, completed ? 1 : 0, completed ? new Date().toISOString() : null]
      );

      if (completed) {
        // Award XP
        await query(
          "INSERT INTO user_xp (user_id, total_xp) VALUES (?, ?) ON DUPLICATE KEY UPDATE total_xp = total_xp + ?",
          [userId, achievement.xp_reward, achievement.xp_reward]
        );
        newAchievements.push(achievement.id);
      }
    } else if (!existing.rows[0].completed && completed) {
      // Update to completed
      await query(
        "UPDATE user_achievements SET progress = ?, completed = 1, completed_at = NOW() WHERE user_id = ? AND achievement_id = ?",
        [progress, userId, achievement.id]
      );

      // Award XP
      await query(
        "INSERT INTO user_xp (user_id, total_xp) VALUES (?, ?) ON DUPLICATE KEY UPDATE total_xp = total_xp + ?",
        [userId, achievement.xp_reward, achievement.xp_reward]
      );
      newAchievements.push(achievement.id);
    } else if (!existing.rows[0].completed) {
      // Update progress
      await query(
        "UPDATE user_achievements SET progress = ? WHERE user_id = ? AND achievement_id = ?",
        [progress, userId, achievement.id]
      );
    }
  }

  return newAchievements;
}

export async function getCompletedAchievements(userId: number): Promise<UserAchievement[]> {
  const result = await query<UserAchievement>(
    "SELECT * FROM user_achievements WHERE user_id = ? AND completed = 1 ORDER BY completed_at DESC",
    [userId]
  );
  return result.rows;
}

export async function getUserXP(userId: number): Promise<UserXP | null> {
  const xpResult = await query<{ total_xp: number }>(
    "SELECT total_xp FROM user_xp WHERE user_id = ?",
    [userId]
  );

  const userResult = await query<{ username: string }>(
    "SELECT username FROM users WHERE id = ?",
    [userId]
  );

  if (!userResult.rows[0]) return null;

  const totalXp = xpResult.rows[0]?.total_xp || 0;
  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;
  const xpForCurrentLevel = (level - 1) * (level - 1) * 100;
  const xpForNextLevel = level * level * 100;
  const xpToNextLevel = xpForNextLevel - totalXp;

  return {
    user_id: userId,
    username: userResult.rows[0].username,
    total_xp: totalXp,
    level,
    xp_to_next_level: xpToNextLevel,
  };
}

export async function getLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
  const result = await query<LeaderboardEntry>(
    `SELECT
      ux.user_id,
      u.username,
      u.display_name,
      u.avatar_url,
      ux.total_xp,
      (SELECT COUNT(*) FROM user_achievements WHERE user_id = ux.user_id AND completed = 1) as achievements_count
    FROM user_xp ux
    JOIN users u ON ux.user_id = u.id
    WHERE u.is_banned = 0
    ORDER BY ux.total_xp DESC
    LIMIT ?`,
    [limit]
  );

  return result.rows.map((row, index) => {
    const level = Math.floor(Math.sqrt(row.total_xp / 100)) + 1;
    return {
      rank: index + 1,
      user_id: row.user_id,
      username: row.username,
      display_name: row.display_name,
      total_xp: row.total_xp,
      level,
      achievements_count: row.achievements_count,
      avatar_url: row.avatar_url,
    };
  });
}

// ========== PROJECT MATERIALS ==========

export async function getProjectMaterials(projectId: number): Promise<ProjectMaterial[]> {
  const items = await getProjectItems(projectId);
  const materialMap = new Map<number, ProjectMaterial>();

  for (const item of items) {
    const itemData = await getItem(item.item_id);
    if (!itemData) continue;

    // Get base materials for this item
    const baseMaterials = await calculateBaseMaterials(item.item_id, item.quantity);

    for (const [matId, quantity] of baseMaterials) {
      const material = await getItem(matId);
      if (!material) continue;

      const existing = materialMap.get(matId);
      if (existing) {
        existing.required_quantity += quantity;
        existing.remaining_quantity = existing.required_quantity - existing.completed_quantity;
      } else {
        materialMap.set(matId, {
          item_id: matId,
          item_name: material.name,
          category: material.category,
          required_quantity: quantity,
          completed_quantity: 0,
          remaining_quantity: quantity,
        });
      }
    }
  }

  return Array.from(materialMap.values()).sort((a, b) => a.item_name.localeCompare(b.item_name));
}

export async function removeProjectItem(
  itemId: number,
  projectId: number,
  userId: number
): Promise<boolean> {
  const project = await getProjectById(projectId);
  if (!project || project.user_id !== userId) return false;

  const result = await query("DELETE FROM project_items WHERE id = ? AND project_id = ?", [
    itemId,
    projectId,
  ]);
  return result.rowCount > 0;
}

export async function updateProjectItemProgress(
  itemId: number,
  projectId: number,
  userId: number,
  completedQty: number
): Promise<boolean> {
  const project = await getProjectById(projectId);
  if (!project || project.user_id !== userId) return false;

  const result = await query(
    "UPDATE project_items SET quantity_completed = ? WHERE id = ? AND project_id = ?",
    [completedQty, itemId, projectId]
  );
  return result.rowCount > 0;
}

// ========== WEBHOOKS ==========

export async function updateWebhook(
  webhookId: number,
  userId: number,
  updates: Partial<CreateWebhookInput>
): Promise<boolean> {
  const webhook = await getWebhookById(webhookId);
  if (!webhook || webhook.user_id !== userId) return false;

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.webhook_url !== undefined) {
    fields.push("webhook_url = ?");
    values.push(updates.webhook_url);
  }
  if (updates.notify_trades !== undefined) {
    fields.push("notify_trades = ?");
    values.push(updates.notify_trades ? 1 : 0);
  }
  if (updates.notify_matches !== undefined) {
    fields.push("notify_matches = ?");
    values.push(updates.notify_matches ? 1 : 0);
  }
  if (updates.notify_price_alerts !== undefined) {
    fields.push("notify_price_alerts = ?");
    values.push(updates.notify_price_alerts ? 1 : 0);
  }
  if (updates.notify_alliance !== undefined) {
    fields.push("notify_alliance = ?");
    values.push(updates.notify_alliance ? 1 : 0);
  }

  if (fields.length === 0) return false;

  values.push(webhookId);
  const result = await query(`UPDATE discord_webhooks SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.rowCount > 0;
}

// ========== RECIPE SUBMISSIONS ==========

export async function approveAndAddRecipe(submissionId: number, reviewerId: number): Promise<boolean> {
  const submission = await getRecipeSubmissionById(submissionId);
  if (!submission) return false;
  if (submission.status !== "pending") return false;

  try {
    let ingredients: { name: string; quantity: number }[] = [];
    try {
      ingredients = JSON.parse(submission.ingredients);
    } catch {
      return false;
    }

    // Check or create result item
    let resultItem = await getItemByName(submission.item_name);
    if (!resultItem) {
      const resultId = await addItem(submission.item_name, "misc", false, `Added from recipe submission #${submissionId}`);
      resultItem = await getItem(resultId);
      if (!resultItem) return false;
    }

    // Add each ingredient to the recipe
    for (const ing of ingredients) {
      let ingredientItem = await getItemByName(ing.name);
      if (!ingredientItem) {
        // Create missing ingredient as base material
        const ingId = await addItem(ing.name, "material", true, `Added from recipe submission #${submissionId}`);
        ingredientItem = await getItem(ingId);
        if (!ingredientItem) continue;
      }

      await addRecipeIngredient(resultItem.id, ingredientItem.id, ing.quantity);
    }

    // Mark submission as approved
    await reviewRecipeSubmission(submissionId, reviewerId, {
      status: "approved",
      admin_notes: "Recipe approved and added to database",
    });

    return true;
  } catch (error) {
    console.error("Error approving recipe:", error);
    return false;
  }
}

// ========== CHARACTER SHOWCASE FUNCTIONS ==========

const MAX_CHARACTERS_PER_USER = 5;

export async function getUserCharacters(userId: number): Promise<Character[]> {
  const result = await query<Character>(
    "SELECT * FROM characters WHERE user_id = ? ORDER BY is_primary DESC, name ASC",
    [userId]
  );
  return result.rows;
}

export async function getUserCharactersWithStats(userId: number): Promise<CharacterWithStats[]> {
  const result = await query<CharacterWithStats>(`
    SELECT
      c.*,
      (SELECT COUNT(*) FROM orders WHERE character_id = c.id) as orders_count,
      (SELECT COUNT(*) FROM merchants WHERE character_id = c.id) as merchants_count,
      (SELECT COUNT(*) FROM projects WHERE character_id = c.id) as projects_count,
      (SELECT COUNT(*) FROM user_skills WHERE character_id = c.id) as skills_count
    FROM characters c
    WHERE c.user_id = ?
    ORDER BY c.is_primary DESC, c.name ASC
  `, [userId]);
  return result.rows;
}

export async function getCharacterById(characterId: number): Promise<Character | null> {
  const result = await query<Character>(
    "SELECT * FROM characters WHERE id = ?",
    [characterId]
  );
  return result.rows[0] || null;
}

export async function getCharacterWithStats(characterId: number): Promise<CharacterWithStats | null> {
  const result = await query<CharacterWithStats>(`
    SELECT
      c.*,
      (SELECT COUNT(*) FROM orders WHERE character_id = c.id) as orders_count,
      (SELECT COUNT(*) FROM merchants WHERE character_id = c.id) as merchants_count,
      (SELECT COUNT(*) FROM projects WHERE character_id = c.id) as projects_count,
      (SELECT COUNT(*) FROM user_skills WHERE character_id = c.id) as skills_count
    FROM characters c
    WHERE c.id = ?
  `, [characterId]);
  return result.rows[0] || null;
}

export async function createCharacter(
  userId: number,
  input: CreateCharacterInput
): Promise<number | null> {
  // Check character limit
  const countResult = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM characters WHERE user_id = ?",
    [userId]
  );
  if (countResult.rows[0].count >= MAX_CHARACTERS_PER_USER) {
    return null; // Limit reached
  }

  // If this is the first character or marked as primary, handle primary flag
  const isFirst = countResult.rows[0].count === 0;
  const isPrimary = isFirst || input.is_primary;

  // If setting as primary, unset other primary characters
  if (isPrimary && !isFirst) {
    await query(
      "UPDATE characters SET is_primary = FALSE WHERE user_id = ?",
      [userId]
    );
  }

  const result = await query(
    `INSERT INTO characters (user_id, name, server, religion, avatar_url, premium_until, is_primary, bio, deed_name, playstyle)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.name,
      input.server || null,
      input.religion || null,
      input.avatar_url || null,
      input.premium_until || null,
      isPrimary,
      input.bio || null,
      input.deed_name || null,
      input.playstyle || null,
    ]
  );

  // Get the inserted ID
  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || null;
}

export async function updateCharacter(
  characterId: number,
  userId: number,
  input: UpdateCharacterInput,
  isAdmin: boolean = false
): Promise<boolean> {
  // Verify ownership
  const character = await getCharacterById(characterId);
  if (!character) return false;
  if (character.user_id !== userId && !isAdmin) return false;

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    values.push(input.name);
  }
  if (input.server !== undefined) {
    updates.push("server = ?");
    values.push(input.server || null);
  }
  if (input.religion !== undefined) {
    updates.push("religion = ?");
    values.push(input.religion || null);
  }
  if (input.avatar_url !== undefined) {
    updates.push("avatar_url = ?");
    values.push(input.avatar_url || null);
  }
  if (input.premium_until !== undefined) {
    updates.push("premium_until = ?");
    values.push(input.premium_until || null);
  }
  if (input.bio !== undefined) {
    updates.push("bio = ?");
    values.push(input.bio || null);
  }
  if (input.deed_name !== undefined) {
    updates.push("deed_name = ?");
    values.push(input.deed_name || null);
  }
  if (input.playstyle !== undefined) {
    updates.push("playstyle = ?");
    values.push(input.playstyle || null);
  }

  // Handle primary flag
  if (input.is_primary === true) {
    // Unset other primary characters first
    await query(
      "UPDATE characters SET is_primary = FALSE WHERE user_id = ?",
      [character.user_id]
    );
    updates.push("is_primary = TRUE");
  }

  if (updates.length === 0) return true;

  values.push(characterId);
  const result = await query(
    `UPDATE characters SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  return result.rowCount > 0;
}

export async function deleteCharacter(
  characterId: number,
  userId: number,
  isAdmin: boolean = false
): Promise<boolean> {
  const character = await getCharacterById(characterId);
  if (!character) return false;
  if (character.user_id !== userId && !isAdmin) return false;

  const wasPrimary = character.is_primary;
  const result = await query(
    "DELETE FROM characters WHERE id = ?",
    [characterId]
  );

  // If deleted character was primary, make another one primary
  if (wasPrimary && result.rowCount > 0) {
    await query(
      `UPDATE characters SET is_primary = TRUE
       WHERE user_id = ?
       ORDER BY created_at ASC
       LIMIT 1`,
      [character.user_id]
    );
  }

  return result.rowCount > 0;
}

export async function setPrimaryCharacter(
  characterId: number,
  userId: number
): Promise<boolean> {
  const character = await getCharacterById(characterId);
  if (!character || character.user_id !== userId) return false;

  // Unset all primary flags for this user
  await query(
    "UPDATE characters SET is_primary = FALSE WHERE user_id = ?",
    [userId]
  );

  // Set the new primary
  const result = await query(
    "UPDATE characters SET is_primary = TRUE WHERE id = ?",
    [characterId]
  );

  return result.rowCount > 0;
}

export async function getCharacterCount(userId: number): Promise<number> {
  const result = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM characters WHERE user_id = ?",
    [userId]
  );
  return result.rows[0]?.count || 0;
}

export async function getPrimaryCharacter(userId: number): Promise<Character | null> {
  const result = await query<Character>(
    "SELECT * FROM characters WHERE user_id = ? AND is_primary = TRUE",
    [userId]
  );
  return result.rows[0] || null;
}
