import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getProspectPageById,
  getProspectsByPage,
  updateProspectPage,
  deleteProspectPage,
} from "@/lib/database";
import { sanitizeError } from "@/lib/security";

// GET /api/prospects/pages/[id] - Get a specific page with its prospects
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const { id } = await params;
    const pageId = parseInt(id, 10);

    if (isNaN(pageId)) {
      return NextResponse.json({ error: "Invalid page ID" }, { status: 400 });
    }

    const page = await getProspectPageById(pageId);

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Only allow access to own pages
    if (page.user_id !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get prospects for this page
    const prospects = await getProspectsByPage(pageId, session.user.id);

    return NextResponse.json({ page, prospects });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch prospect page") },
      { status: 500 }
    );
  }
}

// PUT /api/prospects/pages/[id] - Update a page
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const { id } = await params;
    const pageId = parseInt(id, 10);

    if (isNaN(pageId)) {
      return NextResponse.json({ error: "Invalid page ID" }, { status: 400 });
    }

    const body = await request.json();

    // Validate name if provided
    if (body.name !== undefined && (body.name.length < 1 || body.name.length > 50)) {
      return NextResponse.json(
        { error: "Name must be between 1 and 50 characters" },
        { status: 400 }
      );
    }

    if (body.description !== undefined && body.description.length > 500) {
      return NextResponse.json(
        { error: "Description must be 500 characters or less" },
        { status: 400 }
      );
    }

    // Validate color format (hex color)
    if (body.color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(body.color)) {
      return NextResponse.json(
        { error: "Invalid color format. Use hex color (e.g., #3b82f6)" },
        { status: 400 }
      );
    }

    const success = await updateProspectPage(pageId, session.user.id, body);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update page or access denied" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Update prospect page") },
      { status: 500 }
    );
  }
}

// DELETE /api/prospects/pages/[id] - Delete a page
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const { id } = await params;
    const pageId = parseInt(id, 10);

    if (isNaN(pageId)) {
      return NextResponse.json({ error: "Invalid page ID" }, { status: 400 });
    }

    const success = await deleteProspectPage(pageId, session.user.id);

    if (!success) {
      return NextResponse.json(
        { error: "Cannot delete page. Make sure the page is empty if it's the default page." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Delete prospect page") },
      { status: 500 }
    );
  }
}
