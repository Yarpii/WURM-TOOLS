import { NextResponse } from "next/server";
import {
  getMaterialsList,
  buildCraftingTree,
  getDirectIngredients,
  buildShallowCraftingTree,
  getItem
} from "@/lib/database";
import { sanitizeError } from "@/lib/security";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = parseInt(searchParams.get("item") || "0");
    const quantity = parseFloat(searchParams.get("qty") || "1");
    const mode = searchParams.get("mode") || "easy"; // "easy" = recipe book, "full" = all base materials

    if (!itemId || isNaN(itemId) || itemId < 1) {
      return NextResponse.json(
        { error: "Valid Item ID is required" },
        { status: 400 }
      );
    }

    if (isNaN(quantity) || quantity < 0.01 || quantity > 10000) {
      return NextResponse.json(
        { error: "Quantity must be between 0.01 and 10000" },
        { status: 400 }
      );
    }

    const item = await getItem(itemId);
    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    if (mode === "full") {
      // Full mode: calculate all base materials recursively
      const materials = await getMaterialsList(itemId, quantity);
      const tree = await buildCraftingTree(itemId, quantity);
      return NextResponse.json({
        item,
        materials,
        tree,
        mode: "full",
        description: "All base materials needed"
      });
    } else {
      // Easy mode (default): only direct ingredients (recipe book style)
      const materials = await getDirectIngredients(itemId, quantity);
      const tree = await buildShallowCraftingTree(itemId, quantity);
      return NextResponse.json({
        item,
        materials,
        tree,
        mode: "easy",
        description: "Direct recipe ingredients"
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Calculate materials") },
      { status: 500 }
    );
  }
}
