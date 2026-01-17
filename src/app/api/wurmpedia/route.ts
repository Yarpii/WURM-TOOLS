import { NextRequest, NextResponse } from "next/server";
import {
  getWurmpediaRecipes,
  getWurmpediaStats,
  getWurmpediaSkills,
  getWurmpediaCategories,
  getWurmpediaRecipeById,
} from "@/lib/database";
import type { WurmpediaRecipeFilters } from "@/lib/types";

// GET /api/wurmpedia - Public access to Wurmpedia recipes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Get stats
    if (action === "stats") {
      const stats = await getWurmpediaStats();
      return NextResponse.json(stats);
    }

    // Get unique skills
    if (action === "skills") {
      const skills = await getWurmpediaSkills();
      return NextResponse.json(skills);
    }

    // Get unique categories
    if (action === "categories") {
      const categories = await getWurmpediaCategories();
      return NextResponse.json(categories);
    }

    // Get single recipe by ID
    const id = searchParams.get("id");
    if (id) {
      const recipe = await getWurmpediaRecipeById(parseInt(id, 10));
      if (!recipe) {
        return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
      }
      return NextResponse.json(recipe);
    }

    // Get recipes with filters and pagination
    const filters: WurmpediaRecipeFilters = {};

    const search = searchParams.get("search");
    if (search) filters.search = search;

    const skill = searchParams.get("skill");
    if (skill) filters.skill = skill;

    const recipeType = searchParams.get("recipe_type");
    if (recipeType) filters.recipe_type = recipeType as WurmpediaRecipeFilters["recipe_type"];

    const isCooking = searchParams.get("is_cooking");
    if (isCooking !== null) filters.is_cooking = isCooking === "true";

    const hasMaterials = searchParams.get("has_materials");
    if (hasMaterials !== null) filters.has_materials = hasMaterials === "true";

    const canImprove = searchParams.get("can_improve");
    if (canImprove !== null) filters.can_improve = canImprove === "true";

    const category = searchParams.get("category");
    if (category) filters.category = category;

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

    const result = await getWurmpediaRecipes(filters, { page, limit });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Wurmpedia API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
