import { query } from "./core";
import { getAllItems, getAllRecipes, getItemByName, updateItem, addItem, addRecipeIngredient } from "./items";
import type { Item, RecipeWithNames, ImportStats } from "../types";

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
      const slug = item.name.toLowerCase().replace(/\s+/g, '-');
      if (existing) {
        await updateItem(
          existing.id,
          item.name,
          slug,
          item.skill ?? existing.skill ?? null,
          item.difficulty ?? existing.difficulty ?? null,
          item.base_time_seconds ?? existing.base_time_seconds ?? null,
          Boolean(item.is_base_material ?? existing.is_base_material)
        );
        stats.items_updated++;
      } else {
        await addItem(
          item.name,
          slug,
          item.skill ?? null,
          item.difficulty ?? null,
          item.base_time_seconds ?? null,
          Boolean(item.is_base_material)
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
  await query("DELETE FROM recipe_materials");
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
    query<{ count: number }>("SELECT COUNT(*) as count FROM recipe_materials"),
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
  skill?: string | null;
  difficulty?: number | null;
  base_time_seconds?: number | null;
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
      const slug = item.name.toLowerCase().replace(/\s+/g, '-');
      if (existing) {
        await updateItem(
          existing.id,
          item.name,
          slug,
          item.skill ?? existing.skill ?? null,
          item.difficulty ?? existing.difficulty ?? null,
          item.base_time_seconds ?? existing.base_time_seconds ?? null,
          Boolean(item.is_base_material ?? existing.is_base_material)
        );
        stats.updated++;
      } else {
        await addItem(
          item.name,
          slug,
          item.skill ?? null,
          item.difficulty ?? null,
          item.base_time_seconds ?? null,
          Boolean(item.is_base_material)
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
