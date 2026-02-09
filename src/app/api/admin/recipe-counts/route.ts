import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/core";
import { getSession } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

// GET /api/admin/recipe-counts - Get ingredient counts per item
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require admin authentication
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const session = await getSession(sessionId);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
    }

    const result = await query<{ item_id: number; count: number }>(
      `SELECT item_id, COUNT(*) as count
       FROM recipe_materials
       GROUP BY item_id`
    );

    return NextResponse.json({ data: result.rows });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Get recipe counts") },
      { status: 500 }
    );
  }
}
