import crypto from "crypto";
import { query, withTransaction } from "./db/core";

// ========== PASSWORD UTILITIES ==========

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const newHash = hashPassword(password, salt);
  return newHash === hash;
}

function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ========== USER TYPES ==========

export interface User {
  id: number;
  username: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
  // Profile fields
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  location?: string;
  wurm_server?: string;
  // Visibility settings
  show_in_members_list: boolean;
  show_email: boolean;
  show_location: boolean;
  // Ban status
  is_banned: boolean;
  ban_reason?: string;
  banned_at?: string;
  banned_by?: number;
}

export interface Session {
  id: string;
  user_id: number;
  expires_at: string;
  created_at: string;
}

export interface UserWithPassword extends User {
  password_hash: string;
  salt: string;
}

// ========== DB ROW TYPES ==========

interface UserDbRow {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  location?: string | null;
  wurm_server?: string | null;
  show_in_members_list: number;
  show_email: number;
  show_location: number;
  is_banned: number;
  ban_reason?: string | null;
  banned_at?: string | null;
  banned_by?: number | null;
  password_hash?: string;
  salt?: string;
}

function dbRowToUser(row: UserDbRow): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role as "user" | "admin",
    created_at: row.created_at,
    display_name: row.display_name || undefined,
    bio: row.bio || undefined,
    avatar_url: row.avatar_url || undefined,
    banner_url: row.banner_url || undefined,
    location: row.location || undefined,
    wurm_server: row.wurm_server || undefined,
    show_in_members_list: Boolean(row.show_in_members_list),
    show_email: Boolean(row.show_email),
    show_location: Boolean(row.show_location),
    is_banned: Boolean(row.is_banned),
    ban_reason: row.ban_reason || undefined,
    banned_at: row.banned_at || undefined,
    banned_by: row.banned_by || undefined,
  };
}

// ========== USER FUNCTIONS ==========

export async function createUser(
  username: string,
  password: string
): Promise<{ success: true; user: User } | { success: false; error: string }> {
  // Validate input
  if (!username || username.length < 3) {
    return { success: false, error: "Character name must be at least 3 characters" };
  }
  if (!password || password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  // Check if username already exists
  const existing = await query<UserDbRow>(
    "SELECT id FROM users WHERE username = ?",
    [username.toLowerCase()]
  );

  if (existing.rows.length > 0) {
    return { success: false, error: "This character name is already registered" };
  }

  // Check if this is the first user - make them admin
  const userCount = await query<{ count: number }>("SELECT COUNT(*) as count FROM users");
  const isFirstUser = (userCount.rows[0]?.count || 0) === 0;
  const role = isFirstUser ? "admin" : "user";

  // Generate placeholder email for database compatibility (not used for anything)
  const placeholderEmail = `${username.toLowerCase()}@wurmtools.local`;

  // Create user
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);

  try {
    await query(
      "INSERT INTO users (username, email, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)",
      [username.toLowerCase(), placeholderEmail, hash, salt, role]
    );

    const user = await getUserByUsername(username.toLowerCase());
    if (!user) {
      return { success: false, error: "Failed to create user" };
    }

    return { success: true, user: dbRowToUser(user as unknown as UserDbRow) };
  } catch (e) {
    return { success: false, error: "Failed to create user: " + String(e) };
  }
}

export async function getUserById(id: number): Promise<User | null> {
  const result = await query<UserDbRow>(
    `SELECT id, username, email, role, created_at,
            display_name, bio, avatar_url, banner_url, location, wurm_server,
            show_in_members_list, show_email, show_location,
            is_banned, ban_reason, banned_at, banned_by
     FROM users WHERE id = ?`,
    [id]
  );

  if (result.rows.length === 0) return null;
  return dbRowToUser(result.rows[0]);
}

export async function getUserByEmail(email: string): Promise<UserWithPassword | null> {
  const result = await query<UserDbRow>(
    "SELECT * FROM users WHERE email = ?",
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    ...dbRowToUser(row),
    password_hash: row.password_hash!,
    salt: row.salt!,
  };
}

export async function getUserByUsername(username: string): Promise<UserWithPassword | null> {
  const result = await query<UserDbRow>(
    "SELECT * FROM users WHERE username = ?",
    [username.toLowerCase()]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    ...dbRowToUser(row),
    password_hash: row.password_hash!,
    salt: row.salt!,
  };
}

