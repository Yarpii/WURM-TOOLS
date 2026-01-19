import { NextRequest, NextResponse } from "next/server";
import {
  getItemByName,
  addItem,
  updateItemCraftingData,
  addRecipeIngredient,
  query,
} from "@/lib/database";
import { getSession } from "@/lib/auth";
import type { SkillType, ToolType, WurmpediaRecipe } from "@/lib/types";

// Helper to verify admin authentication
async function verifyAdmin(request: NextRequest): Promise<{
  error?: NextResponse;
  session?: Awaited<ReturnType<typeof getSession>>;
}> {
  const sessionId = request.cookies.get("session")?.value;

  if (!sessionId) {
    return {
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  const session = await getSession(sessionId);
  if (!session) {
    return {
      error: NextResponse.json({ error: "Session expired" }, { status: 401 }),
    };
  }

  if (session.user.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      ),
    };
  }

  return { session };
}

// Map Wurmpedia skill names to our SkillType enum
function mapSkillType(skill: string | null): SkillType {
  if (!skill) return null;

  const normalized = skill.toLowerCase().replace(/\s+/g, "_");

  const skillMap: Record<string, SkillType> = {
    blacksmithing: "blacksmithing",
    carpentry: "carpentry",
    fine_carpentry: "fine_carpentry",
    masonry: "masonry",
    tailoring: "tailoring",
    leatherworking: "leatherworking",
    pottery: "pottery",
    jewelry_smithing: "jewelry_smithing",
    weapon_smithing: "weapon_smithing",
    armour_smithing: "armour_smithing",
    ship_building: "ship_building",
    ropemaking: "ropemaking",
    cloth_tailoring: "cloth_tailoring",
    cooking: "cooking",
    "fine carpentry": "fine_carpentry",
    "jewelry smithing": "jewelry_smithing",
    "jewellery smithing": "jewelry_smithing",
    "weapon smithing": "weapon_smithing",
    "armour smithing": "armour_smithing",
    "armor smithing": "armour_smithing",
    "ship building": "ship_building",
    "cloth tailoring": "cloth_tailoring",
    bowyery: "carpentry",
    fletching: "carpentry",
    "natural substances": null,
    alchemy: null,
  };

  return skillMap[normalized] || skillMap[skill.toLowerCase()] || null;
}

// Map creation tools to our ToolType enum
function mapToolType(tools: string[] | null): ToolType {
  if (!tools || tools.length === 0) return null;

  const toolMap: Record<string, ToolType> = {
    hammer: "hammer",
    mallet: "mallet",
    saw: "saw",
    "carving knife": "carving_knife",
    pickaxe: "pickaxe",
    shovel: "shovel",
    file: "file",
    trowel: "trowel",
    needle: "needle",
    awl: "awl",
    spindle: "spindle",
    chisel: "chisel",
    tongs: "tongs",
  };

  for (const tool of tools) {
    const normalized = tool.toLowerCase();
    if (toolMap[normalized]) {
      return toolMap[normalized];
    }
  }

  return null;
}

// Map Wurmpedia categories to our category system
function mapCategory(categories: string[] | null, skill: string | null): string {
  if (categories && categories.length > 0) {
    const category = categories[0].toLowerCase();

    const categoryMap: Record<string, string> = {
      tools: "tool",
      weapons: "weapon",
      armor: "armor",
      armour: "armor",
      "building materials": "building",
      buildings: "building",
      furniture: "misc",
      containers: "misc",
      food: "food",
      cooking: "food",
      ores: "ore",
      metals: "metal",
      wood: "wood",
      materials: "material",
      vehicles: "vehicle",
      boats: "vehicle",
      ships: "vehicle",
      carts: "vehicle",
    };

    if (categoryMap[category]) {
      return categoryMap[category];
    }
  }

  // Fallback based on skill
  if (skill) {
    const skillCategory: Record<string, string> = {
      blacksmithing: "metal",
      carpentry: "wood",
      fine_carpentry: "wood",
      masonry: "building",
      tailoring: "material",
      leatherworking: "material",
      pottery: "misc",
      jewelry_smithing: "misc",
      weapon_smithing: "weapon",
      armour_smithing: "armor",
      ship_building: "vehicle",
      cooking: "food",
    };

    return skillCategory[skill.toLowerCase().replace(/\s+/g, "_")] || "misc";
  }

  return "misc";
}

// Activate a single recipe
async function activateRecipe(
  recipe: WurmpediaRecipe
): Promise<{ success: boolean; error?: string; itemCreated?: boolean }> {
  const materials = recipe.materials || [];

  // Skip if no materials
  if (materials.length === 0) {
    return { success: false, error: "No materials" };
  }

  // Filter out optional materials
  const requiredMaterials = materials.filter((m) => !m.optional);
  if (requiredMaterials.length === 0) {
    return { success: false, error: "Only optional materials" };
  }

  const resultName = recipe.result_name || recipe.name;
  const category = mapCategory(recipe.categories, recipe.skill);
  const skillType = mapSkillType(recipe.skill);
  const toolType = mapToolType(recipe.creation_tools);

  // Check if result item already exists
  let resultItem = await getItemByName(resultName);
  let itemCreated = false;

  if (!resultItem) {
    // Create the result item
    const resultItemId = await addItem(
      resultName,
      category,
      false,
      `Imported from Wurmpedia: ${recipe.name}`
    );

    // Update with crafting data
    await updateItemCraftingData(resultItemId, {
      difficulty: recipe.difficulty ?? undefined,
      skill_type: skillType ?? undefined,
      tool_type: toolType ?? undefined,
    });

    resultItem = await getItemByName(resultName);
    itemCreated = true;
  }

  if (!resultItem) {
    return { success: false, error: "Failed to create result item" };
  }

  // Process each required material
  for (const material of requiredMaterials) {
    const materialName = material.name;
    const quantity = material.quantity || 1;

    // Check if material item exists
    const existingMaterial = await getItemByName(materialName);
    let materialItemId: number;

    if (!existingMaterial) {
      // Create the material as a base material
      materialItemId = await addItem(
        materialName,
        "material",
        true,
        `Material for ${resultName}`
      );
    } else {
      materialItemId = existingMaterial.id;
    }

    // Add the recipe relationship
    await addRecipeIngredient(resultItem.id, materialItemId, quantity);
  }

  // Mark as activated
  try {
    await query(
      "UPDATE wurmpedia_recipes SET activated_at = NOW() WHERE id = ?",
      [recipe.id]
    );
  } catch {
    // Column doesn't exist yet - ignore
  }

  return { success: true, itemCreated };
}

