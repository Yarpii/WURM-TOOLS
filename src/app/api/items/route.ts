import { NextRequest, NextResponse } from "next/server";
import {
  getAllItems,
  getItemsPaginated,
  searchItems,
  addItem,
  getItemByName,
  getCategories,
} from "@/lib/database";
import { itemsTransformService } from "@/lib/items-transform";
import { getSession } from "@/lib/auth";
import { sanitizeError, validatePagination } from "@/lib/security";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const categoriesOnly = searchParams.get("categories");
    const source = searchParams.get("source"); // "wurmpedia" for items.wurm.tools
    const visibleOnly = searchParams.get("visibleOnly") === "true"; // Only show admin-enabled items

    // Pagination parameters with validation
    const { page, limit } = validatePagination(
      searchParams.get("page"),
      searchParams.get("limit")
    );
    const paginate = searchParams.get("paginate") === "true";

    // Use items.wurm.tools as data source when requested
    if (source === "wurmpedia") {
      if (categoriesOnly) {
        const categories = await itemsTransformService.getCategories();
        return NextResponse.json({ data: categories });
      }

      if (query) {
        const items = await itemsTransformService.searchItems(query);
        // Filter by visibility if requested
        if (visibleOnly) {
          const allVisible = await itemsTransformService.getAllItemsFromDB({ visibleOnly: true });
          const visibleIds = new Set(allVisible.map(i => i.id));
          return NextResponse.json({ data: items.filter(i => visibleIds.has(i.id)) });
        }
        return NextResponse.json({ data: items });
      }

      // Use recipe database as primary source (has better structured data)
      const items = await itemsTransformService.getAllItemsFromDB({ visibleOnly });
      return NextResponse.json({ data: items });
    }

    // Default: use local database
    if (categoriesOnly) {
      const categories = await getCategories();
      return NextResponse.json({ data: categories });
    }

    if (query) {
      // Search results are typically smaller, no pagination needed
      const items = await searchItems(query);
      return NextResponse.json({ data: items });
    }

    // SECURITY: Use paginated version for large datasets
    if (paginate) {
      const result = await getItemsPaginated({ page, limit });
      return NextResponse.json(result);
    }

    // Backwards compatible: return all items (but getAllItems is still bounded by database size)
    const items = await getAllItems();
    return NextResponse.json({ data: items });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch items") },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require admin authentication for creating items
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

    // Only admins can create items
    if (sessionResult.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 }
      );
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
    if (existing) {
      return NextResponse.json(
        { error: "Item already exists" },
        { status: 400 }
      );
    }

    const id = await addItem(
      sanitizedName,
      sanitizedSlug,
      sanitizedSkill,
      sanitizedDifficulty,
      sanitizedBaseTime,
      is_base_material || false
    );

    return NextResponse.json({ id, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Create item") },
      { status: 500 }
    );
  }
}
