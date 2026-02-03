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
    const { display_name, bio, avatar_url, banner_url, location, wurm_server } = body;

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

    // Helper to validate image URLs (supports local uploads and HTTPS)
    const validateImageUrl = (url: string, fieldName: string): string | null => {
      // Allow local uploads (start with /uploads/)
      if (url.startsWith("/uploads/")) {
        // SECURITY: Prevent path traversal attacks
        if (url.includes("..") || url.includes("//") || url.includes("\\")) {
          return `Invalid ${fieldName} URL: path traversal not allowed`;
        }
        // SECURITY: Only allow alphanumeric, dash, underscore, slash, and dot
        const safePathRegex = /^\/uploads\/[a-zA-Z0-9/_.-]+$/;
        if (!safePathRegex.test(url)) {
          return `Invalid ${fieldName} URL: contains invalid characters`;
        }
        if (url.length > 500) {
          return `${fieldName} URL is too long (max 500 characters)`;
        }
        return null;
      }

      try {
        const parsedUrl = new URL(url);
        const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"];
        if (dangerousProtocols.includes(parsedUrl.protocol)) {
          return `Invalid ${fieldName} URL protocol`;
        }
        if (parsedUrl.protocol !== "https:") {
          return `${fieldName} URL must use HTTPS`;
        }
        if (url.length > 500) {
          return `${fieldName} URL is too long (max 500 characters)`;
        }
        return null;
      } catch {
        return `Invalid ${fieldName} URL format`;
      }
    };

    // SECURITY: Validate avatar_url
    if (avatar_url !== undefined && avatar_url !== null && avatar_url !== "") {
      const avatarError = validateImageUrl(avatar_url, "Avatar");
      if (avatarError) {
        return NextResponse.json({ error: avatarError }, { status: 400 });
      }
    }

    // SECURITY: Validate banner_url
    if (banner_url !== undefined && banner_url !== null && banner_url !== "") {
      const bannerError = validateImageUrl(banner_url, "Banner");
      if (bannerError) {
        return NextResponse.json({ error: bannerError }, { status: 400 });
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
      banner_url,
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
