# WURM-TOOLS Database Schema

This directory contains the MySQL/MariaDB schema split into logical parts for easier importing.

## Import Order

Run these files **in order** on your MySQL/MariaDB database:

```bash
# Create the database first
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS wurmtools CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import schema files in order
mysql -u root -p wurmtools < 01-core.sql
mysql -u root -p wurmtools < 02-characters.sql
mysql -u root -p wurmtools < 03-crafting.sql
mysql -u root -p wurmtools < 04-market.sql
mysql -u root -p wurmtools < 05-alliances.sql
mysql -u root -p wurmtools < 06-projects.sql
mysql -u root -p wurmtools < 07-trading.sql
mysql -u root -p wurmtools < 08-map.sql
mysql -u root -p wurmtools < 09-treasure.sql
mysql -u root -p wurmtools < 10-gamification.sql
mysql -u root -p wurmtools < 11-player-hub.sql
mysql -u root -p wurmtools < 12-misc.sql
mysql -u root -p wurmtools < 13-seed-data.sql
mysql -u root -p wurmtools < 14-wurm-skills.sql
mysql -u root -p wurmtools < 15-recipes.sql
```

Or use this one-liner to import all files:

```bash
for f in 0*.sql 1*.sql; do mysql -u root -p wurmtools < "$f"; done
```

## File Contents

| File | Description | Dependencies |
|------|-------------|--------------|
| `01-core.sql` | Users & Sessions | None |
| `02-characters.sql` | Character Showcase | 01 |
| `03-crafting.sql` | Items & Recipes | 01 |
| `04-market.sql` | Orders, Merchants, Price Tracking | 01, 02 |
| `05-alliances.sql` | Alliances & Members | 01 |
| `06-projects.sql` | Projects & Project Items | 01, 02, 03, 05 |
| `07-trading.sql` | Trade Matches & Ratings | 01, 04 |
| `08-map.sql` | Map Locations | 01, 04, 05 |
| `09-treasure.sql` | Treasure Hunting | 01, 02, 05 |
| `10-gamification.sql` | XP & Achievements | 01 |
| `11-player-hub.sql` | Skills, Timers, Events | 01, 02 |
| `12-misc.sql` | Webhooks, Prospects, Submissions | 01 |
| `13-seed-data.sql` | Base Items & Presets | 03, 10, 11 |
| `14-wurm-skills.sql` | Wurm Skills Reference | 11 |
| `15-recipes.sql` | Crafting Recipes | 03, 13 |

## Notes

- All tables use `IF NOT EXISTS` so they can be safely re-run
- Seed data uses `INSERT IGNORE` to avoid duplicates
- The full schema is still available in `../schema-mysql.sql`
