import { NextResponse } from "next/server";
import {
  getAllRecipeItems,
  searchRecipeItems,
  getRecipeSkills,
  getRecipeItemStats,
} from "@/lib/database";
import { sanitizeError, validatePagination } from "@/lib/security";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const skill = searchParams.get("skill");
    const skillsOnly = searchParams.get("skills") === "true";
    const statsOnly = searchParams.get("stats") === "true";

    // Pagination parameters with validation
    const { page, limit } = validatePagination(
      searchParams.get("page"),
      searchParams.get("limit")
    );
    const offset = (page - 1) * limit;

    // Return available skills
    if (skillsOnly) {
      const skills = await getRecipeSkills();
      return NextResponse.json(skills);
    }

    // Return statistics
    if (statsOnly) {
      const stats = await getRecipeItemStats();
      return NextResponse.json(stats);
    }

    // Search if query provided
    if (query) {
      const result = await searchRecipeItems(query, {
        limit,
        offset,
        skill: skill || undefined,
      });
      return NextResponse.json({
        items: result.items,
        total: result.total,
        limit,
        offset,
      });
    }

    // Get all recipe items
    const result = await getAllRecipeItems({
      limit,
      offset,
      skill: skill || undefined,
    });

    return NextResponse.json({
      items: result.items,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Recipe API error:", error);
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch recipes") },
      { status: 500 }
    );
  }
}
