import { query } from "./core";
import type {
  CookingCooker,
  CookingContainer,
  CookingPreparation,
  CookingIngredientCategory,
  CookingIngredient,
  CookingSkill,
  CookingRecipe,
  CookingRecipeFilters,
  CookingRecipeComponent,
  AffinityCalculationInput,
  AffinityCalculationResult,
  CCFPValues,
  CCFPCalculationResult,
  UserPlayerNumber,
  UserSavedRecipe,
} from "../types";
import { RARITY_MODIFIERS, DAILY_CCFP } from "../types";
import type { PaginatedResult, PaginationParams } from "./pagination";
import { validatePagination } from "./pagination";

// ========== COOKING SYSTEM ==========

/**
 * Get all cooking cookers
 */
export async function getCookingCookers(): Promise<CookingCooker[]> {
  const result = await query<CookingCooker>(
    "SELECT * FROM cooking_cookers ORDER BY affinity_value"
  );
  return result.rows;
}

/**
 * Get all cooking containers
 */
export async function getCookingContainers(): Promise<CookingContainer[]> {
  const result = await query<CookingContainer>(
    "SELECT * FROM cooking_containers ORDER BY affinity_value"
  );
  return result.rows;
}

/**
 * Get all cooking preparations
 */
export async function getCookingPreparations(): Promise<CookingPreparation[]> {
  const result = await query<CookingPreparation>(
    "SELECT * FROM cooking_preparations ORDER BY affinity_modifier"
  );
  return result.rows.map(row => ({
    ...row,
    applies_to: typeof row.applies_to === 'string' ? JSON.parse(row.applies_to) : row.applies_to,
  }));
}

/**
 * Get all ingredient categories
 */
export async function getCookingIngredientCategories(): Promise<CookingIngredientCategory[]> {
  const result = await query<CookingIngredientCategory>(
    "SELECT * FROM cooking_ingredient_categories ORDER BY display_order"
  );
  return result.rows;
}

/**
 * Get all cooking ingredients with optional category filter
 */
export async function getCookingIngredients(categoryId?: number): Promise<CookingIngredient[]> {
  let sql = `
    SELECT i.*, c.name as category_name
    FROM cooking_ingredients i
    JOIN cooking_ingredient_categories c ON i.category_id = c.id
  `;
  const params: number[] = [];

  if (categoryId) {
    sql += " WHERE i.category_id = ?";
    params.push(categoryId);
  }

  sql += " ORDER BY c.display_order, i.name";

  const result = await query<CookingIngredient>(sql, params);
  return result.rows;
}

/**
 * Get single cooking ingredient by ID
 */
