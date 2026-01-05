import { NextRequest, NextResponse } from "next/server";
import { createUser, login } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Create user (email is auto-generated for privacy)
    const result = await createUser(username, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Auto-login after registration
    const loginResult = await login(username, password);

    if (!loginResult.success) {
      return NextResponse.json({ error: "Registration successful but login failed" }, { status: 500 });
    }

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      user: loginResult.user,
    });

    response.cookies.set("session", loginResult.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict", // SECURITY: Changed from 'lax' to 'strict' to prevent CSRF
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Registration") },
      { status: 500 }
    );
  }
}
