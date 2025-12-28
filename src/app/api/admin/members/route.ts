import { NextRequest, NextResponse } from "next/server";
import { getSession, getAllUsers, getUserStats } from "@/lib/auth";

// GET /api/admin/members - Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const users = getAllUsers();
    const stats = getUserStats();

    return NextResponse.json({ users, stats });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch users: " + String(error) },
      { status: 500 }
    );
  }
}
