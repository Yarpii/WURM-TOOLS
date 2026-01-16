import { NextRequest, NextResponse } from "next/server";
import { requestUsernameReminder } from "@/lib/password-recovery";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Get IP address from request
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                      request.headers.get("x-real-ip") ||
                      "unknown";

    const result = await requestUsernameReminder(email, ipAddress);

    if (!result.success && result.error?.includes("Too many")) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 429 }
      );
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("[forgot-username] Error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