export async function getAllUsers(): Promise<User[]> {
  const result = await query<UserDbRow>(
    `SELECT id, username, email, role, created_at,
            display_name, bio, avatar_url, location, wurm_server,
            show_in_members_list, show_email, show_location,
            is_banned, ban_reason, banned_at, banned_by
     FROM users ORDER BY created_at DESC`
  );

  return result.rows.map(dbRowToUser);
}

// SECURITY: Pagination types and helpers for DoS prevention
export interface UserPaginatedResult {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;

// SECURITY: Paginated version to prevent DoS via unbounded queries
export async function getUsersPaginated(params?: { page?: number; limit?: number }): Promise<UserPaginatedResult> {
  const page = Math.max(1, Math.floor(params?.page || 1));
  const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Math.floor(params?.limit || DEFAULT_PAGE_LIMIT)));
  const offset = (page - 1) * limit;

  const countResult = await query<{ count: number }>("SELECT COUNT(*) as count FROM users");
  const total = countResult.rows[0]?.count || 0;

  const result = await query<UserDbRow>(
    `SELECT id, username, email, role, created_at,
            display_name, bio, avatar_url, location, wurm_server,
            show_in_members_list, show_email, show_location,
            is_banned, ban_reason, banned_at, banned_by
     FROM users ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return {
    data: result.rows.map(dbRowToUser),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// Get visible members (opt-in and not banned)
export async function getVisibleMembers(): Promise<User[]> {
  const result = await query<UserDbRow>(
    `SELECT id, username, email, role, created_at,
            display_name, bio, avatar_url, location, wurm_server,
            show_in_members_list, show_email, show_location,
            is_banned, ban_reason, banned_at, banned_by
     FROM users
     WHERE show_in_members_list = 1 AND is_banned = 0
     ORDER BY display_name ASC, username ASC`
  );

  return result.rows.map(dbRowToUser);
}

// Get public profile (respects visibility settings)
export async function getPublicProfile(userId: number): Promise<Partial<User> | null> {
  const user = await getUserById(userId);
  if (!user || user.is_banned) return null;

  const profile: Partial<User> = {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    bio: user.bio,
    avatar_url: user.avatar_url,
    wurm_server: user.wurm_server,
    created_at: user.created_at,
    show_in_members_list: user.show_in_members_list,
  };

  if (user.show_email) {
    profile.email = user.email;
  }
  if (user.show_location) {
    profile.location = user.location;
  }

  return profile;
}

export async function updateUserRole(userId: number, role: "user" | "admin"): Promise<boolean> {
  const result = await query(
    "UPDATE users SET role = ? WHERE id = ?",
    [role, userId]
  );
  return result.rowCount > 0;
}

export async function deleteUser(userId: number): Promise<boolean> {
  // Delete all user data in a transaction to ensure consistency
  try {
    await withTransaction(async (client) => {
      // Delete sessions
      await client.query("DELETE FROM sessions WHERE user_id = ?", [userId]);

      // Delete prospects and prospect pages
      await client.query("DELETE FROM prospects WHERE user_id = ?", [userId]);
      await client.query("DELETE FROM prospect_pages WHERE user_id = ?", [userId]);

      // Delete orders
      await client.query("DELETE FROM orders WHERE user_id = ?", [userId]);

      // Delete merchants
      await client.query("DELETE FROM merchants WHERE user_id = ?", [userId]);

      // Delete projects and project items
      await client.query(
        "DELETE FROM project_items WHERE project_id IN (SELECT id FROM projects WHERE user_id = ?)",
        [userId]
      );
      await client.query("DELETE FROM projects WHERE user_id = ?", [userId]);

      // Delete price alerts
      await client.query("DELETE FROM price_alerts WHERE user_id = ?", [userId]);

      // Delete map locations
      await client.query("DELETE FROM map_locations WHERE user_id = ?", [userId]);

      // Delete achievements and XP
      await client.query("DELETE FROM user_achievements WHERE user_id = ?", [userId]);
      await client.query("DELETE FROM user_xp WHERE user_id = ?", [userId]);

      // Delete webhooks
      await client.query("DELETE FROM discord_webhooks WHERE user_id = ?", [userId]);

      // Delete ratings (both given and received)
      await client.query("DELETE FROM user_ratings WHERE rater_id = ? OR rated_user_id = ?", [userId, userId]);

      // Leave alliances (but don't delete owned alliances - admin should handle that separately)
      await client.query("DELETE FROM alliance_members WHERE user_id = ?", [userId]);
      await client.query("DELETE FROM alliance_invites WHERE user_id = ?", [userId]);

      // Finally delete user
      await client.query("DELETE FROM users WHERE id = ?", [userId]);
    });

    return true;
  } catch (error) {
    console.error("[deleteUser] Failed to delete user:", error);
    return false;
  }
}

// ========== AUTHENTICATION FUNCTIONS ==========

export async function login(
  usernameOrEmail: string,
  password: string
): Promise<{ success: true; user: User; sessionId: string } | { success: false; error: string }> {
  // Find user by username or email
  const result = await query<UserDbRow>(
    "SELECT * FROM users WHERE username = ? OR email = ?",
    [usernameOrEmail.toLowerCase(), usernameOrEmail.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return { success: false, error: "Invalid credentials" };
  }

  const row = result.rows[0];

  // Check if user is banned
  if (row.is_banned) {
    return { success: false, error: `Account is banned: ${row.ban_reason || "No reason provided"}` };
  }

  // Verify password
  if (!verifyPassword(password, row.password_hash!, row.salt!)) {
    return { success: false, error: "Invalid credentials" };
  }

  // Create session
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await query(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
    [sessionId, row.id, expiresAt]
  );

  return { success: true, user: dbRowToUser(row), sessionId };
}

export async function logout(sessionId: string): Promise<boolean> {
  const result = await query(
    "DELETE FROM sessions WHERE id = ?",
    [sessionId]
  );
  return result.rowCount > 0;
}

export async function getSession(sessionId: string): Promise<{ session: Session; user: User } | null> {
  // Clean up expired sessions (non-blocking - don't fail session check if cleanup fails)
  try {
    await query("DELETE FROM sessions WHERE expires_at < ?", [new Date()]);
  } catch (cleanupError) {
    // Log but don't throw - session validation should still proceed
    console.warn("Failed to clean up expired sessions:", cleanupError);
  }

  // Get session with user
  const result = await query<{
    id: string;
    user_id: number;
    expires_at: string;
    created_at: string;
    username: string;
    email: string;
    role: string;
    user_created_at: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    location: string | null;
    wurm_server: string | null;
    show_in_members_list: number;
    show_email: number;
    show_location: number;
    is_banned: number;
    ban_reason: string | null;
    banned_at: string | null;
    banned_by: number | null;
  }>(
    `SELECT
      s.id, s.user_id, s.expires_at, s.created_at,
      u.username, u.email, u.role, u.created_at as user_created_at,
      u.display_name, u.bio, u.avatar_url, u.location, u.wurm_server,
      u.show_in_members_list, u.show_email, u.show_location,
      u.is_banned, u.ban_reason, u.banned_at, u.banned_by
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > ?`,
    [sessionId, new Date()]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  // Check if user is banned - invalidate session
  if (row.is_banned) {
    await query("DELETE FROM sessions WHERE id = ?", [sessionId]);
    return null;
  }

  return {
    session: {
      id: row.id,
      user_id: row.user_id,
      expires_at: row.expires_at,
      created_at: row.created_at,
    },
    user: {
      id: row.user_id,
      username: row.username,
      email: row.email,
      role: row.role as "user" | "admin",
      created_at: row.user_created_at,
      display_name: row.display_name || undefined,
      bio: row.bio || undefined,
      avatar_url: row.avatar_url || undefined,
      location: row.location || undefined,
      wurm_server: row.wurm_server || undefined,
      show_in_members_list: Boolean(row.show_in_members_list),
      show_email: Boolean(row.show_email),
      show_location: Boolean(row.show_location),
      is_banned: false,
    },
  };
}

export async function refreshSession(sessionId: string): Promise<boolean> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const result = await query(
    "UPDATE sessions SET expires_at = ? WHERE id = ?",
    [expiresAt, sessionId]
  );
  return result.rowCount > 0;
}

// ========== AUTHORIZATION HELPERS ==========

export function isAdmin(user: User | null): boolean {
  return user?.role === "admin";
}

/**
 * Check if the current user is an admin (async version using cookies)
 */
export async function isAdminAsync(): Promise<boolean> {
  const session = await getSessionAsync();
  return session?.role === "admin";
}

export async function requireAuth(sessionId: string | undefined): Promise<User | null> {
  if (!sessionId) return null;
  const result = await getSession(sessionId);
  return result?.user || null;
}

export async function requireAdmin(sessionId: string | undefined): Promise<User | null> {
  const user = await requireAuth(sessionId);
  if (!user || user.role !== "admin") return null;
  return user;
}

// ========== PROFILE & SETTINGS FUNCTIONS ==========

export interface ProfileUpdateInput {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  location?: string;
  wurm_server?: string;
}

export interface SettingsUpdateInput {
  show_in_members_list?: boolean;
  show_email?: boolean;
  show_location?: boolean;
}

export async function updateUserProfile(userId: number, input: ProfileUpdateInput): Promise<boolean> {
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (input.display_name !== undefined) {
    fields.push("display_name = ?");
    values.push(input.display_name || null);
  }
  if (input.bio !== undefined) {
    fields.push("bio = ?");
    values.push(input.bio || null);
  }
  if (input.avatar_url !== undefined) {
    fields.push("avatar_url = ?");
    values.push(input.avatar_url || null);
  }
  if (input.banner_url !== undefined) {
    fields.push("banner_url = ?");
    values.push(input.banner_url || null);
  }
  if (input.location !== undefined) {
    fields.push("location = ?");
    values.push(input.location || null);
  }
  if (input.wurm_server !== undefined) {
    fields.push("wurm_server = ?");
    values.push(input.wurm_server || null);
  }

  if (fields.length === 0) return false;

  values.push(userId.toString());
  const result = await query(
    `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
    [...values.slice(0, -1), userId]
  );

  return result.rowCount > 0;
}

