import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";
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
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Character name and password are required" },
        { status: 400 }
      );
    }

    const result = await login(username, password);

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

        // Store pending 2FA session
        await createPending2FASession(
          result.user!.id,
          tempToken,
          code,
          EMAIL_2FA_CODE_EXPIRY_MINUTES
        );

        // Send 2FA code via email
        const sent = await send2FACode(user.email, code, user.username);

        if (!sent) {
          // If email fails, log user in anyway (fallback)
          console.error("Failed to send 2FA code, allowing login");
        } else {
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
    }

    // No 2FA or 2FA not configured - proceed with normal login
    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    response.cookies.set("session", result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
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
