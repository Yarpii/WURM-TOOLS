import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserById, updateUserProfile } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

// GET /api/profile - Get current user's full profile
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

    return NextResponse.json({ profile: user });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch profile") },
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

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const body = await request.json();
    const { display_name, bio, avatar_url, location, wurm_server } = body;

    // SECURITY: Input validation and sanitization
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

    // SECURITY: Validate avatar_url to prevent XSS and only allow safe URLs
    if (avatar_url !== undefined && avatar_url !== null && avatar_url !== "") {
      try {
        const url = new URL(avatar_url);
        // Only allow HTTPS URLs
        if (url.protocol !== "https:") {
          return NextResponse.json(
            { error: "Avatar URL must use HTTPS" },
            { status: 400 }
          );
        }
        // Prevent javascript: and data: URLs
        if (["javascript:", "data:", "vbscript:"].includes(url.protocol)) {
          return NextResponse.json(
            { error: "Invalid avatar URL protocol" },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid avatar URL format" },
          { status: 400 }
        );
      }
    }

    // SECURITY: Sanitize text inputs - remove potential XSS vectors
    const sanitizeText = (text: string | undefined): string | undefined => {
      if (text === undefined) return undefined;
      // Basic HTML entity encoding for < > & " '
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
    };

    const success = await updateUserProfile(session.user.id, {
      display_name: sanitizeText(display_name),
      bio: sanitizeText(bio),
      avatar_url,
      location: sanitizeText(location),
      wurm_server: sanitizeText(wurm_server),
    });

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 400 }
      );
    }

    const updatedUser = await getUserById(session.user.id);

    return NextResponse.json({
      success: true,
      profile: updatedUser,
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Update profile") },
      { status: 500 }
    );
  }
}
