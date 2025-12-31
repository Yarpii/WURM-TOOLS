import { NextRequest, NextResponse } from "next/server";
import {
  getAllItems,
  searchItems,
  addItem,
  getItemByName,
  getCategories,
} from "@/lib/database";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const categoriesOnly = searchParams.get("categories");

  if (categoriesOnly) {
    const categories = getCategories();
    return NextResponse.json(categories);
  }

  if (query) {
    const items = searchItems(query);
    return NextResponse.json(items);
  }

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
      { error: String(error) },
      { status: 500 }
    );
  }
}
