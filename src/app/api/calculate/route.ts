import { NextResponse } from "next/server";
import {
  getMaterialsList,
  buildCraftingTree,
  getDirectIngredients,
  buildShallowCraftingTree,
  getItem
} from "@/lib/database";
import { itemsTransformService, getSlugById } from "@/lib/items-transform";
import { sanitizeError } from "@/lib/security";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = parseInt(searchParams.get("item") || "0");
    const quantity = parseFloat(searchParams.get("qty") || "1");
    const mode = searchParams.get("mode") || "easy"; // "easy" = recipe book, "full" = all base materials
    const source = searchParams.get("source"); // "wurmpedia" for items.wurm.tools
    const slug = searchParams.get("slug"); // Alternative: use slug directly

    if (isNaN(quantity) || quantity < 0.01 || quantity > 10000) {
      return NextResponse.json(
        { error: "Quantity must be between 0.01 and 10000" },
        { status: 400 }
      );
    }

    // Use items.wurm.tools as data source when requested
    if (source === "wurmpedia") {
      // For wurmpedia source, we can use either slug or item ID
      let itemSlug: string | null = slug;
      if (!itemSlug && itemId) {
        itemSlug = getSlugById(itemId) || null;
      }

      if (!itemSlug) {
        return NextResponse.json(
          { error: "Item slug or valid item ID required for wurmpedia source" },
          { status: 400 }
        );
      }

      // Use the new recipe database for structured data
      const materialMode = mode === "full" ? "full" : "easy";
      const result = await itemsTransformService.calculateMaterialsFromDB(itemSlug, quantity, materialMode);

      if (!result.item) {
        // Fallback to infobox-based method if recipe DB fails
        const fallbackResult = await itemsTransformService.calculateMaterials(itemId, quantity);
        if (!fallbackResult.item) {
          return NextResponse.json(
            { error: "Item not found in Wurmpedia" },
            { status: 404 }
          );
        }
        return NextResponse.json({
          item: fallbackResult.item,
          materials: fallbackResult.materials,
          tree: fallbackResult.tree,
          mode: "full",
          description: "Materials from Wurmpedia (fallback)"
        });
      }

      return NextResponse.json({
        item: result.item,
        materials: result.materials,
        tree: result.tree,
        mode: materialMode,
        description: materialMode === "easy"
          ? "Direct recipe ingredients from database"
          : "All base materials from database"
      });
    }

    // Default: use local database
    if (!itemId || isNaN(itemId) || itemId < 1) {
      return NextResponse.json(
        { error: "Valid Item ID is required" },
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
