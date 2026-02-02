import { query, withTransaction } from "./core";
import type {
  ArchaeologyPinpoint,
  ArchaeologyComment,
  ArchaeologyFilters,
  CreateArchaeologyPinpointInput,
  UpdateArchaeologyPinpointInput,
  CreateArchaeologyCommentInput,
} from "../types";

// ========== ARCHAEOLOGY PINPOINTS ==========

/**
 * Get archaeology pinpoints with optional filters
 */
export async function getArchaeologyPinpoints(
  userId?: number,
  filters?: ArchaeologyFilters
): Promise<ArchaeologyPinpoint[]> {
  let sql = `
    SELECT
      ap.*,
      u.username,
      v.username as verified_by_username,
      uv.vote_type as user_vote
    FROM archaeology_pinpoints ap
    LEFT JOIN users u ON ap.user_id = u.id
    LEFT JOIN users v ON ap.verified_by = v.id
    LEFT JOIN archaeology_votes uv ON ap.id = uv.pinpoint_id AND uv.user_id = ?
    WHERE 1=1
  `;
  const params: (string | number | boolean)[] = [userId || 0];

  // User can see: their own pinpoints OR public pinpoints
  if (userId) {
    sql += " AND (ap.user_id = ? OR ap.is_public = TRUE)";
    params.push(userId);
  } else {
    // Not logged in - only public
    sql += " AND ap.is_public = TRUE";
  }

  if (filters?.server) {
    sql += " AND ap.server = ?";
    params.push(filters.server);
  }

  if (filters?.site_type) {
    sql += " AND ap.site_type = ?";
    params.push(filters.site_type);
  }

  if (filters?.is_public !== undefined) {
    sql += " AND ap.is_public = ?";
    params.push(filters.is_public);
  }

  if (filters?.user_id) {
    sql += " AND ap.user_id = ?";
    params.push(filters.user_id);
  }

  if (filters?.search) {
    sql += " AND (ap.name LIKE ? OR ap.description LIKE ? OR ap.deed_name LIKE ?)";
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  sql += " ORDER BY ap.created_at DESC";

  const result = await query<ArchaeologyPinpoint & { verified_by_username?: string }>(sql, params);

  return result.rows;
}

/**
 * Get a single archaeology pinpoint by ID
 */
export async function getArchaeologyPinpointById(
  id: number,
  userId?: number
): Promise<ArchaeologyPinpoint | null> {
  const sql = `
    SELECT
      ap.*,
      u.username,
      v.username as verified_by_username,
      uv.vote_type as user_vote
    FROM archaeology_pinpoints ap
    LEFT JOIN users u ON ap.user_id = u.id
    LEFT JOIN users v ON ap.verified_by = v.id
    LEFT JOIN archaeology_votes uv ON ap.id = uv.pinpoint_id AND uv.user_id = ?
    WHERE ap.id = ?
  `;
  const result = await query<ArchaeologyPinpoint>(sql, [userId || 0, id]);
  return result.rows[0] || null;
}

/**
 * Create a new archaeology pinpoint
 */
export async function createArchaeologyPinpoint(
  userId: number,
  input: CreateArchaeologyPinpointInput
): Promise<number> {
  const result = await query(
    `INSERT INTO archaeology_pinpoints
      (user_id, name, description, server, x, y, site_type, deed_name, former_owner,
       estimated_age, findings, notable_items, is_public)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.name,
      input.description || null,
      input.server,
      input.x,
      input.y,
      input.site_type || "unknown",
      input.deed_name || null,
      input.former_owner || null,
      input.estimated_age || null,
      input.findings || null,
      input.notable_items || null,
      input.is_public === true ? 1 : 0,
    ]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

/**
 * Update an archaeology pinpoint
 */
export async function updateArchaeologyPinpoint(
  id: number,
  userId: number,
  input: UpdateArchaeologyPinpointInput,
  isAdmin: boolean = false
): Promise<boolean> {
  // First check ownership
  const existing = await getArchaeologyPinpointById(id, userId);
  if (!existing) return false;
  if (!isAdmin && existing.user_id !== userId) return false;

  const fields: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description || null);
  }
  if (input.server !== undefined) {
    fields.push("server = ?");
    values.push(input.server);
  }
  if (input.x !== undefined) {
    fields.push("x = ?");
    values.push(input.x);
  }
  if (input.y !== undefined) {
    fields.push("y = ?");
    values.push(input.y);
  }
  if (input.site_type !== undefined) {
    fields.push("site_type = ?");
    values.push(input.site_type);
  }
  if (input.deed_name !== undefined) {
    fields.push("deed_name = ?");
    values.push(input.deed_name || null);
  }
  if (input.former_owner !== undefined) {
    fields.push("former_owner = ?");
    values.push(input.former_owner || null);
  }
  if (input.estimated_age !== undefined) {
    fields.push("estimated_age = ?");
    values.push(input.estimated_age || null);
  }
  if (input.findings !== undefined) {
    fields.push("findings = ?");
    values.push(input.findings || null);
  }
  if (input.notable_items !== undefined) {
    fields.push("notable_items = ?");
    values.push(input.notable_items || null);
  }
  if (input.is_public !== undefined) {
    fields.push("is_public = ?");
    values.push(input.is_public ? 1 : 0);
  }

  if (fields.length === 0) return true;

  values.push(id);
  const result = await query(`UPDATE archaeology_pinpoints SET ${fields.join(", ")} WHERE id = ?`, values);
  return (result.rowCount || 0) > 0;
}

/**
 * Delete an archaeology pinpoint
 */
export async function deleteArchaeologyPinpoint(
  id: number,
  userId: number,
  isAdmin: boolean = false
): Promise<boolean> {
  const existing = await getArchaeologyPinpointById(id, userId);
  if (!existing) return false;
  if (!isAdmin && existing.user_id !== userId) return false;

  const result = await query("DELETE FROM archaeology_pinpoints WHERE id = ?", [id]);
  return (result.rowCount || 0) > 0;
}

/**
 * Verify an archaeology pinpoint (admin only)
 */
export async function verifyArchaeologyPinpoint(
  id: number,
  verifiedBy: number
): Promise<boolean> {
  const result = await query(
    "UPDATE archaeology_pinpoints SET is_verified = TRUE, verified_by = ?, verified_at = NOW() WHERE id = ?",
    [verifiedBy, id]
  );
  return (result.rowCount || 0) > 0;
}

/**
 * Vote on an archaeology pinpoint
 */
export async function voteOnArchaeologyPinpoint(
  pinpointId: number,
  userId: number,
  voteType: "up" | "down"
): Promise<boolean> {
  // Check if pinpoint exists and is public
  const pinpoint = await getArchaeologyPinpointById(pinpointId, userId);
  if (!pinpoint || !pinpoint.is_public) return false;

  // Can't vote on your own pinpoint
  if (pinpoint.user_id === userId) return false;

  return withTransaction(async (client) => {
    // Check existing vote
    const existingVote = await client.query<{ vote_type: string }>(
      "SELECT vote_type FROM archaeology_votes WHERE user_id = ? AND pinpoint_id = ?",
      [userId, pinpointId]
    );

    if (existingVote.rows.length > 0) {
      const oldVote = existingVote.rows[0].vote_type;

      if (oldVote === voteType) {
        // Remove vote
        await client.query("DELETE FROM archaeology_votes WHERE user_id = ? AND pinpoint_id = ?", [userId, pinpointId]);
        await client.query(
          `UPDATE archaeology_pinpoints SET ${voteType === "up" ? "upvotes" : "downvotes"} = ${voteType === "up" ? "upvotes" : "downvotes"} - 1 WHERE id = ?`,
          [pinpointId]
        );
      } else {
        // Change vote
        await client.query(
          "UPDATE archaeology_votes SET vote_type = ? WHERE user_id = ? AND pinpoint_id = ?",
          [voteType, userId, pinpointId]
        );
        await client.query(
          `UPDATE archaeology_pinpoints SET
            upvotes = upvotes ${voteType === "up" ? "+ 1" : "- 1"},
            downvotes = downvotes ${voteType === "down" ? "+ 1" : "- 1"}
           WHERE id = ?`,
          [pinpointId]
        );
      }
    } else {
      // New vote
      await client.query(
        "INSERT INTO archaeology_votes (user_id, pinpoint_id, vote_type) VALUES (?, ?, ?)",
        [userId, pinpointId, voteType]
      );
      await client.query(
        `UPDATE archaeology_pinpoints SET ${voteType === "up" ? "upvotes" : "downvotes"} = ${voteType === "up" ? "upvotes" : "downvotes"} + 1 WHERE id = ?`,
        [pinpointId]
      );
    }

    return true;
  });
}

/**
 * Get comments for an archaeology pinpoint
 */
export async function getArchaeologyComments(pinpointId: number): Promise<ArchaeologyComment[]> {
  const result = await query<ArchaeologyComment>(
    `SELECT ac.*, u.username
     FROM archaeology_comments ac
     LEFT JOIN users u ON ac.user_id = u.id
     WHERE ac.pinpoint_id = ?
     ORDER BY ac.created_at ASC`,
    [pinpointId]
  );
  return result.rows;
}

/**
 * Add a comment to an archaeology pinpoint
 */
export async function addArchaeologyComment(
  userId: number,
  input: CreateArchaeologyCommentInput
): Promise<number> {
  // Check pinpoint exists and is public
  const pinpoint = await getArchaeologyPinpointById(input.pinpoint_id, userId);
  if (!pinpoint) return 0;
  if (!pinpoint.is_public && pinpoint.user_id !== userId) return 0;

  const result = await query(
    "INSERT INTO archaeology_comments (pinpoint_id, user_id, comment) VALUES (?, ?, ?)",
    [input.pinpoint_id, userId, input.comment]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

/**
 * Delete an archaeology comment
 */
export async function deleteArchaeologyComment(
  commentId: number,
  userId: number,
  isAdmin: boolean = false
): Promise<boolean> {
  const existing = await query<{ user_id: number }>(
    "SELECT user_id FROM archaeology_comments WHERE id = ?",
    [commentId]
  );
  if (!existing.rows[0]) return false;
  if (!isAdmin && existing.rows[0].user_id !== userId) return false;

  const result = await query("DELETE FROM archaeology_comments WHERE id = ?", [commentId]);
  return (result.rowCount || 0) > 0;
}

/**
 * Get user's archaeology pinpoints
 */
export async function getUserArchaeologyPinpoints(userId: number): Promise<ArchaeologyPinpoint[]> {
  return getArchaeologyPinpoints(userId, { user_id: userId });
}

/**
 * Get archaeology stats
 */
export async function getArchaeologyStats(): Promise<{
  total_pinpoints: number;
  public_pinpoints: number;
  verified_pinpoints: number;
  by_server: Record<string, number>;
  by_site_type: Record<string, number>;
}> {
  const [total, publicCount, verified, byServer, bySiteType] = await Promise.all([
    query<{ count: number }>("SELECT COUNT(*) as count FROM archaeology_pinpoints"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM archaeology_pinpoints WHERE is_public = TRUE"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM archaeology_pinpoints WHERE is_verified = TRUE"),
    query<{ server: string; count: number }>(
      "SELECT server, COUNT(*) as count FROM archaeology_pinpoints WHERE is_public = TRUE GROUP BY server"
    ),
    query<{ site_type: string; count: number }>(
      "SELECT site_type, COUNT(*) as count FROM archaeology_pinpoints WHERE is_public = TRUE GROUP BY site_type"
    ),
  ]);

  const serverStats: Record<string, number> = {};
  byServer.rows.forEach(r => {
    serverStats[r.server] = r.count;
  });

  const siteTypeStats: Record<string, number> = {};
  bySiteType.rows.forEach(r => {
    siteTypeStats[r.site_type] = r.count;
  });

  return {
    total_pinpoints: total.rows[0]?.count || 0,
    public_pinpoints: publicCount.rows[0]?.count || 0,
    verified_pinpoints: verified.rows[0]?.count || 0,
    by_server: serverStats,
    by_site_type: siteTypeStats,
  };
}

// ============================================
// RECIPE DATABASE FUNCTIONS
// For structured recipe data (items, materials, tools, steps)
// ============================================

export interface RecipeItemLocal {
  id: number;
  slug: string;
  name: string;
  skill: string | null;
  difficulty: number | null;
  base_time_seconds: number | null;
  image_url: string | null;
  is_base_material: boolean;
  visible?: boolean;
  material_count?: number;
  tool_count?: number;
}

export interface RecipeItemMaterialLocal {
  id: number;
  material_name: string;
  material_slug: string;
  quantity: number;
  unit: string;
  sort_order: number;
}

export interface RecipeItemToolLocal {
  id: number;
  tool_name: string;
  tool_slug: string;
  is_workstation: boolean;
}

export interface RecipeItemStepLocal {
  id: number;
  step_order: number;
  action: string;
  target_name: string;
  target_slug: string | null;
  target_quantity: number | null;
  target_unit: string | null;
  submenu_path: string | null;
  raw_text: string | null;
}

export interface RecipeItemFullLocal extends RecipeItemLocal {
  materials: RecipeItemMaterialLocal[];
  tools: RecipeItemToolLocal[];
  steps: RecipeItemStepLocal[];
  categories: string[];
}

/**
 * Get all recipe items (from items table with material/tool counts)
 */
export async function getAllRecipeItems(options?: {
  limit?: number;
  offset?: number;
  skill?: string;
  visibleOnly?: boolean;
}): Promise<{ items: RecipeItemLocal[]; total: number }> {
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.skill) {
    conditions.push("i.skill = ?");
    params.push(options.skill);
  }

  if (options?.visibleOnly) {
    conditions.push("i.visible = TRUE");
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM items i ${whereClause}`,
    params
  );
  const total = countResult.rows[0]?.count || 0;

  const result = await query<RecipeItemLocal>(
    `SELECT
      i.id,
      i.slug,
      i.name,
      i.skill,
      i.difficulty,
      i.base_time_seconds,
      i.image_url,
      i.is_base_material,
      i.visible,
      (SELECT COUNT(*) FROM recipe_materials rm WHERE rm.item_id = i.id) as material_count,
      (SELECT COUNT(*) FROM recipe_tools rt WHERE rt.item_id = i.id) as tool_count
    FROM items i
    ${whereClause}
    ORDER BY i.name ASC
    LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { items: result.rows, total };
}

/**
 * Search recipe items by name
 */
export async function searchRecipeItems(
  searchQuery: string,
  options?: { limit?: number; offset?: number; skill?: string }
): Promise<{ items: RecipeItemLocal[]; total: number }> {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  const searchPattern = `%${searchQuery}%`;

  let whereClause = "WHERE i.name LIKE ?";
  const params: (string | number)[] = [searchPattern];

  if (options?.skill) {
    whereClause += " AND i.skill = ?";
    params.push(options.skill);
  }

  const countResult = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM items i ${whereClause}`,
    params
  );
  const total = countResult.rows[0]?.count || 0;

  const result = await query<RecipeItemLocal>(
    `SELECT
      i.id,
      i.slug,
      i.name,
      i.skill,
      i.difficulty,
      i.base_time_seconds,
      i.image_url,
      i.is_base_material,
      (SELECT COUNT(*) FROM recipe_materials rm WHERE rm.item_id = i.id) as material_count,
      (SELECT COUNT(*) FROM recipe_tools rt WHERE rt.item_id = i.id) as tool_count
    FROM items i
    ${whereClause}
    ORDER BY i.name ASC
    LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { items: result.rows, total };
}

/**
 * Get a single recipe item by slug with all materials, tools, steps, and categories
 */
export async function getRecipeItemBySlug(slug: string): Promise<RecipeItemFullLocal | null> {
  // Get the item
  const itemResult = await query<RecipeItemLocal>(
    `SELECT
      id, slug, name, skill, difficulty, base_time_seconds, image_url, is_base_material
    FROM items
    WHERE slug = ?`,
    [slug]
  );

  if (itemResult.rows.length === 0) {
    return null;
  }

  const item = itemResult.rows[0];

  // Get materials, tools, steps, categories in parallel
  const [materialsResult, toolsResult, stepsResult, categoriesResult] = await Promise.all([
    query<RecipeItemMaterialLocal>(
      `SELECT id, material_name, material_slug, quantity, unit, sort_order
       FROM recipe_materials
       WHERE item_id = ?
       ORDER BY sort_order ASC`,
      [item.id]
    ),
    query<RecipeItemToolLocal>(
      `SELECT id, tool_name, tool_slug, is_workstation
       FROM recipe_tools
       WHERE item_id = ?`,
      [item.id]
    ),
    query<RecipeItemStepLocal>(
      `SELECT id, step_order, action, target_name, target_slug, target_quantity, target_unit, submenu_path, raw_text
       FROM recipe_steps
       WHERE item_id = ?
       ORDER BY step_order ASC`,
      [item.id]
    ),
    query<{ category: string }>(
      `SELECT category FROM item_categories WHERE item_id = ?`,
      [item.id]
    ),
  ]);

  return {
    ...item,
    materials: materialsResult.rows,
    tools: toolsResult.rows,
    steps: stepsResult.rows,
    categories: categoriesResult.rows.map(c => c.category),
  };
}

/**
 * Get a single recipe item by ID with all materials, tools, steps, and categories
 */
export async function getRecipeItemById(id: number): Promise<RecipeItemFullLocal | null> {
  const itemResult = await query<RecipeItemLocal>(
    `SELECT
      id, slug, name, skill, difficulty, base_time_seconds, image_url, is_base_material
    FROM items
    WHERE id = ?`,
    [id]
  );

  if (itemResult.rows.length === 0) {
    return null;
  }

  const item = itemResult.rows[0];

  const [materialsResult, toolsResult, stepsResult, categoriesResult] = await Promise.all([
    query<RecipeItemMaterialLocal>(
      `SELECT id, material_name, material_slug, quantity, unit, sort_order
       FROM recipe_materials
       WHERE item_id = ?
       ORDER BY sort_order ASC`,
      [item.id]
    ),
    query<RecipeItemToolLocal>(
      `SELECT id, tool_name, tool_slug, is_workstation
       FROM recipe_tools
       WHERE item_id = ?`,
      [item.id]
    ),
    query<RecipeItemStepLocal>(
      `SELECT id, step_order, action, target_name, target_slug, target_quantity, target_unit, submenu_path, raw_text
       FROM recipe_steps
       WHERE item_id = ?
       ORDER BY step_order ASC`,
      [item.id]
    ),
    query<{ category: string }>(
      `SELECT category FROM item_categories WHERE item_id = ?`,
      [item.id]
    ),
  ]);

  return {
    ...item,
    materials: materialsResult.rows,
    tools: toolsResult.rows,
    steps: stepsResult.rows,
    categories: categoriesResult.rows.map(c => c.category),
  };
}

/**
 * Get available skills from recipe items
 */
export async function getRecipeSkills(): Promise<string[]> {
  const result = await query<{ skill: string }>(
    `SELECT DISTINCT skill FROM items WHERE skill IS NOT NULL AND skill != '' ORDER BY skill ASC`
  );
  return result.rows.map(r => r.skill);
}

/**
 * Update item visibility (admin only)
 */
export async function updateItemVisibility(itemId: number, visible: boolean): Promise<boolean> {
  const result = await query(
    `UPDATE items SET visible = ? WHERE id = ?`,
    [visible, itemId]
  );
  return (result.affectedRows ?? 0) > 0;
}

/**
 * Bulk update item visibility (admin only)
 */
export async function bulkUpdateItemVisibility(itemIds: number[], visible: boolean): Promise<number> {
  if (itemIds.length === 0) return 0;
  const placeholders = itemIds.map(() => "?").join(",");
  const result = await query(
    `UPDATE items SET visible = ? WHERE id IN (${placeholders})`,
    [visible, ...itemIds]
  );
  return result.affectedRows ?? 0;
}

/**
 * Get recipe items statistics
 */
export async function getRecipeItemStats(): Promise<{
  total_items: number;
  items_with_recipes: number;
  base_materials: number;
  by_skill: Record<string, number>;
}> {
  const [total, withRecipes, baseMaterials, bySkill] = await Promise.all([
    query<{ count: number }>("SELECT COUNT(*) as count FROM items"),
    query<{ count: number }>(
      "SELECT COUNT(DISTINCT i.id) as count FROM items i INNER JOIN recipe_materials rm ON rm.item_id = i.id"
    ),
    query<{ count: number }>("SELECT COUNT(*) as count FROM items WHERE is_base_material = TRUE"),
    query<{ skill: string; count: number }>(
      "SELECT skill, COUNT(*) as count FROM items WHERE skill IS NOT NULL GROUP BY skill ORDER BY count DESC"
    ),
  ]);

  const skillStats: Record<string, number> = {};
  bySkill.rows.forEach(r => {
    skillStats[r.skill] = r.count;
  });

  return {
    total_items: total.rows[0]?.count || 0,
    items_with_recipes: withRecipes.rows[0]?.count || 0,
    base_materials: baseMaterials.rows[0]?.count || 0,
    by_skill: skillStats,
  };
}
