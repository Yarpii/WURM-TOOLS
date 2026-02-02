import { query } from "./core";
import type { User } from "../auth";

// ========== EMAIL VERIFICATION & 2FA ==========

export type VerificationCodeType = "email_verify" | "2fa_login" | "password_reset";

export interface EmailVerificationCode {
  id: number;
  user_id: number;
  email: string;
  code: string;
  code_type: VerificationCodeType;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface Pending2FASession {
  id: number;
  user_id: number;
  session_token: string;
  code: string;
  expires_at: Date;
  remember_me: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

export interface Pending2FASessionOptions {
  rememberMe?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface EmailAlertPreferences {
  id: number;
  user_id: number;
  alert_treasure_shared: boolean;
  alert_hunt_completed: boolean;
  alert_price_alert: boolean;
  alert_security: boolean;
  alert_newsletter: boolean;
  created_at: Date;
  updated_at: Date;
}

// Create email verification code
export async function createEmailVerificationCode(
  userId: number,
  email: string,
  code: string,
  codeType: VerificationCodeType,
  expiryMinutes: number = 10
): Promise<EmailVerificationCode | null> {
  // Delete any existing codes of the same type for this user
  await query(
    "DELETE FROM email_verification_codes WHERE user_id = ? AND code_type = ?",
    [userId, codeType]
  );

  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  const result = await query(
    `INSERT INTO email_verification_codes (user_id, email, code, code_type, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, email, code, codeType, expiresAt]
  );

  if (result.rowCount === 0) return null;

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  const id = idResult.rows[0]?.id || 0;

  return {
    id,
    user_id: userId,
    email,
    code,
    code_type: codeType,
    expires_at: expiresAt,
    used_at: null,
    created_at: new Date(),
  };
}

// Verify email code
export async function verifyEmailCode(
  userId: number,
  code: string,
  codeType: VerificationCodeType
): Promise<EmailVerificationCode | null> {
  const result = await query<EmailVerificationCode>(
    `SELECT * FROM email_verification_codes
     WHERE user_id = ? AND code = ? AND code_type = ? AND expires_at > NOW() AND used_at IS NULL`,
    [userId, code, codeType]
  );

  if (result.rows.length === 0) return null;

  // Mark as used
  await query(
    "UPDATE email_verification_codes SET used_at = NOW() WHERE id = ?",
    [result.rows[0].id]
  );

  return result.rows[0];
}

// Update user email and mark as verified
export async function updateUserEmail(
  userId: number,
  email: string,
  verified: boolean = true
): Promise<boolean> {
  const result = await query(
    "UPDATE users SET email = ?, email_verified = ? WHERE id = ?",
    [email, verified, userId]
  );
  return result.rowCount > 0;
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await query<User>(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );
  return result.rows[0] || null;
}

// Get user by ID
export async function getUserById(userId: number): Promise<User | null> {
  const result = await query<User>(
    "SELECT * FROM users WHERE id = ?",
    [userId]
  );
  return result.rows[0] || null;
}

// Check if email is already in use
export async function isEmailInUse(email: string, excludeUserId?: number): Promise<boolean> {
  const params: (string | number)[] = [email];
  let sql = "SELECT COUNT(*) as count FROM users WHERE email = ?";

  if (excludeUserId) {
    sql += " AND id != ?";
    params.push(excludeUserId);
  }

  const result = await query<{ count: number }>(sql, params);
  return (result.rows[0]?.count || 0) > 0;
}

// Enable/disable 2FA for user
export async function setUser2FA(userId: number, enabled: boolean): Promise<boolean> {
  const result = await query(
    "UPDATE users SET two_factor_enabled = ? WHERE id = ?",
    [enabled, userId]
  );
  return result.rowCount > 0;
}

// Check if user has 2FA enabled
export async function hasUser2FAEnabled(userId: number): Promise<boolean> {
  const result = await query<{ two_factor_enabled: boolean }>(
    "SELECT two_factor_enabled FROM users WHERE id = ?",
    [userId]
  );
  return result.rows[0]?.two_factor_enabled || false;
}

// Create pending 2FA session
export async function createPending2FASession(
  userId: number,
  sessionToken: string,
  code: string,
  expiryMinutes: number = 10,
  options?: Pending2FASessionOptions
): Promise<Pending2FASession | null> {
  // Delete any existing pending sessions for this user
  await query("DELETE FROM pending_2fa_sessions WHERE user_id = ?", [userId]);

  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  const rememberMe = options?.rememberMe ?? false;
  const ipAddress = options?.ipAddress ?? null;
  const userAgent = options?.userAgent ?? null;

  const result = await query(
    `INSERT INTO pending_2fa_sessions (user_id, session_token, code, expires_at, remember_me, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, sessionToken, code, expiresAt, rememberMe, ipAddress, userAgent]
  );

  if (result.rowCount === 0) return null;

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  const id = idResult.rows[0]?.id || 0;

  return {
    id,
    user_id: userId,
    session_token: sessionToken,
    code,
    expires_at: expiresAt,
    remember_me: rememberMe,
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: new Date(),
  };
}

// Verify pending 2FA session
export async function verifyPending2FASession(
  sessionToken: string,
  code: string
): Promise<Pending2FASession | null> {
  const result = await query<Pending2FASession>(
    `SELECT * FROM pending_2fa_sessions
     WHERE session_token = ? AND code = ? AND expires_at > NOW()`,
    [sessionToken, code]
  );

  if (result.rows.length === 0) return null;

  // Delete the pending session
  await query("DELETE FROM pending_2fa_sessions WHERE id = ?", [result.rows[0].id]);

  return result.rows[0];
}

// Get pending 2FA session by token
export async function getPending2FASession(sessionToken: string): Promise<Pending2FASession | null> {
  const result = await query<Pending2FASession>(
    "SELECT * FROM pending_2fa_sessions WHERE session_token = ? AND expires_at > NOW()",
    [sessionToken]
  );
  return result.rows[0] || null;
}

// Delete pending 2FA session
export async function deletePending2FASession(sessionToken: string): Promise<boolean> {
  const result = await query(
    "DELETE FROM pending_2fa_sessions WHERE session_token = ?",
    [sessionToken]
  );
  return result.rowCount > 0;
}

// ========== EMAIL ALERT PREFERENCES ==========

// Get user's email alert preferences
export async function getEmailAlertPreferences(userId: number): Promise<EmailAlertPreferences | null> {
  const result = await query<EmailAlertPreferences>(
    "SELECT * FROM email_alert_preferences WHERE user_id = ?",
    [userId]
  );
  return result.rows[0] || null;
}

// Create or update email alert preferences
export async function upsertEmailAlertPreferences(
  userId: number,
  preferences: Partial<Omit<EmailAlertPreferences, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<EmailAlertPreferences | null> {
  const existing = await getEmailAlertPreferences(userId);

  if (existing) {
    // Update existing
    const updates: string[] = [];
    const values: (boolean | number)[] = [];

    if (preferences.alert_treasure_shared !== undefined) {
      updates.push("alert_treasure_shared = ?");
      values.push(preferences.alert_treasure_shared);
    }
    if (preferences.alert_hunt_completed !== undefined) {
      updates.push("alert_hunt_completed = ?");
      values.push(preferences.alert_hunt_completed);
    }
    if (preferences.alert_price_alert !== undefined) {
      updates.push("alert_price_alert = ?");
      values.push(preferences.alert_price_alert);
    }
    if (preferences.alert_security !== undefined) {
      updates.push("alert_security = ?");
      values.push(preferences.alert_security);
    }
    if (preferences.alert_newsletter !== undefined) {
      updates.push("alert_newsletter = ?");
      values.push(preferences.alert_newsletter);
    }

    if (updates.length > 0) {
      values.push(userId);
      await query(
        `UPDATE email_alert_preferences SET ${updates.join(", ")} WHERE user_id = ?`,
        values
      );
    }
  } else {
    // Create new
    await query(
      `INSERT INTO email_alert_preferences
       (user_id, alert_treasure_shared, alert_hunt_completed, alert_price_alert, alert_security, alert_newsletter)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        preferences.alert_treasure_shared ?? true,
        preferences.alert_hunt_completed ?? false,
        preferences.alert_price_alert ?? true,
        preferences.alert_security ?? true,
        preferences.alert_newsletter ?? false,
      ]
    );
  }

  return getEmailAlertPreferences(userId);
}
