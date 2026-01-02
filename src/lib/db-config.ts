/**
 * Database Configuration
 *
 * This module provides database configuration based on environment.
 * Supports SQLite (local development), PostgreSQL, and MySQL/MariaDB (production).
 */

export type DatabaseType = 'sqlite' | 'postgresql' | 'mysql';

export interface DatabaseConfig {
  type: DatabaseType;
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

  // If DATABASE_URL is set and starts with mysql://, use MySQL/MariaDB
  if (databaseUrl && (databaseUrl.startsWith('mysql://') || databaseUrl.startsWith('mariadb://'))) {
    const parsed = parseMySQLConnectionString(databaseUrl);
    return {
      type: 'mysql',
      connectionString: databaseUrl,
      ...parsed,
      ssl: process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : false,
      poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
      poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    };
  }

  // If DATABASE_URL is set and starts with postgresql://, use PostgreSQL
  if (databaseUrl && databaseUrl.startsWith('postgresql://')) {
    return {
      type: 'postgresql',
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === 'false'
        ? false
        : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' },
      poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
      poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    };
  }

  // Default to SQLite for local development
  return {
    type: 'sqlite',
  };
}

/**
 * Check if using MySQL/MariaDB
 */
export function isMySQL(): boolean {
  return getDatabaseConfig().type === 'mysql';
}

/**
 * Check if using PostgreSQL
 */
export function isPostgres(): boolean {
  return getDatabaseConfig().type === 'postgresql';
}

/**
 * Check if using SQLite
 */
export function isSQLite(): boolean {
  return getDatabaseConfig().type === 'sqlite';
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
  const config = getDatabaseConfig();
  switch (config.type) {
    case 'mysql':
      return 'MySQL/MariaDB';
    case 'postgresql':
      return 'PostgreSQL';
    case 'sqlite':
      return 'SQLite';
    default:
      return 'Unknown';
  }
}
