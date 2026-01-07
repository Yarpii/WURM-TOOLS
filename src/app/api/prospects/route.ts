import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getProspectsByUser,
  createProspect,
  searchProspects,
} from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import type { ProspectStatus, ProspectPriority } from "@/lib/types";

// GET /api/prospects - Get user's prospects with optional search/filters
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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const status = searchParams.get("status") as ProspectStatus | null;
    const priority = searchParams.get("priority") as ProspectPriority | null;
    const pageId = searchParams.get("page_id");
    const minQuality = searchParams.get("min_quality");
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // If search query or filters provided, use search function
    if (query || status || priority || pageId || minQuality) {
      const prospects = await searchProspects(session.user.id, query, {
        status: status || undefined,
        priority: priority || undefined,
        pageId: pageId ? parseInt(pageId, 10) : undefined,
        minQuality: minQuality ? parseInt(minQuality, 10) : undefined,
      });
      return NextResponse.json({ prospects });
    }

    // Otherwise return all user's prospects
    const prospects = await getProspectsByUser(session.user.id, limit, offset);
    return NextResponse.json({ prospects });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch prospects") },
      { status: 500 }
    );
  }
}

// POST /api/prospects - Create a new prospect
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
    const {
      page_id,
      name,
      character_name,
      server,
      location,
      status,
      priority,
      quality_rating,
      skills,
      notes,
      contact_info,
      source,
      tags,
      custom_fields,
    } = body;

    // Validate required fields
    if (!page_id) {
      return NextResponse.json(
        { error: "Page ID is required" },
        { status: 400 }
      );
    }

    if (!name || name.length < 1 || name.length > 100) {
      return NextResponse.json(
        { error: "Name must be between 1 and 100 characters" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["potential", "contacted", "interested", "recruited", "declined", "inactive"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Validate priority
    const validPriorities = ["low", "medium", "high", "urgent"];
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: "Invalid priority value" },
        { status: 400 }
      );
    }

    // Validate quality rating
    if (quality_rating !== undefined && (quality_rating < 1 || quality_rating > 5)) {
      return NextResponse.json(
        { error: "Quality rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const prospectId = await createProspect(session.user.id, {
      page_id,
      name,
      character_name,
      server,
      location,
      status,
      priority,
      quality_rating,
      skills,
      notes,
      contact_info,
      source,
      tags,
      custom_fields,
    });

    return NextResponse.json({
      success: true,
      prospect_id: prospectId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Create prospect") },
      { status: 500 }
    );
  }
}
