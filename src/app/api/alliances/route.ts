import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllAlliances, getAlliancesPaginated, createAlliance, getUserAlliance } from "@/lib/database";
import { sanitizeError } from "@/lib/security";

// GET /api/alliances - Get list of public alliances
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination parameters with validation
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const paginate = searchParams.get("paginate") === "true";

    const sessionId = request.cookies.get("session")?.value;
    const session = sessionId ? await getSession(sessionId) : null;
    const isAdmin = session?.user?.role === "admin";

    // SECURITY: Use paginated version for large datasets
    if (paginate) {
      const result = await getAlliancesPaginated({ page, limit }, isAdmin);
      return NextResponse.json(result);
    }

    const alliances = await getAllAlliances(isAdmin);
    return NextResponse.json({ alliances });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch alliances") },
      { status: 500 }
    );
  }
}

// POST /api/alliances - Create a new alliance
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    // Check if user is already in an alliance
    const existingAlliance = await getUserAlliance(session.user.id);
    if (existingAlliance) {
      return NextResponse.json(
        { error: "You are already in an alliance. Leave your current alliance first." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, tag, is_public, max_members } = body;

    // Validate input
    if (!name || name.length < 3 || name.length > 50) {
      return NextResponse.json(
        { error: "Alliance name must be between 3 and 50 characters" },
        { status: 400 }
      );
    }
    if (description && description.length > 500) {
      return NextResponse.json(
        { error: "Description must be 500 characters or less" },
        { status: 400 }
      );
    }
    if (tag && (tag.length < 2 || tag.length > 5)) {
      return NextResponse.json(
        { error: "Tag must be between 2 and 5 characters" },
        { status: 400 }
      );
    }
    if (max_members && (max_members < 5 || max_members > 100)) {
      return NextResponse.json(
        { error: "Max members must be between 5 and 100" },
        { status: 400 }
      );
    }

    const allianceId = await createAlliance(session.user.id, {
      name,
      description,
      tag,
      is_public,
      max_members,
    });

    return NextResponse.json({
      success: true,
      alliance_id: allianceId,
    });
  } catch (error) {
    const errorMessage = String(error);
    if (errorMessage.includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        { error: "An alliance with this name already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: sanitizeError(error, "Create alliance") },
      { status: 500 }
    );
  }
}
