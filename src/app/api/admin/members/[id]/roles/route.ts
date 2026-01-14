import { NextRequest, NextResponse } from "next/server";
import { getSession, userHasPermission, getUserById } from "@/lib/auth";
import { getUserRoles, assignRole, removeRole, getAllRoles } from "@/lib/roles";
import { sanitizeError } from "@/lib/security";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/admin/members/[id]/roles - Get user's roles
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

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

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [userRoles, allRoles] = await Promise.all([
      getUserRoles(userId),
      getAllRoles(),
    ]);

    return NextResponse.json({ userRoles, allRoles, user });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch user roles") },
      { status: 500 }
    );
  }
}

// POST /api/admin/members/[id]/roles - Assign a role to user
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

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
    const { roleId, reason } = body;

    if (!roleId) {
      return NextResponse.json({ error: "roleId is required" }, { status: 400 });
    }

    const result = await assignRole(userId, roleId, session.user.id, reason);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const userRoles = await getUserRoles(userId);
    return NextResponse.json({ success: true, userRoles });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Assign role") },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/members/[id]/roles - Remove a role from user
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

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
    const { roleId, reason } = body;

    if (!roleId) {
      return NextResponse.json({ error: "roleId is required" }, { status: 400 });
    }

    const result = await removeRole(userId, roleId, session.user.id, reason);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const userRoles = await getUserRoles(userId);
    return NextResponse.json({ success: true, userRoles });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Remove role") },
      { status: 500 }
    );
  }
}
