import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProspectStats } from "@/lib/database";
import { sanitizeError } from "@/lib/security";

// GET /api/prospects/stats - Get prospect statistics for the current user
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

    const stats = getProspectStats(session.user.id);
    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch prospect stats") },
      { status: 500 }
    );
  }
}
