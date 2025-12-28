import { NextRequest, NextResponse } from "next/server";
import { getSession, refreshSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const result = getSession(sessionId);

    if (!result) {
      // Session expired or invalid, clear cookie
      const response = NextResponse.json({ authenticated: false, user: null });
      response.cookies.set("session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });
      return response;
    }

    // Refresh session expiry
    refreshSession(sessionId);

    return NextResponse.json({
      authenticated: true,
      user: result.user,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Session check failed: " + String(error) },
      { status: 500 }
    );
  }
}
