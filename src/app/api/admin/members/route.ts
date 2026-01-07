import { NextRequest, NextResponse } from "next/server";
import { getSession, getAllUsers, getUsersPaginated, getUserStats } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

// GET /api/admin/members - Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const paginate = searchParams.get("paginate") === "true";
    const stats = await getUserStats();

    // SECURITY: Support pagination to prevent DoS via unbounded queries
    if (paginate) {
      const pageParam = parseInt(searchParams.get("page") || "1", 10);
      const limitParam = parseInt(searchParams.get("limit") || "50", 10);
      const page = isNaN(pageParam) ? 1 : Math.max(pageParam, 1);
      const limit = isNaN(limitParam) ? 50 : Math.min(Math.max(limitParam, 1), 100);
      const result = await getUsersPaginated({ page, limit });
      return NextResponse.json({ ...result, stats });
    }

    // Legacy: Return all users (backwards compatibility)
    const users = await getAllUsers();
    return NextResponse.json({ users, stats });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch users") },
      { status: 500 }
    );
  }
}
