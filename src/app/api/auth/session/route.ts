import { NextRequest, NextResponse } from "next/server";
import { getSession, refreshSession } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const result = await getSession(sessionId);

    if (!result) {
      // Session expired or invalid, clear cookie
      const response = NextResponse.json({ authenticated: false, user: null });
      response.cookies.set("session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 0,
        path: "/",
      });
      return response;
    }

    // Refresh session expiry (non-blocking - session could expire between check and refresh)
    try {
      await refreshSession(sessionId);
    } catch {
      // Session may have expired right after validation - safe to ignore
    }

    return NextResponse.json({
      authenticated: true,
      user: result.user,
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Session check") },
      { status: 500 }
    );
  }
}
