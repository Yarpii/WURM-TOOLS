import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Character name and password are required" },
        { status: 400 }
      );
    }

    const result = login(username, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    response.cookies.set("session", result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict", // SECURITY: Changed from 'lax' to 'strict' to prevent CSRF
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Login failed: " + String(error) },
      { status: 500 }
    );
  }
}
