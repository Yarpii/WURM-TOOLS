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

    // Get recipe steps (creation instructions)
    const stepsResult = await query<{
      id: number;
      step_order: number;
      action: string;
      target_name: string;
      target_slug: string | null;
      target_quantity: number | null;
      target_unit: string | null;
      submenu_path: string | null;
      raw_text: string | null;
    }>(
      `SELECT id, step_order, action, target_name, target_slug, target_quantity, target_unit, submenu_path, raw_text
       FROM recipe_steps
       WHERE item_id = ?
       ORDER BY step_order ASC`,
      [itemId]
    );

    // Get recipe tools
    const toolsResult = await query<{
      id: number;
      tool_id: number | null;
      tool_name: string;
      tool_slug: string | null;
      is_workstation: boolean;
    }>(
      `SELECT id, tool_id, tool_name, tool_slug, is_workstation
       FROM recipe_tools
       WHERE item_id = ?`,
      [itemId]
    );

    return NextResponse.json({
      item: { id: item.id, name: item.name, slug: item.slug, skill: item.skill },
      materials: result.rows,
      steps: stepsResult.rows,
      tools: toolsResult.rows,
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

    // Handle adding a creation step
    if (body.type === "step") {
      const { action, target_name, target_slug, target_quantity, target_unit, submenu_path, raw_text } = body;
      if (!action || !target_name) {
        return NextResponse.json({ error: "action and target_name are required" }, { status: 400 });
      }

      const maxOrder = await query<{ max_order: number }>(
        "SELECT COALESCE(MAX(step_order), 0) as max_order FROM recipe_steps WHERE item_id = ?",
        [itemId]
      );

      await query(
        `INSERT INTO recipe_steps (item_id, step_order, action, target_name, target_slug, target_quantity, target_unit, submenu_path, raw_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          (maxOrder.rows[0]?.max_order ?? 0) + 1,
          String(action).trim().slice(0, 50),
          String(target_name).trim().slice(0, 255),
          target_slug ? String(target_slug).trim().slice(0, 255) : null,
          target_quantity ? parseFloat(target_quantity) : null,
          target_unit ? String(target_unit).trim().slice(0, 20) : null,
          submenu_path ? String(submenu_path).trim().slice(0, 255) : null,
          raw_text ? String(raw_text).trim() : null,
        ]
      );

      const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
      return NextResponse.json({ id: idResult.rows[0]?.id, success: true }, { status: 201 });
    }

    // Handle adding a tool
    if (body.type === "tool") {
      const { tool_id, tool_name, tool_slug, is_workstation } = body;
      if (!tool_name) {
        return NextResponse.json({ error: "tool_name is required" }, { status: 400 });
      }

      // Check for duplicate
      const existing = await query<{ id: number }>(
        "SELECT id FROM recipe_tools WHERE item_id = ? AND tool_name = ?",
        [itemId, String(tool_name).trim()]
      );
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: "This tool already exists in the recipe" }, { status: 409 });
      }

      await query(
        `INSERT INTO recipe_tools (item_id, tool_id, tool_name, tool_slug, is_workstation)
         VALUES (?, ?, ?, ?, ?)`,
        [
          itemId,
          tool_id ? parseInt(tool_id) : null,
          String(tool_name).trim().slice(0, 255),
          tool_slug ? String(tool_slug).trim().slice(0, 255) : null,
          is_workstation ? 1 : 0,
        ]
      );

      const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
      return NextResponse.json({ id: idResult.rows[0]?.id, success: true }, { status: 201 });
    }

    // Handle "copy from" action - bulk copy recipe from another item
    if (body.copy_from) {
      const sourceId = parseInt(body.copy_from);
      if (isNaN(sourceId) || sourceId < 1) {
        return NextResponse.json({ error: "Invalid source item ID" }, { status: 400 });
      }

      const sourceItem = await getItem(sourceId);
      if (!sourceItem) {
        return NextResponse.json({ error: "Source item not found" }, { status: 404 });
      }

      // Get source item's recipe materials
      const sourceMaterials = await query<{
        material_id: number | null;
        material_name: string;
        material_slug: string | null;
        quantity: number;
        unit: string;
        sort_order: number;
      }>(
        "SELECT material_id, material_name, material_slug, quantity, unit, sort_order FROM recipe_materials WHERE item_id = ? ORDER BY sort_order",
        [sourceId]
      );

      if (sourceMaterials.rows.length === 0) {
        return NextResponse.json({ error: "Source item has no recipe to copy" }, { status: 400 });
      }

      let copied = 0;
      let skipped = 0;

      for (const mat of sourceMaterials.rows) {
        // Check if this ingredient already exists
        const existing = await query<{ id: number }>(
          "SELECT id FROM recipe_materials WHERE item_id = ? AND (material_name = ? OR (material_id IS NOT NULL AND material_id = ?))",
          [itemId, mat.material_name, mat.material_id ?? -1]
        );

        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }

        // Get max sort_order for target
        const maxSort = await query<{ max_sort: number }>(
          "SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM recipe_materials WHERE item_id = ?",
          [itemId]
        );

        await query(
          `INSERT INTO recipe_materials (item_id, material_id, material_name, material_slug, quantity, unit, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [itemId, mat.material_id, mat.material_name, mat.material_slug, mat.quantity, mat.unit, (maxSort.rows[0]?.max_sort ?? -1) + 1]
        );
        copied++;
      }

      // Also copy steps and tools if target has none
      const existingSteps = await query<{ cnt: number }>("SELECT COUNT(*) as cnt FROM recipe_steps WHERE item_id = ?", [itemId]);
      if ((existingSteps.rows[0]?.cnt ?? 0) === 0) {
        const sourceSteps = await query<{
          step_order: number; action: string; target_name: string; target_slug: string | null;
          target_quantity: number | null; target_unit: string | null; submenu_path: string | null; raw_text: string | null;
        }>("SELECT step_order, action, target_name, target_slug, target_quantity, target_unit, submenu_path, raw_text FROM recipe_steps WHERE item_id = ? ORDER BY step_order", [sourceId]);

        for (const step of sourceSteps.rows) {
          await query(
            `INSERT INTO recipe_steps (item_id, step_order, action, target_name, target_slug, target_quantity, target_unit, submenu_path, raw_text)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [itemId, step.step_order, step.action, step.target_name, step.target_slug, step.target_quantity, step.target_unit, step.submenu_path, step.raw_text]
          );
        }
      }

      const existingTools = await query<{ cnt: number }>("SELECT COUNT(*) as cnt FROM recipe_tools WHERE item_id = ?", [itemId]);
      if ((existingTools.rows[0]?.cnt ?? 0) === 0) {
        const sourceTools = await query<{
          tool_id: number | null; tool_name: string; tool_slug: string | null; is_workstation: boolean;
        }>("SELECT tool_id, tool_name, tool_slug, is_workstation FROM recipe_tools WHERE item_id = ?", [sourceId]);

        for (const tool of sourceTools.rows) {
          await query(
            `INSERT INTO recipe_tools (item_id, tool_id, tool_name, tool_slug, is_workstation) VALUES (?, ?, ?, ?, ?)`,
            [itemId, tool.tool_id, tool.tool_name, tool.tool_slug, tool.is_workstation ? 1 : 0]
          );
        }
      }

      return NextResponse.json({
        success: true,
        copied,
        skipped,
        source: sourceItem.name,
      }, { status: 201 });
    }

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
    const stepId = searchParams.get("step_id");
    const toolId = searchParams.get("tool_id");

    if (stepId) {
      await query("DELETE FROM recipe_steps WHERE id = ?", [parseInt(stepId)]);
      return NextResponse.json({ success: true });
    }

    if (toolId) {
      await query("DELETE FROM recipe_tools WHERE id = ?", [parseInt(toolId)]);
      return NextResponse.json({ success: true });
    }

    if (!recipeId) {
      return NextResponse.json({ error: "recipe_id, step_id, or tool_id query parameter is required" }, { status: 400 });
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
