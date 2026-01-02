/**
 * MySQL/MariaDB Database Layer
 *
 * This module provides MySQL/MariaDB database functionality with connection pooling.
 * Used for production deployments on VPS environments with MariaDB.
 */

import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getDatabaseConfig } from './db-config';

let pool: Pool | null = null;

/**
 * Get or create the MySQL connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    const config = getDatabaseConfig();

    if (config.type !== 'mysql') {
      throw new Error('MySQL configuration not found. Set DATABASE_URL environment variable with mysql:// prefix.');
    }

    // Parse connection string or use individual config
    if (config.connectionString) {
      pool = mysql.createPool(config.connectionString);
    } else {
      pool = mysql.createPool({
        host: config.host || 'localhost',
        port: config.port || 3306,
        user: config.user || 'root',
        password: config.password || '',
        database: config.database || 'wurmtools',
        waitForConnections: true,
        connectionLimit: config.poolMax || 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        // MariaDB/MySQL SSL configuration
        ssl: config.ssl ? {
          rejectUnauthorized: typeof config.ssl === 'object' ? config.ssl.rejectUnauthorized : true
        } : undefined,
      });
    }

    // Log pool events in development
    if (process.env.NODE_ENV === 'development') {
      pool.on('connection', () => console.log('[MySQL] Client connected'));
      pool.on('release', () => console.log('[MySQL] Client released'));
    }
  }

  return pool;
}

/**
 * Execute a query and return all rows
 */
export async function query<T extends RowDataPacket = RowDataPacket>(
  text: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<T[]> {
  const [rows] = await getPool().query<T[]>(text, params);
  return rows;
}

/**
 * Execute a query and return the first row
 */
export async function queryOne<T extends RowDataPacket = RowDataPacket>(
  text: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

/**
 * Execute a query and return the result (for INSERT, UPDATE, DELETE)
 * Returns ResultSetHeader which includes insertId, affectedRows, etc.
 */
export async function execute(
  text: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<ResultSetHeader> {
  const [result] = await getPool().execute<ResultSetHeader>(text, params);
  return result;
}

/**
 * Run a transaction
 */
export async function transaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
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
 * Get the last insert ID from a result
 */
export function getInsertId(result: ResultSetHeader): number {
  return result.insertId;
}

/**
 * Get the number of affected rows from a result
 */
export function getAffectedRows(result: ResultSetHeader): number {
  return result.affectedRows;
}

/**
 * Initialize the database schema
 * This should be run once when setting up a new database
 */
export async function initializeSchema(): Promise<void> {
  // Create essential tables if they don't exist
  // For full schema, use the schema-mysql.sql file

  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
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
      show_in_members_list BOOLEAN DEFAULT TRUE,
      show_email BOOLEAN DEFAULT FALSE,
      show_location BOOLEAN DEFAULT TRUE,
      is_banned BOOLEAN DEFAULT FALSE,
      ban_reason TEXT,
      banned_at TIMESTAMP NULL,
      banned_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Sessions table
    `CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(255) PRIMARY KEY,
      user_id INT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Items table
    `CREATE TABLE IF NOT EXISTS items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      category VARCHAR(50) DEFAULT 'misc',
      is_base_material BOOLEAN DEFAULT FALSE,
      description TEXT,
      difficulty INT,
      skill_type VARCHAR(50),
      base_time INT,
      tool_type VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Recipes table
    `CREATE TABLE IF NOT EXISTS recipes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      result_item_id INT NOT NULL,
      ingredient_item_id INT NOT NULL,
      quantity DECIMAL(10, 4) NOT NULL DEFAULT 1,
      CONSTRAINT fk_recipes_result FOREIGN KEY (result_item_id) REFERENCES items(id) ON DELETE CASCADE,
      CONSTRAINT fk_recipes_ingredient FOREIGN KEY (ingredient_item_id) REFERENCES items(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];

  for (const sql of tables) {
    await execute(sql);
  }

  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_recipes_result ON recipes(result_item_id)',
    'CREATE INDEX IF NOT EXISTS idx_recipes_ingredient ON recipes(ingredient_item_id)',
  ];

  for (const sql of indexes) {
    try {
      await execute(sql);
    } catch {
      // Index might already exist, that's fine
    }
  }
}

// ============================================================
// HELPER TYPES FOR MySQL QUERY RESULTS
// ============================================================

export interface MySQLUser extends RowDataPacket {
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

export interface MySQLSession extends RowDataPacket {
  id: string;
  user_id: number;
  expires_at: Date;
  created_at: Date;
}

export interface MySQLItem extends RowDataPacket {
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

export interface MySQLRecipe extends RowDataPacket {
  id: number;
  result_item_id: number;
  ingredient_item_id: number;
  quantity: number;
}

// ============================================================
// MYSQL-SPECIFIC UTILITIES
// ============================================================

/**
 * Convert PostgreSQL-style placeholders ($1, $2, etc.) to MySQL-style (?)
 * This helps with migrating queries from PostgreSQL
 */
export function convertPlaceholders(sql: string): string {
  return sql.replace(/\$\d+/g, '?');
}

/**
 * Check if MySQL/MariaDB supports a specific feature
 */
export async function checkFeatureSupport(): Promise<{
  version: string;
  isMariaDB: boolean;
  supportsJSON: boolean;
  supportsCheckConstraints: boolean;
}> {
  const result = await queryOne<RowDataPacket>('SELECT VERSION() as version');
  const version = result?.version || '';
  const isMariaDB = version.toLowerCase().includes('mariadb');

  // Parse version number
  const versionMatch = version.match(/^(\d+)\.(\d+)/);
  const majorVersion = versionMatch ? parseInt(versionMatch[1], 10) : 0;
  const minorVersion = versionMatch ? parseInt(versionMatch[2], 10) : 0;

  return {
    version,
    isMariaDB,
    // JSON supported in MySQL 5.7+ and MariaDB 10.2+
    supportsJSON: isMariaDB ? (majorVersion >= 10 && minorVersion >= 2) : majorVersion >= 5,
    // CHECK constraints supported in MySQL 8.0+ and MariaDB 10.2+
    supportsCheckConstraints: isMariaDB ? (majorVersion >= 10 && minorVersion >= 2) : majorVersion >= 8,
  };
}
