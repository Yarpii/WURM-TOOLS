import { NextRequest, NextResponse } from "next/server";
import {
  getAllRecipes,
  addRecipeIngredient,
  updateRecipeIngredient,
  deleteRecipeIngredient,
} from "@/lib/database";
import { getSession } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

// Helper to verify admin authentication
function verifyAdmin(request: NextRequest): { error?: NextResponse; session?: ReturnType<typeof getSession> } {
  const sessionId = request.cookies.get("session")?.value;

  if (!sessionId) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const session = getSession(sessionId);
  if (!session) {
    return { error: NextResponse.json({ error: "Session expired" }, { status: 401 }) };
  }

  if (session.user.role !== "admin") {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }

  return { session };
}

export async function GET(request: NextRequest) {
  try {
    const auth = verifyAdmin(request);
    if (auth.error) return auth.error;

    const recipes = getAllRecipes();
    return NextResponse.json(recipes);
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error, "Fetch recipes") }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { result_item_id, ingredient_item_id, quantity } = body;

    if (!result_item_id || !ingredient_item_id) {
      return NextResponse.json(
        { error: "Result and ingredient IDs are required" },
        { status: 400 }
      );
    }

    if (result_item_id === ingredient_item_id) {
      return NextResponse.json(
        { error: "An item cannot be an ingredient of itself" },
        { status: 400 }
      );
    }

    const id = addRecipeIngredient(
      result_item_id,
      ingredient_item_id,
      quantity || 1
    );

    if (id === null) {
      return NextResponse.json(
        { error: "Would create circular dependency" },
        { status: 400 }
      );
    }

    return NextResponse.json({ id, success: true });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error, "Add recipe") }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = verifyAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { id, quantity } = body;

    if (!id || quantity === undefined) {
      return NextResponse.json(
        { error: "Recipe ID and quantity are required" },
        { status: 400 }
      );
    }

    const success = updateRecipeIngredient(id, quantity);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error, "Update recipe") }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = verifyAdmin(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");

    if (!id) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 }
      );
    }

    const success = deleteRecipeIngredient(id);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error, "Delete recipe") }, { status: 500 });
  }
}
