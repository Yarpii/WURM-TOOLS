import { NextRequest, NextResponse } from "next/server";
import { getItem, updateItem, deleteItem, getItemByName } from "@/lib/database";
import { getSession } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await getItem(parseInt(id));

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require admin authentication for updating items
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

    const { id } = await params;
    const body = await request.json();
    const { name, category, is_base_material, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // SECURITY: Input validation - sanitize inputs
    const sanitizedName = String(name).trim().slice(0, 100);
    const sanitizedCategory = String(category || "misc").trim().slice(0, 50);
    const sanitizedDescription = String(description || "").trim().slice(0, 500);

    const existing = await getItemByName(sanitizedName);
    if (existing && existing.id !== parseInt(id)) {
      return NextResponse.json(
        { error: "Another item with this name exists" },
        { status: 400 }
      );
    }

    const success = await updateItem(
      parseInt(id),
      sanitizedName,
      sanitizedCategory,
      is_base_material || false,
      sanitizedDescription
    );

    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error, "Update item") }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require admin authentication for deleting items
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

    const { id } = await params;
    const success = await deleteItem(parseInt(id));
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error, "Delete item") }, { status: 500 });
  }
}