export async function updateUserSettings(userId: number, input: SettingsUpdateInput): Promise<boolean> {
  const fields: string[] = [];
  const values: number[] = [];

  if (input.show_in_members_list !== undefined) {
    fields.push("show_in_members_list = ?");
    values.push(input.show_in_members_list ? 1 : 0);
  }
  if (input.show_email !== undefined) {
    fields.push("show_email = ?");
    values.push(input.show_email ? 1 : 0);
  }
  if (input.show_location !== undefined) {
    fields.push("show_location = ?");
    values.push(input.show_location ? 1 : 0);
  }

  if (fields.length === 0) return false;

  const result = await query(
    `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
    [...values, userId]
  );

  return result.rowCount > 0;
}

// ========== ADMIN USER MANAGEMENT ==========

export async function banUser(userId: number, adminId: number, reason: string): Promise<boolean> {
  const result = await query(
    `UPDATE users SET
      is_banned = 1,
      ban_reason = ?,
      banned_at = NOW(),
      banned_by = ?
    WHERE id = ? AND role != 'admin'`,
    [reason, adminId, userId]
  );

  // Also invalidate all sessions for this user
  if (result.rowCount > 0) {
    await query("DELETE FROM sessions WHERE user_id = ?", [userId]);
  }

  return result.rowCount > 0;
}

export async function unbanUser(userId: number): Promise<boolean> {
  const result = await query(
    `UPDATE users SET
      is_banned = 0,
      ban_reason = NULL,
      banned_at = NULL,
      banned_by = NULL
    WHERE id = ?`,
    [userId]
  );

  return result.rowCount > 0;
}

export async function adminUpdateUser(
  userId: number,
  input: {
    role?: "user" | "admin";
    display_name?: string;
    bio?: string;
    location?: string;
    wurm_server?: string;
  }
): Promise<boolean> {
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (input.role !== undefined) {
    fields.push("role = ?");
    values.push(input.role);
  }
  if (input.display_name !== undefined) {
    fields.push("display_name = ?");
    values.push(input.display_name || null);
  }
  if (input.bio !== undefined) {
    fields.push("bio = ?");
    values.push(input.bio || null);
  }
  if (input.location !== undefined) {
    fields.push("location = ?");
    values.push(input.location || null);
  }
  if (input.wurm_server !== undefined) {
    fields.push("wurm_server = ?");
    values.push(input.wurm_server || null);
  }

  if (fields.length === 0) return false;

  const result = await query(
    `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
    [...values, userId]
  );

  return result.rowCount > 0;
}

