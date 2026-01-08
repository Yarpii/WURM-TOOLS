import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getAllianceById,
  updateAlliance,
  deleteAlliance,
  getAllianceMember,
} from "@/lib/database";
import { sanitizeError, INPUT_LIMITS } from "@/lib/security";

// GET /api/alliances/[id] - Get alliance details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const allianceId = parseInt(id, 10);

    if (isNaN(allianceId)) {
      return NextResponse.json({ error: "Invalid alliance ID" }, { status: 400 });
    }

    const alliance = await getAllianceById(allianceId);

    if (!alliance) {
      return NextResponse.json({ error: "Alliance not found" }, { status: 404 });
    }

    // Check if user has permission to view private alliance
    if (!alliance.is_public) {
      const sessionId = request.cookies.get("session")?.value;
      const session = sessionId ? await getSession(sessionId) : null;

      if (!session) {
        return NextResponse.json({ error: "Alliance not found" }, { status: 404 });
      }

      const isAdmin = session.user.role === "admin";
      const isMember = await getAllianceMember(allianceId, session.user.id);

      if (!isAdmin && !isMember) {
        return NextResponse.json({ error: "Alliance not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ alliance });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch alliance") },
      { status: 500 }
    );
  }
}

// PUT /api/alliances/[id] - Update alliance
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
    const allianceId = parseInt(id, 10);

    if (isNaN(allianceId)) {
      return NextResponse.json({ error: "Invalid alliance ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, tag, is_public, max_members } = body;

    // Validate input
    if (name !== undefined && (name.length < 3 || name.length > 50)) {
      return NextResponse.json(
        { error: "Alliance name must be between 3 and 50 characters" },
        { status: 400 }
      );
    }
    if (description !== undefined && description.length > 500) {
      return NextResponse.json(
        { error: "Description must be 500 characters or less" },
        { status: 400 }
      );
    }
    if (tag !== undefined && tag && (tag.length < INPUT_LIMITS.tag.min || tag.length > INPUT_LIMITS.tag.max)) {
      return NextResponse.json(
        { error: `Tag must be between ${INPUT_LIMITS.tag.min} and ${INPUT_LIMITS.tag.max} characters` },
        { status: 400 }
      );
    }

    const isAdmin = session.user.role === "admin";
    const success = await updateAlliance(
      allianceId,
      session.user.id,
      { name, description, tag, is_public, max_members },
      isAdmin
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update alliance. You may not have permission." },
        { status: 403 }
      );
    }

    const updatedAlliance = await getAllianceById(allianceId);

    return NextResponse.json({
      success: true,
      alliance: updatedAlliance,
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Update alliance") },
      { status: 500 }
    );
  }
}

// DELETE /api/alliances/[id] - Delete alliance
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
    const allianceId = parseInt(id, 10);

    if (isNaN(allianceId)) {
      return NextResponse.json({ error: "Invalid alliance ID" }, { status: 400 });
    }

    const isAdmin = session.user.role === "admin";
    const success = await deleteAlliance(allianceId, session.user.id, isAdmin);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete alliance. Only the leader or admin can delete an alliance." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Delete alliance") },
      { status: 500 }
    );
  }
}
