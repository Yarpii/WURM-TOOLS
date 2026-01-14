import { NextRequest, NextResponse } from "next/server";
import { getSessionAsync } from "@/lib/auth";
import {
  createEmailVerificationCode,
  verifyEmailCode,
  updateUserEmail,
  isEmailInUse,
  setUser2FA,
  hasUser2FAEnabled,
  getEmailAlertPreferences,
  upsertEmailAlertPreferences,
  getUserById,
} from "@/lib/database";
import {
  generateVerificationCode,
  sendEmailVerificationCode,
  isEmailConfigured,
  EMAIL_2FA_CODE_EXPIRY_MINUTES,
} from "@/lib/email";
import { sanitizeError } from "@/lib/security";

// POST /api/email - Email operations
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionAsync();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      // Send verification code to new email
      case "send_verification": {
        const { email } = body;

        if (!email || typeof email !== "string") {
          return NextResponse.json(
            { error: "Email is required" },
            { status: 400 }
          );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return NextResponse.json(
            { error: "Invalid email format" },
            { status: 400 }
          );
        }

        // Check if email is already in use
        const inUse = await isEmailInUse(email, session.userId);
        if (inUse) {
          return NextResponse.json(
            { error: "This email is already in use by another account" },
            { status: 400 }
          );
        }

        // Check if email is configured
        if (!isEmailConfigured()) {
          return NextResponse.json(
            { error: "Email service is not configured" },
            { status: 503 }
          );
        }

        // Get user for username
        const user = await getUserById(session.userId);
        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Generate and store verification code
        const code = generateVerificationCode();
        await createEmailVerificationCode(
          session.userId,
          email,
          code,
          "email_verify",
          EMAIL_2FA_CODE_EXPIRY_MINUTES
        );

        // Send verification email
        const sent = await sendEmailVerificationCode(email, code, user.username);
        if (!sent) {
          return NextResponse.json(
            { error: "Failed to send verification email" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Verification code sent to your email",
          expiresIn: EMAIL_2FA_CODE_EXPIRY_MINUTES,
        });
      }

      // Verify email code
      case "verify": {
        const { code } = body;

        if (!code || typeof code !== "string") {
          return NextResponse.json(
            { error: "Verification code is required" },
            { status: 400 }
          );
        }

        const verification = await verifyEmailCode(
          session.userId,
          code,
          "email_verify"
        );

        if (!verification) {
          return NextResponse.json(
            { error: "Invalid or expired verification code" },
            { status: 400 }
          );
        }

        // Update user's email
        const updated = await updateUserEmail(
          session.userId,
          verification.email,
          true
        );

        if (!updated) {
          return NextResponse.json(
            { error: "Failed to update email" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Email verified successfully",
          email: verification.email,
        });
      }

      // Enable 2FA
      case "enable_2fa": {
        // Check if user has verified email
        const user = await getUserById(session.userId);
        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if email is a placeholder
        if (user.email.endsWith("@wurmtools.local")) {
          return NextResponse.json(
            { error: "Please add and verify your email address before enabling 2FA" },
            { status: 400 }
          );
        }

        await setUser2FA(session.userId, true);

        return NextResponse.json({
          success: true,
          message: "Two-factor authentication enabled",
        });
      }

      // Disable 2FA
      case "disable_2fa": {
        await setUser2FA(session.userId, false);

        return NextResponse.json({
          success: true,
          message: "Two-factor authentication disabled",
        });
      }

      // Get 2FA status
      case "get_2fa_status": {
        const enabled = await hasUser2FAEnabled(session.userId);
        const user = await getUserById(session.userId);

        return NextResponse.json({
          enabled,
          hasVerifiedEmail: user ? !user.email.endsWith("@wurmtools.local") : false,
          email: user?.email || null,
        });
      }

      // Get alert preferences
      case "get_alert_preferences": {
        let prefs = await getEmailAlertPreferences(session.userId);

        // Create default preferences if none exist
        if (!prefs) {
          prefs = await upsertEmailAlertPreferences(session.userId, {});
        }

        return NextResponse.json({ preferences: prefs });
      }

      // Update alert preferences
      case "update_alert_preferences": {
        const { preferences } = body;

        if (!preferences || typeof preferences !== "object") {
          return NextResponse.json(
            { error: "Preferences object is required" },
            { status: 400 }
          );
        }

        const updated = await upsertEmailAlertPreferences(
          session.userId,
          preferences
        );

        return NextResponse.json({
          success: true,
          preferences: updated,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json(
      { error: sanitizeError(error, "Email operation") },
      { status: 500 }
    );
  }
}

// GET /api/email - Get email status
export async function GET() {
  try {
    const session = await getSessionAsync();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const has2FA = await hasUser2FAEnabled(session.userId);
    const prefs = await getEmailAlertPreferences(session.userId);

    // Check if email is placeholder
    const hasRealEmail = !user.email.endsWith("@wurmtools.local");

    return NextResponse.json({
      email: hasRealEmail ? user.email : null,
      emailVerified: hasRealEmail,
      twoFactorEnabled: has2FA,
      alertPreferences: prefs,
      emailConfigured: isEmailConfigured(),
    });
  } catch (error) {
    console.error("Email GET error:", error);
    return NextResponse.json(
      { error: sanitizeError(error, "Get email status") },
      { status: 500 }
    );
  }
}
