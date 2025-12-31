/**
 * PostgreSQL Database Layer
 *
 * This module provides PostgreSQL database functionality with connection pooling.
 * Used for production deployments on VPS or cloud environments.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { getDatabaseConfig } from './db-config';

let pool: Pool | null = null;

/**
 * Get or create the PostgreSQL connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    const config = getDatabaseConfig();

    if (config.type !== 'postgresql') {
      throw new Error('PostgreSQL configuration not found. Set DATABASE_URL environment variable.');
    }

    pool = new Pool({
      connectionString: config.connectionString,
      ssl: config.ssl,
      min: config.poolMin || 2,
      max: config.poolMax || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Log pool events in development
    if (process.env.NODE_ENV === 'development') {
      pool.on('connect', () => console.log('[PG] Client connected'));
      pool.on('error', (err) => console.error('[PG] Pool error:', err.message));
    }
  }

  return pool;
}

/**
 * Execute a query and return all rows
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

/**
 * Execute a query and return the first row
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

/**
 * Execute a query and return the QueryResult (includes rowCount, etc.)
 */
export async function execute(
  text: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<QueryResult> {
  return getPool().query(text, params);
}

/**
 * Run a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Check if the database is connected
 */
export async function isConnected(): Promise<boolean> {
  try {
    await queryOne('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize the database schema
 * This should be run once when setting up a new database
 */
export async function initializeSchema(): Promise<void> {
  const schemaSQL = `
    -- Check if tables exist and create them if not
    -- This is a simplified version - use the full schema.sql for production

    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        display_name VARCHAR(100),
        bio TEXT,
        avatar_url VARCHAR(500),
        location VARCHAR(100),
        wurm_server VARCHAR(50),
        show_in_members_list BOOLEAN DEFAULT true,
        show_email BOOLEAN DEFAULT false,
        show_location BOOLEAN DEFAULT true,
        is_banned BOOLEAN DEFAULT false,
        ban_reason TEXT,
        banned_at TIMESTAMP,
        banned_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        category VARCHAR(50) DEFAULT 'misc',
        is_base_material BOOLEAN DEFAULT false,
        description TEXT,
        difficulty INTEGER,
        skill_type VARCHAR(50),
        base_time INTEGER,
        tool_type VARCHAR(50)
    );

    CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        result_item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        ingredient_item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        quantity DECIMAL(10, 4) NOT NULL DEFAULT 1
    );
  `;

  await execute(schemaSQL);
}

// ============================================================
// HELPER TYPES FOR PostgreSQL QUERY RESULTS
// ============================================================

export interface PgUser {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  salt: string;
  role: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  wurm_server: string | null;
  show_in_members_list: boolean;
  show_email: boolean;
  show_location: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: Date | null;
  banned_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface PgSession {
  id: string;
  user_id: number;
  expires_at: Date;
  created_at: Date;
}

export interface PgItem {
  id: number;
  name: string;
  category: string;
  is_base_material: boolean;
  description: string | null;
  difficulty: number | null;
  skill_type: string | null;
  base_time: number | null;
  tool_type: string | null;
}

export interface PgRecipe {
  id: number;
  result_item_id: number;
  ingredient_item_id: number;
  quantity: number;
}
