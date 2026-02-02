import { query } from "./core";
import type {
  Alliance,
  AllianceMember,
  AllianceInvite,
  AllianceRole,
  CreateAllianceInput,
  UpdateAllianceInput,
} from "../types";
import type { PaginatedResult, PaginationParams } from "./pagination";
import { validatePagination } from "./pagination";

// ========== ALLIANCES ==========

export async function getAllAlliances(includePrivate: boolean = false): Promise<Alliance[]> {
  let sql = "SELECT * FROM alliances";
  if (!includePrivate) {
    sql += " WHERE is_public = 1";
  }
  sql += " ORDER BY name";

  const result = await query<Alliance>(sql);
  return result.rows;
}

export async function getAlliancesPaginated(params?: PaginationParams, includePrivate?: boolean): Promise<PaginatedResult<Alliance>> {
  const { offset, limit, page } = validatePagination(params);
  const alliances = await getAllAlliances(includePrivate);
  return {
    data: alliances.slice(offset, offset + limit),
    total: alliances.length,
    page,
    limit,
    totalPages: Math.ceil(alliances.length / limit),
  };
}

export async function getAllianceById(id: number): Promise<Alliance | null> {
  const result = await query<Alliance>("SELECT * FROM alliances WHERE id = ?", [id]);
  return result.rows[0] || null;
}

export async function getUserAlliance(userId: number): Promise<Alliance | null> {
  const result = await query<{ alliance_id: number }>(
    "SELECT alliance_id FROM alliance_members WHERE user_id = ?",
    [userId]
  );
  if (result.rows.length === 0) return null;
  return getAllianceById(result.rows[0].alliance_id);
}

