import { NextRequest, NextResponse } from "next/server";
import {
  saveUserPlayerNumber,
  getUserPlayerNumber,
  getUserPlayerNumbers,
  saveUserRecipe,
  getUserSavedRecipes,
  deleteUserSavedRecipe,
  toggleUserRecipeFavorite,
} from "@/lib/database";
import { getSession } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

// Helper to verify authentication
async function verifyAuth(request: NextRequest): Promise<{
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

  return { session };
}

/**
 * GET /api/cooking/user
 *
 * Query params:
 * - action: player-number | player-numbers | recipes
 * - character_name: for player-number action
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const userId = auth.session!.user.id;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "player-number": {
        const characterName = searchParams.get("character_name") || undefined;
        const playerNumber = await getUserPlayerNumber(userId, characterName);
        return NextResponse.json(playerNumber);
      }

      case "player-numbers": {
        const playerNumbers = await getUserPlayerNumbers(userId);
        return NextResponse.json(playerNumbers);
      }

      case "recipes": {
        const recipes = await getUserSavedRecipes(userId);
        return NextResponse.json(recipes);
      }

      default:
        // Return all user data
        const [playerNumbers, recipes] = await Promise.all([
          getUserPlayerNumbers(userId),
          getUserSavedRecipes(userId),
        ]);
        return NextResponse.json({ playerNumbers, recipes });
    }
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch user cooking data") },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cooking/user
 *
 * Actions:
 * - save-player-number: Save player number for character
 * - save-recipe: Save custom recipe
 * - toggle-favorite: Toggle favorite on saved recipe
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const userId = auth.session!.user.id;
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "save-player-number": {
        const { player_number, character_name } = body;

        if (typeof player_number !== "number" || player_number < 0 || player_number > 137) {
          return NextResponse.json(
            { error: "player_number must be between 0 and 137" },
            { status: 400 }
          );
        }

        const result = await saveUserPlayerNumber(userId, player_number, character_name);
        return NextResponse.json(result);
      }

      case "save-recipe": {
        const { recipe_name, cooker_id, container_id, ingredients, player_number, notes } = body;

        if (!recipe_name || !Array.isArray(ingredients) || ingredients.length === 0) {
          return NextResponse.json(
            { error: "recipe_name and ingredients are required" },
            { status: 400 }
          );
        }

        const recipeId = await saveUserRecipe(
          userId,
          recipe_name,
          cooker_id || null,
          container_id || null,
          ingredients,
          player_number,
          notes
        );

        return NextResponse.json({ id: recipeId, success: true });
      }

      case "toggle-favorite": {
        const { recipe_id } = body;

        if (typeof recipe_id !== "number") {
          return NextResponse.json(
            { error: "recipe_id is required" },
            { status: 400 }
          );
        }

        const success = await toggleUserRecipeFavorite(userId, recipe_id);
        return NextResponse.json({ success });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Save user cooking data") },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cooking/user?recipe_id=<id>
 *
 * Delete saved recipe
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const userId = auth.session!.user.id;
    const { searchParams } = new URL(request.url);
    const recipeId = parseInt(searchParams.get("recipe_id") || "0");

    if (!recipeId) {
      return NextResponse.json(
        { error: "recipe_id is required" },
        { status: 400 }
      );
    }

    const success = await deleteUserSavedRecipe(userId, recipeId);

    if (!success) {
      return NextResponse.json(
        { error: "Recipe not found or not owned by user" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Delete saved recipe") },
      { status: 500 }
    );
  }
}
