import { NextRequest, NextResponse } from "next/server";
import { getSession, userHasPermission } from "@/lib/auth";
import {
  getAllRoles,
  createRole,
  getAllPermissions,
  getRoleStats,
} from "@/lib/roles";
import { sanitizeError } from "@/lib/security";

// GET /api/admin/roles - Get all roles with stats
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
    const canView = await userHasPermission(session.user.id, "admin.access");
    if (!canView && session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const [roles, permissions, stats] = await Promise.all([
      getAllRoles(),
      getAllPermissions(),
      getRoleStats(),
    ]);

    return NextResponse.json({ roles, permissions, stats });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch roles") },
      { status: 500 }
    );
  }
}

// POST /api/admin/roles - Create a new role
export async function POST(request: NextRequest) {
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
    const canManage = await userHasPermission(session.user.id, "admin.roles.manage");
    if (!canManage && session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { name, display_name, description, color, icon, priority } = body;

    if (!name || !display_name) {
      return NextResponse.json(
        { error: "Name and display_name are required" },
        { status: 400 }
      );
    }

    const result = await createRole({
      name,
      display_name,
      description,
      color,
      icon,
      priority,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ role: result.role }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Create role") },
      { status: 500 }
    );
  }
}
