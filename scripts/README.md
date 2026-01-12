# Scripts Folder

Database schema en scripts voor WURM-TOOLS.

## Folder Structuur

```
/scripts
├── /schema              # Gesplitste schema bestanden (genummerd)
│   ├── 01-core.sql      # Users, sessions, basis tabellen
│   ├── 02-characters.sql
│   ├── 03-crafting.sql
│   ├── 04-market.sql
│   ├── 05-alliances.sql
│   ├── 06-projects.sql
│   ├── 07-trading.sql
│   ├── 08-map.sql
│   ├── 09-treasure.sql
│   ├── 10-gamification.sql
│   ├── 11-player-hub.sql
│   ├── 12-misc.sql
│   ├── 13-seed-data.sql
│   ├── 14-wurm-skills.sql
│   ├── 15-recipes.sql
│   └── 16-community-resources.sql
│
├── /migrations          # Database migrations (voor bestaande databases)
│   ├── add-banner-url.sql
│   ├── add-characters.sql
│   ├── add-dashboard-indexes.sql
│   ├── add-discord-id.sql
│   └── add-is-complete-column.sql
│
├── /setup               # Quick-start scripts
│   └── railway-minimal-setup.sql
│
├── /Maps                # Archive map images (per server/date)
│
├── combine-schema.sh    # Script om alle schema's te combineren
├── schema-mysql.sql     # Gecombineerd schema (auto-generated)
└── README.md            # Dit bestand
```

## Gebruik

### Nieuwe Database Opzetten

**Optie 1: Gecombineerd schema (aanbevolen)**
```bash
mysql -u root -p wurmtools < scripts/schema-mysql.sql
```

**Optie 2: Individuele bestanden**
```bash
for file in scripts/schema/*.sql; do
    mysql -u root -p wurmtools < "$file"
done
```

**Optie 3: Minimal setup (alleen users/sessions)**
```bash
mysql -u root -p wurmtools < scripts/setup/railway-minimal-setup.sql
```

### Migrations Draaien

Voor bestaande databases, draai alleen de benodigde migrations:

```bash
mysql -u root -p wurmtools < scripts/migrations/add-dashboard-indexes.sql
```

### Schema Regenereren

Als je wijzigingen maakt in `/schema/*.sql`, regenereer het gecombineerde bestand:

```bash
cd scripts
./combine-schema.sh > schema-mysql.sql
```

## Regels

1. **NOOIT** direct `schema-mysql.sql` bewerken - bewerk de individuele bestanden in `/schema/`
2. Nieuwe features → nieuw genummerd bestand in `/schema/` (bijv. `17-nieuwe-feature.sql`)
3. Wijzigingen aan bestaande tabellen → migration in `/migrations/`
4. Na elke wijziging → `./combine-schema.sh > schema-mysql.sql` draaien
