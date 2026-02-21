import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";
import {
  checkRateLimit,
  getClientIp,
  addRateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import {
  hasUser2FAEnabled,
  createPending2FASession,
  getUserById,
} from "@/lib/database";
import {
  generateVerificationCode,
  send2FACode,
  isEmailConfigured,
  EMAIL_2FA_ENABLED,
  EMAIL_2FA_CODE_EXPIRY_MINUTES,
} from "@/lib/email";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = getClientIp(request);

    // SECURITY: Apply strict rate limiting to login attempts
    const rateLimitResult = await checkRateLimit(clientIp, "login");
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
      addRateLimitHeaders(response.headers, rateLimitResult, RATE_LIMITS.login);
      return response;
    }

    const body = await request.json();
    const { username, password, rememberMe } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Character name and password are required" },
        { status: 400 }
      );
    }

    // Get IP and user agent for session tracking
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                      request.headers.get("x-real-ip") ||
                      undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await login(username, password, {
      rememberMe: Boolean(rememberMe),
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Check if user has 2FA enabled
    const has2FA = await hasUser2FAEnabled(result.user!.id);

    if (has2FA && EMAIL_2FA_ENABLED && isEmailConfigured()) {
      // Get user for email
      const user = await getUserById(result.user!.id);

      if (user && !user.email.endsWith("@wurmtools.local")) {
        // Generate 2FA code
        const code = generateVerificationCode();

        // Create temporary session token for 2FA flow
        const tempToken = randomBytes(32).toString("hex");

        // Store pending 2FA session with rememberMe preference
        await createPending2FASession(
          result.user!.id,
          tempToken,
          code,
          EMAIL_2FA_CODE_EXPIRY_MINUTES,
          { rememberMe: Boolean(rememberMe), ipAddress, userAgent }
        );

        // Send 2FA code via email
        const sent = await send2FACode(user.email, code, user.username);

        if (!sent) {
          // SECURITY: If email fails, do NOT bypass 2FA - return an error
          console.error("Failed to send 2FA code for user:", user.username);
          return NextResponse.json(
            { error: "Failed to send verification code. Please try again later." },
            { status: 503 }
          );
        }

        // Return 2FA required response
        return NextResponse.json({
          success: false,
          requires2FA: true,
          tempToken,
          message: "Verification code sent to your email",
          expiresIn: EMAIL_2FA_CODE_EXPIRY_MINUTES,
        });
      }
    }

    // Calculate cookie max age based on rememberMe
    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // 30 days vs 7 days

    // No 2FA or 2FA not configured - proceed with normal login
    const response = NextResponse.json({
      success: true,
      user: result.user,
      isNewDevice: result.isNewDevice,
    });

    response.cookies.set("session", result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || process.env.FORCE_SECURE_COOKIES === "true",
      sameSite: "strict",
      maxAge: cookieMaxAge,
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Login") },
      { status: 500 }
    );
  }
}
