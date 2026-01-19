import { NextRequest, NextResponse } from "next/server";
import {
  importWurmpediaRecipes,
  getWurmpediaRecipes,
  getWurmpediaStats,
  getWurmpediaSkills,
  getWurmpediaCategories,
  getWurmpediaImportLogs,
  clearWurmpediaRecipes,
  deleteWurmpediaRecipe,
} from "@/lib/database";
import { getSession } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";
import type { WurmpediaRecipeInput, WurmpediaRecipeFilters } from "@/lib/types";

// Helper to verify admin authentication
async function verifyAdmin(request: NextRequest): Promise<{
  error?: NextResponse;
  session?: Awaited<ReturnType<typeof getSession>>
}> {
  const sessionId = request.cookies.get("session")?.value;

  if (!sessionId) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const session = await getSession(sessionId);
  if (!session) {
    return { error: NextResponse.json({ error: "Session expired" }, { status: 401 }) };
  }

  if (session.user.role !== "admin") {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }

  return { session };
}

/**
 * GET /api/admin/wurmpedia-recipes
 *
 * Query params:
 * - action=stats: Get statistics
 * - action=skills: Get unique skills list
 * - action=categories: Get unique categories list
 * - action=logs: Get import logs
 * - search, skill, recipe_type, is_cooking, etc.: Filter recipes
 * - page, limit: Pagination
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Handle special actions
    if (action === "stats") {
      const stats = await getWurmpediaStats();
      return NextResponse.json(stats);
    }

    if (action === "skills") {
      const skills = await getWurmpediaSkills();
      return NextResponse.json(skills);
    }

    if (action === "categories") {
      const categories = await getWurmpediaCategories();
      return NextResponse.json(categories);
    }

    if (action === "logs") {
      const limit = parseInt(searchParams.get("limit") || "10");
      const logs = await getWurmpediaImportLogs(limit);
      return NextResponse.json(logs);
    }

    // Build filters from query params
    const filters: WurmpediaRecipeFilters = {};

    if (searchParams.has("search")) {
      filters.search = searchParams.get("search") || undefined;
    }
    if (searchParams.has("skill")) {
      filters.skill = searchParams.get("skill") || undefined;
    }
    if (searchParams.has("recipe_type")) {
      filters.recipe_type = searchParams.get("recipe_type") as WurmpediaRecipeFilters["recipe_type"];
    }
    if (searchParams.has("is_cooking")) {
      filters.is_cooking = searchParams.get("is_cooking") === "true";
    }
    if (searchParams.has("has_materials")) {
      filters.has_materials = searchParams.get("has_materials") === "true";
    }
    if (searchParams.has("can_improve")) {
      filters.can_improve = searchParams.get("can_improve") === "true";
    }
    if (searchParams.has("category")) {
      filters.category = searchParams.get("category") || undefined;
    }
    if (searchParams.has("activated")) {
      filters.activated = searchParams.get("activated") === "true";
    }

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const result = await getWurmpediaRecipes(filters, { page, limit });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch Wurmpedia recipes") },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/wurmpedia-recipes
 *
 * Body:
 * - action: "import" | "clear"
 * - recipes: WurmpediaRecipeInput[] (for import)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { action, recipes } = body;

    if (action === "clear") {
      const result = await clearWurmpediaRecipes();
      return NextResponse.json({
        success: true,
        message: `Deleted ${result.deleted} recipes`
      });
    }

    if (action === "import" || !action) {
      // Validate recipes array
      if (!Array.isArray(recipes)) {
        return NextResponse.json(
          { error: "recipes must be an array" },
          { status: 400 }
        );
      }

      if (recipes.length === 0) {
        return NextResponse.json(
          { error: "recipes array is empty" },
          { status: 400 }
        );
      }

      // Validate each recipe has required fields
      for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i] as WurmpediaRecipeInput;
        if (!recipe.id || !recipe.name) {
          return NextResponse.json(
            { error: `Recipe at index ${i} is missing required fields (id, name)` },
            { status: 400 }
          );
        }
      }

      // Perform import
      const result = await importWurmpediaRecipes(
        recipes as WurmpediaRecipeInput[],
        auth.session?.user.id
      );

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'import' or 'clear'" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Import Wurmpedia recipes") },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/wurmpedia-recipes?id=<id>
 *
 * Delete a single Wurmpedia recipe
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");

    if (!id) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 }
      );
    }

    const success = await deleteWurmpediaRecipe(id);

    if (!success) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Delete Wurmpedia recipe") },
      { status: 500 }
    );
  }
}
