import { NextResponse } from "next/server";
import {
  getMaterialsList,
  buildCraftingTree,
  getDirectIngredients,
  buildShallowCraftingTree,
  getItem
} from "@/lib/database";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = parseInt(searchParams.get("item") || "0");
  const quantity = parseFloat(searchParams.get("qty") || "1");
  const mode = searchParams.get("mode") || "easy"; // "easy" = recipe book, "full" = all base materials

  if (!itemId) {
    return NextResponse.json(
      { error: "Item ID is required" },
      { status: 400 }
    );
  }

  const item = getItem(itemId);
  if (!item) {
    return NextResponse.json(
      { error: "Item not found" },
      { status: 404 }
    );
  }

  if (mode === "full") {
    // Full mode: calculate all base materials recursively
    const materials = getMaterialsList(itemId, quantity);
    const tree = buildCraftingTree(itemId, quantity);
    return NextResponse.json({
      item,
      materials,
      tree,
      mode: "full",
      description: "All base materials needed"
    });
  } else {
    // Easy mode (default): only direct ingredients (recipe book style)
    const materials = getDirectIngredients(itemId, quantity);
    const tree = buildShallowCraftingTree(itemId, quantity);
    return NextResponse.json({
      item,
      materials,
      tree,
      mode: "easy",
      description: "Direct recipe ingredients"
    });
  }
}
