import { NextRequest, NextResponse } from "next/server";
import { getSessionAsync as getSession } from "@/lib/auth";
import { getAllSiteSettingsDetailed, updateSiteSettings } from "@/lib/db/site-settings";
import { sanitizeError } from "@/lib/security";

// GET /api/admin/settings - Get all settings with metadata (admin only)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check admin role
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await getAllSiteSettingsDetailed();
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch admin settings") },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings - Update settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 });
    }

    // Validate: only allow known setting keys (prevent injection of new keys)
    const allowedKeys = [
      "site_name", "site_tagline",
      "header_logo_dark", "header_logo_light", "footer_icon_dark", "footer_icon_light",
      "favicon_dark", "favicon_light", "og_image_url",
      "color_accent", "color_accent_hover", "color_success", "color_warning", "color_danger", "color_info",
      "social_twitter", "social_github", "social_discord",
      "seo_description", "seo_keywords",
    ];

    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(settings)) {
      if (allowedKeys.includes(key) && typeof value === "string") {
        // Validate color format
        if (key.startsWith("color_") && !/^#[0-9a-fA-F]{6}$/.test(value)) {
          return NextResponse.json(
            { error: `Invalid color format for ${key}. Must be #RRGGBB.` },
            { status: 400 }
          );
        }
        // Limit string length
        if (value.length > 2000) {
          return NextResponse.json(
            { error: `Value for ${key} is too long (max 2000 chars).` },
            { status: 400 }
          );
        }
        filtered[key] = value;
      }
    }

    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ error: "No valid settings to update" }, { status: 400 });
    }

    await updateSiteSettings(filtered, session.userId);

    // Return updated settings
    const updatedSettings = await getAllSiteSettingsDetailed();
    return NextResponse.json({ settings: updatedSettings, updated: Object.keys(filtered) });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Update admin settings") },
      { status: 500 }
    );
  }
}
