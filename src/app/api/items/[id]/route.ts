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
    const { name, category, is_base_material, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // SECURITY: Input validation - sanitize inputs
    const sanitizedName = String(name).trim().slice(0, 100);
    const sanitizedCategory = String(category || "misc").trim().slice(0, 50);
    const sanitizedDescription = String(description || "").trim().slice(0, 500);

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
      sanitizedCategory,
      is_base_material || false,
      sanitizedDescription
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
