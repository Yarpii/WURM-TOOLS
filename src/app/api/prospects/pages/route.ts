import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getProspectPagesByUser,
  createProspectPage,
} from "@/lib/database";
import { sanitizeError } from "@/lib/security";

// GET /api/prospects/pages - Get user's prospect pages
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const pages = await getProspectPagesByUser(session.user.id);
    return NextResponse.json({ pages });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch prospect pages") },
      { status: 500 }
    );
  }
}

// POST /api/prospects/pages - Create a new prospect page
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color, icon } = body;

    // Validate required fields
    if (!name || name.length < 1 || name.length > 50) {
      return NextResponse.json(
        { error: "Name must be between 1 and 50 characters" },
        { status: 400 }
      );
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: "Description must be 500 characters or less" },
        { status: 400 }
      );
    }

    // Validate color format (hex color)
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json(
        { error: "Invalid color format. Use hex color (e.g., #3b82f6)" },
        { status: 400 }
      );
    }

    const pageId = await createProspectPage(session.user.id, {
      name,
      description,
      color,
      icon,
    });

    return NextResponse.json({
      success: true,
      page_id: pageId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Create prospect page") },
      { status: 500 }
    );
  }
}
