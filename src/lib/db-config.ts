/**
 * Database Configuration
 *
 * This module provides database configuration based on environment.
 * Supports both SQLite (local development) and PostgreSQL (production).
 */

export type DatabaseType = 'sqlite' | 'postgresql';

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
 * Get database configuration from environment variables
 */
export function getDatabaseConfig(): DatabaseConfig {
  const databaseUrl = process.env.DATABASE_URL;

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
 * Check if using PostgreSQL
 */
export function isPostgres(): boolean {
  return getDatabaseConfig().type === 'postgresql';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
