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

De bestanden zijn genummerd in de juiste volgorde. Importeer ze van 01 tot 13:

```bash
# Importeer alle seed bestanden in volgorde
for file in mysql/import_seed/*.sql; do
    echo "Importing $file..."
    mysql -u root -p wurmtools < "$file"
done
```

Of handmatig:

| # | Bestand | Tabel | Omschrijving |
|---|---------|-------|--------------|
| 01 | `01-pages.sql` | pages | Wiki pagina's |
| 02 | `02-categories.sql` | categories | Categorieën |
| 03 | `03-images.sql` | images | Afbeeldingen |
| 04 | `04-items.sql` | items | Craftable items |
| 05 | `05-infoboxes.sql` | infoboxes | Item info boxes |
| 06 | `06-page_categories.sql` | page_categories | Page-category links |
| 07 | `07-page_images.sql` | page_images | Page-image links |
| 08 | `08-page_links.sql` | page_links | Interne links |
| 09 | `09-page_sections.sql` | page_sections | Pagina secties |
| 10 | `10-infobox_fields.sql` | infobox_fields | Info box velden |
| 11 | `11-item_categories.sql` | item_categories | Item categorieën |
| 12 | `12-recipe_materials.sql` | recipe_materials | Recepten materialen |
| 13 | `13-recipe_steps.sql` | recipe_steps | Recepten stappen |

## Waarom deze volgorde?

De volgorde is bepaald door **foreign key dependencies**:

- `01-04`: Basis tabellen zonder dependencies
- `05-09`: Tabellen met foreign keys naar `pages`, `categories`, of `images`
- `10`: Heeft foreign key naar `infoboxes`
- `11-13`: Hebben foreign keys naar `items`

## Troubleshooting

### Foreign Key Constraint Errors

Als je toch foreign key errors krijgt (bijv. bij her-import), disable ze tijdelijk:

```sql
SET FOREIGN_KEY_CHECKS=0;
-- importeer alle bestanden
SET FOREIGN_KEY_CHECKS=1;
```

### Duplicate Key Errors

Bij her-import, truncate eerst alle tabellen:

```sql
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
