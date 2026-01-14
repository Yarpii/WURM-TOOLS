import { NextRequest, NextResponse } from "next/server";
import { getSession, userHasPermission } from "@/lib/auth";
import {
  getRoleById,
  updateRole,
  deleteRole,
  getRolePermissions,
  setRolePermissions,
  getUsersWithRole,
} from "@/lib/roles";
import { sanitizeError } from "@/lib/security";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/admin/roles/[id] - Get role details with permissions and users
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const roleId = parseInt(id);
    if (isNaN(roleId)) {
      return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });
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

    const role = await getRoleById(roleId);
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const [permissions, users] = await Promise.all([
      getRolePermissions(roleId),
      getUsersWithRole(roleId),
    ]);

    return NextResponse.json({ role, permissions, users });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch role") },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/roles/[id] - Update a role
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const roleId = parseInt(id);
    if (isNaN(roleId)) {
      return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });
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
    const { display_name, description, color, icon, priority, permissions } = body;

    // Update role properties
    if (display_name || description !== undefined || color || icon || priority !== undefined) {
      const updated = await updateRole(roleId, {
        display_name,
        description,
        color,
        icon,
        priority,
      });
      if (!updated) {
        return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
      }
    }

    // Update permissions if provided
    if (permissions && Array.isArray(permissions)) {
      const permissionsSet = await setRolePermissions(roleId, permissions);
      if (!permissionsSet) {
        return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 });
      }
    }

    const role = await getRoleById(roleId);
    const rolePermissions = await getRolePermissions(roleId);

    return NextResponse.json({ role, permissions: rolePermissions });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Update role") },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/roles/[id] - Delete a role
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const roleId = parseInt(id);
    if (isNaN(roleId)) {
      return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });
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

    const result = await deleteRole(roleId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Delete role") },
      { status: 500 }
    );
  }
}
