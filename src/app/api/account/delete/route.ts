import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteAccount } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

// DELETE /api/account/delete - Delete account
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const body = await request.json();
    const { password, confirmation } = body;

    // Validate input
    if (!password) {
      return NextResponse.json(
        { error: "Password is required to delete account" },
        { status: 400 }
      );
    }

    if (confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Please type DELETE to confirm account deletion" },
        { status: 400 }
      );
    }

    const result = deleteAccount(session.user.id, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete account" },
        { status: 400 }
      );
    }

    // Clear the session cookie
    const response = NextResponse.json({
      success: true,
      message: "Account deleted successfully.",
    });

    response.cookies.delete("session");

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Delete account") },
      { status: 500 }
    );
  }
}
