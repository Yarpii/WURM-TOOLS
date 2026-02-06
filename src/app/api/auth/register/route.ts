import { NextRequest, NextResponse } from "next/server";
import { createUser, login } from "@/lib/auth";
import { createCharacter } from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import {
  checkRateLimit,
  getClientIp,
  addRateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = getClientIp(request);

    // SECURITY: Apply rate limiting to registration attempts
    const rateLimitResult = await checkRateLimit(clientIp, "auth");
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
      addRateLimitHeaders(response.headers, rateLimitResult, RATE_LIMITS.auth);
      return response;
    }

    const body = await request.json();
    const { username, email, password } = body;

    // Validate email
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // Create user with real email
    const result = await createUser(username, password, email);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Auto-create main character with the username
    try {
      await createCharacter(result.user.id, {
        name: username,
        is_primary: true,
      });
    } catch (charError) {
      console.warn("Could not auto-create main character:", charError);
      // Don't fail registration if character creation fails
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
