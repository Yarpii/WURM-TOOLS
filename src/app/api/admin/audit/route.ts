import { NextRequest, NextResponse } from "next/server";
import { getSession, userHasPermission } from "@/lib/auth";
import { getRoleAuditLog } from "@/lib/roles";
import { sanitizeError, validatePagination } from "@/lib/security";

// GET /api/admin/audit - Get role audit log
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

    // Check permission
    const canView = await userHasPermission(session.user.id, "mod.audit.view");
    if (!canView && session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const roleId = searchParams.get("roleId");
    const { page, limit } = validatePagination(
      searchParams.get("page"),
      searchParams.get("limit")
    );

    const entries = await getRoleAuditLog({
      userId: userId ? parseInt(userId) : undefined,
      roleId: roleId ? parseInt(roleId) : undefined,
      limit,
      offset: (page - 1) * limit,
    });

    return NextResponse.json({ entries, page, limit });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch audit log") },
      { status: 500 }
    );
  }
}
