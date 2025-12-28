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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
    `);
  }

  // Ensure admin user exists (create if not present)
  const adminExists = db
    .prepare("SELECT id FROM users WHERE username = 'admin'")
    .get();

  if (!adminExists) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = hashPassword("admin123", salt);

    db.prepare(
      "INSERT INTO users (username, email, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)"
    ).run("admin", "admin@wurmtools.com", hash, salt, "admin");
  }
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
  email: string,
  password: string
): { success: true; user: User } | { success: false; error: string } {
  const db = getDb();

  // Validate input
  if (!username || username.length < 3) {
    return { success: false, error: "Username must be at least 3 characters" };
  }
  if (!email || !email.includes("@")) {
    return { success: false, error: "Invalid email address" };
  }
  if (!password || password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" };
  }

  // Check if username or email already exists
  const existingUser = db
    .prepare("SELECT id FROM users WHERE username = ? OR email = ?")
    .get(username.toLowerCase(), email.toLowerCase());

  if (existingUser) {
    return { success: false, error: "Username or email already exists" };
  }

  // Create user
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);

  try {
    const result = db
      .prepare(
        "INSERT INTO users (username, email, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)"
      )
      .run(username.toLowerCase(), email.toLowerCase(), hash, salt, "user");

    const user = getUserById(result.lastInsertRowid as number);
    if (!user) {
      return { success: false, error: "Failed to create user" };
    }

    return { success: true, user };
  } catch (e) {
    return { success: false, error: "Failed to create user: " + String(e) };
  }
}

export function getUserById(id: number): User | null {
  const row = getDb()
    .prepare("SELECT id, username, email, role, created_at FROM users WHERE id = ?")
    .get(id) as UserWithPassword | undefined;

  return row ? { ...row, role: row.role as "user" | "admin" } : null;
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

export function getAllUsers(): User[] {
  return getDb()
    .prepare("SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC")
    .all() as User[];
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
  const user = db
    .prepare("SELECT * FROM users WHERE username = ? OR email = ?")
    .get(usernameOrEmail.toLowerCase(), usernameOrEmail.toLowerCase()) as UserWithPassword | undefined;

  if (!user) {
    return { success: false, error: "Invalid credentials" };
  }

  // Verify password
  if (!verifyPassword(password, user.password_hash, user.salt)) {
    return { success: false, error: "Invalid credentials" };
  }

  // Create session
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  db.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
  ).run(sessionId, user.id, expiresAt);

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role as "user" | "admin",
      created_at: user.created_at,
    },
    sessionId,
  };
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
        u.username, u.email, u.role, u.created_at as user_created_at
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
    } | undefined;

  if (!row) {
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
