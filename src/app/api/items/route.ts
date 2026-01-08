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
import { sanitizeError, validatePagination } from "@/lib/security";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const categoriesOnly = searchParams.get("categories");

    // Pagination parameters with validation
    const { page, limit } = validatePagination(
      searchParams.get("page"),
      searchParams.get("limit")
    );
    const paginate = searchParams.get("paginate") === "true";

    if (categoriesOnly) {
      const categories = await getCategories();
      return NextResponse.json(categories);
    }

    if (query) {
      // Search results are typically smaller, no pagination needed
      const items = await searchItems(query);
      return NextResponse.json(items);
    }

    // SECURITY: Use paginated version for large datasets
    if (paginate) {
      const result = await getItemsPaginated({ page, limit });
      return NextResponse.json(result);
    }

    // Backwards compatible: return all items (but getAllItems is still bounded by database size)
    const items = await getAllItems();
    return NextResponse.json(items);
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
    const { name, category, is_base_material, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // SECURITY: Input validation - sanitize name
    const sanitizedName = String(name).trim().slice(0, 100);
    const sanitizedCategory = String(category || "misc").trim().slice(0, 50);
    const sanitizedDescription = String(description || "").trim().slice(0, 500);

    const existing = await getItemByName(sanitizedName);
    if (existing) {
      return NextResponse.json(
        { error: "Item already exists" },
        { status: 400 }
      );
    }

    const id = await addItem(
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
