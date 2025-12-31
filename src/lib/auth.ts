import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "wurmcalc.sqlite");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initAuthTables(db);
  }
  return db;
}

function initAuthTables(db: Database.Database): void {
  // Check if users table exists
  const usersTableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    .get();

  if (!usersTableExists) {
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        display_name TEXT,
        bio TEXT,
        avatar_url TEXT,
        location TEXT,
        wurm_server TEXT,
        show_in_members_list INTEGER DEFAULT 0,
        show_email INTEGER DEFAULT 0,
        show_location INTEGER DEFAULT 1,
        is_banned INTEGER DEFAULT 0,
        ban_reason TEXT,
        banned_at TEXT,
        banned_by INTEGER
      );

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_sessions_user ON sessions(user_id);
      CREATE INDEX idx_sessions_expires ON sessions(expires_at);
      CREATE INDEX idx_users_visible ON users(show_in_members_list);
      CREATE INDEX idx_users_banned ON users(is_banned);
    `);
  }

  // Add new columns if they don't exist (migration for existing databases)
  const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  const columnNames = columns.map(c => c.name);

  if (!columnNames.includes("display_name")) {
    db.exec("ALTER TABLE users ADD COLUMN display_name TEXT");
  }
  if (!columnNames.includes("bio")) {
    db.exec("ALTER TABLE users ADD COLUMN bio TEXT");
  }
  if (!columnNames.includes("avatar_url")) {
    db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT");
  }
  if (!columnNames.includes("location")) {
    db.exec("ALTER TABLE users ADD COLUMN location TEXT");
  }
  if (!columnNames.includes("wurm_server")) {
    db.exec("ALTER TABLE users ADD COLUMN wurm_server TEXT");
  }
  if (!columnNames.includes("show_in_members_list")) {
    db.exec("ALTER TABLE users ADD COLUMN show_in_members_list INTEGER DEFAULT 0");
  }
  if (!columnNames.includes("show_email")) {
    db.exec("ALTER TABLE users ADD COLUMN show_email INTEGER DEFAULT 0");
  }
  if (!columnNames.includes("show_location")) {
    db.exec("ALTER TABLE users ADD COLUMN show_location INTEGER DEFAULT 1");
  }
  if (!columnNames.includes("is_banned")) {
    db.exec("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0");
  }
  if (!columnNames.includes("ban_reason")) {
    db.exec("ALTER TABLE users ADD COLUMN ban_reason TEXT");
  }
  if (!columnNames.includes("banned_at")) {
    db.exec("ALTER TABLE users ADD COLUMN banned_at TEXT");
  }
  if (!columnNames.includes("banned_by")) {
    db.exec("ALTER TABLE users ADD COLUMN banned_by INTEGER");
  }

  // Note: Admin user should be created manually via environment variable or CLI
  // DO NOT create default admin with hardcoded password - this is a critical security risk
  // To create an admin, use: ADMIN_INITIAL_PASSWORD=<secure_password> npm run setup-admin
  // Or promote an existing user via the database
}

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

// ========== USER FUNCTIONS ==========

export function createUser(
  username: string,
  password: string
): { success: true; user: User } | { success: false; error: string } {
  const db = getDb();

  // Validate input
  if (!username || username.length < 3) {
    return { success: false, error: "Character name must be at least 3 characters" };
  }
  if (!password || password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" };
  }

  // Check if username already exists
  const existingUser = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username.toLowerCase());

  if (existingUser) {
    return { success: false, error: "This character name is already registered" };
  }

  // Generate placeholder email for database compatibility (not used for anything)
  const placeholderEmail = `${username.toLowerCase()}@wurmtools.local`;

  // Create user
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);

  try {
    const result = db
      .prepare(
        "INSERT INTO users (username, email, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)"
      )
      .run(username.toLowerCase(), placeholderEmail, hash, salt, "user");

    const user = getUserById(result.lastInsertRowid as number);
    if (!user) {
      return { success: false, error: "Failed to create user" };
    }

    return { success: true, user };
  } catch (e) {
    return { success: false, error: "Failed to create user: " + String(e) };
  }
}

interface UserDbRow {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  wurm_server?: string;
  show_in_members_list: number;
  show_email: number;
  show_location: number;
  is_banned: number;
  ban_reason?: string;
  banned_at?: string;
  banned_by?: number;
}

export function getUserById(id: number): User | null {
  const row = getDb()
    .prepare(`
      SELECT id, username, email, role, created_at,
             display_name, bio, avatar_url, location, wurm_server,
             show_in_members_list, show_email, show_location,
             is_banned, ban_reason, banned_at, banned_by
      FROM users WHERE id = ?
    `)
    .get(id) as UserDbRow | undefined;

  if (!row) return null;

  return dbRowToUser(row);
}

export function getUserByEmail(email: string): UserWithPassword | null {
  return getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase()) as UserWithPassword | null;
}

export function getUserByUsername(username: string): UserWithPassword | null {
  return getDb()
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username.toLowerCase()) as UserWithPassword | null;
}

function dbRowToUser(row: UserDbRow): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role as "user" | "admin",
    created_at: row.created_at,
    display_name: row.display_name,
    bio: row.bio,
    avatar_url: row.avatar_url,
    location: row.location,
    wurm_server: row.wurm_server,
    show_in_members_list: Boolean(row.show_in_members_list),
    show_email: Boolean(row.show_email),
    show_location: Boolean(row.show_location),
    is_banned: Boolean(row.is_banned),
    ban_reason: row.ban_reason,
    banned_at: row.banned_at,
    banned_by: row.banned_by,
  };
}

export function getAllUsers(): User[] {
  const rows = getDb()
    .prepare(`
      SELECT id, username, email, role, created_at,
             display_name, bio, avatar_url, location, wurm_server,
             show_in_members_list, show_email, show_location,
             is_banned, ban_reason, banned_at, banned_by
      FROM users ORDER BY created_at DESC
    `)
    .all() as UserDbRow[];

  return rows.map(dbRowToUser);
}

// Get visible members (opt-in and not banned)
export function getVisibleMembers(): User[] {
  const rows = getDb()
    .prepare(`
      SELECT id, username, email, role, created_at,
             display_name, bio, avatar_url, location, wurm_server,
             show_in_members_list, show_email, show_location,
             is_banned, ban_reason, banned_at, banned_by
      FROM users
      WHERE show_in_members_list = 1 AND is_banned = 0
      ORDER BY display_name ASC, username ASC
    `)
    .all() as UserDbRow[];

  return rows.map(dbRowToUser);
}

// Get public profile (respects visibility settings)
export function getPublicProfile(userId: number): Partial<User> | null {
  const user = getUserById(userId);
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

export function updateUserRole(userId: number, role: "user" | "admin"): boolean {
  const result = getDb()
    .prepare("UPDATE users SET role = ? WHERE id = ?")
    .run(role, userId);
  return result.changes > 0;
}

export function deleteUser(userId: number): boolean {
  const db = getDb();
  // Delete sessions first
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  // Then delete user
  const result = db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  return result.changes > 0;
}

// ========== AUTHENTICATION FUNCTIONS ==========

export function login(
  usernameOrEmail: string,
  password: string
): { success: true; user: User; sessionId: string } | { success: false; error: string } {
  const db = getDb();

  // Find user by username or email
  const row = db
    .prepare("SELECT * FROM users WHERE username = ? OR email = ?")
    .get(usernameOrEmail.toLowerCase(), usernameOrEmail.toLowerCase()) as (UserDbRow & {
      password_hash: string;
      salt: string;
    }) | undefined;

  if (!row) {
    return { success: false, error: "Invalid credentials" };
  }

  // Check if user is banned
  if (row.is_banned) {
    return { success: false, error: `Account is banned: ${row.ban_reason || "No reason provided"}` };
  }

  // Verify password
  if (!verifyPassword(password, row.password_hash, row.salt)) {
    return { success: false, error: "Invalid credentials" };
  }

  // Create session
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  db.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
  ).run(sessionId, row.id, expiresAt);

  const user: User = dbRowToUser(row);

  return { success: true, user, sessionId };
}

export function logout(sessionId: string): boolean {
  const result = getDb()
    .prepare("DELETE FROM sessions WHERE id = ?")
    .run(sessionId);
  return result.changes > 0;
}

export function getSession(sessionId: string): { session: Session; user: User } | null {
  const db = getDb();

  // Clean up expired sessions first
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());

  // Get session with user
  const row = db
    .prepare(`
      SELECT
        s.id, s.user_id, s.expires_at, s.created_at,
        u.username, u.email, u.role, u.created_at as user_created_at,
        u.display_name, u.bio, u.avatar_url, u.location, u.wurm_server,
        u.show_in_members_list, u.show_email, u.show_location,
        u.is_banned, u.ban_reason, u.banned_at, u.banned_by
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > ?
    `)
    .get(sessionId, new Date().toISOString()) as {
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
    } | undefined;

  if (!row) {
    return null;
  }

  // Check if user is banned - invalidate session
  if (row.is_banned) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
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

export function refreshSession(sessionId: string): boolean {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const result = getDb()
    .prepare("UPDATE sessions SET expires_at = ? WHERE id = ?")
    .run(expiresAt, sessionId);
  return result.changes > 0;
}

// ========== AUTHORIZATION HELPERS ==========

export function isAdmin(user: User | null): boolean {
  return user?.role === "admin";
}

export function requireAuth(sessionId: string | undefined): User | null {
  if (!sessionId) return null;
  const result = getSession(sessionId);
  return result?.user || null;
}

export function requireAdmin(sessionId: string | undefined): User | null {
  const user = requireAuth(sessionId);
  if (!user || user.role !== "admin") return null;
  return user;
}

// ========== PROFILE & SETTINGS FUNCTIONS ==========

export interface ProfileUpdateInput {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  wurm_server?: string;
}

export interface SettingsUpdateInput {
  show_in_members_list?: boolean;
  show_email?: boolean;
  show_location?: boolean;
}

export function updateUserProfile(userId: number, input: ProfileUpdateInput): boolean {
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
  const result = getDb()
    .prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values.slice(0, -1), userId);

  return result.changes > 0;
}

export function updateUserSettings(userId: number, input: SettingsUpdateInput): boolean {
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

  const result = getDb()
    .prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values, userId);

  return result.changes > 0;
}

// ========== ADMIN USER MANAGEMENT ==========

export function banUser(userId: number, adminId: number, reason: string): boolean {
  const result = getDb()
    .prepare(`
      UPDATE users SET
        is_banned = 1,
        ban_reason = ?,
        banned_at = datetime('now'),
        banned_by = ?
      WHERE id = ? AND role != 'admin'
    `)
    .run(reason, adminId, userId);

  // Also invalidate all sessions for this user
  if (result.changes > 0) {
    getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  }

  return result.changes > 0;
}

export function unbanUser(userId: number): boolean {
  const result = getDb()
    .prepare(`
      UPDATE users SET
        is_banned = 0,
        ban_reason = NULL,
        banned_at = NULL,
        banned_by = NULL
      WHERE id = ?
    `)
    .run(userId);

  return result.changes > 0;
}

export function adminUpdateUser(
  userId: number,
  input: {
    role?: "user" | "admin";
    display_name?: string;
    bio?: string;
    location?: string;
    wurm_server?: string;
  }
): boolean {
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

  const result = getDb()
    .prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values, userId);

  return result.changes > 0;
}

// Get user statistics
export function getUserStats(): {
  total: number;
  visible: number;
  banned: number;
  admins: number;
} {
  const db = getDb();
  const total = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  const visible = db.prepare("SELECT COUNT(*) as count FROM users WHERE show_in_members_list = 1 AND is_banned = 0").get() as { count: number };
  const banned = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_banned = 1").get() as { count: number };
  const admins = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };

  return {
    total: total.count,
    visible: visible.count,
    banned: banned.count,
    admins: admins.count,
  };
}
