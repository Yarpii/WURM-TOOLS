# Community Resources Setup

Dit document beschrijft hoe je het Community Resources systeem kunt instellen en gebruiken.

## Database Setup

Het Community Resources systeem voegt een nieuwe schema file toe die de benodigde tabellen aanmaakt.

### Installatie

1. **Database Schema Toepassen**:
   ```bash
   mysql -u <username> -p <database> < scripts/schema/16-community-resources.sql
   ```

   Of als je al een database connectie hebt in je applicatie, kun je het schema laden via:
   ```bash
   npm run db:setup
   ```

2. **Tabellen Verifiëren**:
   Het schema maakt de volgende tabellen aan:
   - `community_resources` - Hoofdtabel voor resources
   - `resource_versions` - Versiegeschiedenis van resources
   - `resource_ratings` - User ratings en reviews
   - `resource_comments` - Comments op resources

3. **Standaard Data**:
   Het schema voegt automatisch de Google Drive community folder toe als een featured resource.

## Features

### Voor Gebruikers

1. **Resources Bekijken**:
   - Ga naar `/resources`
   - Filter op type, categorie, of zoek op trefwoorden
   - Bekijk featured en populaire resources

2. **Resource Toevoegen**:
   - Login required
   - Klik op "Add Resource"
   - Vul naam, type, categorie, en URL in
   - Optioneel: Voeg beschrijving en tags toe

3. **Resource Details**:
   - Klik op een resource voor details
   - Download/open de resource
   - Geef een rating en review
   - Plaats comments

### Voor Admins

Admins hebben extra mogelijkheden:
- Resources als "featured" markeren
- Alle resources bewerken/verwijderen
- Resources modereren (is_approved flag)

## API Endpoints

### GET `/api/resources`
Haal resources op met optionele filters:
- `?resource_type=guide` - Filter op type (guide, tool, data, media, template, other)
- `?category=Crafting Guides` - Filter op categorie
- `?search=keyword` - Zoek in naam en beschrijving
- `?tags=guide,beginner` - Filter op tags
- `?featured=true` - Alleen featured resources
- `?popular=true` - Populaire resources (meest bekeken/gedownload)
- `?categories=true` - Haal lijst van categorieën op

### POST `/api/resources`
Maak een nieuwe resource aan:
```json
{
  "name": "Crafting Guide 2024",
  "description": "Complete guide voor crafting",
  "resource_type": "guide",
  "category": "Crafting Guides",
  "external_url": "https://example.com/guide",
  "tags": ["guide", "crafting", "beginner"]
}
```

### GET `/api/resources/[id]`
Haal details van een specifieke resource op

### POST `/api/resources/[id]`
Voer acties uit op een resource:
- `action: "download"` - Verhoog download counter
- `action: "rate"` - Geef een rating (1-5)
- `action: "comment"` - Plaats een comment
- `action: "add_version"` - Voeg een nieuwe versie toe (owner/admin)

### PUT `/api/resources/[id]`
Update een resource (owner/admin only)

### DELETE `/api/resources/[id]`
Verwijder een resource (owner/admin only)

## Database Schema Details

### community_resources
```sql
- id (INT, PRIMARY KEY)
- alliance_id (INT, NULL) - Optioneel gekoppeld aan alliance
- resource_type (ENUM) - Type: guide, tool, data, media, template, other
- name (VARCHAR 255) - Naam van de resource
- description (TEXT) - Beschrijving
- external_url (VARCHAR 1000) - Link naar externe resource (Google Drive, etc.)
- file_path (VARCHAR 500) - Lokaal bestand (toekomstige feature)
- file_size (BIGINT) - Bestandsgrootte in bytes
- category (VARCHAR 100) - Categorie
- tags (JSON) - Array van tags
- created_by (INT) - User ID van maker
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- view_count (INT) - Aantal keer bekeken
- download_count (INT) - Aantal keer gedownload
- is_approved (BOOLEAN) - Voor moderatie
- is_featured (BOOLEAN) - Featured resource
```

## Google Drive Community Folder

De Google Drive community folder is standaard toegevoegd als featured resource:
- **Naam**: WURM Community Resources (Google Drive)
- **URL**: https://drive.google.com/drive/folders/0B6J_aGQ6URL8UURFN2VadWxtSWs?resourcekey=0-DuurGPuGLSABmTTu7-999g
- **Type**: Data
- **Categorie**: Community Archives

## Toekomstige Features

Mogelijk toekomstige uitbreidingen:
- Lokale file uploads (via /public/resources/)
- Resource thumbnails/previews
- Automatische categorisatie
- Resource bundles/collections
- Download statistics & analytics
- Resource recommendations
- Integration met alliances (alliance-only resources)