// Get user statistics
export async function getUserStats(): Promise<{
  total: number;
  visible: number;
  banned: number;
  admins: number;
}> {
  const [totalResult, visibleResult, bannedResult, adminsResult] = await Promise.all([
    query<{ count: number }>("SELECT COUNT(*) as count FROM users"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE show_in_members_list = 1 AND is_banned = 0"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE is_banned = 1"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE role = 'admin'"),
  ]);

  return {
    total: totalResult.rows[0]?.count || 0,
    visible: visibleResult.rows[0]?.count || 0,
    banned: bannedResult.rows[0]?.count || 0,
    admins: adminsResult.rows[0]?.count || 0,
  };
}

// ========== PASSWORD MANAGEMENT ==========

export interface ChangePasswordResult {
  success: boolean;
  error?: string;
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  // Get current user's password hash and salt
  const result = await query<{ password_hash: string; salt: string }>(
    "SELECT password_hash, salt FROM users WHERE id = ?",
    [userId]
  );

  if (result.rows.length === 0) {
    return { success: false, error: "User not found" };
  }

  const user = result.rows[0];

  // Verify current password
  if (!verifyPassword(currentPassword, user.password_hash, user.salt)) {
    return { success: false, error: "Current password is incorrect" };
  }

  // Validate new password
  if (newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters" };
  }

  if (newPassword.length > 128) {
    return { success: false, error: "New password is too long" };
  }

  // Generate new salt and hash
  const newSalt = crypto.randomBytes(16).toString("hex");
  const newHash = hashPassword(newPassword, newSalt);

  // Update password
  const updateResult = await query(
    "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?",
    [newHash, newSalt, userId]
  );

  if (updateResult.rowCount === 0) {
    return { success: false, error: "Failed to update password" };
  }

  // Invalidate all other sessions for this user (security measure)
  await query("DELETE FROM sessions WHERE user_id = ?", [userId]);

  return { success: true };
}

export async function deleteAccount(userId: number, password: string): Promise<ChangePasswordResult> {
  // Get current user's password hash and salt
  const result = await query<{ password_hash: string; salt: string; role: string }>(
    "SELECT password_hash, salt, role FROM users WHERE id = ?",
    [userId]
  );

  if (result.rows.length === 0) {
    return { success: false, error: "User not found" };
  }

  const user = result.rows[0];

  // Don't allow admins to delete their account this way
  if (user.role === "admin") {
    return { success: false, error: "Admin accounts cannot be deleted this way" };
  }

  // Verify password
  if (!verifyPassword(password, user.password_hash, user.salt)) {
    return { success: false, error: "Password is incorrect" };
  }

  // Delete user data in order (respecting foreign keys)
  try {
    await withTransaction(async (client) => {
      // Delete sessions
      await client.query("DELETE FROM sessions WHERE user_id = ?", [userId]);

      // Delete prospects and prospect pages
      await client.query("DELETE FROM prospects WHERE user_id = ?", [userId]);
      await client.query("DELETE FROM prospect_pages WHERE user_id = ?", [userId]);

      // Delete orders
      await client.query("DELETE FROM orders WHERE user_id = ?", [userId]);

      // Delete merchants
      await client.query("DELETE FROM merchants WHERE user_id = ?", [userId]);

      // Delete projects and project items
      await client.query(
        "DELETE FROM project_items WHERE project_id IN (SELECT id FROM projects WHERE user_id = ?)",
        [userId]
      );
      await client.query("DELETE FROM projects WHERE user_id = ?", [userId]);

      // Delete price alerts
      await client.query("DELETE FROM price_alerts WHERE user_id = ?", [userId]);

      // Delete map locations
      await client.query("DELETE FROM map_locations WHERE user_id = ?", [userId]);

      // Delete achievements and XP
      await client.query("DELETE FROM user_achievements WHERE user_id = ?", [userId]);
      await client.query("DELETE FROM user_xp WHERE user_id = ?", [userId]);

      // Delete webhooks
      await client.query("DELETE FROM discord_webhooks WHERE user_id = ?", [userId]);

      // Delete ratings (both given and received)
      await client.query("DELETE FROM user_ratings WHERE rater_id = ? OR rated_user_id = ?", [userId, userId]);

      // Leave alliances
      await client.query("DELETE FROM alliance_members WHERE user_id = ?", [userId]);
      await client.query("DELETE FROM alliance_invites WHERE user_id = ?", [userId]);

      // Finally delete user
      await client.query("DELETE FROM users WHERE id = ?", [userId]);
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete account" };
  }
}

// ========== ASYNC SESSION HELPERS ==========

/**
 * Session result for async getSession (used by API routes)
 */
export interface AsyncSessionResult {
  userId: number;
  username: string;
  role: string;
}

/**
 * Get session from Next.js cookies (async version for Server Components/API Routes)
 * This uses the Next.js cookies() function to automatically get the session cookie
 */
export async function getSessionAsync(): Promise<AsyncSessionResult | null> {
  try {
    // Dynamic import of next/headers to avoid issues during build
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return null;
    }

    const result = await getSession(sessionId);
    if (!result) {
      return null;
    }

    return {
      userId: result.user.id,
      username: result.user.username,
      role: result.user.role,
    };
  } catch {
    // If cookies() is not available (e.g., during build), return null
    return null;
  }
}