// POST /api/wurmpedia/activate/bulk - Bulk activate all recipes with materials
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const auth = await verifyAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { skill, recipe_type, only_not_activated } = body;

    // Build query to get recipes
    let whereClause = "WHERE has_materials = TRUE";
    const params: (string | boolean)[] = [];

    if (skill) {
      whereClause += " AND skill = ?";
      params.push(skill);
    }

    if (recipe_type) {
      whereClause += " AND recipe_type = ?";
      params.push(recipe_type);
    }

    if (only_not_activated) {
      whereClause += " AND activated_at IS NULL";
    }

    // Get all matching recipes
    const recipes = await query<WurmpediaRecipe[]>(
      `SELECT * FROM wurmpedia_recipes ${whereClause}`,
      params
    );

    if (!recipes || recipes.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No recipes found matching the criteria",
        activated: 0,
        failed: 0,
        skipped: 0,
      });
    }

    // Process each recipe
    let activated = 0;
    let failed = 0;
    let skipped = 0;
    let itemsCreated = 0;
    const errors: string[] = [];

    for (const recipe of recipes) {
      // Parse JSON fields if they're strings
      if (typeof recipe.materials === "string") {
        try {
          recipe.materials = JSON.parse(recipe.materials);
        } catch {
          recipe.materials = null;
        }
      }
      if (typeof recipe.categories === "string") {
        try {
          recipe.categories = JSON.parse(recipe.categories);
        } catch {
          recipe.categories = null;
        }
      }
      if (typeof recipe.creation_tools === "string") {
        try {
          recipe.creation_tools = JSON.parse(recipe.creation_tools);
        } catch {
          recipe.creation_tools = null;
        }
      }

      try {
        const result = await activateRecipe(recipe);

        if (result.success) {
          activated++;
          if (result.itemCreated) {
            itemsCreated++;
          }
        } else if (result.error === "No materials" || result.error === "Only optional materials") {
          skipped++;
        } else {
          failed++;
          errors.push(`${recipe.name}: ${result.error}`);
        }
      } catch (error) {
        failed++;
        errors.push(`${recipe.name}: ${String(error)}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk activation complete: ${activated} activated, ${skipped} skipped, ${failed} failed`,
      total_processed: recipes.length,
      activated,
      items_created: itemsCreated,
      skipped,
      failed,
      errors: errors.slice(0, 10), // Only return first 10 errors
    });
  } catch (error) {
    console.error("Bulk activate error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + String(error) },
      { status: 500 }
    );
  }
}

// GET /api/wurmpedia/activate/bulk - Get activation statistics
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const auth = await verifyAdmin(request);
    if (auth.error) return auth.error;

    // Get counts
    const [totalResult, withMaterialsResult, activatedResult, notActivatedResult] =
      await Promise.all([
        query<{ count: number }[]>(
          "SELECT COUNT(*) as count FROM wurmpedia_recipes"
        ),
        query<{ count: number }[]>(
          "SELECT COUNT(*) as count FROM wurmpedia_recipes WHERE has_materials = TRUE"
        ),
        query<{ count: number }[]>(
          "SELECT COUNT(*) as count FROM wurmpedia_recipes WHERE activated_at IS NOT NULL"
        ),
        query<{ count: number }[]>(
          "SELECT COUNT(*) as count FROM wurmpedia_recipes WHERE has_materials = TRUE AND activated_at IS NULL"
        ),
      ]);

    // Get by skill breakdown
    const bySkill = await query<{ skill: string; total: number; activated: number }[]>(`
      SELECT
        COALESCE(skill, 'Unknown') as skill,
        COUNT(*) as total,
        SUM(CASE WHEN activated_at IS NOT NULL THEN 1 ELSE 0 END) as activated
      FROM wurmpedia_recipes
      WHERE has_materials = TRUE
      GROUP BY skill
      ORDER BY total DESC
    `);

    // Get by type breakdown
    const byType = await query<{ recipe_type: string; total: number; activated: number }[]>(`
      SELECT
        recipe_type,
        COUNT(*) as total,
        SUM(CASE WHEN activated_at IS NOT NULL THEN 1 ELSE 0 END) as activated
      FROM wurmpedia_recipes
      WHERE has_materials = TRUE
      GROUP BY recipe_type
      ORDER BY total DESC
    `);

    return NextResponse.json({
      total_recipes: totalResult?.[0]?.count || 0,
      with_materials: withMaterialsResult?.[0]?.count || 0,
      activated: activatedResult?.[0]?.count || 0,
      not_activated: notActivatedResult?.[0]?.count || 0,
      by_skill: bySkill || [],
      by_type: byType || [],
    });
  } catch (error) {
    console.error("Bulk stats error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + String(error) },
      { status: 500 }
    );
  }
}
