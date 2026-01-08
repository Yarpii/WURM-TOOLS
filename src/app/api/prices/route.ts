import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getPriceGuideItems,
  getServerPriceComparison,
  getPopularPricedItems,
  getPriceHistory,
  submitPrice,
  getPriceAnalytics,
} from "@/lib/database";
import { sanitizeError, validateStringFields, INPUT_LIMITS, validatePagination } from "@/lib/security";

const WURM_SERVERS = [
  "Xanadu", "Deliverance", "Exodus", "Celebration", "Pristine", "Release",
  "Independence", "Chaos", "Harmony", "Melody", "Cadence", "Defiance",
];

// GET /api/prices - Get price guide data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Popular items for homepage
    if (action === "popular") {
      const limit = parseInt(searchParams.get("limit") || "20");
      const items = await getPopularPricedItems(Math.min(limit, 50));
      return NextResponse.json({ items });
    }

    // Server comparison for specific item
    if (action === "servers") {
      const itemName = searchParams.get("item");
      if (!itemName) {
        return NextResponse.json({ error: "Item name required" }, { status: 400 });
      }
      const servers = await getServerPriceComparison(itemName);
      return NextResponse.json({ servers });
    }

    // Detailed analytics for specific item
    if (action === "detail") {
      const itemName = searchParams.get("item");
      if (!itemName) {
        return NextResponse.json({ error: "Item name required" }, { status: 400 });
      }

      const [analytics, history, servers] = await Promise.all([
        getPriceAnalytics(itemName),
        getPriceHistory(itemName, parseInt(searchParams.get("days") || "30")),
        getServerPriceComparison(itemName),
      ]);

      return NextResponse.json({ analytics, history, servers });
    }

    // Default: price guide list with search/pagination
    const { page, limit } = validatePagination(
      searchParams.get("page"),
      searchParams.get("limit")
    );
    const search = searchParams.get("search") || undefined;
    const days = parseInt(searchParams.get("days") || "30");

    const result = await getPriceGuideItems({
      search,
      days,
      limit,
      offset: (page - 1) * limit,
      minPrices: 1,
    });

    return NextResponse.json({
      items: result.items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch price guide") },
      { status: 500 }
    );
  }
}

// POST /api/prices - Submit a price
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const result = await getSession(sessionId);
    if (!result) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { item_name, price, order_type, quality, server, currency } = body;

    // Validate inputs
    const validationError = validateStringFields([
      { value: item_name, name: "Item name", limits: INPUT_LIMITS.itemName, required: true },
    ]);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (!price || typeof price !== "number" || price <= 0) {
      return NextResponse.json(
        { error: "Valid price is required" },
        { status: 400 }
      );
    }

    if (!order_type || !["buy", "sell"].includes(order_type)) {
      return NextResponse.json(
        { error: "Order type must be 'buy' or 'sell'" },
        { status: 400 }
      );
    }

    // Validate server if provided
    if (server && !WURM_SERVERS.includes(server)) {
      return NextResponse.json(
        { error: "Invalid server" },
        { status: 400 }
      );
    }

    // Validate quality if provided
    if (quality !== undefined && (quality < 1 || quality > 100)) {
      return NextResponse.json(
        { error: "Quality must be between 1 and 100" },
        { status: 400 }
      );
    }

    await submitPrice(result.user.id, item_name.trim(), price, order_type, {
      quality: quality || undefined,
      server: server || undefined,
      currency: currency || "silver",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Submit price") },
      { status: 500 }
    );
  }
}
