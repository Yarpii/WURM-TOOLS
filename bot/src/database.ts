import mysql, { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { BOT_CONFIG } from './config';

let pool: Pool | null = null;

/**
 * Get or create database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    const url = new URL(BOT_CONFIG.databaseUrl);
    pool = mysql.createPool({
      host: url.hostname,
      port: parseInt(url.port || '3306'),
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 10, // Limit queued requests to prevent memory exhaustion
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return pool;
}

/**
 * Execute a query and return results
 */
export async function query<T extends RowDataPacket>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const db = getPool();
  const [rows] = await db.query<T[]>(sql, params);
  return rows;
}

/**
 * Execute an insert/update and return result
 */
export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<ResultSetHeader> {
  const db = getPool();
  const [result] = await db.execute<ResultSetHeader>(sql, params);
  return result;
}

/**
 * Close the database pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Escape special characters in LIKE patterns to prevent SQL LIKE injection
 * Escapes %, _, and \ characters
 */
function escapeLikeString(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

// ==================== USER FUNCTIONS ====================

export interface DbUser extends RowDataPacket {
  id: number;
  username: string;
  discord_id?: string;
}

/**
 * Get user by Discord ID
 */
export async function getUserByDiscordId(discordId: string): Promise<DbUser | null> {
  const users = await query<DbUser>(
    'SELECT id, username, discord_id FROM users WHERE discord_id = ?',
    [discordId]
  );
  return users[0] || null;
}

/**
 * Link Discord account to user
 */
export async function linkDiscordAccount(userId: number, discordId: string): Promise<void> {
  await execute('UPDATE users SET discord_id = ? WHERE id = ?', [discordId, userId]);
}

// ==================== TIMER FUNCTIONS ====================

export interface DbTimer extends RowDataPacket {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  timer_type: string;
  duration_minutes: number;
  start_time: Date;
  end_time: Date;
  is_recurring: boolean;
  recurrence_interval: number | null;
  notify_discord: boolean;
  is_active: boolean;
  color: string;
  icon: string | null;
}

/**
 * Get user's active timers
 */
export async function getUserTimers(userId: number): Promise<DbTimer[]> {
  return query<DbTimer>(
    `SELECT id, user_id, name, description, timer_type, duration_minutes,
            start_time, end_time, is_recurring, recurrence_interval,
            notify_discord, is_active, color, icon
     FROM user_timers
     WHERE user_id = ? AND is_active = true
     ORDER BY end_time ASC`,
    [userId]
  );
}

/**
 * Create a new timer
 */
export async function createTimer(
  userId: number,
  name: string,
  timerType: string,
  durationMinutes: number,
  options: {
    description?: string;
    isRecurring?: boolean;
    notifyDiscord?: boolean;
    color?: string;
    icon?: string;
  } = {}
): Promise<number> {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  const result = await execute(
    `INSERT INTO user_timers (
      user_id, name, description, timer_type, duration_minutes,
      start_time, end_time, is_recurring, notify_discord, color, icon
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      name,
      options.description || null,
      timerType,
      durationMinutes,
      startTime,
      endTime,
      options.isRecurring || false,
      options.notifyDiscord !== false,
      options.color || '#3b82f6',
      options.icon || null,
    ]
  );

  return result.insertId;
}

/**
 * Cancel a timer
 */
export async function cancelTimer(timerId: number, userId: number): Promise<boolean> {
  const result = await execute(
    'UPDATE user_timers SET is_active = false WHERE id = ? AND user_id = ?',
    [timerId, userId]
  );
  return result.affectedRows > 0;
}

/**
 * Get timer presets
 */
export async function getTimerPresets(): Promise<DbTimer[]> {
  return query<DbTimer>(
    `SELECT id, name, timer_type, duration_minutes, description, color, icon
     FROM timer_presets
     WHERE is_public = true OR user_id IS NULL
     ORDER BY timer_type, name`
  );
}

// ==================== PRICE FUNCTIONS ====================

export interface DbPriceHistory extends RowDataPacket {
  item_name: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  total_orders: number;
  latest_price: number;
}

/**
 * Get price info for an item
 */
export async function getItemPrice(itemName: string): Promise<DbPriceHistory | null> {
  const escaped = escapeLikeString(itemName);
  const results = await query<DbPriceHistory>(
    `SELECT
      item_name,
      AVG(price) as avg_price,
      MIN(price) as min_price,
      MAX(price) as max_price,
      COUNT(*) as total_orders,
      (SELECT price FROM price_history WHERE LOWER(item_name) = LOWER(?) ORDER BY recorded_at DESC LIMIT 1) as latest_price
     FROM price_history
     WHERE LOWER(item_name) LIKE LOWER(?) ESCAPE '\\\\'
     GROUP BY item_name
     LIMIT 1`,
    [itemName, `%${escaped}%`]
  );
  return results[0] || null;
}

/**
 * Search for items by name
 */
export async function searchPrices(searchTerm: string, limit = 10): Promise<DbPriceHistory[]> {
  const escaped = escapeLikeString(searchTerm);
  return query<DbPriceHistory>(
    `SELECT
      item_name,
      AVG(price) as avg_price,
      MIN(price) as min_price,
      MAX(price) as max_price,
      COUNT(*) as total_orders
     FROM price_history
     WHERE LOWER(item_name) LIKE LOWER(?) ESCAPE '\\\\'
     GROUP BY item_name
     ORDER BY total_orders DESC
     LIMIT ?`,
    [`%${escaped}%`, limit]
  );
}

// ==================== CRAFTING FUNCTIONS ====================

export interface DbItem extends RowDataPacket {
  id: number;
  name: string;
  category: string;
  is_base_material: boolean;
  description: string | null;
  difficulty: number | null;
  skill_type: string | null;
}

export interface DbRecipe extends RowDataPacket {
  result_name: string;
  ingredient_name: string;
  quantity: number;
}

/**
 * Search for items
 */
export async function searchItems(searchTerm: string, limit = 10): Promise<DbItem[]> {
  const escaped = escapeLikeString(searchTerm);
  return query<DbItem>(
    `SELECT id, name, category, is_base_material, description, difficulty, skill_type
     FROM items
     WHERE LOWER(name) LIKE LOWER(?) ESCAPE '\\\\'
     ORDER BY name
     LIMIT ?`,
    [`%${escaped}%`, limit]
  );
}

/**
 * Get item by name (exact or close match)
 */
export async function getItemByName(name: string): Promise<DbItem | null> {
  // Try exact match first
  let items = await query<DbItem>(
    'SELECT * FROM items WHERE LOWER(name) = LOWER(?)',
    [name]
  );

  if (items.length === 0) {
    // Try partial match with escaped LIKE
    const escaped = escapeLikeString(name);
    items = await query<DbItem>(
      `SELECT * FROM items WHERE LOWER(name) LIKE LOWER(?) ESCAPE '\\\\' ORDER BY LENGTH(name) LIMIT 1`,
      [`%${escaped}%`]
    );
  }

  return items[0] || null;
}

/**
 * Get recipe for an item
 */
export async function getRecipe(itemId: number): Promise<DbRecipe[]> {
  return query<DbRecipe>(
    `SELECT
      ri.name as result_name,
      ii.name as ingredient_name,
      r.quantity
     FROM recipes r
     JOIN items ri ON r.result_item_id = ri.id
     JOIN items ii ON r.ingredient_item_id = ii.id
     WHERE r.result_item_id = ?
     ORDER BY r.quantity DESC`,
    [itemId]
  );
}

// ==================== EVENT FUNCTIONS ====================

export interface DbEvent extends RowDataPacket {
  id: number;
  title: string;
  description: string | null;
  event_type: string;
  server: string | null;
  location: string | null;
  start_date: Date;
  end_date: Date | null;
  is_public: boolean;
  attendee_count: number;
}

/**
 * Get upcoming public events
 */
export async function getUpcomingEvents(limit = 5): Promise<DbEvent[]> {
  return query<DbEvent>(
    `SELECT e.*,
      (SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id) as attendee_count
     FROM events e
     WHERE e.is_public = true AND e.start_date > NOW()
     ORDER BY e.start_date ASC
     LIMIT ?`,
    [limit]
  );
}

// ==================== LEADERBOARD FUNCTIONS ====================

export interface DbLeaderboardEntry extends RowDataPacket {
  user_id: number;
  username: string;
  total_xp: number;
  level: number;
}

/**
 * Get XP leaderboard
 */
export async function getLeaderboard(limit = 10): Promise<DbLeaderboardEntry[]> {
  return query<DbLeaderboardEntry>(
    `SELECT ux.user_id, u.username, ux.total_xp, ux.level
     FROM user_xp ux
     JOIN users u ON ux.user_id = u.id
     ORDER BY ux.total_xp DESC
     LIMIT ?`,
    [limit]
  );
}

// ==================== MARKET ORDER FUNCTIONS ====================

export interface DbMarketOrder extends RowDataPacket {
  id: number;
  username: string;
  order_type: string;
  item_name: string;
  quantity: number;
  quality: number | null;
  price: number | null;
  currency: string | null;
  location: string | null;
  status: string;
  created_at: Date;
}

/**
 * Get active market orders for an item
 */
export async function getMarketOrders(
  itemName: string,
  orderType?: 'buy' | 'sell',
  limit = 10
): Promise<DbMarketOrder[]> {
  const escaped = escapeLikeString(itemName);
  let sql = `
    SELECT o.*, u.username
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE LOWER(o.item_name) LIKE LOWER(?) ESCAPE '\\\\' AND o.status = 'active'
  `;
  const params: unknown[] = [`%${escaped}%`];

  if (orderType) {
    sql += ' AND o.order_type = ?';
    params.push(orderType);
  }

  sql += ' ORDER BY o.created_at DESC LIMIT ?';
  params.push(limit);

  return query<DbMarketOrder>(sql, params);
}

// ==================== DISCORD LINKING FUNCTIONS ====================

interface DbDiscordLink extends RowDataPacket {
  id: number;
  user_id: number;
  verification_code: string;
  expires_at: Date;
  username: string;
}

/**
 * Verify a Discord link code and link the account
 */
export async function verifyAndLinkDiscord(
  code: string,
  discordId: string
): Promise<{ success: boolean; username?: string; error?: string }> {
  // Find the verification code
  const links = await query<DbDiscordLink>(
    `SELECT dl.*, u.username
     FROM discord_link_codes dl
     JOIN users u ON dl.user_id = u.id
     WHERE dl.verification_code = ? AND dl.expires_at > NOW() AND dl.used_at IS NULL`,
    [code]
  );

  if (links.length === 0) {
    return { success: false, error: 'Invalid or expired verification code.' };
  }

  const link = links[0];

  // Check if Discord ID is already linked to another account
  const existingLink = await getUserByDiscordId(discordId);
  if (existingLink) {
    return { success: false, error: 'This Discord account is already linked to another Wurm Tools account.' };
  }

  // Check if user already has a Discord account linked
  const userWithDiscord = await query<DbUser>(
    'SELECT id, discord_id FROM users WHERE id = ? AND discord_id IS NOT NULL',
    [link.user_id]
  );
  if (userWithDiscord.length > 0) {
    return { success: false, error: 'This Wurm Tools account already has a Discord account linked.' };
  }

  // Link the account
  await execute('UPDATE users SET discord_id = ? WHERE id = ?', [discordId, link.user_id]);

  // Mark the code as used
  await execute('UPDATE discord_link_codes SET used_at = NOW() WHERE id = ?', [link.id]);

  return { success: true, username: link.username };
}

/**
 * Unlink a Discord account
 */
export async function unlinkDiscordAccount(discordId: string): Promise<void> {
  await execute('UPDATE users SET discord_id = NULL WHERE discord_id = ?', [discordId]);
}

/**
 * Get user stats for status command
 */
export async function getUserStats(userId: number): Promise<{
  activeTimers: number;
  totalOrders: number;
  eventsAttending: number;
}> {
  const [timers, orders, events] = await Promise.all([
    query<RowDataPacket & { count: number }>(
      'SELECT COUNT(*) as count FROM user_timers WHERE user_id = ? AND is_active = true',
      [userId]
    ),
    query<RowDataPacket & { count: number }>(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status = "active"',
      [userId]
    ),
    query<RowDataPacket & { count: number }>(
      `SELECT COUNT(*) as count FROM event_attendees ea
       JOIN events e ON ea.event_id = e.id
       WHERE ea.user_id = ? AND e.start_date > NOW()`,
      [userId]
    ),
  ]);

  return {
    activeTimers: timers[0]?.count || 0,
    totalOrders: orders[0]?.count || 0,
    eventsAttending: events[0]?.count || 0,
  };
}
