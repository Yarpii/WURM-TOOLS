#!/usr/bin/env npx ts-node
/**
 * Migration Script: SQLite to MySQL/MariaDB
 *
 * This script exports data from the local SQLite database and imports it
 * into the remote MySQL/MariaDB database.
 *
 * Usage:
 *   1. Set DATABASE_URL environment variable to your MySQL connection string
 *      Format: mysql://user:password@host:3306/database
 *   2. Run: npx ts-node scripts/migrate-to-mysql.ts
 *
 * Options:
 *   --dry-run    Show what would be migrated without making changes
 *   --skip-seed  Skip seeding default items/recipes (use if already seeded)
 *   --from-pg    Migrate from PostgreSQL instead of SQLite
 */

import Database from 'better-sqlite3';
import mysql, { Pool, RowDataPacket } from 'mysql2/promise';
import path from 'path';
import fs from 'fs';

// Configuration
const SQLITE_PATH = path.join(process.cwd(), 'wurmcalc.sqlite');
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_SEED = process.argv.includes('--skip-seed');
const FROM_PG = process.argv.includes('--from-pg');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTable(name: string, count: number) {
  console.log(`  ${colors.cyan}→${colors.reset} ${name}: ${colors.green}${count} records${colors.reset}`);
}

interface TableInfo {
  name: string;
  columns: string[];
  hasAutoIncrement: boolean;
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════╗', 'blue');
  log('║     SQLite to MySQL/MariaDB Migration                   ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝\n', 'blue');

  if (DRY_RUN) {
    log('🔍 DRY RUN MODE - No changes will be made\n', 'yellow');
  }

  // Check SQLite database exists
  if (!fs.existsSync(SQLITE_PATH)) {
    log(`❌ SQLite database not found at: ${SQLITE_PATH}`, 'red');
    log('   Make sure you have a wurmcalc.sqlite file in your project root.', 'red');
    process.exit(1);
  }