export async function getCookingIngredientById(id: number): Promise<CookingIngredient | null> {
  const result = await query<CookingIngredient>(
    `SELECT i.*, c.name as category_name
     FROM cooking_ingredients i
     JOIN cooking_ingredient_categories c ON i.category_id = c.id
     WHERE i.id = ?`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Search cooking ingredients by name
 */
export async function searchCookingIngredients(searchTerm: string, limit: number = 20): Promise<CookingIngredient[]> {
  const result = await query<CookingIngredient>(
    `SELECT i.*, c.name as category_name
     FROM cooking_ingredients i
     JOIN cooking_ingredient_categories c ON i.category_id = c.id
     WHERE i.name LIKE ?
     ORDER BY i.name
     LIMIT ?`,
    [`%${searchTerm}%`, limit]
  );
  return result.rows;
}

/**
 * Get all cooking skills (affinity targets)
 */
export async function getCookingSkills(): Promise<CookingSkill[]> {
  const result = await query<CookingSkill>(
    "SELECT * FROM cooking_skills ORDER BY id"
  );
  return result.rows;
}

/**
 * Get cooking skill by ID
 */
export async function getCookingSkillById(id: number): Promise<CookingSkill | null> {
  const result = await query<CookingSkill>(
    "SELECT * FROM cooking_skills WHERE id = ?",
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Calculate affinity from cooking components
 */
export async function calculateAffinity(
  input: AffinityCalculationInput
): Promise<AffinityCalculationResult> {
  let totalPoints = input.player_number;
  const breakdown = {
    cooker: 0,
    container: 0,
    ingredients: [] as Array<{
      name: string;
      base: number;
      preparation: number;
      rarity: number;
      total: number;
    }>,
  };

  // Add cooker points
  if (input.cooker_id) {
    const cookerResult = await query<{ affinity_value: number }>(
      "SELECT affinity_value FROM cooking_cookers WHERE id = ?",
      [input.cooker_id]
    );
    if (cookerResult.rows[0]) {
      breakdown.cooker = cookerResult.rows[0].affinity_value;
      totalPoints += breakdown.cooker;
    }
  }

  // Add container points
  if (input.container_id) {
    const containerResult = await query<{ affinity_value: number }>(
      "SELECT affinity_value FROM cooking_containers WHERE id = ?",
      [input.container_id]
    );
    if (containerResult.rows[0]) {
      breakdown.container = containerResult.rows[0].affinity_value;
      totalPoints += breakdown.container;
    }
  }

  // Add ingredient points
  for (const ing of input.ingredients) {
    const ingredientResult = await query<{ name: string; affinity_value: number }>(
      "SELECT name, affinity_value FROM cooking_ingredients WHERE id = ?",
      [ing.ingredient_id]
    );

    if (ingredientResult.rows[0]) {
      const ingredient = ingredientResult.rows[0];
      let prepModifier = 0;

      // Get preparation modifier
      if (ing.preparation_id) {
        const prepResult = await query<{ affinity_modifier: number }>(
          "SELECT affinity_modifier FROM cooking_preparations WHERE id = ?",
          [ing.preparation_id]
        );
        if (prepResult.rows[0]) {
          prepModifier = prepResult.rows[0].affinity_modifier;
        }
      }

      // Get rarity modifier
      const rarityModifier = RARITY_MODIFIERS[ing.rarity] || 0;

      const ingredientTotal = ingredient.affinity_value + prepModifier + rarityModifier;

      breakdown.ingredients.push({
        name: ingredient.name,
        base: ingredient.affinity_value,
        preparation: prepModifier,
        rarity: rarityModifier,
        total: ingredientTotal,
      });

      totalPoints += ingredientTotal;
    }
  }

  // Calculate final skill ID (mod 138)
  const skillId = ((totalPoints % 138) + 138) % 138; // Handle negative numbers

  // Get skill name
  const skill = await getCookingSkillById(skillId);

  return {
    skill_id: skillId,
    skill_name: skill?.name || `Unknown (${skillId})`,
    total_points: totalPoints,
    breakdown,
  };
}

/**
 * Calculate CCFP values from ingredients
 */
export async function calculateCCFP(
  ingredients: Array<{ ingredient_id: number; quantity: number }>
): Promise<CCFPCalculationResult> {
  const totals: CCFPValues = { calories: 0, carbs: 0, fats: 0, proteins: 0 };
  const perIngredient: Array<{ name: string; ccfp: CCFPValues }> = [];

  for (const ing of ingredients) {
    const result = await query<CookingIngredient>(
      "SELECT name, calories, carbs, fats, proteins FROM cooking_ingredients WHERE id = ?",
      [ing.ingredient_id]
    );

    if (result.rows[0]) {
      const ingredient = result.rows[0];
      const quantity = ing.quantity || 1;

      const ccfp: CCFPValues = {
        calories: ingredient.calories * quantity,
        carbs: ingredient.carbs * quantity,
        fats: ingredient.fats * quantity,
        proteins: ingredient.proteins * quantity,
      };

      totals.calories += ccfp.calories;
      totals.carbs += ccfp.carbs;
      totals.fats += ccfp.fats;
      totals.proteins += ccfp.proteins;

      perIngredient.push({ name: ingredient.name, ccfp });
    }
  }

  return {
    totals,
    percentages: {
      calories: (totals.calories / DAILY_CCFP.calories) * 100,
      carbs: (totals.carbs / DAILY_CCFP.carbs) * 100,
      fats: (totals.fats / DAILY_CCFP.fats) * 100,
      proteins: (totals.proteins / DAILY_CCFP.proteins) * 100,
    },
    per_ingredient: perIngredient,
  };
}

/**
 * Discover player number from a test meal result
 */
export async function discoverPlayerNumber(
  cookerId: number | null,
  containerId: number | null,
  ingredientId: number,
  preparationId: number | null,
  resultSkillId: number
): Promise<number> {
  // Get component values
  let componentSum = 0;

  if (cookerId) {
    const cooker = await query<{ affinity_value: number }>(
      "SELECT affinity_value FROM cooking_cookers WHERE id = ?",
      [cookerId]
    );
    if (cooker.rows[0]) componentSum += cooker.rows[0].affinity_value;
  }

  if (containerId) {
    const container = await query<{ affinity_value: number }>(
      "SELECT affinity_value FROM cooking_containers WHERE id = ?",
      [containerId]
    );
    if (container.rows[0]) componentSum += container.rows[0].affinity_value;
  }

  const ingredient = await query<{ affinity_value: number }>(
    "SELECT affinity_value FROM cooking_ingredients WHERE id = ?",
    [ingredientId]
  );
  if (ingredient.rows[0]) componentSum += ingredient.rows[0].affinity_value;

  if (preparationId) {
    const prep = await query<{ affinity_modifier: number }>(
      "SELECT affinity_modifier FROM cooking_preparations WHERE id = ?",
      [preparationId]
    );
    if (prep.rows[0]) componentSum += prep.rows[0].affinity_modifier;
  }

  // Calculate player number: result = (player + components) mod 138
  // So: player = (result - components) mod 138
  let playerNumber = (resultSkillId - componentSum) % 138;
  if (playerNumber < 0) playerNumber += 138;

  return playerNumber;
}

/**
 * Save user's player number
 */
export async function saveUserPlayerNumber(
  userId: number,
  playerNumber: number,
  characterName?: string
): Promise<UserPlayerNumber> {
  // Check if exists
  const existing = await query<{ id: number }>(
    "SELECT id FROM user_player_numbers WHERE user_id = ? AND (character_name = ? OR (character_name IS NULL AND ? IS NULL))",
    [userId, characterName || null, characterName || null]
  );

  if (existing.rows.length > 0) {
    // Update
    await query(
      "UPDATE user_player_numbers SET player_number = ? WHERE id = ?",
      [playerNumber, existing.rows[0].id]
    );
    return getUserPlayerNumber(userId, characterName) as Promise<UserPlayerNumber>;
  } else {
    // Insert
    await query(
      "INSERT INTO user_player_numbers (user_id, player_number, character_name) VALUES (?, ?, ?)",
      [userId, playerNumber, characterName || null]
    );
    return getUserPlayerNumber(userId, characterName) as Promise<UserPlayerNumber>;
  }
}

/**
 * Get user's player number
 */
export async function getUserPlayerNumber(
  userId: number,
  characterName?: string
): Promise<UserPlayerNumber | null> {
  const result = await query<UserPlayerNumber>(
    "SELECT * FROM user_player_numbers WHERE user_id = ? AND (character_name = ? OR (character_name IS NULL AND ? IS NULL))",
    [userId, characterName || null, characterName || null]
  );
  return result.rows[0] || null;
}

/**
 * Get all user's player numbers (for multiple characters)
 */
export async function getUserPlayerNumbers(userId: number): Promise<UserPlayerNumber[]> {
  const result = await query<UserPlayerNumber>(
    "SELECT * FROM user_player_numbers WHERE user_id = ? ORDER BY character_name",
    [userId]
  );
  return result.rows;
}

/**
 * Save user's custom recipe
 */
export async function saveUserRecipe(
  userId: number,
  recipeName: string,
  cookerId: number | null,
  containerId: number | null,
  ingredients: CookingRecipeComponent[],
  playerNumber?: number,
  notes?: string
): Promise<number> {
  // Calculate affinity if player number provided
  let affinitySkillId: number | null = null;
  let ccfp: CCFPValues | null = null;

  if (playerNumber !== undefined) {
    const affinityResult = await calculateAffinity({
      player_number: playerNumber,
      cooker_id: cookerId,
      container_id: containerId,
      ingredients: ingredients.map(i => ({
        ingredient_id: i.ingredient_id,
        preparation_id: i.preparation_id,
        rarity: i.rarity,
      })),
    });
    affinitySkillId = affinityResult.skill_id;
  }

  // Calculate CCFP
  const ccfpResult = await calculateCCFP(
    ingredients.map(i => ({ ingredient_id: i.ingredient_id, quantity: i.quantity }))
  );
  ccfp = ccfpResult.totals;

  await query(
    `INSERT INTO user_saved_recipes
     (user_id, recipe_name, cooker_id, container_id, ingredients, calculated_affinity_skill_id, calculated_ccfp, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      recipeName,
      cookerId,
      containerId,
      JSON.stringify(ingredients),
      affinitySkillId,
      JSON.stringify(ccfp),
      notes || null,
    ]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

/**
 * Get user's saved recipes
 */
export async function getUserSavedRecipes(userId: number): Promise<UserSavedRecipe[]> {
  const result = await query<UserSavedRecipe & { skill_name?: string }>(
    `SELECT r.*, s.name as calculated_affinity_skill_name
     FROM user_saved_recipes r
     LEFT JOIN cooking_skills s ON r.calculated_affinity_skill_id = s.id
     WHERE r.user_id = ?
     ORDER BY r.is_favorite DESC, r.updated_at DESC`,
    [userId]
  );

  return result.rows.map(row => ({
    ...row,
    ingredients: typeof row.ingredients === 'string' ? JSON.parse(row.ingredients) : row.ingredients,
    calculated_ccfp: typeof row.calculated_ccfp === 'string' ? JSON.parse(row.calculated_ccfp) : row.calculated_ccfp,
  }));
}

/**
 * Delete user's saved recipe
 */
export async function deleteUserSavedRecipe(userId: number, recipeId: number): Promise<boolean> {
  const result = await query(
    "DELETE FROM user_saved_recipes WHERE id = ? AND user_id = ?",
    [recipeId, userId]
  );
  return result.rowCount > 0;
}

/**
 * Toggle favorite status on saved recipe
 */
export async function toggleUserRecipeFavorite(userId: number, recipeId: number): Promise<boolean> {
  const result = await query(
    "UPDATE user_saved_recipes SET is_favorite = NOT is_favorite WHERE id = ? AND user_id = ?",
    [recipeId, userId]
  );
  return result.rowCount > 0;
}

/**
 * Get cooking recipes with filters
 */
export async function getCookingRecipes(
  filters?: CookingRecipeFilters,
  pagination?: PaginationParams
): Promise<PaginatedResult<CookingRecipe>> {
  const { offset, limit, page } = validatePagination(pagination);

  let whereClause = "WHERE 1=1";
  const params: (string | number | boolean)[] = [];

  if (filters?.search) {
    whereClause += " AND (r.name LIKE ? OR r.result_name LIKE ?)";
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }

  if (filters?.cooker_id) {
    whereClause += " AND r.cooker_id = ?";
    params.push(filters.cooker_id);
  }

  if (filters?.container_id) {
    whereClause += " AND r.container_id = ?";
    params.push(filters.container_id);
  }

  if (filters?.skill_required) {
    whereClause += " AND r.skill_required = ?";
    params.push(filters.skill_required);
  }

  if (filters?.difficulty_min !== undefined) {
    whereClause += " AND r.difficulty >= ?";
    params.push(filters.difficulty_min);
  }

  if (filters?.difficulty_max !== undefined) {
    whereClause += " AND r.difficulty <= ?";
    params.push(filters.difficulty_max);
  }

  if (filters?.fills_all_ccfp !== undefined) {
    whereClause += " AND r.fills_all_ccfp = ?";
    params.push(filters.fills_all_ccfp);
  }

  if (filters?.is_verified !== undefined) {
    whereClause += " AND r.is_verified = ?";
    params.push(filters.is_verified);
  }

  // Count total
  const countResult = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM cooking_recipes r ${whereClause}`,
    params
  );
  const total = countResult.rows[0]?.count || 0;

  // Get data with joins
  const dataResult = await query<CookingRecipe>(
    `SELECT r.*, ck.name as cooker_name, ct.name as container_name
     FROM cooking_recipes r
     LEFT JOIN cooking_cookers ck ON r.cooker_id = ck.id
     LEFT JOIN cooking_containers ct ON r.container_id = ct.id
     ${whereClause}
     ORDER BY r.name
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    data: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get cooking stats
 */
export async function getCookingStats(): Promise<{
  total_cookers: number;
  total_containers: number;
  total_preparations: number;
  total_ingredients: number;
  total_skills: number;
  total_recipes: number;
  ingredients_by_category: Record<string, number>;
}> {
  const [cookers, containers, preps, ingredients, skills, recipes, byCategory] = await Promise.all([
    query<{ count: number }>("SELECT COUNT(*) as count FROM cooking_cookers"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM cooking_containers"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM cooking_preparations"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM cooking_ingredients"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM cooking_skills"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM cooking_recipes"),
    query<{ category_name: string; count: number }>(
      `SELECT c.name as category_name, COUNT(i.id) as count
       FROM cooking_ingredient_categories c
       LEFT JOIN cooking_ingredients i ON c.id = i.category_id
       GROUP BY c.id, c.name
       ORDER BY c.display_order`
    ),
  ]);

  const ingredientsByCategory: Record<string, number> = {};
  byCategory.rows.forEach(r => {
    ingredientsByCategory[r.category_name] = r.count;
  });

  return {
    total_cookers: cookers.rows[0]?.count || 0,
    total_containers: containers.rows[0]?.count || 0,
    total_preparations: preps.rows[0]?.count || 0,
    total_ingredients: ingredients.rows[0]?.count || 0,
    total_skills: skills.rows[0]?.count || 0,
    total_recipes: recipes.rows[0]?.count || 0,
    ingredients_by_category: ingredientsByCategory,
  };
}