export async function createAlliance(userId: number, input: CreateAllianceInput): Promise<number> {
  await query(
    `INSERT INTO alliances (name, description, leader_id, is_public, max_members)
     VALUES (?, ?, ?, ?, ?)`,
    [input.name, input.description || null, userId, input.is_public ? 1 : 0, input.max_members || 50]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  const allianceId = idResult.rows[0]?.id || 0;

  await query(
    "INSERT INTO alliance_members (alliance_id, user_id, role) VALUES (?, ?, 'leader')",
    [allianceId, userId]
  );

  return allianceId;
}

export async function updateAlliance(
  allianceId: number,
  userId: number,
  input: UpdateAllianceInput,
  isAdmin: boolean = false
): Promise<boolean> {
  const alliance = await getAllianceById(allianceId);
  if (!alliance) return false;
  if (!isAdmin && alliance.leader_id !== userId) return false;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description);
  }
  if (input.is_public !== undefined) {
    fields.push("is_public = ?");
    values.push(input.is_public ? 1 : 0);
  }
  if (input.max_members !== undefined) {
    fields.push("max_members = ?");
    values.push(input.max_members);
  }

  if (fields.length === 0) return false;

  values.push(allianceId);
  const result = await query(`UPDATE alliances SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.rowCount > 0;
}

export async function deleteAlliance(allianceId: number, userId: number, isAdmin: boolean = false): Promise<boolean> {
  const alliance = await getAllianceById(allianceId);
  if (!alliance) return false;
  if (!isAdmin && alliance.leader_id !== userId) return false;

  await query("DELETE FROM alliance_members WHERE alliance_id = ?", [allianceId]);
  await query("DELETE FROM alliance_invites WHERE alliance_id = ?", [allianceId]);
  const result = await query("DELETE FROM alliances WHERE id = ?", [allianceId]);
  return result.rowCount > 0;
}

export async function getAllianceMembers(allianceId: number): Promise<AllianceMember[]> {
  const result = await query<AllianceMember>(
    `SELECT am.*, u.username
     FROM alliance_members am
     JOIN users u ON am.user_id = u.id
     WHERE am.alliance_id = ?
     ORDER BY am.role, u.username`,
    [allianceId]
  );
  return result.rows;
}

export async function getAllianceMember(allianceId: number, userId: number): Promise<AllianceMember | null> {
  const result = await query<AllianceMember>(
    "SELECT * FROM alliance_members WHERE alliance_id = ? AND user_id = ?",
    [allianceId, userId]
  );
  return result.rows[0] || null;
}

// ========== ALLIANCE INVITES ==========

export async function getUserInvites(userId: number): Promise<AllianceInvite[]> {
  const result = await query<AllianceInvite>(
    `SELECT ai.*, a.name as alliance_name, u.username as invited_by_username
     FROM alliance_invites ai
     JOIN alliances a ON ai.alliance_id = a.id
     JOIN users u ON ai.invited_by = u.id
     WHERE ai.user_id = ? AND ai.status = 'pending'
     ORDER BY ai.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getAllianceInvites(allianceId: number): Promise<AllianceInvite[]> {
  const result = await query<AllianceInvite>(
    `SELECT ai.*, u.username
     FROM alliance_invites ai
     JOIN users u ON ai.user_id = u.id
     WHERE ai.alliance_id = ? AND ai.status = 'pending'
     ORDER BY ai.created_at DESC`,
    [allianceId]
  );
  return result.rows;
}

export async function createInvite(allianceId: number, userId: number, invitedBy: number): Promise<number | null> {
  // Check if user is already in an alliance
  const existingAlliance = await getUserAlliance(userId);
  if (existingAlliance) return null;

  // Check if user already has a pending invite from this alliance
  const existingInvite = await query<AllianceInvite>(
    "SELECT id FROM alliance_invites WHERE alliance_id = ? AND user_id = ? AND status = 'pending'",
    [allianceId, userId]
  );
  if (existingInvite.rows.length > 0) return null;

  // Check if alliance is full
  const alliance = await getAllianceById(allianceId);
  if (!alliance) return null;

  const members = await getAllianceMembers(allianceId);
  if (members.length >= alliance.max_members) return null;

  await query(
    "INSERT INTO alliance_invites (alliance_id, user_id, invited_by, status) VALUES (?, ?, ?, 'pending')",
    [allianceId, userId, invitedBy]
  );
  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || null;
}

export async function respondToInvite(inviteId: number, userId: number, accept: boolean): Promise<boolean> {
  // Get the invite
  const inviteResult = await query<AllianceInvite>(
    "SELECT * FROM alliance_invites WHERE id = ? AND user_id = ? AND status = 'pending'",
    [inviteId, userId]
  );
  const invite = inviteResult.rows[0];
  if (!invite) return false;

  // Check if user is already in an alliance
  const existingAlliance = await getUserAlliance(userId);
  if (existingAlliance) return false;

  if (accept) {
    // Check if alliance is full
    const alliance = await getAllianceById(invite.alliance_id);
    if (!alliance) return false;

    const members = await getAllianceMembers(invite.alliance_id);
    if (members.length >= alliance.max_members) return false;

    // Add user to alliance
    await query(
      "INSERT INTO alliance_members (alliance_id, user_id, role, invited_by) VALUES (?, ?, 'member', ?)",
      [invite.alliance_id, userId, invite.invited_by]
    );

    // Update invite status
    await query(
      "UPDATE alliance_invites SET status = 'accepted' WHERE id = ?",
      [inviteId]
    );

    // Decline all other pending invites for this user
    await query(
      "UPDATE alliance_invites SET status = 'declined' WHERE user_id = ? AND id != ? AND status = 'pending'",
      [userId, inviteId]
    );
  } else {
    // Decline the invite
    await query(
      "UPDATE alliance_invites SET status = 'declined' WHERE id = ?",
      [inviteId]
    );
  }

  return true;
}

export async function cancelInvite(inviteId: number, userId: number, isAdmin: boolean = false): Promise<boolean> {
  // Get the invite
  const inviteResult = await query<AllianceInvite>(
    "SELECT ai.*, am.role as user_role FROM alliance_invites ai LEFT JOIN alliance_members am ON ai.alliance_id = am.alliance_id AND am.user_id = ? WHERE ai.id = ? AND ai.status = 'pending'",
    [userId, inviteId]
  );
  const invite = inviteResult.rows[0];
  if (!invite) return false;

  // Check permission: must be admin, or officer/leader of the alliance
  const userRole = (invite as AllianceInvite & { user_role?: string }).user_role;
  if (!isAdmin && (!userRole || userRole === "member")) {
    return false;
  }

  const result = await query(
    "DELETE FROM alliance_invites WHERE id = ?",
    [inviteId]
  );
  return result.rowCount > 0;
}

// ========== ALLIANCE MANAGEMENT ==========

export async function removeMember(
  allianceId: number,
  userIdToRemove: number,
  requesterId: number,
  isAdmin: boolean = false
): Promise<boolean> {
  const alliance = await getAllianceById(allianceId);
  if (!alliance) return false;

  // Check permission: must be admin, or alliance leader/officer
  if (!isAdmin && alliance.leader_id !== requesterId) {
    const requesterMember = await getAllianceMember(allianceId, requesterId);
    if (!requesterMember || requesterMember.role === "member") return false;
  }

  // Cannot remove the leader
  if (alliance.leader_id === userIdToRemove) return false;

  const result = await query(
    "DELETE FROM alliance_members WHERE alliance_id = ? AND user_id = ?",
    [allianceId, userIdToRemove]
  );
  return result.rowCount > 0;
}

export async function updateMemberRole(
  allianceId: number,
  userId: number,
  role: AllianceRole,
  requesterId: number,
  isAdmin: boolean = false
): Promise<boolean> {
  const alliance = await getAllianceById(allianceId);
  if (!alliance) return false;

  // Only leader or admin can change roles
  if (!isAdmin && alliance.leader_id !== requesterId) return false;

  // Cannot change leader's role (must use transferLeadership)
  if (alliance.leader_id === userId) return false;

  const result = await query(
    "UPDATE alliance_members SET role = ? WHERE alliance_id = ? AND user_id = ?",
    [role, allianceId, userId]
  );
  return result.rowCount > 0;
}

export async function transferLeadership(
  allianceId: number,
  currentLeaderId: number,
  newLeaderId: number
): Promise<boolean> {
  const alliance = await getAllianceById(allianceId);
  if (!alliance) return false;

  // Verify current user is the leader
  if (alliance.leader_id !== currentLeaderId) return false;

  // Verify new leader is a member
  const newLeader = await getAllianceMember(allianceId, newLeaderId);
  if (!newLeader) return false;

  // Update alliance leader
  await query("UPDATE alliances SET leader_id = ? WHERE id = ?", [newLeaderId, allianceId]);

  // Update roles: new leader to leader, old leader to officer
  await query(
    "UPDATE alliance_members SET role = 'leader' WHERE alliance_id = ? AND user_id = ?",
    [allianceId, newLeaderId]
  );
  await query(
    "UPDATE alliance_members SET role = 'officer' WHERE alliance_id = ? AND user_id = ?",
    [allianceId, currentLeaderId]
  );

  return true;
}
