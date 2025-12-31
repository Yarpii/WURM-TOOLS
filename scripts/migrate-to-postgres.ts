#!/usr/bin/env npx ts-node
/**
 * Migration Script: SQLite to PostgreSQL
 *
 * This script exports data from the local SQLite database and imports it
 * into the remote PostgreSQL database.
 *
 * Usage:
 *   1. Set DATABASE_URL environment variable to your PostgreSQL connection string
 *   2. Run: npx ts-node scripts/migrate-to-postgres.ts
 *
 * Options:
 *   --dry-run    Show what would be migrated without making changes
 *   --skip-seed  Skip seeding default items/recipes (use if already seeded)
 */

import Database from 'better-sqlite3';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

// Configuration
const SQLITE_PATH = path.join(process.cwd(), 'wurmcalc.sqlite');
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_SEED = process.argv.includes('--skip-seed');

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
  log('║     SQLite to PostgreSQL Migration                      ║', 'blue');
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

  // Check PostgreSQL connection string
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    log('❌ DATABASE_URL environment variable not set', 'red');
    log('   Set it to your PostgreSQL connection string:', 'red');
    log('   export DATABASE_URL="postgresql://user:pass@host:5432/dbname"\n', 'yellow');
    process.exit(1);
  }

  log('📂 SQLite database: ' + SQLITE_PATH, 'cyan');
  log('🐘 PostgreSQL: ' + DATABASE_URL.replace(/:[^:@]+@/, ':****@'), 'cyan');
  log('');

  // Connect to SQLite
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  log('✅ Connected to SQLite', 'green');

  // Connect to PostgreSQL
  const pg = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  try {
    await pg.query('SELECT 1');
    log('✅ Connected to PostgreSQL\n', 'green');
  } catch (error) {
    log(`❌ Failed to connect to PostgreSQL: ${(error as Error).message}`, 'red');
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
  log('📊 Analyzing SQLite database...', 'blue');
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
    process.exit(0);
  }

  // Ask for confirmation
  log('⚠️  This will INSERT data into your PostgreSQL database.', 'yellow');
  log('   Existing data with conflicting IDs may cause errors.', 'yellow');
  log('   Consider running scripts/schema.sql first on an empty database.\n', 'yellow');

  // Migrate data
  log('🚀 Starting migration...', 'blue');

  const client = await pg.connect();

  try {
    await client.query('BEGIN');

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

      // Insert into PostgreSQL
      let inserted = 0;
      for (const record of records) {
        const columns = Object.keys(record).filter((col) => record[col] !== undefined);
        const values = columns.map((col) => {
          const val = record[col];
          // Convert SQLite booleans (0/1) to PostgreSQL booleans
          if (val === 0 || val === 1) {
            const boolColumns = [
              'is_base_material', 'is_active', 'is_public', 'is_shared',
              'is_verified', 'is_banned', 'show_in_members_list', 'show_email',
              'show_location', 'is_default', 'notify_trades', 'notify_matches',
              'notify_price_alerts', 'notify_alliance', 'completed'
            ];
            if (boolColumns.includes(col)) {
              return val === 1;
            }
          }
          return val;
        });

        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const columnNames = columns.map((col) => `"${col}"`).join(', ');

        try {
          await client.query(
            `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
            values
          );
          inserted++;
        } catch (error) {
          log(`      ⚠️  Error inserting record: ${(error as Error).message}`, 'yellow');
        }
      }

      log(`      ✅ Inserted ${inserted}/${records.length} records`, 'green');

      // Reset sequence for auto-increment columns
      if (info.hasAutoIncrement) {
        try {
          await client.query(`
            SELECT setval(pg_get_serial_sequence('${tableName}', 'id'),
                          COALESCE((SELECT MAX(id) FROM ${tableName}), 1))
          `);
        } catch {
          // Sequence might not exist, ignore
        }
      }
    }

    await client.query('COMMIT');
    log('\n✅ Migration completed successfully!', 'green');

  } catch (error) {
    await client.query('ROLLBACK');
    log(`\n❌ Migration failed: ${(error as Error).message}`, 'red');
    throw error;
  } finally {
    client.release();
  }

  // Cleanup
  sqlite.close();
  await pg.end();

  log('\n╔════════════════════════════════════════════════════════╗', 'green');
  log('║     Migration Complete!                                  ║', 'green');
  log('╚════════════════════════════════════════════════════════╝', 'green');
  log('\nNext steps:', 'cyan');
  log('  1. Update your .env.local with DATABASE_URL', 'reset');
  log('  2. Test your application with: npm run dev', 'reset');
  log('  3. Deploy to production\n', 'reset');
}

main().catch((error) => {
  console.error('Migration error:', error);
  process.exit(1);
});
