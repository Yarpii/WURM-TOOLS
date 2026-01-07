import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getMerchantById,
  updateMerchant,
  deleteMerchant,
  toggleMerchantActive,
} from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import type { MerchantCategory } from "@/lib/types";

const VALID_CATEGORIES: MerchantCategory[] = [
  "tools",
  "weapons",
  "armor",
  "materials",
  "food",
  "animals",
  "vehicles",
  "furniture",
  "misc",
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const merchantId = parseInt(id);

    if (isNaN(merchantId)) {
      return NextResponse.json(
        { error: "Invalid merchant ID" },
        { status: 400 }
      );
    }

    const merchant = await getMerchantById(merchantId);
    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(merchant);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch merchant") },
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
    const merchantId = parseInt(id);

    if (isNaN(merchantId)) {
      return NextResponse.json(
        { error: "Invalid merchant ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Check if this is a toggle active request
    if (body.toggle_active !== undefined) {
      const success = await toggleMerchantActive(
        merchantId,
        result.user.id,
        result.user.role === "admin"
      );

      if (!success) {
        return NextResponse.json(
          { error: "Failed to update merchant. Not found or not authorized." },
          { status: 403 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Validate category if provided
    if (body.category && !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    // Regular update
    const success = await updateMerchant(
      merchantId,
      result.user.id,
      body,
      result.user.role === "admin"
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update merchant. Not found or not authorized." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Update merchant") },
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
    const merchantId = parseInt(id);

    if (isNaN(merchantId)) {
      return NextResponse.json(
        { error: "Invalid merchant ID" },
        { status: 400 }
      );
    }

    const success = await deleteMerchant(
      merchantId,
      result.user.id,
      result.user.role === "admin"
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete merchant. Not found or not authorized." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Delete merchant") },
      { status: 500 }
    );
  }
}
