import { query } from "./core";
import type {
  CommunityResource,
  ResourceFilters,
  ResourceVersion,
  ResourceRating,
  ResourceComment,
  CreateResourceInput,
  UpdateResourceInput,
  CreateResourceVersionInput,
  CreateResourceRatingInput,
} from "../types";

// ========== COMMUNITY RESOURCES ==========

// Get all community resources with filters
export async function getCommunityResources(
  filters?: ResourceFilters,
  limit: number = 50,
  offset: number = 0
): Promise<CommunityResource[]> {
  let sql = `
    SELECT
      cr.*,
      u.username as creator_username,
      a.name as alliance_name,
      AVG(rr.rating) as average_rating,
      COUNT(DISTINCT rr.id) as rating_count
    FROM community_resources cr
    LEFT JOIN users u ON cr.created_by = u.id
    LEFT JOIN alliances a ON cr.alliance_id = a.id
    LEFT JOIN resource_ratings rr ON cr.id = rr.resource_id
    WHERE 1=1
  `;
  const params: (string | number | boolean)[] = [];

  if (filters?.resource_type) {
    sql += " AND cr.resource_type = ?";
    params.push(filters.resource_type);
  }

  if (filters?.category) {
    sql += " AND cr.category = ?";
    params.push(filters.category);
  }

  if (filters?.alliance_id) {
    sql += " AND cr.alliance_id = ?";
    params.push(filters.alliance_id);
  }

  if (filters?.created_by) {
    sql += " AND cr.created_by = ?";
    params.push(filters.created_by);
  }

  if (filters?.is_featured !== undefined) {
    sql += " AND cr.is_featured = ?";
    params.push(filters.is_featured ? 1 : 0);
  }

  if (filters?.search) {
    sql += " AND (cr.name LIKE ? OR cr.description LIKE ?)";
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }

  if (filters?.tags && filters.tags.length > 0) {
    sql += " AND cr.tags IS NOT NULL";
    // JSON search for tags
    filters.tags.forEach((tag) => {
      sql += " AND JSON_CONTAINS(cr.tags, ?, '$')";
      params.push(JSON.stringify(tag));
    });
  }

  sql += " GROUP BY cr.id";
  sql += " ORDER BY cr.is_featured DESC, cr.created_at DESC";
  sql += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const result = await query<CommunityResource>(sql, params);

  // Parse tags JSON
  return result.rows.map(row => ({
    ...row,
    tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : []
  }));
}

// Get a single community resource by ID
export async function getCommunityResourceById(id: number): Promise<CommunityResource | null> {
  const result = await query<CommunityResource>(`
    SELECT
      cr.*,
      u.username as creator_username,
      a.name as alliance_name,
      AVG(rr.rating) as average_rating,
      COUNT(DISTINCT rr.id) as rating_count
    FROM community_resources cr
    LEFT JOIN users u ON cr.created_by = u.id
    LEFT JOIN alliances a ON cr.alliance_id = a.id
    LEFT JOIN resource_ratings rr ON cr.id = rr.resource_id
    WHERE cr.id = ?
    GROUP BY cr.id
  `, [id]);

  if (result.rows.length === 0) return null;

  const resource = result.rows[0];
  return {
    ...resource,
    tags: resource.tags ? (typeof resource.tags === 'string' ? JSON.parse(resource.tags) : resource.tags) : []
  };
}

// Create a new community resource
export async function createCommunityResource(
  input: CreateResourceInput,
  userId: number
): Promise<number> {
  const tagsJson = input.tags && input.tags.length > 0 ? JSON.stringify(input.tags) : null;

  await query(
    `INSERT INTO community_resources (
      alliance_id, resource_type, name, description, external_url,
      file_path, file_size, category, tags, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.alliance_id || null,
      input.resource_type,
      input.name,
      input.description || null,
      input.external_url || null,
      input.file_path || null,
      input.file_size || null,
      input.category,
      tagsJson,
      userId
    ]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0].id;
}

// Update a community resource
export async function updateCommunityResource(
  id: number,
  userId: number,
  input: UpdateResourceInput,
  isAdmin: boolean = false
): Promise<boolean> {
  // Verify ownership or admin
  if (!isAdmin) {
    const resource = await getCommunityResourceById(id);
    if (!resource || resource.created_by !== userId) return false;
  }

  const updates: string[] = [];
  const params: (string | number | boolean | null)[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    params.push(input.name);
  }

  if (input.description !== undefined) {
    updates.push("description = ?");
    params.push(input.description || null);
  }

  if (input.external_url !== undefined) {
    updates.push("external_url = ?");
    params.push(input.external_url || null);
  }

  if (input.category !== undefined) {
    updates.push("category = ?");
    params.push(input.category);
  }

  if (input.tags !== undefined) {
    updates.push("tags = ?");
    params.push(input.tags && input.tags.length > 0 ? JSON.stringify(input.tags) : null);
  }

  if (input.is_featured !== undefined && isAdmin) {
    updates.push("is_featured = ?");
    params.push(input.is_featured ? 1 : 0);
  }

  if (updates.length === 0) return false;

  params.push(id);
  const result = await query(
    `UPDATE community_resources SET ${updates.join(", ")} WHERE id = ?`,
    params
  );

  return result.rowCount > 0;
}

// Delete a community resource
export async function deleteCommunityResource(
  id: number,
  userId: number,
  isAdmin: boolean = false
): Promise<boolean> {
  if (!isAdmin) {
    const resource = await getCommunityResourceById(id);
    if (!resource || resource.created_by !== userId) return false;
  }

  const result = await query("DELETE FROM community_resources WHERE id = ?", [id]);
  return result.rowCount > 0;
}

// Increment view count
export async function incrementResourceViewCount(id: number): Promise<void> {
  await query("UPDATE community_resources SET view_count = view_count + 1 WHERE id = ?", [id]);
}

// Increment download count
export async function incrementResourceDownloadCount(id: number): Promise<void> {
  await query("UPDATE community_resources SET download_count = download_count + 1 WHERE id = ?", [id]);
}

// Get resource versions
export async function getResourceVersions(resourceId: number): Promise<ResourceVersion[]> {
  const result = await query<ResourceVersion>(`
    SELECT
      rv.*,
      u.username as uploader_username
    FROM resource_versions rv
    LEFT JOIN users u ON rv.uploaded_by = u.id
    WHERE rv.resource_id = ?
    ORDER BY rv.uploaded_at DESC
  `, [resourceId]);
  return result.rows;
}

// Add a resource version
export async function addResourceVersion(
  input: CreateResourceVersionInput,
  userId: number
): Promise<number> {
  await query(
    `INSERT INTO resource_versions (
      resource_id, version, file_path, file_size, uploaded_by, changelog
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.resource_id,
      input.version,
      input.file_path,
      input.file_size || null,
      userId,
      input.changelog || null
    ]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0].id;
}

