import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserByUsername } from "@/lib/auth";
import {
  getAllianceById,
  getAllianceInvites,
  getAllianceMember,
  createInvite,
  cancelInvite,
} from "@/lib/database";

// GET /api/alliances/[id]/invites - Get pending invites for alliance
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
    const allianceId = parseInt(id, 10);

    if (isNaN(allianceId)) {
      return NextResponse.json({ error: "Invalid alliance ID" }, { status: 400 });
    }

    // Check if user has permission to view invites
    const member = await getAllianceMember(allianceId, session.user.id);
    const isAdmin = session.user.role === "admin";

    if (!isAdmin && (!member || member.role === "member")) {
      return NextResponse.json(
        { error: "Only officers and leaders can view invites" },
        { status: 403 }
      );
    }

    const invites = await getAllianceInvites(allianceId);

    return NextResponse.json({ invites });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch invites: " + String(error) },
      { status: 500 }
    );
  }
}

// POST /api/alliances/[id]/invites - Create a new invite
export async function POST(
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
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Find target user
    const targetUser = await getUserByUsername(username);
    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const inviteId = await createInvite(allianceId, targetUser.id, session.user.id);

    if (inviteId === null) {
      return NextResponse.json(
        { error: "Failed to create invite. User may already be in an alliance, already invited, or alliance is full." },
        { status: 400 }
      );
    }

    const invites = await getAllianceInvites(allianceId);

    return NextResponse.json({
      success: true,
      invite_id: inviteId,
      invites,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create invite: " + String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/alliances/[id]/invites - Cancel an invite
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

    const url = new URL(request.url);
    const inviteIdParam = url.searchParams.get("invite_id");
    const inviteId = inviteIdParam ? parseInt(inviteIdParam, 10) : null;

    if (!inviteId || isNaN(inviteId)) {
      return NextResponse.json({ error: "Invalid invite ID" }, { status: 400 });
    }

    const isAdmin = session.user.role === "admin";
    const success = await cancelInvite(inviteId, session.user.id, isAdmin);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to cancel invite. Only officers and leaders can cancel invites." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to cancel invite: " + String(error) },
      { status: 500 }
    );
  }
}