  // Check MySQL connection string
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    log('❌ DATABASE_URL environment variable not set', 'red');
    log('   Set it to your MySQL/MariaDB connection string:', 'red');
    log('   export DATABASE_URL="mysql://user:pass@host:3306/dbname"\n', 'yellow');
    process.exit(1);
  }

  if (!DATABASE_URL.startsWith('mysql://') && !DATABASE_URL.startsWith('mariadb://')) {
    log('❌ DATABASE_URL must start with mysql:// or mariadb://', 'red');
    log('   Current value: ' + DATABASE_URL.substring(0, 20) + '...', 'red');
    process.exit(1);
  }

  log('📂 SQLite database: ' + SQLITE_PATH, 'cyan');
  log('🐬 MySQL/MariaDB: ' + DATABASE_URL.replace(/:[^:@]+@/, ':****@'), 'cyan');
  log('');

  // Connect to SQLite
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  log('✅ Connected to SQLite', 'green');

  // Connect to MySQL
  const mysqlPool = mysql.createPool(DATABASE_URL);

  try {
    await mysqlPool.query('SELECT 1');
    log('✅ Connected to MySQL/MariaDB\n', 'green');

    // Get MySQL version info
    const [versionRows] = await mysqlPool.query<RowDataPacket[]>('SELECT VERSION() as version');
    const version = versionRows[0]?.version || 'unknown';
    log(`   Server version: ${version}`, 'cyan');
  } catch (error) {
    log(`❌ Failed to connect to MySQL/MariaDB: ${(error as Error).message}`, 'red');
    process.exit(1);
  }

  // Tables to migrate (in order due to foreign key constraints)
  const tablesToMigrate = [
    'users',
    'sessions',
    'items',
    'recipes',
    'alliances',
    'alliance_members',
    'alliance_invites',
    'orders',
    'merchants',
    'price_history',
    'price_alerts',
    'projects',
    'project_items',
    'trade_matches',
    'user_ratings',
    'map_locations',
    'user_xp',
    'user_achievements',
    'discord_webhooks',
    'prospect_pages',
    'prospects',
    'user_skills',
    'skill_history',
    'user_timers',
    'timer_presets',
    'events',
    'event_attendees',
    'wurm_skills',
  ];

  // Get table info from SQLite
  const getTableInfo = (tableName: string): TableInfo | null => {
    try {
      const tableInfo = sqlite
        .prepare(`PRAGMA table_info(${tableName})`)
        .all() as { name: string; pk: number }[];

      if (tableInfo.length === 0) return null;

      return {
        name: tableName,
        columns: tableInfo.map((col) => col.name),
        hasAutoIncrement: tableInfo.some((col) => col.pk === 1),
      };
    } catch {
      return null;
    }
  };

  // Count records in SQLite
  log('\n📊 Analyzing SQLite database...', 'blue');
  const stats: { table: string; count: number }[] = [];

  for (const tableName of tablesToMigrate) {
    const info = getTableInfo(tableName);
    if (info) {
      const count = (
        sqlite.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number }
      ).count;
      stats.push({ table: tableName, count });
      logTable(tableName, count);
    }
  }

  const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);
  log(`\n📈 Total records to migrate: ${totalRecords}\n`, 'cyan');

  if (DRY_RUN) {
    log('🔍 Dry run complete. No data was migrated.', 'yellow');
    log('   Remove --dry-run flag to perform actual migration.\n', 'yellow');
    sqlite.close();
    await mysqlPool.end();
    process.exit(0);
  }

  // Ask for confirmation
  log('⚠️  This will INSERT data into your MySQL/MariaDB database.', 'yellow');
  log('   Existing data with conflicting IDs may cause errors.', 'yellow');
  log('   Consider running scripts/schema-mysql.sql first on an empty database.\n', 'yellow');

  // Migrate data
  log('🚀 Starting migration...', 'blue');

  const connection = await mysqlPool.getConnection();

  try {
    // Disable foreign key checks for migration
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.beginTransaction();

    for (const tableName of tablesToMigrate) {
      const info = getTableInfo(tableName);
      if (!info) continue;

      const count = stats.find((s) => s.table === tableName)?.count || 0;
      if (count === 0) {
        log(`   ⏭️  Skipping ${tableName} (no records)`, 'yellow');
        continue;
      }

      log(`   📦 Migrating ${tableName}...`, 'cyan');

      // Get all records from SQLite
      const records = sqlite.prepare(`SELECT * FROM ${tableName}`).all() as Record<string, unknown>[];

      // Insert into MySQL
      let inserted = 0;
      for (const record of records) {
        const columns = Object.keys(record).filter((col) => record[col] !== undefined);
        const values = columns.map((col) => {
          const val = record[col];
          // Convert SQLite booleans (0/1) to MySQL booleans
          if (val === 0 || val === 1) {
            const boolColumns = [
              'is_base_material', 'is_active', 'is_public', 'is_shared',
              'is_verified', 'is_banned', 'show_in_members_list', 'show_email',
              'show_location', 'is_default', 'notify_trades', 'notify_matches',
              'notify_price_alerts', 'notify_alliance', 'completed', 'is_recurring',
              'notify_discord', 'is_all_day', 'is_featured'
            ];
            if (boolColumns.includes(col)) {
              return val === 1;
            }
          }
          return val;
        });

        const placeholders = columns.map(() => '?').join(', ');
        const columnNames = columns.map((col) => `\`${col}\``).join(', ');

        try {
          await connection.query(
            `INSERT IGNORE INTO ${tableName} (${columnNames}) VALUES (${placeholders})`,
            values
          );
          inserted++;
        } catch (error) {
          log(`      ⚠️  Error inserting record: ${(error as Error).message}`, 'yellow');
        }
      }

      log(`      ✅ Inserted ${inserted}/${records.length} records`, 'green');
    }

    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.commit();
    log('\n✅ Migration completed successfully!', 'green');

  } catch (error) {
    await connection.rollback();
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    log(`\n❌ Migration failed: ${(error as Error).message}`, 'red');
    throw error;
  } finally {
    connection.release();
  }

  // Cleanup
  sqlite.close();
  await mysqlPool.end();

  log('\n╔════════════════════════════════════════════════════════╗', 'green');
  log('║     Migration Complete!                                  ║', 'green');
  log('╚════════════════════════════════════════════════════════╝', 'green');
  log('\nNext steps:', 'cyan');
  log('  1. Update your .env.local with DATABASE_URL=mysql://...', 'reset');
  log('  2. Test your application with: npm run dev', 'reset');
  log('  3. Deploy to production\n', 'reset');
}

main().catch((error) => {
  console.error('Migration error:', error);
  process.exit(1);
});
