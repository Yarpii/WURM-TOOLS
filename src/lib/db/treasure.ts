import { query } from "./core";
import type {
  TreasureHunt,
  TreasureHuntStatus,
  TreasureLoot,
  TreasureStats,
  SharedTreasure,
  SharedTreasureStatus,
  TreasureHuntShare,
  CreateTreasureHuntInput,
  UpdateTreasureHuntInput,
  AddTreasureLootInput,
  CreateSharedTreasureInput,
  UpdateSharedTreasureInput,
} from "../types";

// ========== TREASURE HUNTING ==========

// Get user's treasure hunts
export async function getUserTreasureHunts(
  userId: number,
  filters?: {
    status?: TreasureHuntStatus;
    server?: string;
    difficulty?: string;
    parent_hunt_id?: number;
  }
): Promise<TreasureHunt[]> {
  let sql = `
    SELECT
      th.*,
      c.name as character_name,
      a.name as alliance_name,
      p.name as parent_hunt_name,
      (SELECT COUNT(*) FROM treasure_loot WHERE treasure_hunt_id = th.id) as loot_count
    FROM treasure_hunts th
    LEFT JOIN characters c ON th.character_id = c.id
    LEFT JOIN alliances a ON th.alliance_id = a.id
    LEFT JOIN treasure_hunts p ON th.parent_hunt_id = p.id
    WHERE th.user_id = ?
  `;
  const params: unknown[] = [userId];

  if (filters?.status) {
    sql += " AND th.status = ?";
    params.push(filters.status);
  }
  if (filters?.server) {
    sql += " AND th.server = ?";
    params.push(filters.server);
  }
  if (filters?.difficulty) {
    sql += " AND th.difficulty = ?";
    params.push(filters.difficulty);
  }
  if (filters?.parent_hunt_id) {
    sql += " AND th.parent_hunt_id = ?";
    params.push(filters.parent_hunt_id);
  }

  sql += " ORDER BY th.created_at DESC";

  const result = await query<TreasureHunt>(sql, params);
  return result.rows;
}

// Get single treasure hunt by ID
export async function getTreasureHuntById(huntId: number): Promise<TreasureHunt | null> {
  const result = await query<TreasureHunt>(`
    SELECT
      th.*,
      u.username,
      c.name as character_name,
      a.name as alliance_name,
      p.name as parent_hunt_name,
      (SELECT COUNT(*) FROM treasure_loot WHERE treasure_hunt_id = th.id) as loot_count
    FROM treasure_hunts th
    LEFT JOIN users u ON th.user_id = u.id
    LEFT JOIN characters c ON th.character_id = c.id
    LEFT JOIN alliances a ON th.alliance_id = a.id
    LEFT JOIN treasure_hunts p ON th.parent_hunt_id = p.id
    WHERE th.id = ?
  `, [huntId]);
  return result.rows[0] || null;
}

// Get child hunts (maps found in this chest)
export async function getChildHunts(parentHuntId: number): Promise<TreasureHunt[]> {
  const result = await query<TreasureHunt>(`
    SELECT
      th.*,
      c.name as character_name,
      (SELECT COUNT(*) FROM treasure_loot WHERE treasure_hunt_id = th.id) as loot_count
    FROM treasure_hunts th
    LEFT JOIN characters c ON th.character_id = c.id
    WHERE th.parent_hunt_id = ?
    ORDER BY th.created_at DESC
  `, [parentHuntId]);
  return result.rows;
}

