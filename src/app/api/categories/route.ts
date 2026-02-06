import { NextRequest, NextResponse } from "next/server";
import {
  getCategories,
  getCategoriesWithCounts,
  getUncategorizedItems,
  setItemCategories,
} from "@/lib/database";
import { getSession } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

// GET /api/categories - Get all categories
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const withCounts = searchParams.get("counts") === "1";
    const uncategorized = searchParams.get("uncategorized") === "1";

    // Get uncategorized items
    if (uncategorized) {
      const items = await getUncategorizedItems();
      return NextResponse.json({ data: items });
    }

    // Get categories with counts
    if (withCounts) {
      const categories = await getCategoriesWithCounts();
      return NextResponse.json({ data: categories });
    }

    // Get just category names
    const categories = await getCategories();
    return NextResponse.json({ data: categories });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Get categories") },
      { status: 500 }
    );
  }
}

// POST /api/categories - Bulk assign category to multiple items
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { itemIds, category, action } = body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: "itemIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!category || typeof category !== "string") {
      return NextResponse.json(
        { error: "category is required" },
        { status: 400 }
      );
    }

    const sanitizedCategory = category.trim().toLowerCase().slice(0, 100);
    if (!sanitizedCategory) {
      return NextResponse.json(
        { error: "Invalid category name" },
        { status: 400 }
      );
    }

    let updated = 0;
    for (const itemId of itemIds) {
      const id = parseInt(itemId);
      if (isNaN(id) || id < 1) continue;

      if (action === "remove") {
        // Get current categories and remove this one
        const { getItemCategories } = await import("@/lib/database");
        const current = await getItemCategories(id);
        const filtered = current.filter((c) => c !== sanitizedCategory);
        await setItemCategories(id, filtered);
      } else {
        // Add category (default action)
        const { getItemCategories } = await import("@/lib/database");
        const current = await getItemCategories(id);
        if (!current.includes(sanitizedCategory)) {
          await setItemCategories(id, [...current, sanitizedCategory]);
        }
      }
      updated++;
    }

    return NextResponse.json({
      success: true,
      updated,
      category: sanitizedCategory,
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Bulk category update") },
      { status: 500 }
    );
  }
}
