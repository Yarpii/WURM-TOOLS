import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/core";
import { sanitizeError } from "@/lib/security";

// GET /api/admin/recipe-counts - Get ingredient counts per item
export async function GET(request: NextRequest) {
  try {
    const result = await query<{ item_id: number; count: number }>(
      `SELECT item_id, COUNT(*) as count
       FROM recipe_materials
       GROUP BY item_id`
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Get recipe counts") },
      { status: 500 }
    );
  }
}
