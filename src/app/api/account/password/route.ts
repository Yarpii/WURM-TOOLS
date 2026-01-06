import { NextRequest, NextResponse } from "next/server";
import { getSession, changePassword } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

// PUT /api/account/password - Change password
export async function PUT(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const body = await request.json();
    const { current_password, new_password, confirm_password } = body;

    // Validate input
    if (!current_password || !new_password || !confirm_password) {
      return NextResponse.json(
        { error: "All password fields are required" },
        { status: 400 }
      );
    }

    if (new_password !== confirm_password) {
      return NextResponse.json(
        { error: "New passwords do not match" },
        { status: 400 }
      );
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (new_password === current_password) {
      return NextResponse.json(
        { error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    const result = await changePassword(session.user.id, current_password, new_password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to change password" },
        { status: 400 }
      );
    }

    // Clear the session cookie since all sessions are invalidated
    const response = NextResponse.json({
      success: true,
      message: "Password changed successfully. Please log in again.",
    });

    response.cookies.delete("session");

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Change password") },
      { status: 500 }
    );
  }
}
