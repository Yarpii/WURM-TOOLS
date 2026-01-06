import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getAllOrders,
  getOrdersPaginated,
  createOrder,
  getOrderStats,
  expireOldOrders,
} from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import type { OrderType, OrderStatus, CreateOrderInput } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    // Expire old orders first
    expireOldOrders();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as OrderStatus | null;
    const order_type = searchParams.get("type") as OrderType | null;
    const item_name = searchParams.get("item");
    const user_id = searchParams.get("user_id");
    const stats_only = searchParams.get("stats");

    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const paginate = searchParams.get("paginate") === "true";

    if (stats_only) {
      const stats = getOrderStats();
      return NextResponse.json(stats);
    }

    const filters = {
      status: status || undefined,
      order_type: order_type || undefined,
      item_name: item_name || undefined,
      user_id: user_id ? parseInt(user_id) : undefined,
    };

    // SECURITY: Use paginated version for large datasets
    if (paginate) {
      const result = getOrdersPaginated(filters, { page, limit });
      return NextResponse.json(result);
    }

    const orders = getAllOrders(filters);
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

    if (!item_name || item_name.trim() === "") {
      return NextResponse.json(
        { error: "Item name is required" },
        { status: 400 }
      );
    }

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be at least 1" },
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
