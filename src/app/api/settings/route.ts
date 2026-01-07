import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserById, updateUserSettings } from "@/lib/auth";

// GET /api/settings - Get current user's settings
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

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      settings: {
        show_in_members_list: user.show_in_members_list,
        show_email: user.show_email,
        show_location: user.show_location,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch settings: " + String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update current user's settings
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
    const { show_in_members_list, show_email, show_location } = body;

    const success = await updateUserSettings(session.user.id, {
      show_in_members_list,
      show_email,
      show_location,
    });

    if (!success) {
      return NextResponse.json(
        { error: "No settings were updated" },
        { status: 400 }
      );
    }

    const updatedUser = await getUserById(session.user.id);

    return NextResponse.json({
      success: true,
      settings: {
        show_in_members_list: updatedUser?.show_in_members_list,
        show_email: updatedUser?.show_email,
        show_location: updatedUser?.show_location,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update settings: " + String(error) },
      { status: 500 }
    );
  }
}
