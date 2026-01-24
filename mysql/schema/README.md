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
mysql -u root -p wurmtools < 16-community-resources.sql
mysql -u root -p wurmtools < 17-community-roles.sql
mysql -u root -p wurmtools < 18-wurmpedia-recipes.sql
mysql -u root -p wurmtools < 19-cooking-system.sql
mysql -u root -p wurmtools < 20-archaeology.sql
mysql -u root -p wurmtools < 21-discord-email-auth.sql
```

Or use this one-liner to import all files:

```bash
for f in 0*.sql 1*.sql 2*.sql; do mysql -u root -p wurmtools < "$f"; done
```

## File Contents

| File | Description | Dependencies |
|------|-------------|--------------|
| `01-core.sql` | Users & Sessions | None |
| `02-characters.sql` | Character Showcase | 01 |
| `03-crafting.sql` | **Items & Recipes (NEW structured tables)** | 01 |
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
| `15-recipes.sql` | Legacy Recipe Seed Data | 03, 13 |
| `16-community-resources.sql` | Community Resources | 01 |
| `17-community-roles.sql` | Community Roles | 01 |
| `18-wurmpedia-recipes.sql` | Wurmpedia Import Tables | 01 |
| `19-cooking-system.sql` | Cooking System | 01 |
| `20-archaeology.sql` | Archaeology Pinpoints | 01 |
| `21-discord-email-auth.sql` | Discord & Email Auth | 01 |

## Crafting System Tables (03-crafting.sql)

The crafting system uses structured tables for accurate recipe data:

### New Tables (Primary)

| Table | Description |
|-------|-------------|
| `items` | Craftable items with skill, difficulty, time |
| `recipe_materials` | Materials needed per item (quantity, unit) |
| `recipe_tools` | Tools needed per item (workstations) |
| `recipe_steps` | Creation instructions (activate, right-click, submenu) |
| `item_categories` | Categories per item for filtering |

### Legacy Tables (Backwards Compatibility)

| Table | Description |
|-------|-------------|
| `legacy_items` | Old simple items table |
| `legacy_recipes` | Old result→ingredient relationships |

### Useful Views

| View | Description |
|------|-------------|
| `v_items_summary` | Items with material/tool counts |
| `v_recipes` | Full recipe with materials joined |
| `v_material_uses` | Reverse lookup: what can I craft with this material? |

## Notes

- All tables use `IF NOT EXISTS` so they can be safely re-run
- Seed data uses `INSERT IGNORE` to avoid duplicates
- The full schema is still available in `../schema-mysql.sql`
- Recipe data is imported from Wurmpedia using the `/api/wurmpedia` endpoints
