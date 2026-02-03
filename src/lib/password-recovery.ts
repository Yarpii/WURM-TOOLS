import crypto from "crypto";
import { query } from "./db/core";
import { getUserByEmail } from "./auth";
import {
  sendPasswordResetEmail,
  sendUsernameReminderEmail,
  sendAccountLockedEmail,
  isEmailConfigured,
} from "./email";

// ========== CONFIGURATION ==========

const RESET_TOKEN_EXPIRY_HOURS = 1;
const MAX_RESET_REQUESTS_PER_HOUR = 3;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// ========== HELPER FUNCTIONS ==========

function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ========== RATE LIMITING ==========

export async function checkForgotPasswordRateLimit(
  email: string,
  ipAddress?: string
): Promise<{ allowed: boolean; remainingAttempts: number }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Check by email
  const emailRequests = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM forgot_password_requests
     WHERE email = ? AND created_at > ?`,
    [email.toLowerCase(), oneHourAgo]
  );

  const emailCount = emailRequests.rows[0]?.count || 0;
  if (emailCount >= MAX_RESET_REQUESTS_PER_HOUR) {
    return { allowed: false, remainingAttempts: 0 };
  }

  // Also check by IP if provided
  if (ipAddress) {
    const ipRequests = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM forgot_password_requests
       WHERE ip_address = ? AND created_at > ?`,
      [ipAddress, oneHourAgo]
    );

    const ipCount = ipRequests.rows[0]?.count || 0;
    if (ipCount >= MAX_RESET_REQUESTS_PER_HOUR * 2) {
      return { allowed: false, remainingAttempts: 0 };
    }
  }

  return {
    allowed: true,
    remainingAttempts: MAX_RESET_REQUESTS_PER_HOUR - emailCount - 1,
  };
}

async function logForgotPasswordRequest(email: string, ipAddress?: string): Promise<void> {
  await query(
    `INSERT INTO forgot_password_requests (email, ip_address) VALUES (?, ?)`,
    [email.toLowerCase(), ipAddress || null]
  );

  // Cleanup old records (older than 24 hours)
  await query(
    `DELETE FROM forgot_password_requests WHERE created_at < ?`,
    [new Date(Date.now() - 24 * 60 * 60 * 1000)]
  );
}

// ========== PASSWORD RESET ==========

export interface RequestPasswordResetResult {
  success: boolean;
  error?: string;
  // Always return success to prevent email enumeration
  message: string;
}

export async function requestPasswordReset(
  email: string,
  ipAddress?: string
): Promise<RequestPasswordResetResult> {
  if (!isEmailConfigured()) {
    return {
      success: false,
      error: "Email service is not configured",
      message: "Email service is not available",
    };
  }

  // Check rate limit
  const rateLimit = await checkForgotPasswordRateLimit(email, ipAddress);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: "Too many password reset requests. Please try again later.",
      message: "Too many requests. Please try again later.",
    };
  }

  // Log the request for rate limiting
  await logForgotPasswordRequest(email, ipAddress);

  // Find user by email
  const user = await getUserByEmail(email.toLowerCase());

  // Always return a generic success message to prevent email enumeration
  const genericMessage = "If an account exists with this email, you will receive a password reset link shortly.";

  if (!user) {
    // Don't reveal that the email doesn't exist
    return { success: true, message: genericMessage };
  }

  // Generate reset token
  const token = generateResetToken();
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Invalidate any existing tokens for this user
  await query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL`,
    [user.id]
  );

  // Store new token
  await query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
    [user.id, hashedToken, expiresAt]
  );

  // Send email with reset link
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wurm.tools";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail(user.email, user.username, resetUrl);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    // Still return success to prevent enumeration
  }

  return { success: true, message: genericMessage };
}

export interface ValidateResetTokenResult {
  valid: boolean;
  userId?: number;
  username?: string;
  error?: string;
}

export async function validateResetToken(token: string): Promise<ValidateResetTokenResult> {
  const hashedToken = hashToken(token);

  const result = await query<{
    id: number;
    user_id: number;
    expires_at: string;
    used_at: string | null;
    username: string;
  }>(
    `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.username
     FROM password_reset_tokens prt
     JOIN users u ON prt.user_id = u.id
     WHERE prt.token = ?`,
    [hashedToken]
  );

  if (result.rows.length === 0) {
    return { valid: false, error: "Invalid or expired reset link" };
  }

  const tokenData = result.rows[0];

  if (tokenData.used_at) {
    return { valid: false, error: "This reset link has already been used" };
  }

  if (new Date(tokenData.expires_at) < new Date()) {
    return { valid: false, error: "This reset link has expired" };
  }

  return {
    valid: true,
    userId: tokenData.user_id,
    username: tokenData.username,
  };
}

export interface ResetPasswordResult {
  success: boolean;
  error?: string;
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<ResetPasswordResult> {
  // Validate token
  const tokenValidation = await validateResetToken(token);
  if (!tokenValidation.valid || !tokenValidation.userId) {
    return { success: false, error: tokenValidation.error || "Invalid token" };
  }

  // Validate password
  if (newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  if (newPassword.length > 128) {
    return { success: false, error: "Password is too long" };
  }

  // SECURITY: Generate new password hash with OWASP-recommended iterations
  const PBKDF2_ITERATIONS = 210000;
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(newPassword, salt, PBKDF2_ITERATIONS, 64, "sha512").toString("hex");

  // Update password
  await query(
    `UPDATE users SET password_hash = ?, salt = ? WHERE id = ?`,
    [hash, salt, tokenValidation.userId]
  );

  // Mark token as used
  const hashedToken = hashToken(token);
  await query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE token = ?`,
    [hashedToken]
  );

  // Invalidate all sessions for this user (security measure)
  await query(`DELETE FROM sessions WHERE user_id = ?`, [tokenValidation.userId]);

  return { success: true };
}

