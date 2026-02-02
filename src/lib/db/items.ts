import { query } from "./core";
import type { Item, Recipe, RecipeWithNames } from "../types";
import type { PaginatedResult, PaginationParams } from "./pagination";
import { validatePagination } from "./pagination";

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
    "SELECT DISTINCT category FROM item_categories ORDER BY category"
  );
  return result.rows.map((r) => r.category);
}

// Get categories for a specific item
export async function getItemCategories(itemId: number): Promise<string[]> {
  const result = await query<{ category: string }>(
    "SELECT category FROM item_categories WHERE item_id = ? ORDER BY category",
    [itemId]
  );
  return result.rows.map((r) => r.category);
}

// Set categories for an item (replaces existing)
export async function setItemCategories(itemId: number, categories: string[]): Promise<void> {
  // Delete existing categories
  await query("DELETE FROM item_categories WHERE item_id = ?", [itemId]);

  // Insert new categories
  if (categories.length > 0) {
    const values = categories.map(cat => [itemId, cat.trim().toLowerCase()]);
    const placeholders = values.map(() => "(?, ?)").join(", ");
    const flatValues = values.flat();
    await query(
      `INSERT INTO item_categories (item_id, category) VALUES ${placeholders}`,
      flatValues
    );
  }
}

// Get all categories with item counts
export async function getCategoriesWithCounts(): Promise<{ category: string; count: number }[]> {
  const result = await query<{ category: string; count: number }>(
    `SELECT category, COUNT(*) as count FROM item_categories GROUP BY category ORDER BY category`
  );
  return result.rows;
}

// Get items without any category assigned
export async function getUncategorizedItems(): Promise<Item[]> {
  const result = await query<Item>(
    `SELECT i.* FROM items i
     LEFT JOIN item_categories ic ON i.id = ic.item_id
     WHERE ic.item_id IS NULL
     ORDER BY i.name`
  );
  return result.rows;
}

export async function getSkills(): Promise<string[]> {
  const result = await query<{ skill: string }>(
    "SELECT DISTINCT skill FROM items WHERE skill IS NOT NULL ORDER BY skill"
  );
  return result.rows.map((r) => r.skill);
}

export async function getRecipe(itemId: number): Promise<Recipe[]> {
  const result = await query<Recipe>(
    `SELECT
      rm.id,
      rm.item_id as result_item_id,
      rm.material_id as ingredient_item_id,
      CAST(rm.quantity AS SIGNED) as quantity
    FROM recipe_materials rm
    WHERE rm.item_id = ? AND rm.material_id IS NOT NULL`,
    [itemId]
  );
  return result.rows;
}

export async function getAllRecipes(): Promise<RecipeWithNames[]> {
  const result = await query<RecipeWithNames>(`
    SELECT
      rm.id,
      rm.item_id as result_item_id,
      rm.material_id as ingredient_item_id,
      CAST(rm.quantity AS SIGNED) as quantity,
      ri.name as result_name,
      ii.name as ingredient_name
    FROM recipe_materials rm
    JOIN items ri ON rm.item_id = ri.id
    JOIN items ii ON rm.material_id = ii.id
    ORDER BY ri.name, ii.name
  `);
  return result.rows;
}

// ========== CRUD FUNCTIONS ==========

export async function addItem(
  name: string,
  slug: string,
  skill: string | null = null,
  difficulty: number | null = null,
  baseTimeSeconds: number | null = null,
  isBaseMaterial: boolean = false
): Promise<number> {
  await query(
    "INSERT INTO items (name, slug, skill, difficulty, base_time_seconds, is_base_material) VALUES (?, ?, ?, ?, ?, ?)",
    [name, slug, skill, difficulty, baseTimeSeconds, isBaseMaterial ? 1 : 0]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function updateItem(
  id: number,
  name: string,
  slug: string,
  skill: string | null,
  difficulty: number | null,
  baseTimeSeconds: number | null,
  isBaseMaterial: boolean
): Promise<boolean> {
  const result = await query(
    "UPDATE items SET name = ?, slug = ?, skill = ?, difficulty = ?, base_time_seconds = ?, is_base_material = ? WHERE id = ?",
    [name, slug, skill, difficulty, baseTimeSeconds, isBaseMaterial ? 1 : 0, id]
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
  await query("DELETE FROM recipe_materials WHERE item_id = ? OR material_id = ?", [id, id]);
  const result = await query("DELETE FROM items WHERE id = ?", [id]);
  return result.rowCount > 0;
}

export async function addRecipeIngredient(
  resultId: number,
  ingredientId: number,
  quantity: number
): Promise<number | null> {
  const existing = await query<{ id: number }>(
    "SELECT id FROM recipe_materials WHERE item_id = ? AND material_id = ?",
    [resultId, ingredientId]
  );

  if (existing.rows.length > 0) return null;

  // Get the ingredient name for the material_name field
  const ingredient = await getItem(ingredientId);
  const materialName = ingredient?.name || "Unknown";
  const materialSlug = ingredient?.slug || null;

  await query(
    `INSERT INTO recipe_materials (item_id, material_id, material_name, material_slug, quantity)
     VALUES (?, ?, ?, ?, ?)`,
    [resultId, ingredientId, materialName, materialSlug, quantity]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || null;
}

export async function updateRecipeIngredient(
  recipeId: number,
  quantity: number
): Promise<boolean> {
  const result = await query("UPDATE recipe_materials SET quantity = ? WHERE id = ?", [quantity, recipeId]);
  return result.rowCount > 0;
}

export async function deleteRecipeIngredient(recipeId: number): Promise<boolean> {
  const result = await query("DELETE FROM recipe_materials WHERE id = ?", [recipeId]);
  return result.rowCount > 0;
}
