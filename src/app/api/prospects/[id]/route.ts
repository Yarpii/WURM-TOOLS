import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getProspectById,
  updateProspect,
  deleteProspect,
  updateProspectLastContact,
} from "@/lib/database";
import { sanitizeError } from "@/lib/security";

// GET /api/prospects/[id] - Get a specific prospect
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
    const prospectId = parseInt(id, 10);

    if (isNaN(prospectId)) {
      return NextResponse.json({ error: "Invalid prospect ID" }, { status: 400 });
    }

    const prospect = await getProspectById(prospectId);

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Only allow access to own prospects
    if (prospect.user_id !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ prospect });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch prospect") },
      { status: 500 }
    );
  }
}

// PUT /api/prospects/[id] - Update a prospect
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
    const prospectId = parseInt(id, 10);

    if (isNaN(prospectId)) {
      return NextResponse.json({ error: "Invalid prospect ID" }, { status: 400 });
    }

    const body = await request.json();

    // Handle special action for marking contact
    if (body.action === "mark_contact") {
      const success = updateProspectLastContact(prospectId, session.user.id);
      if (!success) {
        return NextResponse.json({ error: "Failed to update contact time" }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    // Validate name if provided
    if (body.name !== undefined && (body.name.length < 1 || body.name.length > 100)) {
      return NextResponse.json(
        { error: "Name must be between 1 and 100 characters" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["potential", "contacted", "interested", "recruited", "declined", "inactive"];
    if (body.status !== undefined && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Validate priority
    const validPriorities = ["low", "medium", "high", "urgent"];
    if (body.priority !== undefined && !validPriorities.includes(body.priority)) {
      return NextResponse.json(
        { error: "Invalid priority value" },
        { status: 400 }
      );
    }

    // Validate quality rating
    if (body.quality_rating !== undefined && (body.quality_rating < 1 || body.quality_rating > 5)) {
      return NextResponse.json(
        { error: "Quality rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const success = await updateProspect(prospectId, session.user.id, body);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update prospect or access denied" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Update prospect") },
      { status: 500 }
    );
  }
}

// DELETE /api/prospects/[id] - Delete a prospect
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
    const prospectId = parseInt(id, 10);

    if (isNaN(prospectId)) {
      return NextResponse.json({ error: "Invalid prospect ID" }, { status: 400 });
    }

    const success = await deleteProspect(prospectId, session.user.id);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete prospect or access denied" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Delete prospect") },
      { status: 500 }
    );
  }
}
