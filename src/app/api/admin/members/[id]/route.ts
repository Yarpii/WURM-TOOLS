import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  getUserById,
  adminUpdateUser,
  banUser,
  unbanUser,
  deleteUser,
} from "@/lib/auth";

// GET /api/admin/members/[id] - Get user details (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch user: " + String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/admin/members/[id] - Update user (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const body = await request.json();
    const { role, display_name, bio, location, wurm_server } = body;

    // Validate role
    if (role !== undefined && !["user", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Prevent removing admin from self
    if (userId === session.user.id && role === "user") {
      return NextResponse.json(
        { error: "You cannot remove admin privileges from yourself" },
        { status: 400 }
      );
    }

    const success = adminUpdateUser(userId, {
      role,
      display_name,
      bio,
      location,
      wurm_server,
    });

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 400 }
      );
    }

    const updatedUser = await getUserById(userId);

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update user: " + String(error) },
      { status: 500 }
    );
  }
}

// POST /api/admin/members/[id] - Ban/unban user (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Can't ban yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot ban yourself" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, reason } = body;

    if (!["ban", "unban"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'ban' or 'unban'" },
        { status: 400 }
      );
    }

    let success: boolean;

    if (action === "ban") {
      if (!reason || reason.length < 3) {
        return NextResponse.json(
          { error: "Ban reason is required (at least 3 characters)" },
          { status: 400 }
        );
      }
      success = await banUser(userId, session.user.id, reason);
    } else {
      success = await unbanUser(userId);
    }

    if (!success) {
      return NextResponse.json(
        { error: `Failed to ${action} user. Admins cannot be banned.` },
        { status: 400 }
      );
    }

    const updatedUser = await getUserById(userId);

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update ban status: " + String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/members/[id] - Delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Can't delete yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check if user is admin
    const targetUser = await getUserById(userId);
    if (targetUser?.role === "admin") {
      return NextResponse.json(
        { error: "Cannot delete an admin account" },
        { status: 400 }
      );
    }

    const success = deleteUser(userId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete user: " + String(error) },
      { status: 500 }
    );
  }
}
