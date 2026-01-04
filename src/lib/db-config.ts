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
 */
export function getDatabaseConfig(): DatabaseConfig {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required. Format: mysql://user:password@host:port/database');
  }

  if (!databaseUrl.startsWith('mysql://') && !databaseUrl.startsWith('mariadb://')) {
    throw new Error('DATABASE_URL must start with mysql:// or mariadb://');
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
