import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/database";
import { getSession } from "@/lib/auth";

// Helper to verify admin authentication
async function verifyAdmin(request: NextRequest): Promise<{
  error?: NextResponse;
  session?: Awaited<ReturnType<typeof getSession>>;
}> {
  const sessionId = request.cookies.get("session")?.value;

  if (!sessionId) {
    return {
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  const session = await getSession(sessionId);
  if (!session) {
    return {
      error: NextResponse.json({ error: "Session expired" }, { status: 401 }),
    };
  }

  if (session.user.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      ),
    };
  }

  return { session };
}

// POST /api/wurmpedia/activate/deactivate - Remove activated_at timestamp from a recipe
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const auth = await verifyAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { recipeId } = body;

    if (!recipeId) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 }
      );
    }

    // Remove the activated_at timestamp
    const result = await query(
      "UPDATE wurmpedia_recipes SET activated_at = NULL WHERE id = ?",
      [recipeId]
    );

    if (result.rows.length === 0 && result.affectedRows === 0) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Recipe deactivated. Note: The calculator item was not deleted.",
    });
  } catch (error) {
    console.error("Deactivate error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + String(error) },
      { status: 500 }
    );
  }
}
