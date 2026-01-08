import { NextResponse } from "next/server";
import { getVisibleMembers } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

// GET /api/members - Get list of visible members (opt-in)
export async function GET() {
  try {
    const members = await getVisibleMembers();

    // Return public info only
    const publicMembers = members.map((member) => ({
      id: member.id,
      username: member.username,
      display_name: member.display_name,
      avatar_url: member.avatar_url,
      wurm_server: member.wurm_server,
      location: member.show_location ? member.location : undefined,
      created_at: member.created_at,
    }));

    return NextResponse.json({ members: publicMembers });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch members") },
      { status: 500 }
    );
  }
}
