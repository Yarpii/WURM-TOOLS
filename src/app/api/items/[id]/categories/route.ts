import { NextRequest, NextResponse } from "next/server";
import { getItemCategories, setItemCategories, getItem } from "@/lib/database";
import { getSession } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

// GET /api/items/[id]/categories - Get categories for an item
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

    const categories = await getItemCategories(itemId);
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Get item categories") },
      { status: 500 }
    );
  }
}

// PUT /api/items/[id]/categories - Set categories for an item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const sessionResult = await getSession(sessionId);
    if (!sessionResult) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    if (sessionResult.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const itemId = parseInt(id);

    if (isNaN(itemId) || itemId < 1) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    // Check if item exists
    const item = await getItem(itemId);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const body = await request.json();
    const { categories } = body;

    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: "Categories must be an array" },
        { status: 400 }
      );
    }

    // Sanitize and validate categories
    const sanitizedCategories = categories
      .map((cat: unknown) => String(cat).trim().toLowerCase().slice(0, 100))
      .filter((cat: string) => cat.length > 0);

    await setItemCategories(itemId, sanitizedCategories);

    return NextResponse.json({
      success: true,
      categories: sanitizedCategories,
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Set item categories") },
      { status: 500 }
    );
  }
}
