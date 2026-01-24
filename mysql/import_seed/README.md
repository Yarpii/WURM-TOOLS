# Import Seed Data

Seed data voor de WURM-TOOLS database. Deze bestanden bevatten de wurmpedia data die geïmporteerd moet worden na het aanmaken van het schema.

## Vereisten

Voordat je de seed data importeert, moet het schema eerst zijn aangemaakt:

```bash
# Draai eerst alle schema bestanden
for file in mysql/schema/*.sql; do
    mysql -u root -p wurmtools < "$file"
done
```

## Import Volgorde

**BELANGRIJK**: De bestanden moeten in de juiste volgorde worden geïmporteerd vanwege foreign key constraints.

### Import Script

```bash
#!/bin/bash
# import-seed.sh

DB_NAME="wurmtools"
SEED_DIR="mysql/import_seed"

# Disable foreign key checks for faster import
mysql -u root -p $DB_NAME -e "SET FOREIGN_KEY_CHECKS=0;"

# Stap 1: Basis tabellen (geen foreign keys)
echo "Importing pages..."
mysql -u root -p $DB_NAME < "$SEED_DIR/pages.sql"

echo "Importing categories..."
mysql -u root -p $DB_NAME < "$SEED_DIR/categories.sql"

echo "Importing images..."
mysql -u root -p $DB_NAME < "$SEED_DIR/images.sql"

echo "Importing items..."
mysql -u root -p $DB_NAME < "$SEED_DIR/items.sql"

# Stap 2: Tabellen met FK naar pages
echo "Importing infoboxes..."
mysql -u root -p $DB_NAME < "$SEED_DIR/infoboxes.sql"

echo "Importing page_categories..."
mysql -u root -p $DB_NAME < "$SEED_DIR/page_categories.sql"

echo "Importing page_images..."
mysql -u root -p $DB_NAME < "$SEED_DIR/page_images.sql"

echo "Importing page_links..."
mysql -u root -p $DB_NAME < "$SEED_DIR/page_links.sql"

echo "Importing page_sections..."
mysql -u root -p $DB_NAME < "$SEED_DIR/page_sections.sql"

# Stap 3: Tabellen met FK naar infoboxes
echo "Importing infobox_fields..."
mysql -u root -p $DB_NAME < "$SEED_DIR/infobox_fields.sql"

# Stap 4: Tabellen met FK naar items
echo "Importing item_categories..."
mysql -u root -p $DB_NAME < "$SEED_DIR/item_categories.sql"

echo "Importing recipe_materials..."
mysql -u root -p $DB_NAME < "$SEED_DIR/recipe_materials.sql"

echo "Importing recipe_steps..."
mysql -u root -p $DB_NAME < "$SEED_DIR/recipe_steps.sql"

# Re-enable foreign key checks
mysql -u root -p $DB_NAME -e "SET FOREIGN_KEY_CHECKS=1;"

echo "Import complete!"
```

## Handmatige Import Volgorde

Als je handmatig importeert, volg deze volgorde:

1. **Basis tabellen** (geen dependencies):
   - `pages.sql`
   - `categories.sql`
   - `images.sql`
   - `items.sql`

2. **Pagina-gerelateerde tabellen** (FK naar pages):
   - `infoboxes.sql`
   - `page_categories.sql`
   - `page_images.sql`
   - `page_links.sql`
   - `page_sections.sql`

3. **Infobox-gerelateerde tabellen** (FK naar infoboxes):
   - `infobox_fields.sql`

4. **Item-gerelateerde tabellen** (FK naar items):
   - `item_categories.sql`
   - `recipe_materials.sql`
   - `recipe_steps.sql`

## Troubleshooting

### Foreign Key Constraint Errors

Als je foreign key errors krijgt, disable ze tijdelijk:

```sql
SET FOREIGN_KEY_CHECKS=0;
-- Import je bestanden
SET FOREIGN_KEY_CHECKS=1;
```

### Duplicate Key Errors

Als je duplicate key errors krijgt bij her-import:

```sql
-- Truncate tabellen in omgekeerde volgorde
SET FOREIGN_KEY_CHECKS=0;
TRUNCATE TABLE infobox_fields;
TRUNCATE TABLE infoboxes;
TRUNCATE TABLE page_categories;
TRUNCATE TABLE page_images;
TRUNCATE TABLE page_links;
TRUNCATE TABLE page_sections;
TRUNCATE TABLE item_categories;
TRUNCATE TABLE recipe_materials;
TRUNCATE TABLE recipe_steps;
TRUNCATE TABLE items;
TRUNCATE TABLE pages;
TRUNCATE TABLE categories;
TRUNCATE TABLE images;
SET FOREIGN_KEY_CHECKS=1;
```

## Bestand Overzicht

| Bestand | Tabel | Records | Description |
|---------|-------|---------|-------------|
| pages.sql | pages | ~4000 | Wiki pagina's |
| categories.sql | categories | ~300 | Categorieën |
| images.sql | images | ~5000 | Afbeeldingen |
| items.sql | items | ~4000 | Craftable items |
| infoboxes.sql | infoboxes | ~3000 | Item info boxes |
| infobox_fields.sql | infobox_fields | ~25000 | Info box velden |
| page_categories.sql | page_categories | ~8000 | Page-category links |
| page_images.sql | page_images | ~6000 | Page-image links |
| page_links.sql | page_links | ~50000 | Interne links |
| page_sections.sql | page_sections | ~20000 | Pagina secties |
| item_categories.sql | item_categories | ~10000 | Item categorieën |
| recipe_materials.sql | recipe_materials | ~5000 | Recepten materialen |
| recipe_steps.sql | recipe_steps | ~10000 | Recepten stappen |