// ========== USERNAME REMINDER ==========

export interface RequestUsernameReminderResult {
  success: boolean;
  error?: string;
  message: string;
}

export async function requestUsernameReminder(
  email: string,
  ipAddress?: string
): Promise<RequestUsernameReminderResult> {
  if (!isEmailConfigured()) {
    return {
      success: false,
      error: "Email service is not configured",
      message: "Email service is not available",
    };
  }

  // Check rate limit (reuse the same rate limiting)
  const rateLimit = await checkForgotPasswordRateLimit(email, ipAddress);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: "Too many requests. Please try again later.",
      message: "Too many requests. Please try again later.",
    };
  }

  // Log the request
  await logForgotPasswordRequest(email, ipAddress);

  // Generic message to prevent enumeration
  const genericMessage = "If an account exists with this email, you will receive a username reminder shortly.";

  // Find all users with this email
  const result = await query<{ username: string }>(
    `SELECT username FROM users WHERE email = ?`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    // Don't reveal that the email doesn't exist
    return { success: true, message: genericMessage };
  }

  const usernames = result.rows.map(row => row.username);

  try {
    await sendUsernameReminderEmail(email.toLowerCase(), usernames);
  } catch (error) {
    console.error("Failed to send username reminder email:", error);
  }

  return { success: true, message: genericMessage };
}

// ========== LOGIN ATTEMPT TRACKING ==========

export async function recordLoginAttempt(
  identifier: string,
  identifierType: "email" | "username" | "ip",
  success: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await query(
    `INSERT INTO login_attempts (identifier, identifier_type, success, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?)`,
    [identifier.toLowerCase(), identifierType, success, ipAddress || null, userAgent || null]
  );

  // Cleanup old attempts (older than 24 hours)
  await query(
    `DELETE FROM login_attempts WHERE created_at < ?`,
    [new Date(Date.now() - 24 * 60 * 60 * 1000)]
  );
}

