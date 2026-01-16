import { NextRequest, NextResponse } from "next/server";
import { validateResetToken, resetPassword } from "@/lib/password-recovery";
import { sendPasswordChangedEmail } from "@/lib/email";
import { getUserById } from "@/lib/auth";

// Validate token (GET)
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const result = await validateResetToken(token);

    return NextResponse.json({
      valid: result.valid,
      username: result.username,
      error: result.error,
    });
  } catch (error) {
    console.error("[reset-password] Validation error:", error);
    return NextResponse.json(
      { valid: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

// Reset password (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: "Password is too long" },
        { status: 400 }
      );
    }

    // Get user info before reset for email notification
    const tokenValidation = await validateResetToken(token);

    const result = await resetPassword(token, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Send password changed notification
    if (tokenValidation.userId) {
      try {
        const user = await getUserById(tokenValidation.userId);
        if (user) {
          await sendPasswordChangedEmail(user.email, user.username);
        }
      } catch (emailError) {
        console.error("[reset-password] Failed to send notification:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("[reset-password] Error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
