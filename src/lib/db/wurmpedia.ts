import { query } from "./core";
import type {
  WurmpediaRecipe,
  WurmpediaRecipeInput,
  WurmpediaRecipeType,
  WurmpediaRecipeFilters,
  WurmpediaImportResult,
  WurmpediaImportLog,
} from "../types";
import type { PaginatedResult, PaginationParams } from "./pagination";
import { validatePagination } from "./pagination";

// ========== WURMPEDIA RECIPE IMPORT ==========

/**
 * Convert name to URL-friendly slug
 */
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Import recipes from Wurmpedia JSON format
 */
export async function importWurmpediaRecipes(
  recipes: WurmpediaRecipeInput[],
  importedBy?: number
): Promise<WurmpediaImportResult> {
  const result: WurmpediaImportResult = {
    success: true,
    recipes_added: 0,
    recipes_updated: 0,
    recipes_failed: 0,
    errors: [],
  };

  for (const recipe of recipes) {
    try {
      // Check if recipe already exists by wurmpedia_id
      const existing = await query<{ id: number }>(
        "SELECT id FROM wurmpedia_recipes WHERE wurmpedia_id = ?",
        [recipe.id]
      );

      const slug = createSlug(recipe.name);
      const recipeType = (recipe.type || 'misc') as WurmpediaRecipeType;

      if (existing.rows.length > 0) {
        // Update existing recipe
        await query(
          `UPDATE wurmpedia_recipes SET
            name = ?,
            slug = ?,
            image_url = ?,
            categories = ?,
            creation_tools = ?,
            creation_target = ?,
            creation_target_quantity = ?,
            creation_menu = ?,
            creation_steps = ?,
            materials = ?,
            result_name = ?,
            result_weight = ?,
            result_quantity = ?,
            skill = ?,
            difficulty = ?,
            can_improve = ?,
            improve_with = ?,
            properties = ?,
            notes = ?,
            is_cooking = ?,
            has_materials = ?,
            recipe_type = ?
          WHERE wurmpedia_id = ?`,
          [
            recipe.name,
            slug,
            recipe.image || null,
            recipe.categories ? JSON.stringify(recipe.categories) : null,
            recipe.creation?.tools ? JSON.stringify(recipe.creation.tools) : null,
            recipe.creation?.target || null,
            recipe.creation?.targetQuantity || null,
            recipe.creation?.menu || null,
            recipe.creation?.steps ? JSON.stringify(recipe.creation.steps) : null,
            recipe.materials ? JSON.stringify(recipe.materials) : null,
            recipe.result?.name || null,
            recipe.result?.weight || null,
            recipe.result?.quantity || 1,
            recipe.skill || null,
            recipe.difficulty || null,
            recipe.canImprove || false,
            recipe.improveWith || null,
            recipe.properties ? JSON.stringify(recipe.properties) : null,
            recipe.notes ? JSON.stringify(recipe.notes) : null,
            recipe.isCooking || false,
            recipe.hasMaterials || false,
            recipeType,
            recipe.id,
          ]
        );
        result.recipes_updated++;
      } else {
        // Insert new recipe
        await query(
          `INSERT INTO wurmpedia_recipes (
            wurmpedia_id, name, slug, image_url, categories,
            creation_tools, creation_target, creation_target_quantity,
            creation_menu, creation_steps, materials,
            result_name, result_weight, result_quantity,
            skill, difficulty, can_improve, improve_with,
            properties, notes, is_cooking, has_materials, recipe_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            recipe.id,
            recipe.name,
            slug,
            recipe.image || null,
            recipe.categories ? JSON.stringify(recipe.categories) : null,
            recipe.creation?.tools ? JSON.stringify(recipe.creation.tools) : null,
            recipe.creation?.target || null,
            recipe.creation?.targetQuantity || null,
            recipe.creation?.menu || null,
            recipe.creation?.steps ? JSON.stringify(recipe.creation.steps) : null,
            recipe.materials ? JSON.stringify(recipe.materials) : null,
            recipe.result?.name || null,
            recipe.result?.weight || null,
            recipe.result?.quantity || 1,
            recipe.skill || null,
            recipe.difficulty || null,
            recipe.canImprove || false,
            recipe.improveWith || null,
            recipe.properties ? JSON.stringify(recipe.properties) : null,
            recipe.notes ? JSON.stringify(recipe.notes) : null,
            recipe.isCooking || false,
            recipe.hasMaterials || false,
            recipeType,
          ]
        );
        result.recipes_added++;
      }
    } catch (error) {
      result.recipes_failed++;
      result.errors.push(`Failed to import "${recipe.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Log the import
  try {
    await query(
      `INSERT INTO wurmpedia_import_logs (imported_by, recipes_added, recipes_updated, recipes_failed, error_details)
       VALUES (?, ?, ?, ?, ?)`,
      [
        importedBy || null,
        result.recipes_added,
        result.recipes_updated,
        result.recipes_failed,
        result.errors.length > 0 ? JSON.stringify(result.errors) : null,
      ]
    );

    const logResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
    result.log_id = logResult.rows[0]?.id;
  } catch {
    // Log failure shouldn't fail the import
  }

  result.success = result.recipes_failed === 0;
  return result;
}

/**
 * Parse JSON fields in Wurmpedia recipe
 */
function parseWurmpediaRecipe(row: WurmpediaRecipe): WurmpediaRecipe {
  return {
    ...row,
    categories: typeof row.categories === 'string' ? JSON.parse(row.categories) : row.categories,
    creation_tools: typeof row.creation_tools === 'string' ? JSON.parse(row.creation_tools) : row.creation_tools,
    creation_steps: typeof row.creation_steps === 'string' ? JSON.parse(row.creation_steps) : row.creation_steps,
    materials: typeof row.materials === 'string' ? JSON.parse(row.materials) : row.materials,
    properties: typeof row.properties === 'string' ? JSON.parse(row.properties) : row.properties,
    notes: typeof row.notes === 'string' ? JSON.parse(row.notes) : row.notes,
  };
}

/**
 * Get all Wurmpedia recipes with optional filters
 */
export async function getWurmpediaRecipes(
  filters?: WurmpediaRecipeFilters,
  pagination?: PaginationParams
): Promise<PaginatedResult<WurmpediaRecipe>> {
  const { offset, limit, page } = validatePagination(pagination);

  let whereClause = "WHERE 1=1";
  const params: (string | number | boolean)[] = [];

  if (filters?.search) {
    whereClause += " AND (name LIKE ? OR result_name LIKE ? OR skill LIKE ?)";
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (filters?.skill) {
    whereClause += " AND skill = ?";
    params.push(filters.skill);
  }

  if (filters?.recipe_type) {
    whereClause += " AND recipe_type = ?";
    params.push(filters.recipe_type);
  }

  if (filters?.is_cooking !== undefined) {
    whereClause += " AND is_cooking = ?";
    params.push(filters.is_cooking);
  }

  if (filters?.has_materials !== undefined) {
    whereClause += " AND has_materials = ?";
    params.push(filters.has_materials);
  }

  if (filters?.can_improve !== undefined) {
    whereClause += " AND can_improve = ?";
    params.push(filters.can_improve);
  }

  if (filters?.category) {
    whereClause += " AND JSON_CONTAINS(categories, ?)";
    params.push(JSON.stringify(filters.category));
  }

  if (filters?.activated !== undefined) {
    if (filters.activated) {
      whereClause += " AND activated_at IS NOT NULL";
    } else {
      whereClause += " AND activated_at IS NULL";
    }
  }

  // Count total
  const countResult = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM wurmpedia_recipes ${whereClause}`,
    params
  );
  const total = countResult.rows[0]?.count || 0;

  // Get data
  const dataResult = await query<WurmpediaRecipe>(
    `SELECT * FROM wurmpedia_recipes ${whereClause} ORDER BY name LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Parse JSON fields
  const recipes = dataResult.rows.map(parseWurmpediaRecipe);

  return {
    data: recipes,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get single Wurmpedia recipe by ID
 */
export async function getWurmpediaRecipeById(id: number): Promise<WurmpediaRecipe | null> {
  const result = await query<WurmpediaRecipe>(
    "SELECT * FROM wurmpedia_recipes WHERE id = ?",
    [id]
  );

  if (result.rows.length === 0) return null;
  return parseWurmpediaRecipe(result.rows[0]);
}

/**
 * Get Wurmpedia recipe by wurmpedia_id
 */
export async function getWurmpediaRecipeByWurmpediaId(wurmpediaId: number): Promise<WurmpediaRecipe | null> {
  const result = await query<WurmpediaRecipe>(
    "SELECT * FROM wurmpedia_recipes WHERE wurmpedia_id = ?",
    [wurmpediaId]
  );

  if (result.rows.length === 0) return null;
  return parseWurmpediaRecipe(result.rows[0]);
}

/**
 * Search Wurmpedia recipes using fulltext search
 */
export async function searchWurmpediaRecipes(
  searchTerm: string,
  limit: number = 20
): Promise<WurmpediaRecipe[]> {
  const result = await query<WurmpediaRecipe>(
    `SELECT *, MATCH(name, result_name, skill) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
     FROM wurmpedia_recipes
     WHERE MATCH(name, result_name, skill) AGAINST(? IN NATURAL LANGUAGE MODE)
     ORDER BY relevance DESC
     LIMIT ?`,
    [searchTerm, searchTerm, limit]
  );

  return result.rows.map(parseWurmpediaRecipe);
}

/**
 * Get all unique skills from Wurmpedia recipes
 */
export async function getWurmpediaSkills(): Promise<string[]> {
  const result = await query<{ skill: string }>(
    "SELECT DISTINCT skill FROM wurmpedia_recipes WHERE skill IS NOT NULL ORDER BY skill"
  );
  return result.rows.map(r => r.skill);
}

/**
 * Get all unique categories from Wurmpedia recipes
 */
export async function getWurmpediaCategories(): Promise<string[]> {
  const result = await query<{ category: string }>(
    `SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(categories, CONCAT('$[', n.i, ']'))) as category
     FROM wurmpedia_recipes,
     (SELECT 0 as i UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
      UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) n
     WHERE JSON_EXTRACT(categories, CONCAT('$[', n.i, ']')) IS NOT NULL
     ORDER BY category`
  );
  return result.rows.map(r => r.category).filter(Boolean);
}

/**
 * Get Wurmpedia recipe statistics
 */
export async function getWurmpediaStats(): Promise<{
  total_recipes: number;
  cooking_recipes: number;
  improvable_recipes: number;
  recipes_with_materials: number;
  unique_skills: number;
  unique_categories: number;
  by_type: Record<string, number>;
}> {
  const [totalResult, cookingResult, improvableResult, materialsResult, skillsResult, typesResult] = await Promise.all([
    query<{ count: number }>("SELECT COUNT(*) as count FROM wurmpedia_recipes"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM wurmpedia_recipes WHERE is_cooking = TRUE"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM wurmpedia_recipes WHERE can_improve = TRUE"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM wurmpedia_recipes WHERE has_materials = TRUE"),
    query<{ count: number }>("SELECT COUNT(DISTINCT skill) as count FROM wurmpedia_recipes WHERE skill IS NOT NULL"),
    query<{ recipe_type: string; count: number }>(
      "SELECT recipe_type, COUNT(*) as count FROM wurmpedia_recipes GROUP BY recipe_type"
    ),
  ]);

  const categories = await getWurmpediaCategories();

  const byType: Record<string, number> = {};
  typesResult.rows.forEach(r => {
    byType[r.recipe_type] = r.count;
  });

  return {
    total_recipes: totalResult.rows[0]?.count || 0,
    cooking_recipes: cookingResult.rows[0]?.count || 0,
    improvable_recipes: improvableResult.rows[0]?.count || 0,
    recipes_with_materials: materialsResult.rows[0]?.count || 0,
    unique_skills: skillsResult.rows[0]?.count || 0,
    unique_categories: categories.length,
    by_type: byType,
  };
}

/**
 * Get Wurmpedia import logs
 */
export async function getWurmpediaImportLogs(limit: number = 10): Promise<WurmpediaImportLog[]> {
  const result = await query<WurmpediaImportLog>(
    `SELECT * FROM wurmpedia_import_logs ORDER BY imported_at DESC LIMIT ?`,
    [limit]
  );

  return result.rows.map(row => ({
    ...row,
    error_details: typeof row.error_details === 'string' ? JSON.parse(row.error_details) : row.error_details,
  }));
}

/**
 * Clear all Wurmpedia recipes (for re-import)
 */
export async function clearWurmpediaRecipes(): Promise<{ deleted: number }> {
  const countResult = await query<{ count: number }>("SELECT COUNT(*) as count FROM wurmpedia_recipes");
  const count = countResult.rows[0]?.count || 0;

  await query("DELETE FROM wurmpedia_recipes");

  return { deleted: count };
}

/**
 * Delete single Wurmpedia recipe
 */
export async function deleteWurmpediaRecipe(id: number): Promise<boolean> {
  const result = await query("DELETE FROM wurmpedia_recipes WHERE id = ?", [id]);
  return result.rowCount > 0;
}
