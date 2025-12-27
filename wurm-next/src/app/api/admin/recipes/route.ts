import { NextResponse } from "next/server";
import {
  getAllRecipes,
  addRecipeIngredient,
  updateRecipeIngredient,
  deleteRecipeIngredient,
} from "@/lib/database";

export async function GET() {
  const recipes = getAllRecipes();
  return NextResponse.json(recipes);
}

export async function POST(request: Request) {
  try {
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
