import { NextRequest, NextResponse } from "next/server";
import {
  getAllItems,
  getItemsPaginated,
  searchItems,
  addItem,
  getItemByName,
  getCategories,
} from "@/lib/database";
import { getSession } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const categoriesOnly = searchParams.get("categories");

  // Pagination parameters
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const paginate = searchParams.get("paginate") === "true";

  if (categoriesOnly) {
    const categories = getCategories();
    return NextResponse.json(categories);
  }

  if (query) {
    // Search results are typically smaller, no pagination needed
    const items = searchItems(query);
    return NextResponse.json(items);
  }

  // SECURITY: Use paginated version for large datasets
  if (paginate) {
    const result = getItemsPaginated({ page, limit });
    return NextResponse.json(result);
  }

  // Backwards compatible: return all items (but getAllItems is still bounded by database size)
  const items = getAllItems();
  return NextResponse.json(items);
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

    const sessionResult = getSession(sessionId);
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
    const { name, category, is_base_material, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // SECURITY: Input validation - sanitize name
    const sanitizedName = String(name).trim().slice(0, 100);
    const sanitizedCategory = String(category || "misc").trim().slice(0, 50);
    const sanitizedDescription = String(description || "").trim().slice(0, 500);

    const existing = getItemByName(sanitizedName);
    if (existing) {
      return NextResponse.json(
        { error: "Item already exists" },
        { status: 400 }
      );
    }

    const id = addItem(
      sanitizedName,
      sanitizedCategory,
      is_base_material || false,
      sanitizedDescription
    );

    return NextResponse.json({ id, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Create item") },
      { status: 500 }
    );
  }
}
