/**
 * Unified Database Core
 *
 * This module provides a unified database interface that works with both:
 * - SQLite (local development)
 * - MySQL/MariaDB (production)
 *
 * The database type is automatically detected from the DATABASE_URL environment variable.
 */

import Database from "better-sqlite3";
import mysql, { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import path from "path";
import { getDatabaseConfig, isMySQL, isSQLite } from "../db-config";

// ========== SQLite Setup ==========
const DB_PATH = path.join(process.cwd(), "wurmcalc.sqlite");
let sqliteDb: Database.Database | null = null;

export function getSqliteDb(): Database.Database {
  if (!sqliteDb) {
    sqliteDb = new Database(DB_PATH);
    sqliteDb.pragma("journal_mode = WAL");
  }
  return sqliteDb;
}

// ========== MySQL Setup ==========
let mysqlPool: Pool | null = null;

export function getMySQLPool(): Pool {
  if (!mysqlPool) {
    const config = getDatabaseConfig();

    if (config.type !== 'mysql') {
      throw new Error('MySQL configuration not found. Set DATABASE_URL environment variable with mysql:// prefix.');
    }

    if (config.connectionString) {
      mysqlPool = mysql.createPool(config.connectionString);
    } else {
      mysqlPool = mysql.createPool({
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
        ssl: config.ssl ? {
          rejectUnauthorized: typeof config.ssl === 'object' ? config.ssl.rejectUnauthorized : true
        } : undefined,
      });
    }
  }
  return mysqlPool;
}

// ========== Unified Query Interface ==========

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

/**
 * Execute a query with parameterized placeholders
 * - For MySQL: Uses ? placeholders natively
 * - For SQLite: Converts PostgreSQL-style $1, $2 to ? placeholders
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  if (isMySQL()) {
    return queryMySQL<T>(sql, params);
  } else {
    return querySQLite<T>(sql, params);
  }
}

/**
 * MySQL query implementation
 */
async function queryMySQL<T>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const pool = getMySQLPool();

  // Convert PostgreSQL $1, $2 to MySQL ?
  let convertedSql = sql;
  let paramIndex = 1;
  while (convertedSql.includes(`$${paramIndex}`)) {
    convertedSql = convertedSql.replace(`$${paramIndex}`, "?");
    paramIndex++;
  }

  try {
    const isSelect = convertedSql.trim().toUpperCase().startsWith("SELECT");

    if (isSelect) {
      const [rows] = await pool.query<RowDataPacket[]>(convertedSql, params);
      return { rows: rows as T[], rowCount: rows.length };
    } else {
      const [result] = await pool.execute<ResultSetHeader>(convertedSql, params);
      return { rows: [], rowCount: result.affectedRows };
    }
  } catch (error) {
    console.error("MySQL Query error:", error);
    console.error("SQL:", convertedSql);
    console.error("Params:", params);
    throw error;
  }
}

/**
 * SQLite query implementation
 */
function querySQLite<T>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const database = getSqliteDb();

  // Convert PostgreSQL $1, $2 to SQLite ?
  let convertedSql = sql;
  let paramIndex = 1;
  while (convertedSql.includes(`$${paramIndex}`)) {
    convertedSql = convertedSql.replace(`$${paramIndex}`, "?");
    paramIndex++;
  }

  // Convert PostgreSQL/MySQL functions to SQLite equivalents
  convertedSql = convertedSql
    .replace(/NOW\(\)/gi, "datetime('now')")
    .replace(/CURRENT_TIMESTAMP/gi, "datetime('now')")
    .replace(/::text/gi, "")
    .replace(/::integer/gi, "")
    .replace(/::boolean/gi, "")
    .replace(/COALESCE\s*\(/gi, "IFNULL(");

  try {
    const isSelect = convertedSql.trim().toUpperCase().startsWith("SELECT");

    if (isSelect) {
      const stmt = database.prepare(convertedSql);
      const rows = stmt.all(...params) as T[];
      return Promise.resolve({ rows, rowCount: rows.length });
    } else {
      const stmt = database.prepare(convertedSql);
      const result = stmt.run(...params);
      return Promise.resolve({ rows: [], rowCount: result.changes });
    }
  } catch (error) {
    console.error("SQLite Query error:", error);
    console.error("SQL:", convertedSql);
    console.error("Params:", params);
    throw error;
  }
}

// ========== Client Interface for Transactions ==========

export interface DbClient {
  query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<QueryResult<T>>;
  release: () => void;
}

/**
 * Get a database client for transaction support
 */
export async function getClient(): Promise<DbClient> {
  if (isMySQL()) {
    const pool = getMySQLPool();
    const connection = await pool.getConnection();

    return {
      query: async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
        // Convert PostgreSQL $1, $2 to MySQL ?
        let convertedSql = sql;
        let paramIndex = 1;
        while (convertedSql.includes(`$${paramIndex}`)) {
          convertedSql = convertedSql.replace(`$${paramIndex}`, "?");
          paramIndex++;
        }

        const isSelect = convertedSql.trim().toUpperCase().startsWith("SELECT");

        if (isSelect) {
          const [rows] = await connection.query<RowDataPacket[]>(convertedSql, params);
          return { rows: rows as T[], rowCount: rows.length };
        } else {
          const [result] = await connection.execute<ResultSetHeader>(convertedSql, params);
          return { rows: [], rowCount: result.affectedRows };
        }
      },
      release: () => {
        connection.release();
      }
    };
  } else {
    // SQLite doesn't need connection pooling
    return {
      query: async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
        return querySQLite<T>(sql, params);
      },
      release: () => {
        // No-op for SQLite
      }
    };
  }
}

/**
 * Execute multiple queries in a transaction
 */
export async function withTransaction<T>(
  callback: (client: DbClient) => Promise<T>
): Promise<T> {
  if (isMySQL()) {
    const pool = getMySQLPool();
    const connection = await pool.getConnection();

    const client: DbClient = {
      query: async <R = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
        let convertedSql = sql;
        let paramIndex = 1;
        while (convertedSql.includes(`$${paramIndex}`)) {
          convertedSql = convertedSql.replace(`$${paramIndex}`, "?");
          paramIndex++;
        }

        const isSelect = convertedSql.trim().toUpperCase().startsWith("SELECT");

        if (isSelect) {
          const [rows] = await connection.query<RowDataPacket[]>(convertedSql, params);
          return { rows: rows as R[], rowCount: rows.length };
        } else {
          const [result] = await connection.execute<ResultSetHeader>(convertedSql, params);
          return { rows: [], rowCount: result.affectedRows };
        }
      },
      release: () => {
        connection.release();
      }
    };

    try {
      await connection.beginTransaction();
      const result = await callback(client);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } else {
    const database = getSqliteDb();
    const client: DbClient = {
      query: async <R = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
        return querySQLite<R>(sql, params);
      },
      release: () => {}
    };

    try {
      database.exec("BEGIN TRANSACTION");
      const result = await callback(client);
      database.exec("COMMIT");
      return result;
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
}

// ========== Backwards Compatibility ==========

/**
 * Get the SQLite database instance (for backwards compatibility with existing code)
 * This should only be used when you specifically need SQLite
 */
export function getDb(): Database.Database {
  return getSqliteDb();
}

/**
 * Close database connections
 */
export async function closeConnections(): Promise<void> {
  if (mysqlPool) {
    await mysqlPool.end();
    mysqlPool = null;
  }
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
}
