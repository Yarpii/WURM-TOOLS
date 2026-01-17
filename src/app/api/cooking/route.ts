import { NextRequest, NextResponse } from "next/server";
import {
  getCookingCookers,
  getCookingContainers,
  getCookingPreparations,
  getCookingIngredients,
  getCookingIngredientCategories,
  getCookingSkills,
  searchCookingIngredients,
  getCookingStats,
  calculateAffinity,
  calculateCCFP,
  discoverPlayerNumber,
} from "@/lib/database";
import { getSession } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";
import type { AffinityCalculationInput } from "@/lib/types";

/**
 * GET /api/cooking
 *
 * Query params:
 * - action: cookers | containers | preparations | ingredients | categories | skills | stats
 * - category_id: filter ingredients by category
 * - search: search ingredients by name
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "cookers": {
        const cookers = await getCookingCookers();
        return NextResponse.json(cookers);
      }

      case "containers": {
        const containers = await getCookingContainers();
        return NextResponse.json(containers);
      }

      case "preparations": {
        const preparations = await getCookingPreparations();
        return NextResponse.json(preparations);
      }

      case "ingredients": {
        const categoryId = searchParams.get("category_id");
        const search = searchParams.get("search");

        if (search) {
          const ingredients = await searchCookingIngredients(search);
          return NextResponse.json(ingredients);
        }

        const ingredients = await getCookingIngredients(
          categoryId ? parseInt(categoryId) : undefined
        );
        return NextResponse.json(ingredients);
      }

      case "categories": {
        const categories = await getCookingIngredientCategories();
        return NextResponse.json(categories);
      }

      case "skills": {
        const skills = await getCookingSkills();
        return NextResponse.json(skills);
      }

      case "stats": {
        const stats = await getCookingStats();
        return NextResponse.json(stats);
      }

      default:
        // Return all basic data for initial page load
        const [cookers, containers, preparations, categories, skills] = await Promise.all([
          getCookingCookers(),
          getCookingContainers(),
          getCookingPreparations(),
          getCookingIngredientCategories(),
          getCookingSkills(),
        ]);

        return NextResponse.json({
          cookers,
          containers,
          preparations,
          categories,
          skills,
        });
    }
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch cooking data") },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cooking
 *
 * Actions:
 * - calculate-affinity: Calculate affinity from components
 * - calculate-ccfp: Calculate CCFP from ingredients
 * - discover-player-number: Discover player number from test meal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "calculate-affinity": {
        const input: AffinityCalculationInput = {
          player_number: body.player_number,
          cooker_id: body.cooker_id || null,
          container_id: body.container_id || null,
          ingredients: body.ingredients || [],
        };

        if (typeof input.player_number !== "number") {
          return NextResponse.json(
            { error: "player_number is required" },
            { status: 400 }
          );
        }

        const result = await calculateAffinity(input);
        return NextResponse.json(result);
      }

      case "calculate-ccfp": {
        const { ingredients } = body;

        if (!Array.isArray(ingredients)) {
          return NextResponse.json(
            { error: "ingredients array is required" },
            { status: 400 }
          );
        }

        const result = await calculateCCFP(ingredients);
        return NextResponse.json(result);
      }

      case "discover-player-number": {
        const { cooker_id, container_id, ingredient_id, preparation_id, result_skill_id } = body;

        if (typeof ingredient_id !== "number" || typeof result_skill_id !== "number") {
          return NextResponse.json(
            { error: "ingredient_id and result_skill_id are required" },
            { status: 400 }
          );
        }

        const playerNumber = await discoverPlayerNumber(
          cooker_id || null,
          container_id || null,
          ingredient_id,
          preparation_id || null,
          result_skill_id
        );

        return NextResponse.json({ player_number: playerNumber });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Cooking calculation") },
      { status: 500 }
    );
  }
}
