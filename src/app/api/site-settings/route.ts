import { NextResponse } from "next/server";
import { getAllSiteSettings } from "@/lib/db/site-settings";
import { sanitizeError } from "@/lib/security";

// GET /api/site-settings - Public endpoint to fetch site settings
export async function GET() {
  try {
    const settings = await getAllSiteSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch site settings") },
      { status: 500 }
    );
  }
}
