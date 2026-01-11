/**
 * Database Configuration
 *
 * This module provides database configuration based on environment.
 * Supports MySQL/MariaDB for production.
 */

export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  poolMin?: number;
  poolMax?: number;
}

/**
 * Parse a MySQL connection string
 * Format: mysql://user:password@host:port/database
 */
function parseMySQLConnectionString(url: string): Partial<DatabaseConfig> {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 3306,
      user: parsed.username,
      password: parsed.password,
      database: parsed.pathname.slice(1), // Remove leading /
    };
  } catch {
    return {};
  }
}

/**
 * Get database configuration from environment variables
 * Supports multiple connection formats for different platforms:
 * - DATABASE_URL (Vercel, Plesk, etc.)
 * - MYSQL_URL (Railway)
 * - Individual variables (MYSQLHOST, MYSQLPORT, etc.)
 */
export function getDatabaseConfig(): DatabaseConfig {
  // Try DATABASE_URL first (most common)
  let databaseUrl = process.env.DATABASE_URL;

  // Fall back to MYSQL_URL (Railway)
  if (!databaseUrl) {
    databaseUrl = process.env.MYSQL_URL;
  }

  // Fall back to individual variables (Railway also provides these)
  if (!databaseUrl && process.env.MYSQLHOST) {
    const host = process.env.MYSQLHOST;
    const port = process.env.MYSQLPORT || '3306';
    const user = process.env.MYSQLUSER || 'root';
    const password = process.env.MYSQLPASSWORD || '';
    const database = process.env.MYSQLDATABASE || '';
    databaseUrl = `mysql://${user}:${password}@${host}:${port}/${database}`;
  }

  if (!databaseUrl) {
    throw new Error(
      'Database connection not configured. Please set one of:\n' +
      '  - DATABASE_URL (format: mysql://user:password@host:port/database)\n' +
      '  - MYSQL_URL (Railway format)\n' +
      '  - MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE (individual variables)'
    );
  }

  if (!databaseUrl.startsWith('mysql://') && !databaseUrl.startsWith('mariadb://')) {
    throw new Error('Database URL must start with mysql:// or mariadb://');
  }

  const parsed = parseMySQLConnectionString(databaseUrl);
  return {
    connectionString: databaseUrl,
    ...parsed,
    ssl: process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : false,
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  };
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get the current database type name for logging
 */
export function getDatabaseTypeName(): string {
  return 'MySQL/MariaDB';
}
