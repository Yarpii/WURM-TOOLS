import { NextRequest, NextResponse } from "next/server";
import { getItem, updateItem, deleteItem, getItemByName } from "@/lib/database";
import { itemsTransformService, getSlugById } from "@/lib/items-transform";
import { getSession } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const { id } = await params;

  // Support both numeric ID and slug
  const itemId = parseInt(id);
  const isSlug = isNaN(itemId);

  // Use items.wurm.tools as data source when requested
  if (source === "wurmpedia") {
    let item;
    if (isSlug) {
      // ID is actually a slug
      item = await itemsTransformService.getItemBySlug(id);
    } else {
      // Try to get slug from ID mapping, then fetch
      const slug = getSlugById(itemId);
      if (slug) {
        item = await itemsTransformService.getItemBySlug(slug);
      } else {
        // If no mapping, try using the ID as a slug (unlikely to work)
        item = await itemsTransformService.getItem(itemId);
      }
    }

    if (!item) {
      return NextResponse.json({ error: "Item not found in Wurmpedia" }, { status: 404 });
    }

    return NextResponse.json(item);
  }

  // Default: use local database
  if (isNaN(itemId) || itemId < 1) {
    return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
  }

  const item = await getItem(itemId);

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require admin authentication for updating items
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

    const body = await request.json();
    const { name, slug, skill, difficulty, base_time_seconds, is_base_material } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // SECURITY: Input validation - sanitize inputs
    const sanitizedName = String(name).trim().slice(0, 255);
    const sanitizedSlug = String(slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")).trim().slice(0, 255);
    const sanitizedSkill = skill ? String(skill).trim().slice(0, 100) : null;
    const sanitizedDifficulty = difficulty ? Math.min(100, Math.max(1, parseInt(difficulty))) : null;
    const sanitizedBaseTime = base_time_seconds ? Math.max(1, parseInt(base_time_seconds)) : null;

    const existing = await getItemByName(sanitizedName);
    if (existing && existing.id !== itemId) {
      return NextResponse.json(
        { error: "Another item with this name exists" },
        { status: 400 }
      );
    }

    const success = await updateItem(
      itemId,
      sanitizedName,
      sanitizedSlug,
      sanitizedSkill,
      sanitizedDifficulty,
      sanitizedBaseTime,
      is_base_material || false
    );

    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error, "Update item") }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require admin authentication for deleting items
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

    const success = await deleteItem(itemId);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error, "Delete item") }, { status: 500 });
  }
}
