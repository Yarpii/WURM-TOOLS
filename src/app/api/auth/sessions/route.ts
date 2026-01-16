import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import {
  getUserSessions,
  revokeSession,
  revokeAllOtherSessions,
} from "@/lib/password-recovery";

// Get all sessions for current user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const sessionData = await getSession(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const sessions = await getUserSessions(sessionData.user.id, sessionId);

    return NextResponse.json({
      sessions: sessions.map(s => ({
        id: s.id,
        deviceName: s.deviceName,
        ipAddress: s.ipAddress,
        lastActiveAt: s.lastActiveAt?.toISOString(),
        createdAt: s.createdAt.toISOString(),
        isCurrent: s.isCurrent,
      })),
    });
  } catch (error) {
    console.error("[sessions] GET error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// Revoke a session
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const currentSessionId = cookieStore.get("session")?.value;

    if (!currentSessionId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const sessionData = await getSession(currentSessionId);
    if (!sessionData) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId, all } = body;

    if (all === true) {
      // Revoke all other sessions
      const count = await revokeAllOtherSessions(sessionData.user.id, currentSessionId);
      return NextResponse.json({
        success: true,
        message: `Logged out of ${count} other device(s)`,
        revokedCount: count,
      });
    }

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const result = await revokeSession(sessionData.user.id, sessionId, currentSessionId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Session revoked successfully",
    });
  } catch (error) {
    console.error("[sessions] DELETE error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
