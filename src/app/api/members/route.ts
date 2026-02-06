import { NextResponse } from "next/server";
import { getVisibleMembers } from "@/lib/auth";
import { query } from "@/lib/database";
import { sanitizeError } from "@/lib/security";

// GET /api/members - Get list of visible members with primary roles (single JOIN query)
export async function GET() {
  try {
    const members = await getVisibleMembers();

    // Fetch all primary roles in a single query instead of N+1 individual queries
    let roleMap = new Map<number, { role_name: string; role_display_name: string; role_color: string | null; role_icon: string | null; role_priority: number }>();

    if (members.length > 0) {
      try {
        const memberIds = members.map(m => m.id);
        const placeholders = memberIds.map(() => '?').join(',');
        const rolesResult = await query<{
          user_id: number;
          role_name: string;
          role_display_name: string;
          role_color: string | null;
          role_icon: string | null;
          role_priority: number;
        }>(
          `SELECT ur.user_id, r.name as role_name, r.display_name as role_display_name,
                  r.color as role_color, r.icon as role_icon, r.priority as role_priority
           FROM user_roles ur
           JOIN roles r ON r.id = ur.role_id
           WHERE ur.user_id IN (${placeholders})
           ORDER BY r.priority DESC`,
          memberIds
        );

        // Keep only the highest-priority role per user
        for (const row of rolesResult.rows) {
          if (!roleMap.has(row.user_id)) {
            roleMap.set(row.user_id, row);
          }
        }
      } catch {
        // Roles table might not exist yet - continue without roles
        roleMap = new Map();
      }
    }

    const membersWithRoles = members.map((member) => {
      const primaryRole = roleMap.get(member.id);
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
    });

    return NextResponse.json({ members: membersWithRoles });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch members") },
      { status: 500 }
    );
  }
}
