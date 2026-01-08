/**
 * Database Core
 *
 * This module provides the database interface for MySQL/MariaDB.
 * The database connection is configured via the DATABASE_URL environment variable.
 */

import mysql, { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getDatabaseConfig } from "../db-config";

// ========== MySQL Setup ==========
let mysqlPool: Pool | null = null;

export function getMySQLPool(): Pool {
  if (!mysqlPool) {
    const config = getDatabaseConfig();

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

// ========== Query Interface ==========

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

/**
 * Execute a query with parameterized placeholders
 * Uses ? placeholders natively for MySQL
 * Also supports PostgreSQL-style $1, $2 placeholders (converts them automatically)
 */
export async function query<T = Record<string, unknown>>(
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
    // Provide helpful error messages for common connection issues
    const err = error as { code?: string; message?: string };
    if (err.code === 'ECONNREFUSED') {
      console.error("MySQL Connection refused - is the database server running?");
      console.error("Check DATABASE_URL or database host/port configuration.");
      const dbError = new Error("Database connection refused. Please ensure MySQL is running.");
      (dbError as Error & { code: string }).code = 'ECONNREFUSED';
      throw dbError;
    }
    console.error("MySQL Query error:", error);
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
}

/**
 * Execute multiple queries in a transaction
 */
export async function withTransaction<T>(
  callback: (client: DbClient) => Promise<T>
): Promise<T> {
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
}

/**
 * Close database connections
 */
export async function closeConnections(): Promise<void> {
  if (mysqlPool) {
    await mysqlPool.end();
    mysqlPool = null;
  }
}
