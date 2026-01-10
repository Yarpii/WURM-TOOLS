import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getAllOrders,
  getOrdersPaginated,
  createOrder,
  getOrderStats,
  expireOldOrders,
} from "@/lib/database";
import { sanitizeError, validateStringFields, INPUT_LIMITS, validatePagination } from "@/lib/security";
import type { OrderType, OrderStatus, CreateOrderInput } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    // Expire old orders first (non-blocking, log errors but don't fail the request)
    expireOldOrders().catch((err) => {
      console.warn("[orders] Failed to expire old orders:", err);
    });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as OrderStatus | null;
    const order_type = searchParams.get("type") as OrderType | null;
    const item_name = searchParams.get("item");
    const user_id = searchParams.get("user_id");
    const stats_only = searchParams.get("stats");

    // Pagination parameters with validation
    const { page, limit } = validatePagination(
      searchParams.get("page"),
      searchParams.get("limit")
    );
    const paginate = searchParams.get("paginate") === "true";

    if (stats_only) {
      const stats = await getOrderStats();
      return NextResponse.json(stats);
    }

    // Parse and validate user_id if provided
    let parsedUserId: number | undefined;
    if (user_id) {
      parsedUserId = parseInt(user_id);
      if (isNaN(parsedUserId) || parsedUserId < 1) {
        return NextResponse.json(
          { error: "Invalid user ID" },
          { status: 400 }
        );
      }
    }

    const filters = {
      status: status || undefined,
      type: order_type || undefined,
      item: item_name || undefined,
      userId: parsedUserId,
    };

    // SECURITY: Use paginated version for large datasets
    if (paginate) {
      const result = await getOrdersPaginated({ page, limit }, filters);
      return NextResponse.json(result);
    }

    const orders = await getAllOrders(filters);
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch orders") },
      { status: 500 }
    );
  }
}

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
    const {
      order_type,
      item_name,
      quantity,
      quality,
      price,
      currency,
      trade_for,
      location,
      notes,
      expires_days,
    } = body;

    // Validate required fields
    if (!order_type || !["buy", "sell", "trade"].includes(order_type)) {
      return NextResponse.json(
        { error: "Invalid order type" },
        { status: 400 }
      );
    }

    // Validate string field lengths
    const validationError = validateStringFields([
      { value: item_name, name: "Item name", limits: INPUT_LIMITS.itemName, required: true },
      { value: trade_for, name: "Trade for", limits: INPUT_LIMITS.tradeFor },
      { value: location, name: "Location", limits: INPUT_LIMITS.location },
      { value: notes, name: "Notes", limits: INPUT_LIMITS.notes },
    ]);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (!quantity || quantity < 1 || quantity > 1000000) {
      return NextResponse.json(
        { error: "Quantity must be between 1 and 1,000,000" },
        { status: 400 }
      );
    }

    // For trade orders, trade_for is required
    if (order_type === "trade" && (!trade_for || trade_for.trim() === "")) {
      return NextResponse.json(
        { error: "Trade orders require specifying what you want to trade for" },
        { status: 400 }
      );
    }

    // Validate price if provided
    if (price !== undefined && (price < 0 || price > 100000000)) {
      return NextResponse.json(
        { error: "Price must be between 0 and 100,000,000" },
        { status: 400 }
      );
    }

    // Validate expires_days
    if (expires_days !== undefined && (expires_days < 1 || expires_days > 365)) {
      return NextResponse.json(
        { error: "Expiry must be between 1 and 365 days" },
        { status: 400 }
      );
    }

    const input: CreateOrderInput = {
      order_type,
      item_name: item_name.trim(),
      quantity,
      quality: quality || undefined,
      price: price || undefined,
      currency: currency || "silver",
      trade_for: trade_for?.trim() || undefined,
      location: location?.trim() || undefined,
      notes: notes?.trim() || undefined,
      expires_days: expires_days || 30, // Default 30 days
    };

    const orderId = await createOrder(result.user.id, input);

    return NextResponse.json({ id: orderId, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Create order") },
      { status: 500 }
    );
  }
}