// Create new treasure hunt
export async function createTreasureHunt(
  userId: number,
  input: CreateTreasureHuntInput
): Promise<number> {
  await query(
    `INSERT INTO treasure_hunts (user_id, character_id, parent_hunt_id, name, description, server, map_quality, difficulty, is_public, alliance_id, screenshot_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.character_id || null,
      input.parent_hunt_id || null,
      input.name,
      input.description || null,
      input.server,
      input.map_quality || null,
      input.difficulty || "easy",
      input.is_public ? 1 : 0,
      input.alliance_id || null,
      input.screenshot_url || null,
    ]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

// Update treasure hunt
export async function updateTreasureHunt(
  huntId: number,
  userId: number,
  input: UpdateTreasureHuntInput,
  isAdmin: boolean = false
): Promise<boolean> {
  const hunt = await getTreasureHuntById(huntId);
  if (!hunt) return false;
  if (hunt.user_id !== userId && !isAdmin) return false;

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    values.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push("description = ?");
    values.push(input.description || null);
  }
  if (input.server !== undefined) {
    updates.push("server = ?");
    values.push(input.server);
  }
  if (input.map_quality !== undefined) {
    updates.push("map_quality = ?");
    values.push(input.map_quality);
  }
  if (input.difficulty !== undefined) {
    updates.push("difficulty = ?");
    values.push(input.difficulty);
  }
  if (input.x !== undefined) {
    updates.push("x = ?");
    values.push(input.x);
  }
  if (input.y !== undefined) {
    updates.push("y = ?");
    values.push(input.y);
  }
  if (input.status !== undefined) {
    updates.push("status = ?");
    values.push(input.status);

    // Auto-set timestamps based on status
    if (input.status === "found" || input.status === "digging") {
      updates.push("found_at = CURRENT_TIMESTAMP");
    }
    if (input.status === "completed") {
      updates.push("completed_at = CURRENT_TIMESTAMP");
    }
  }
  if (input.chest_type !== undefined) {
    updates.push("chest_type = ?");
    values.push(input.chest_type || null);
  }
  if (input.requires_key !== undefined) {
    updates.push("requires_key = ?");
    values.push(input.requires_key ? 1 : 0);
  }
  if (input.is_public !== undefined) {
    updates.push("is_public = ?");
    values.push(input.is_public ? 1 : 0);
  }
  if (input.parent_hunt_id !== undefined) {
    updates.push("parent_hunt_id = ?");
    values.push(input.parent_hunt_id || null);
  }
  if (input.screenshot_url !== undefined) {
    updates.push("screenshot_url = ?");
    values.push(input.screenshot_url || null);
  }

  if (updates.length === 0) return true;

  values.push(huntId);
  const result = await query(
    `UPDATE treasure_hunts SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  return result.rowCount > 0;
}

// Delete treasure hunt
export async function deleteTreasureHunt(
  huntId: number,
  userId: number,
  isAdmin: boolean = false
): Promise<boolean> {
  const hunt = await getTreasureHuntById(huntId);
  if (!hunt) return false;
  if (hunt.user_id !== userId && !isAdmin) return false;

  const result = await query(
    "DELETE FROM treasure_hunts WHERE id = ?",
    [huntId]
  );
  return result.rowCount > 0;
}

// Get treasure loot for a hunt
export async function getTreasureLoot(huntId: number): Promise<TreasureLoot[]> {
  const result = await query<TreasureLoot>(
    "SELECT * FROM treasure_loot WHERE treasure_hunt_id = ? ORDER BY created_at DESC",
    [huntId]
  );
  return result.rows;
}

// Add loot to a treasure hunt
export async function addTreasureLoot(
  huntId: number,
  userId: number,
  input: AddTreasureLootInput
): Promise<number | null> {
  // Verify ownership
  const hunt = await getTreasureHuntById(huntId);
  if (!hunt || hunt.user_id !== userId) return null;

  await query(
    `INSERT INTO treasure_loot (treasure_hunt_id, item_name, quantity, quality, rarity, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      huntId,
      input.item_name,
      input.quantity || 1,
      input.quality || null,
      input.rarity || null,
      input.notes || null,
    ]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || null;
}

// Delete loot item
export async function deleteTreasureLoot(
  lootId: number,
  userId: number
): Promise<boolean> {
  // Verify ownership through hunt
  const lootResult = await query<{ user_id: number }>(
    `SELECT th.user_id FROM treasure_loot tl
     JOIN treasure_hunts th ON tl.treasure_hunt_id = th.id
     WHERE tl.id = ?`,
    [lootId]
  );
  if (!lootResult.rows[0] || lootResult.rows[0].user_id !== userId) return false;

  const result = await query("DELETE FROM treasure_loot WHERE id = ?", [lootId]);
  return result.rowCount > 0;
}

// Get user's treasure stats
export async function getTreasureStats(userId: number): Promise<TreasureStats> {
  const huntsResult = await query<{
    status: string;
    difficulty: string;
    server: string;
    count: number;
  }>(`
    SELECT status, difficulty, server, COUNT(*) as count
    FROM treasure_hunts
    WHERE user_id = ?
    GROUP BY status, difficulty, server
  `, [userId]);

  const lootResult = await query<{ total: number; rare: number }>(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN rarity IN ('rare', 'supreme', 'fantastic') THEN 1 ELSE 0 END) as rare
    FROM treasure_loot tl
    JOIN treasure_hunts th ON tl.treasure_hunt_id = th.id
    WHERE th.user_id = ?
  `, [userId]);

  const stats: TreasureStats = {
    total_hunts: 0,
    completed_hunts: 0,
    abandoned_hunts: 0,
    in_progress_hunts: 0,
    total_loot_items: lootResult.rows[0]?.total || 0,
    rare_finds: lootResult.rows[0]?.rare || 0,
    by_difficulty: { easy: 0, challenging: 0, difficult: 0 },
    by_server: {},
  };

  for (const row of huntsResult.rows) {
    stats.total_hunts += row.count;

    if (row.status === "completed") stats.completed_hunts += row.count;
    else if (row.status === "abandoned") stats.abandoned_hunts += row.count;
    else if (!["new"].includes(row.status)) stats.in_progress_hunts += row.count;

    if (row.difficulty in stats.by_difficulty) {
      stats.by_difficulty[row.difficulty as keyof typeof stats.by_difficulty] += row.count;
    }

    stats.by_server[row.server] = (stats.by_server[row.server] || 0) + row.count;
  }

  return stats;
}

// ========== SHARED TREASURES (COMMUNITY) ==========

// Get shared treasures
export async function getSharedTreasures(
  filters?: {
    server?: string;
    treasure_type?: string;
    status?: SharedTreasureStatus;
    verified_only?: boolean;
  },
  userId?: number
): Promise<SharedTreasure[]> {
  let sql = `
    SELECT
      st.*,
      u.username,
      v.username as verified_by_username
      ${userId ? ", stv.vote_type as user_vote" : ""}
    FROM shared_treasures st
    LEFT JOIN users u ON st.user_id = u.id
    LEFT JOIN users v ON st.verified_by = v.id
    ${userId ? "LEFT JOIN shared_treasure_votes stv ON st.id = stv.treasure_id AND stv.user_id = ?" : ""}
    WHERE 1=1
  `;
  const params: unknown[] = userId ? [userId] : [];

  if (filters?.server) {
    sql += " AND st.server = ?";
    params.push(filters.server);
  }
  if (filters?.treasure_type) {
    sql += " AND st.treasure_type = ?";
    params.push(filters.treasure_type);
  }
  if (filters?.status) {
    sql += " AND st.status = ?";
    params.push(filters.status);
  }
  if (filters?.verified_only) {
    sql += " AND st.is_verified = TRUE";
  }

  sql += " ORDER BY st.created_at DESC";

  const result = await query<SharedTreasure>(sql, params);
  return result.rows;
}

// Get single shared treasure
export async function getSharedTreasureById(
  treasureId: number,
  userId?: number
): Promise<SharedTreasure | null> {
  const result = await query<SharedTreasure>(`
    SELECT
      st.*,
      u.username,
      v.username as verified_by_username
      ${userId ? ", stv.vote_type as user_vote" : ""}
    FROM shared_treasures st
    LEFT JOIN users u ON st.user_id = u.id
    LEFT JOIN users v ON st.verified_by = v.id
    ${userId ? "LEFT JOIN shared_treasure_votes stv ON st.id = stv.treasure_id AND stv.user_id = ?" : ""}
    WHERE st.id = ?
  `, userId ? [userId, treasureId] : [treasureId]);
  return result.rows[0] || null;
}

// Create shared treasure
export async function createSharedTreasure(
  userId: number,
  input: CreateSharedTreasureInput
): Promise<number> {
  await query(
    `INSERT INTO shared_treasures (user_id, name, description, server, x, y, treasure_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.name,
      input.description || null,
      input.server,
      input.x,
      input.y,
      input.treasure_type,
    ]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

// Update shared treasure
export async function updateSharedTreasure(
  treasureId: number,
  userId: number,
  input: UpdateSharedTreasureInput,
  isAdmin: boolean = false
): Promise<boolean> {
  const treasure = await getSharedTreasureById(treasureId);
  if (!treasure) return false;
  if (treasure.user_id !== userId && !isAdmin) return false;

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    values.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push("description = ?");
    values.push(input.description || null);
  }
  if (input.x !== undefined) {
    updates.push("x = ?");
    values.push(input.x);
  }
  if (input.y !== undefined) {
    updates.push("y = ?");
    values.push(input.y);
  }
  if (input.treasure_type !== undefined) {
    updates.push("treasure_type = ?");
    values.push(input.treasure_type);
  }
  if (input.status !== undefined && isAdmin) {
    updates.push("status = ?");
    values.push(input.status);
  }

  if (updates.length === 0) return true;

  values.push(treasureId);
  const result = await query(
    `UPDATE shared_treasures SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  return result.rowCount > 0;
}

// Delete shared treasure
export async function deleteSharedTreasure(
  treasureId: number,
  userId: number,
  isAdmin: boolean = false
): Promise<boolean> {
  const treasure = await getSharedTreasureById(treasureId);
  if (!treasure) return false;
  if (treasure.user_id !== userId && !isAdmin) return false;

  const result = await query(
    "DELETE FROM shared_treasures WHERE id = ?",
    [treasureId]
  );
  return result.rowCount > 0;
}

// Vote on shared treasure
export async function voteSharedTreasure(
  treasureId: number,
  userId: number,
  voteType: "up" | "down"
): Promise<boolean> {
  // Check if already voted
  const existingVote = await query<{ vote_type: string }>(
    "SELECT vote_type FROM shared_treasure_votes WHERE treasure_id = ? AND user_id = ?",
    [treasureId, userId]
  );

  if (existingVote.rows[0]) {
    // Remove old vote count
    const oldVote = existingVote.rows[0].vote_type;
    if (oldVote === voteType) {
      // Same vote - remove it
      await query(
        "DELETE FROM shared_treasure_votes WHERE treasure_id = ? AND user_id = ?",
        [treasureId, userId]
      );
      await query(
        `UPDATE shared_treasures SET ${oldVote === "up" ? "upvotes = upvotes - 1" : "downvotes = downvotes - 1"} WHERE id = ?`,
        [treasureId]
      );
      return true;
    }

    // Different vote - update
    await query(
      "UPDATE shared_treasure_votes SET vote_type = ? WHERE treasure_id = ? AND user_id = ?",
      [voteType, treasureId, userId]
    );
    await query(
      `UPDATE shared_treasures SET
        ${voteType === "up" ? "upvotes = upvotes + 1, downvotes = downvotes - 1" : "upvotes = upvotes - 1, downvotes = downvotes + 1"}
       WHERE id = ?`,
      [treasureId]
    );
  } else {
    // New vote
    await query(
      "INSERT INTO shared_treasure_votes (user_id, treasure_id, vote_type) VALUES (?, ?, ?)",
      [userId, treasureId, voteType]
    );
    await query(
      `UPDATE shared_treasures SET ${voteType === "up" ? "upvotes = upvotes + 1" : "downvotes = downvotes + 1"} WHERE id = ?`,
      [treasureId]
    );
  }

  return true;
}

// Verify shared treasure (admin only)
export async function verifySharedTreasure(
  treasureId: number,
  adminId: number,
  verified: boolean
): Promise<boolean> {
  const result = await query(
    `UPDATE shared_treasures SET
      is_verified = ?,
      verified_by = ?,
      verified_at = ${verified ? "CURRENT_TIMESTAMP" : "NULL"}
     WHERE id = ?`,
    [verified ? 1 : 0, verified ? adminId : null, treasureId]
  );
  return result.rowCount > 0;
}

// ========== TREASURE HUNT PRIVATE SHARING ==========

// Share a treasure hunt with a specific user
export async function shareTreasureHuntWithUser(
  huntId: number,
  userId: number,
  shareWithUserId: number,
  message?: string,
  canEdit: boolean = false
): Promise<number | null> {
  // Verify ownership
  const hunt = await getTreasureHuntById(huntId);
  if (!hunt || hunt.user_id !== userId) return null;

  // Can't share with yourself
  if (userId === shareWithUserId) return null;

  try {
    await query(
      `INSERT INTO treasure_hunt_shares (treasure_hunt_id, shared_by_user_id, shared_with_user_id, message, can_edit)
       VALUES (?, ?, ?, ?, ?)`,
      [huntId, userId, shareWithUserId, message || null, canEdit ? 1 : 0]
    );

    const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
    return idResult.rows[0]?.id || null;
  } catch {
    // Already shared (unique constraint)
    return null;
  }
}

// Remove a share
export async function unshareTreasureHunt(
  shareId: number,
  userId: number
): Promise<boolean> {
  const result = await query(
    "DELETE FROM treasure_hunt_shares WHERE id = ? AND shared_by_user_id = ?",
    [shareId, userId]
  );
  return result.rowCount > 0;
}

// Get shares for a treasure hunt (who it's shared with)
export async function getTreasureHuntShares(
  huntId: number,
  userId: number
): Promise<TreasureHuntShare[]> {
  const result = await query<TreasureHuntShare>(`
    SELECT
      ths.*,
      u.username as shared_with_username
    FROM treasure_hunt_shares ths
    JOIN users u ON ths.shared_with_user_id = u.id
    WHERE ths.treasure_hunt_id = ? AND ths.shared_by_user_id = ?
    ORDER BY ths.created_at DESC
  `, [huntId, userId]);
  return result.rows;
}

// Get hunts shared with me
export async function getHuntsSharedWithMe(userId: number): Promise<(TreasureHunt & { shared_by_username: string; share_message?: string })[]> {
  const result = await query<TreasureHunt & { shared_by_username: string; share_message?: string }>(`
    SELECT
      th.*,
      c.name as character_name,
      a.name as alliance_name,
      u.username as shared_by_username,
      ths.message as share_message,
      (SELECT COUNT(*) FROM treasure_loot WHERE treasure_hunt_id = th.id) as loot_count
    FROM treasure_hunt_shares ths
    JOIN treasure_hunts th ON ths.treasure_hunt_id = th.id
    JOIN users u ON ths.shared_by_user_id = u.id
    LEFT JOIN characters c ON th.character_id = c.id
    LEFT JOIN alliances a ON th.alliance_id = a.id
    WHERE ths.shared_with_user_id = ?
    ORDER BY ths.created_at DESC
  `, [userId]);
  return result.rows;
}

// Search users to share with
export async function searchUsersForSharing(
  searchTerm: string,
  currentUserId: number,
  limit: number = 10
): Promise<{ id: number; username: string; display_name?: string }[]> {
  const result = await query<{ id: number; username: string; display_name?: string }>(`
    SELECT id, username, display_name
    FROM users
    WHERE id != ?
      AND is_banned = 0
      AND (username LIKE ? OR display_name LIKE ?)
    ORDER BY username
    LIMIT ?
  `, [currentUserId, `%${searchTerm}%`, `%${searchTerm}%`, limit]);
  return result.rows;
}
