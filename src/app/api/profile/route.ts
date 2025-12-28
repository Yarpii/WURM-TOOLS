import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserById, updateUserProfile } from "@/lib/auth";

// GET /api/profile - Get current user's full profile
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

    const user = getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ profile: user });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch profile: " + String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/profile - Update current user's profile
export async function PUT(request: NextRequest) {
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
    const { display_name, bio, avatar_url, location, wurm_server } = body;

    // Validate input
    if (display_name !== undefined && display_name.length > 50) {
      return NextResponse.json(
        { error: "Display name must be 50 characters or less" },
        { status: 400 }
      );
    }
    if (bio !== undefined && bio.length > 500) {
      return NextResponse.json(
        { error: "Bio must be 500 characters or less" },
        { status: 400 }
      );
    }
    if (location !== undefined && location.length > 100) {
      return NextResponse.json(
        { error: "Location must be 100 characters or less" },
        { status: 400 }
      );
    }
    if (wurm_server !== undefined && wurm_server.length > 50) {
      return NextResponse.json(
        { error: "Wurm server must be 50 characters or less" },
        { status: 400 }
      );
    }

    const success = updateUserProfile(session.user.id, {
      display_name,
      bio,
      avatar_url,
      location,
      wurm_server,
    });

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 400 }
      );
    }

    const updatedUser = getUserById(session.user.id);

    return NextResponse.json({
      success: true,
      profile: updatedUser,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update profile: " + String(error) },
      { status: 500 }
    );
  }
}
