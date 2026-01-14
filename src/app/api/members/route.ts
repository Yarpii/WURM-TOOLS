import { NextResponse } from "next/server";
import { getVisibleMembers } from "@/lib/auth";
import { getUserPrimaryRole } from "@/lib/roles";
import { sanitizeError } from "@/lib/security";

// GET /api/members - Get list of visible members (opt-in)
export async function GET() {
  try {
    const members = await getVisibleMembers();

    // Get primary roles for all members (in parallel for performance)
    const membersWithRoles = await Promise.all(
      members.map(async (member) => {
        let primaryRole = null;
        try {
          primaryRole = await getUserPrimaryRole(member.id);
        } catch {
          // Roles table might not exist yet
        }

        return {
          id: member.id,
          username: member.username,
          display_name: member.display_name,
          avatar_url: member.avatar_url,
          wurm_server: member.wurm_server,
          location: member.show_location ? member.location : undefined,
          created_at: member.created_at,
          primary_role: primaryRole && primaryRole.role_name !== "member" ? {
            role_name: primaryRole.role_name,
            role_display_name: primaryRole.role_display_name,
            role_color: primaryRole.role_color,
            role_icon: primaryRole.role_icon,
            role_priority: primaryRole.role_priority,
          } : undefined,
        };
      })
    );

    return NextResponse.json({ members: membersWithRoles });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch members") },
      { status: 500 }
    );
  }
}