export async function getRecentFailedAttempts(
  identifier: string,
  identifierType: "email" | "username" | "ip"
): Promise<number> {
  const fifteenMinutesAgo = new Date(Date.now() - LOCKOUT_DURATION_MINUTES * 60 * 1000);

  const result = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM login_attempts
     WHERE identifier = ? AND identifier_type = ? AND success = FALSE AND created_at > ?`,
    [identifier.toLowerCase(), identifierType, fifteenMinutesAgo]
  );

  return result.rows[0]?.count || 0;
}

// ========== ACCOUNT LOCKOUT ==========

export interface AccountLockStatus {
  isLocked: boolean;
  lockedUntil?: Date;
  remainingAttempts?: number;
}

export async function checkAccountLockout(userId: number): Promise<AccountLockStatus> {
  const result = await query<{ locked_until: string; failed_attempts: number }>(
    `SELECT locked_until, failed_attempts FROM account_lockouts WHERE user_id = ?`,
    [userId]
  );

  if (result.rows.length === 0) {
    return { isLocked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS };
  }

  const lockout = result.rows[0];
  const lockedUntil = new Date(lockout.locked_until);

  if (lockedUntil > new Date()) {
    return { isLocked: true, lockedUntil };
  }

  // Lock has expired, remove it
  await query(`DELETE FROM account_lockouts WHERE user_id = ?`, [userId]);
  return { isLocked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS };
}

export async function incrementFailedAttempts(
  userId: number,
  email: string,
  username: string
): Promise<{ isNowLocked: boolean; attemptsRemaining: number }> {
  // Check current lockout status
  const result = await query<{ failed_attempts: number }>(
    `SELECT failed_attempts FROM account_lockouts WHERE user_id = ?`,
    [userId]
  );

  let failedAttempts = (result.rows[0]?.failed_attempts || 0) + 1;

  if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
    // Lock the account
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);

    await query(
      `INSERT INTO account_lockouts (user_id, locked_until, failed_attempts, reason)
       VALUES (?, ?, ?, 'Too many failed login attempts')
       ON DUPLICATE KEY UPDATE locked_until = ?, failed_attempts = ?, locked_at = NOW()`,
      [userId, lockedUntil, failedAttempts, lockedUntil, failedAttempts]
    );

    // Send notification email
    try {
      await sendAccountLockedEmail(email, username, LOCKOUT_DURATION_MINUTES);
    } catch (error) {
      console.error("Failed to send account locked email:", error);
    }

    return { isNowLocked: true, attemptsRemaining: 0 };
  } else {
    // Update failed attempts counter
    await query(
      `INSERT INTO account_lockouts (user_id, locked_until, failed_attempts)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE failed_attempts = ?`,
      [userId, new Date(), failedAttempts, failedAttempts]
    );

    return {
      isNowLocked: false,
      attemptsRemaining: MAX_LOGIN_ATTEMPTS - failedAttempts,
    };
  }
}

export async function clearFailedAttempts(userId: number): Promise<void> {
  await query(`DELETE FROM account_lockouts WHERE user_id = ?`, [userId]);
}

// ========== SESSION MANAGEMENT ==========

export interface ActiveSession {
  id: string;
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
  lastActiveAt?: Date;
  createdAt: Date;
  isCurrent: boolean;
}

export async function getUserSessions(
  userId: number,
  currentSessionId?: string
): Promise<ActiveSession[]> {
  const result = await query<{
    id: string;
    ip_address: string | null;
    user_agent: string | null;
    device_name: string | null;
    last_active_at: string | null;
    created_at: string;
  }>(
    `SELECT id, ip_address, user_agent, device_name, last_active_at, created_at
     FROM sessions
     WHERE user_id = ? AND expires_at > NOW()
     ORDER BY last_active_at DESC, created_at DESC`,
    [userId]
  );

  return result.rows.map(row => ({
    id: row.id,
    ipAddress: row.ip_address || undefined,
    userAgent: row.user_agent || undefined,
    deviceName: row.device_name || undefined,
    lastActiveAt: row.last_active_at ? new Date(row.last_active_at) : undefined,
    createdAt: new Date(row.created_at),
    isCurrent: row.id === currentSessionId,
  }));
}

export async function revokeSession(
  userId: number,
  sessionId: string,
  currentSessionId?: string
): Promise<{ success: boolean; error?: string }> {
  // Don't allow revoking the current session (use logout instead)
  if (sessionId === currentSessionId) {
    return { success: false, error: "Cannot revoke current session. Use logout instead." };
  }

  const result = await query(
    `DELETE FROM sessions WHERE id = ? AND user_id = ?`,
    [sessionId, userId]
  );

  if (result.rowCount === 0) {
    return { success: false, error: "Session not found" };
  }

  return { success: true };
}

export async function revokeAllOtherSessions(
  userId: number,
  currentSessionId: string
): Promise<number> {
  const result = await query(
    `DELETE FROM sessions WHERE user_id = ? AND id != ?`,
    [userId, currentSessionId]
  );

  return result.rowCount;
}

export async function updateSessionInfo(
  sessionId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // Parse user agent for device name
  let deviceName = "Unknown device";
  if (userAgent) {
    if (userAgent.includes("Mobile")) {
      deviceName = "Mobile device";
    } else if (userAgent.includes("Windows")) {
      deviceName = "Windows PC";
    } else if (userAgent.includes("Mac")) {
      deviceName = "Mac";
    } else if (userAgent.includes("Linux")) {
      deviceName = "Linux PC";
    } else if (userAgent.includes("Chrome")) {
      deviceName = "Chrome browser";
    } else if (userAgent.includes("Firefox")) {
      deviceName = "Firefox browser";
    } else if (userAgent.includes("Safari")) {
      deviceName = "Safari browser";
    }
  }

  await query(
    `UPDATE sessions
     SET ip_address = COALESCE(?, ip_address),
         user_agent = COALESCE(?, user_agent),
         device_name = COALESCE(?, device_name),
         last_active_at = NOW()
     WHERE id = ?`,
    [ipAddress || null, userAgent || null, deviceName, sessionId]
  );
}

// Parse user agent string for email notifications
export function parseUserAgent(userAgent: string): { browser?: string; os?: string } {
  let browser: string | undefined;
  let os: string | undefined;

  // Detect browser
  if (userAgent.includes("Firefox/")) {
    browser = "Firefox";
  } else if (userAgent.includes("Edg/")) {
    browser = "Microsoft Edge";
  } else if (userAgent.includes("Chrome/")) {
    browser = "Google Chrome";
  } else if (userAgent.includes("Safari/") && !userAgent.includes("Chrome")) {
    browser = "Safari";
  } else if (userAgent.includes("Opera/") || userAgent.includes("OPR/")) {
    browser = "Opera";
  }

  // Detect OS
  if (userAgent.includes("Windows NT 10")) {
    os = "Windows 10/11";
  } else if (userAgent.includes("Windows")) {
    os = "Windows";
  } else if (userAgent.includes("Mac OS X")) {
    os = "macOS";
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os = "iOS";
  } else if (userAgent.includes("Android")) {
    os = "Android";
  } else if (userAgent.includes("Linux")) {
    os = "Linux";
  }

  return { browser, os };
}