// Get resource ratings
export async function getResourceRatings(resourceId: number): Promise<ResourceRating[]> {
  const result = await query<ResourceRating>(`
    SELECT
      rr.*,
      u.username
    FROM resource_ratings rr
    LEFT JOIN users u ON rr.user_id = u.id
    WHERE rr.resource_id = ?
    ORDER BY rr.created_at DESC
  `, [resourceId]);
  return result.rows;
}

// Add or update a resource rating
export async function addOrUpdateResourceRating(
  input: CreateResourceRatingInput,
  userId: number
): Promise<void> {
  await query(
    `INSERT INTO resource_ratings (resource_id, user_id, rating, review)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rating = VALUES(rating), review = VALUES(review), updated_at = CURRENT_TIMESTAMP`,
    [input.resource_id, userId, input.rating, input.review || null]
  );
}

// Delete a resource rating
export async function deleteResourceRating(
  resourceId: number,
  userId: number
): Promise<boolean> {
  const result = await query(
    "DELETE FROM resource_ratings WHERE resource_id = ? AND user_id = ?",
    [resourceId, userId]
  );
  return result.rowCount > 0;
}

// Get resource comments
export async function getResourceComments(resourceId: number): Promise<ResourceComment[]> {
  const result = await query<ResourceComment>(`
    SELECT
      rc.*,
      u.username
    FROM resource_comments rc
    LEFT JOIN users u ON rc.user_id = u.id
    WHERE rc.resource_id = ?
    ORDER BY rc.created_at ASC
  `, [resourceId]);
  return result.rows;
}

// Add a resource comment
export async function addResourceComment(
  resourceId: number,
  userId: number,
  comment: string
): Promise<number> {
  await query(
    "INSERT INTO resource_comments (resource_id, user_id, comment) VALUES (?, ?, ?)",
    [resourceId, userId, comment]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0].id;
}

// Delete a resource comment
export async function deleteResourceComment(
  commentId: number,
  userId: number,
  isAdmin: boolean = false
): Promise<boolean> {
  let sql = "DELETE FROM resource_comments WHERE id = ?";
  const params: number[] = [commentId];

  if (!isAdmin) {
    sql += " AND user_id = ?";
    params.push(userId);
  }

  const result = await query(sql, params);
  return result.rowCount > 0;
}

// Get resource categories (distinct)
export async function getResourceCategories(): Promise<string[]> {
  const result = await query<{ category: string }>(
    "SELECT DISTINCT category FROM community_resources ORDER BY category"
  );
  return result.rows.map(row => row.category);
}

// Get popular resources (most viewed/downloaded)
export async function getPopularResources(limit: number = 10): Promise<CommunityResource[]> {
  const result = await query<CommunityResource>(`
    SELECT
      cr.*,
      u.username as creator_username,
      a.name as alliance_name,
      AVG(rr.rating) as average_rating,
      COUNT(DISTINCT rr.id) as rating_count
    FROM community_resources cr
    LEFT JOIN users u ON cr.created_by = u.id
    LEFT JOIN alliances a ON cr.alliance_id = a.id
    LEFT JOIN resource_ratings rr ON cr.id = rr.resource_id
    WHERE cr.is_approved = 1
    GROUP BY cr.id
    ORDER BY (cr.view_count + cr.download_count * 2) DESC
    LIMIT ?
  `, [limit]);

  return result.rows.map(row => ({
    ...row,
    tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : []
  }));
}

// Get featured resources
export async function getFeaturedResources(): Promise<CommunityResource[]> {
  const result = await query<CommunityResource>(`
    SELECT
      cr.*,
      u.username as creator_username,
      a.name as alliance_name,
      AVG(rr.rating) as average_rating,
      COUNT(DISTINCT rr.id) as rating_count
    FROM community_resources cr
    LEFT JOIN users u ON cr.created_by = u.id
    LEFT JOIN alliances a ON cr.alliance_id = a.id
    LEFT JOIN resource_ratings rr ON cr.id = rr.resource_id
    WHERE cr.is_featured = 1 AND cr.is_approved = 1
    GROUP BY cr.id
    ORDER BY cr.created_at DESC
  `);

  return result.rows.map(row => ({
    ...row,
    tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : []
  }));
}
