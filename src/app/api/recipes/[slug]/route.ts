import { NextResponse } from "next/server";
import { getRecipeItemBySlug } from "@/lib/database";
import { sanitizeError } from "@/lib/security";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is required" },
        { status: 400 }
      );
    }

    const recipe = await getRecipeItemBySlug(slug);

    if (!recipe) {
      return NextResponse.json(
        { error: `Recipe not found: ${slug}` },
        { status: 404 }
      );
    }

    // Transform to match RecipeDBItem format expected by items-api.ts
    return NextResponse.json({
      id: recipe.id,
      slug: recipe.slug,
      name: recipe.name,
      skill: recipe.skill,
      difficulty: recipe.difficulty,
      base_time_seconds: recipe.base_time_seconds,
      image_url: recipe.image_url,
      is_base_material: recipe.is_base_material,
      materials: recipe.materials.map(m => ({
        material_name: m.material_name,
        material_slug: m.material_slug,
        quantity: m.quantity,
        unit: m.unit,
        sort_order: m.sort_order,
      })),
      tools: recipe.tools.map(t => ({
        tool_name: t.tool_name,
        tool_slug: t.tool_slug,
        is_workstation: t.is_workstation,
      })),
      steps: recipe.steps.map(s => ({
        step_order: s.step_order,
        action: s.action,
        target_name: s.target_name,
        target_slug: s.target_slug,
        target_quantity: s.target_quantity,
        target_unit: s.target_unit,
        submenu_path: s.submenu_path,
        raw_text: s.raw_text,
      })),
      categories: recipe.categories,
    });
  } catch (error) {
    console.error("Recipe API error:", error);
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch recipe") },
      { status: 500 }
    );
  }
}
