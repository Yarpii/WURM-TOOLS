import { NextRequest, NextResponse } from "next/server";
import {
  getItem,
  getRecipe,
  addRecipeIngredient,
  updateRecipeIngredient,
  deleteRecipeIngredient,
  searchItems,
} from "@/lib/database";
import { getSession } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";
import { query } from "@/lib/db/core";

// GET /api/items/[id]/recipes - Get all recipe materials for an item
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id);

    if (isNaN(itemId) || itemId < 1) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const item = await getItem(itemId);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Get recipe materials with ingredient names
    const result = await query<{
      id: number;
      item_id: number;
      material_id: number | null;
      material_name: string;
      material_slug: string | null;
      quantity: number;
      unit: string;
      sort_order: number;
    }>(
      `SELECT rm.id, rm.item_id, rm.material_id, rm.material_name, rm.material_slug,
              rm.quantity, rm.unit, rm.sort_order
       FROM recipe_materials rm
       WHERE rm.item_id = ?
       ORDER BY rm.sort_order, rm.material_name`,
      [itemId]
    );

    return NextResponse.json({
      item: { id: item.id, name: item.name, slug: item.slug },
      materials: result.rows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Get recipe materials") },
      { status: 500 }
    );
  }
}

// POST /api/items/[id]/recipes - Add an ingredient to an item's recipe
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const sessionResult = await getSession(sessionId);
    if (!sessionResult || sessionResult.user.role !== "admin") {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
    }

    const { id } = await params;
    const itemId = parseInt(id);

    if (isNaN(itemId) || itemId < 1) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const item = await getItem(itemId);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const body = await request.json();
    const { material_id, material_name, material_slug, quantity, unit } = body;

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: "Valid quantity is required" }, { status: 400 });
    }

    if (!material_name && !material_id) {
      return NextResponse.json({ error: "Material name or ID is required" }, { status: 400 });
    }

    const sanitizedQuantity = Math.max(0.01, parseFloat(quantity));
    const sanitizedUnit = unit === "kg" ? "kg" : "piece";

    // If material_id is provided, use the addRecipeIngredient function
    if (material_id) {
      const materialId = parseInt(material_id);
      const ingredientItem = await getItem(materialId);
      if (!ingredientItem) {
        return NextResponse.json({ error: "Ingredient item not found" }, { status: 404 });
      }

      const recipeId = await addRecipeIngredient(itemId, materialId, sanitizedQuantity);
      if (recipeId === null) {
        return NextResponse.json({ error: "This ingredient already exists in the recipe" }, { status: 409 });
      }

      // Update unit if not default
      if (sanitizedUnit !== "piece") {
        await query("UPDATE recipe_materials SET unit = ? WHERE id = ?", [sanitizedUnit, recipeId]);
      }

      return NextResponse.json({ id: recipeId, success: true }, { status: 201 });
    }

    // If only material_name is provided (unlinked ingredient)
    const sanitizedName = String(material_name).trim().slice(0, 255);
    const sanitizedSlug = material_slug
      ? String(material_slug).trim().slice(0, 255)
      : sanitizedName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    // Check for duplicate by name
    const existing = await query<{ id: number }>(
      "SELECT id FROM recipe_materials WHERE item_id = ? AND material_name = ?",
      [itemId, sanitizedName]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "This ingredient already exists in the recipe" }, { status: 409 });
    }

    // Get max sort_order
    const maxSort = await query<{ max_sort: number }>(
      "SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM recipe_materials WHERE item_id = ?",
      [itemId]
    );

    await query(
      `INSERT INTO recipe_materials (item_id, material_id, material_name, material_slug, quantity, unit, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [itemId, null, sanitizedName, sanitizedSlug, sanitizedQuantity, sanitizedUnit, (maxSort.rows[0]?.max_sort ?? -1) + 1]
    );

    const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
    return NextResponse.json({ id: idResult.rows[0]?.id, success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Add recipe ingredient") },
      { status: 500 }
    );
  }
}

// PUT /api/items/[id]/recipes - Update an ingredient in an item's recipe
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const sessionResult = await getSession(sessionId);
    if (!sessionResult || sessionResult.user.role !== "admin") {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
    }

    const body = await request.json();
    const { recipe_id, quantity, unit, sort_order } = body;

    if (!recipe_id) {
      return NextResponse.json({ error: "recipe_id is required" }, { status: 400 });
    }

    const fields: string[] = [];
    const values: (number | string)[] = [];

    if (quantity !== undefined) {
      const sanitizedQuantity = Math.max(0.01, parseFloat(quantity));
      fields.push("quantity = ?");
      values.push(sanitizedQuantity);
    }

    if (unit !== undefined) {
      fields.push("unit = ?");
      values.push(unit === "kg" ? "kg" : "piece");
    }

    if (sort_order !== undefined) {
      fields.push("sort_order = ?");
      values.push(Math.max(0, parseInt(sort_order)));
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(parseInt(recipe_id));
    await query(`UPDATE recipe_materials SET ${fields.join(", ")} WHERE id = ?`, values);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Update recipe ingredient") },
      { status: 500 }
    );
  }
}

// DELETE /api/items/[id]/recipes - Remove an ingredient from an item's recipe
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const sessionResult = await getSession(sessionId);
    if (!sessionResult || sessionResult.user.role !== "admin") {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const recipeId = searchParams.get("recipe_id");

    if (!recipeId) {
      return NextResponse.json({ error: "recipe_id query parameter is required" }, { status: 400 });
    }

    const success = await deleteRecipeIngredient(parseInt(recipeId));
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Delete recipe ingredient") },
      { status: 500 }
    );
  }
}
