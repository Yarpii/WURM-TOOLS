import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserInvites, respondToInvite, getUserAlliance } from "@/lib/database";

// GET /api/invites - Get current user's pending invites
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

    const invites = await getUserInvites(session.user.id);
    const currentAlliance = await getUserAlliance(session.user.id);

    return NextResponse.json({
      invites,
      current_alliance: currentAlliance,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch invites: " + String(error) },
      { status: 500 }
    );
  }
}

// POST /api/invites - Accept or decline an invite
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
    const { invite_id, accept } = body;

    if (!invite_id) {
      return NextResponse.json(
        { error: "Invite ID is required" },
        { status: 400 }
      );
    }

    if (typeof accept !== "boolean") {
      return NextResponse.json(
        { error: "'accept' must be a boolean" },
        { status: 400 }
      );
    }

    const success = await respondToInvite(invite_id, session.user.id, accept);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to respond to invite. It may have expired or you're already in an alliance." },
        { status: 400 }
      );
    }

    const invites = await getUserInvites(session.user.id);
    const currentAlliance = await getUserAlliance(session.user.id);

    return NextResponse.json({
      success: true,
      invites,
      current_alliance: currentAlliance,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to respond to invite: " + String(error) },
      { status: 500 }
    );
  }
}
