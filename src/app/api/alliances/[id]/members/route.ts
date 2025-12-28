import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getAllianceById,
  getAllianceMembers,
  getAllianceMember,
  updateMemberRole,
  removeMember,
  transferLeadership,
} from "@/lib/database";

// GET /api/alliances/[id]/members - Get alliance members
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

    const alliance = getAllianceById(allianceId);
    if (!alliance) {
      return NextResponse.json({ error: "Alliance not found" }, { status: 404 });
    }

    // Check if user has permission to view private alliance members
    if (!alliance.is_public) {
      const sessionId = request.cookies.get("session")?.value;
      const session = sessionId ? getSession(sessionId) : null;

      if (!session) {
        return NextResponse.json({ error: "Alliance not found" }, { status: 404 });
      }

      const isAdmin = session.user.role === "admin";
      const isMember = getAllianceMember(allianceId, session.user.id);

      if (!isAdmin && !isMember) {
        return NextResponse.json({ error: "Alliance not found" }, { status: 404 });
      }
    }

    const members = getAllianceMembers(allianceId);

    return NextResponse.json({ members });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch members: " + String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/alliances/[id]/members - Update member role or transfer leadership
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const { id } = await params;
    const allianceId = parseInt(id, 10);

    if (isNaN(allianceId)) {
      return NextResponse.json({ error: "Invalid alliance ID" }, { status: 400 });
    }

    const body = await request.json();
    const { user_id, role, transfer_leadership } = body;

    if (!user_id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const isAdmin = session.user.role === "admin";

    if (transfer_leadership) {
      // Transfer leadership
      const success = transferLeadership(allianceId, session.user.id, user_id);

      if (!success) {
        return NextResponse.json(
          { error: "Failed to transfer leadership. You must be the current leader." },
          { status: 403 }
        );
      }
    } else if (role) {
      // Update role
      if (!["officer", "member"].includes(role)) {
        return NextResponse.json(
          { error: "Invalid role. Must be 'officer' or 'member'" },
          { status: 400 }
        );
      }

      const success = updateMemberRole(allianceId, user_id, role, session.user.id, isAdmin);

      if (!success) {
        return NextResponse.json(
          { error: "Failed to update member role. Only the leader can change roles." },
          { status: 403 }
        );
      }
    }

    const members = getAllianceMembers(allianceId);

    return NextResponse.json({
      success: true,
      members,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update member: " + String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/alliances/[id]/members - Remove member or leave alliance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const { id } = await params;
    const allianceId = parseInt(id, 10);

    if (isNaN(allianceId)) {
      return NextResponse.json({ error: "Invalid alliance ID" }, { status: 400 });
    }

    const url = new URL(request.url);
    const targetUserId = url.searchParams.get("user_id");
    const userIdToRemove = targetUserId ? parseInt(targetUserId, 10) : session.user.id;

    if (isNaN(userIdToRemove)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const isAdmin = session.user.role === "admin";
    const success = removeMember(allianceId, userIdToRemove, session.user.id, isAdmin);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to remove member. Leaders cannot leave (transfer leadership first). Officers/leaders can kick members." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to remove member: " + String(error) },
      { status: 500 }
    );
  }
}
