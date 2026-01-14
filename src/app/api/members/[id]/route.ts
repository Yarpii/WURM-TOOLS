import { NextRequest, NextResponse } from "next/server";
import { getPublicProfile } from "@/lib/auth";
import { getUserCharacters } from "@/lib/database";
import { getUserRoles } from "@/lib/roles";
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

    // Fetch user's characters and roles
    const [characters, roles] = await Promise.all([
      getUserCharacters(userId),
      getUserRoles(userId).catch(() => []), // Gracefully handle if roles table doesn't exist
    ]);

    // Filter out the basic 'member' role from public display
    const displayRoles = roles.filter((r) => r.role_name !== "member");

    return NextResponse.json({
      profile: { ...profile, roles: displayRoles },
      characters,
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch profile") },
      { status: 500 }
    );
  }
}
