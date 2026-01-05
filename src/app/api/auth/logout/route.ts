import { NextRequest, NextResponse } from "next/server";
import { logout } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (sessionId) {
      await logout(sessionId);
    }

    const response = NextResponse.json({ success: true });

    // Clear session cookie
    response.cookies.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict", // SECURITY: Changed from 'lax' to 'strict' for CSRF protection
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Logout") },
      { status: 500 }
    );
  }
}
