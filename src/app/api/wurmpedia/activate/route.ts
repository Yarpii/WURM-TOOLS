import { NextRequest, NextResponse } from "next/server";
import {
  getWurmpediaRecipeById,
  getItemByName,
  addItem,
  updateItemCraftingData,
  addRecipeIngredient,
  query,
} from "@/lib/database";
import type { SkillType, ToolType } from "@/lib/types";

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
    // Additional mappings for Wurmpedia variations
    "fine carpentry": "fine_carpentry",
    "jewelry smithing": "jewelry_smithing",
    "jewellery smithing": "jewelry_smithing",
    "weapon smithing": "weapon_smithing",
    "armour smithing": "armour_smithing",
    "armor smithing": "armour_smithing",
    "ship building": "ship_building",
    "cloth tailoring": "cloth_tailoring",
    "bowyery": "carpentry",
    "fletching": "carpentry",
    "natural substances": null,
    "alchemy": null,
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

// POST /api/wurmpedia/activate - Convert a Wurmpedia recipe to calculator items/recipes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipeId } = body;

    if (!recipeId) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 }
      );
    }

    // Get the Wurmpedia recipe
    const wurmpediaRecipe = await getWurmpediaRecipeById(recipeId);
    if (!wurmpediaRecipe) {
      return NextResponse.json(
        { error: "Wurmpedia recipe not found" },
        { status: 404 }
      );
    }

    // Check if recipe has materials
    if (!wurmpediaRecipe.materials || wurmpediaRecipe.materials.length === 0) {
      return NextResponse.json(
        { error: "This recipe has no materials and cannot be activated" },
        { status: 400 }
      );
    }

    // Determine the result item name
    const resultName = wurmpediaRecipe.result_name || wurmpediaRecipe.name;
    const category = mapCategory(wurmpediaRecipe.categories, wurmpediaRecipe.skill);
    const skillType = mapSkillType(wurmpediaRecipe.skill);
    const toolType = mapToolType(wurmpediaRecipe.creation_tools);

    // Check if result item already exists
    let resultItem = await getItemByName(resultName);
    let resultItemCreated = false;

    if (!resultItem) {
      // Create the result item
      const resultItemId = await addItem(
        resultName,
        category,
        false, // not a base material
        `Imported from Wurmpedia: ${wurmpediaRecipe.name}`
      );

      // Update with crafting data
      await updateItemCraftingData(resultItemId, {
        difficulty: wurmpediaRecipe.difficulty ?? undefined,
        skill_type: skillType ?? undefined,
        tool_type: toolType ?? undefined,
      });

      resultItem = await getItemByName(resultName);
      resultItemCreated = true;
    }

    if (!resultItem) {
      return NextResponse.json(
        { error: "Failed to create or find result item" },
        { status: 500 }
      );
    }

    // Process each material
    const materialsAdded: string[] = [];
    const materialsSkipped: string[] = [];
    const recipesAdded: number[] = [];
    const recipesSkipped: string[] = [];

    for (const material of wurmpediaRecipe.materials) {
      if (material.optional) {
        // Skip optional materials for the calculator
        continue;
      }

      const materialName = material.name;
      const quantity = material.quantity || 1;

      // Check if material item exists
      let materialItem = await getItemByName(materialName);

      if (!materialItem) {
        // Create the material as a base material
        const materialItemId = await addItem(
          materialName,
          "material", // Default category for materials
          true, // Is a base material
          `Material for ${resultName}`
        );
        materialItem = { id: materialItemId, name: materialName } as { id: number; name: string };
        materialsAdded.push(materialName);
      } else {
        materialsSkipped.push(materialName);
      }

      // Add the recipe relationship
      const recipeResult = await addRecipeIngredient(
        resultItem.id,
        materialItem.id,
        quantity
      );

      if (recipeResult !== null) {
        recipesAdded.push(recipeResult);
      } else {
        recipesSkipped.push(materialName);
      }
    }

    // Mark the Wurmpedia recipe as activated (add a flag or timestamp)
    await query(
      "UPDATE wurmpedia_recipes SET activated_at = NOW() WHERE id = ?",
      [recipeId]
    );

    const message = resultItemCreated
      ? `Created "${resultName}" with ${recipesAdded.length} recipe ingredients`
      : `Updated recipes for "${resultName}" - added ${recipesAdded.length} ingredients`;

    return NextResponse.json({
      success: true,
      message,
      result_item: {
        id: resultItem.id,
        name: resultName,
        created: resultItemCreated,
      },
      materials: {
        added: materialsAdded,
        skipped: materialsSkipped,
      },
      recipes: {
        added: recipesAdded.length,
        skipped: recipesSkipped.length,
      },
    });
  } catch (error) {
    console.error("Wurmpedia activate error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + String(error) },
      { status: 500 }
    );
  }
}
