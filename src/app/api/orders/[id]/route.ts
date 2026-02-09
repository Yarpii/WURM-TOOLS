import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getOrderById,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
} from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import type { OrderStatus } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: "Invalid order ID" },
        { status: 400 }
      );
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch order") },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: "Invalid order ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Check if this is a status update
    if (body.status !== undefined) {
      const validStatuses: OrderStatus[] = ["active", "completed", "cancelled", "expired"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }

      const success = await updateOrderStatus(
        orderId,
        result.user.id,
        body.status,
        result.user.role === "admin"
      );

      if (!success) {
        return NextResponse.json(
          { error: "Failed to update order status. Order not found or not authorized." },
          { status: 403 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // SECURITY: Only allow known fields to prevent mass assignment
    const ALLOWED_FIELDS = ["item_name", "quantity", "price", "quality", "server", "description", "order_type", "trade_for"];
    const filteredBody: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (body[key] !== undefined) {
        filteredBody[key] = body[key];
      }
    }

    // Regular update
    const success = await updateOrder(orderId, result.user.id, filteredBody);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update order. Order not found or not authorized." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Update order") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: "Invalid order ID" },
        { status: 400 }
      );
    }

    const success = await deleteOrder(
      orderId,
      result.user.id,
      result.user.role === "admin"
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete order. Order not found or not authorized." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Delete order") },
      { status: 500 }
    );
  }
}
