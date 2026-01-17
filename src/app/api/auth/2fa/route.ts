import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";
import {
  verifyPending2FASession,
  getPending2FASession,
  deletePending2FASession,
  getUserById,
} from "@/lib/database";

// POST /api/auth/2fa - Verify 2FA code and complete login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tempToken, code } = body;

    if (!tempToken || !code) {
      return NextResponse.json(
        { error: "Verification token and code are required" },
        { status: 400 }
      );
    }

    // Verify the 2FA code
    const pendingSession = await verifyPending2FASession(tempToken, code);

    if (!pendingSession) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 401 }
      );
    }

    // Get user
    const user = await getUserById(pendingSession.user_id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create actual session with stored options
    const sessionId = await createSession(user.id, {
      rememberMe: pendingSession.remember_me,
      ipAddress: pendingSession.ip_address || undefined,
      userAgent: pendingSession.user_agent || undefined,
    });

    // Calculate cookie max age based on rememberMe
    const cookieMaxAge = pendingSession.remember_me
      ? 30 * 24 * 60 * 60  // 30 days if rememberMe
      : 7 * 24 * 60 * 60;  // 7 days default

    // Return success with session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      },
    });

    response.cookies.set("session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: cookieMaxAge,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("2FA verification error:", error);
    return NextResponse.json(
      { error: sanitizeError(error, "2FA verification") },
      { status: 500 }
    );
  }
}

// DELETE /api/auth/2fa - Cancel 2FA verification
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tempToken = searchParams.get("token");

    if (!tempToken) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    await deletePending2FASession(tempToken);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Cancel 2FA") },
      { status: 500 }
    );
  }
}

// GET /api/auth/2fa - Check if 2FA session is still valid
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tempToken = searchParams.get("token");

    if (!tempToken) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const session = await getPending2FASession(tempToken);

    if (!session) {
      return NextResponse.json({ valid: false, expired: true });
    }

    const expiresIn = Math.max(
      0,
      Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000)
    );

    return NextResponse.json({
      valid: true,
      expiresIn,
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Check 2FA") },
      { status: 500 }
    );
  }
}
