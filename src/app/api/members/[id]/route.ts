import { NextRequest, NextResponse } from "next/server";
import { getPublicProfile } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

// GET /api/members/[id] - Get public profile of a member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const profile = await getPublicProfile(userId);

    if (!profile) {
      return NextResponse.json({ error: "User not found or not visible" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch profile") },
      { status: 500 }
    );
  }
}
