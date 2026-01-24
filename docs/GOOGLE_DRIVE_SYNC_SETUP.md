# Google Drive Sync Setup Guide

Deze guide legt uit hoe je de automatische Google Drive synchronisatie instelt voor community resources.

## Wat doet het?

Het Google Drive Sync systeem:
- **Download** automatisch alle bestanden van een Google Drive folder naar je server
- **Synchroniseert** periodiek om updates te detecteren (standaard elke 6 uur)
- **Serveert** bestanden direct vanaf je server (veel sneller dan Google Drive links)
- **Bespaart** Google Drive traffic - gebruikers downloaden vanaf jouw server
- **Update tracking** - alleen gewijzigde bestanden worden opnieuw gedownload
- **Cleanup** - bestanden die uit Drive verwijderd zijn worden ook lokaal verwijderd

## Vereisten

1. **Google Cloud Project** met Drive API toegang
2. **Service Account** credentials
3. **Gedeelde Drive folder** (met de service account)

## Setup Stappen

### Stap 1: Google Cloud Project Setup

1. Ga naar [Google Cloud Console](https://console.cloud.google.com/)

2. **Maak een nieuw project** (of gebruik een bestaand):
   - Klik op de project selector bovenaan
   - Klik "New Project"
   - Geef een naam (bijv. "WURM Tools Drive Sync")
   - Klik "Create"

3. **Enable Google Drive API**:
   - Ga naar "APIs & Services" → "Library"
   - Zoek naar "Google Drive API"
   - Klik op de API en dan "Enable"

### Stap 2: Service Account Aanmaken

1. **Navigate naar Service Accounts**:
   - "APIs & Services" → "Credentials"
   - Klik "Create Credentials" → "Service Account"

2. **Service Account Details**:
   - Name: `wurm-tools-drive-sync`
   - Service account ID: (wordt automatisch gegenereerd)
   - Description: `Service account for syncing community resources from Google Drive`
   - Klik "Create and Continue"

3. **Grant Access** (optioneel):
   - Skip deze stap (geen rol nodig)
   - Klik "Continue"

4. **Done**:
   - Klik "Done"

### Stap 3: Service Account Key Downloaden

1. **Open de Service Account**:
   - Ga naar "APIs & Services" → "Credentials"
   - Klik op de service account die je net hebt aangemaakt

2. **Create Key**:
   - Ga naar de "Keys" tab
   - Klik "Add Key" → "Create new key"
   - Kies "JSON" format
   - Klik "Create"
   - **De key wordt automatisch gedownload** - bewaar deze veilig!

3. **Noteer het Service Account Email**:
   - Dit staat in de key file als `client_email`
   - Bijvoorbeeld: `wurm-tools-drive-sync@project-id.iam.gserviceaccount.com`

### Stap 4: Google Drive Folder Delen

1. **Open je Google Drive folder** met community resources

2. **Deel met Service Account**:
   - Klik op de folder → "Share"
   - Plak het **service account email** (uit stap 3)
   - Geef **Viewer** rechten (read-only is voldoende)
   - Klik "Send" (of "Share")

3. **Folder ID Ophalen**:
   - Open de folder in je browser
   - De URL is: `https://drive.google.com/drive/folders/FOLDER_ID?...`
   - Kopieer het `FOLDER_ID` gedeelte
   - Voor jouw folder: `0B6J_aGQ6URL8UURFN2VadWxtSWs`

### Stap 5: Configuratie in .env.local

1. **Open** `.env.local` in je project root (maak deze aan als die nog niet bestaat)

2. **Voeg de volgende configuratie toe**:

```bash
# Google Drive API Configuration
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com

# Option A: Paste entire JSON key as single line
GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"..."}

# Option B: Path to JSON key file (alternative)
# GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_FILE=/path/to/service-account-key.json

# Community folder configuration
GOOGLE_DRIVE_COMMUNITY_FOLDER_ID=0B6J_aGQ6URL8UURFN2VadWxtSWs
GOOGLE_DRIVE_RESOURCE_KEY=0-DuurGPuGLSABmTTu7-999g

# Sync settings
DRIVE_SYNC_INTERVAL_HOURS=6
DRIVE_SYNC_AUTO_ENABLED=true
DRIVE_MAX_FILE_SIZE_MB=100
```

**Belangrijk**:
- Voor `GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY`: Open de gedownloade JSON file, kopieer de HELE inhoud, en plak het als één regel
- Alternatief: Gebruik `GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_FILE` met het pad naar de JSON file

### Stap 6: Database Schema Toepassen

```bash
mysql -u your_username -p your_database < scripts/schema/16-community-resources.sql
```

Dit maakt de benodigde tabellen aan:
- `community_resources` - Resource metadata
- `resource_sync_metadata` - Sync tracking per bestand
- `resource_sync_log` - Sync geschiedenis
- `resource_ratings` - User ratings
- `resource_comments` - Comments

### Stap 7: Dependencies Installeren

```bash
npm install
```

Dit installeert de `googleapis` package die nodig is voor Google Drive API.

### Stap 8: Test de Sync

1. **Start je applicatie**:
   ```bash
   npm run dev
   ```

2. **Login als admin** op je website

3. **Ga naar de sync pagina**:
   - Navigate naar `/admin/sync`
   - Je zou de configuratie status moeten zien

4. **Trigger handmatige sync**:
   - Klik op "Sync Now"
   - De eerste sync kan enkele minuten duren afhankelijk van hoeveel bestanden er zijn
   - Monitor de progress in de console logs

5. **Verifieer de bestanden**:
   - Check `/public/resources/community/` - je bestanden zouden daar moeten staan
   - Check de database: `SELECT * FROM resource_sync_metadata;`

## Automatische Sync

### Productie Server

In productie start de scheduler automatisch:
```bash
NODE_ENV=production npm start
```

De scheduler:
- Start automatisch bij server boot
- Runt initiële sync na 1 minuut
- Runt daarna elke `DRIVE_SYNC_INTERVAL_HOURS` uur
- Logs worden naar console geschreven

### Development

In development moet je de scheduler handmatig enablen:
```bash
ENABLE_SCHEDULER=true npm run dev
```

Of gebruik handmatige sync via de admin UI.

### PM2 Configuration

Als je PM2 gebruikt, voeg dit toe aan je `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'wurm-tools',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      ENABLE_SCHEDULER: 'true'
    }
  }]
}
```

## Monitoring

### Admin Dashboard

- Ga naar `/admin/sync`
- Zie laatste sync status
- Bekijk statistieken (downloads, updates, errors)
- Trigger handmatige sync

### Logs

Sync logs worden geschreven naar:
- Console output (stdout)
- Database tabel `resource_sync_log`

Check logs:
```sql
SELECT * FROM resource_sync_log ORDER BY synced_at DESC LIMIT 10;
```

### Errors

Als er errors zijn tijdens sync:
- Check de errors array in de admin UI
- Check console logs voor details
- Veelvoorkomende issues:
  - Service account heeft geen toegang tot folder
  - API quota exceeded (verhoog quota in Google Cloud)
  - File size te groot (pas `DRIVE_MAX_FILE_SIZE_MB` aan)
  - Network timeout (tijdelijk, retry zal werken)

## File Storage

### Lokale Opslag

Bestanden worden opgeslagen in:
```
/public/resources/community/
  └── [Folder Structure from Drive]
      ├── file1.pdf
      ├── file2.xlsx
      └── subfolder/
          └── file3.png
```

### URL Toegang

Files zijn toegankelijk via:
```
https://your-domain.com/resources/community/file1.pdf
```

### Google Workspace Files

Google Docs, Sheets, etc. worden automatisch geëxporteerd:
- **Google Docs** → PDF
- **Google Sheets** → Excel (.xlsx)
- **Google Slides** → PDF

## Best Practices

### File Sizes

- Standaard max: 100MB per bestand
- Grotere files worden geskipped
- Pas aan met `DRIVE_MAX_FILE_SIZE_MB` env var

### Sync Frequency

- **Te vaak** (< 1 uur): Kan API quota bereiken
- **Te weinig** (> 24 uur): Updates worden traag zichtbaar
- **Aanbevolen**: 6-12 uur

### Storage Management

Monitor disk usage:
```bash
du -sh public/resources/community/
```

Cleanup indien nodig:
```sql
-- Files ouder dan 90 dagen die niet gesynct zijn
DELETE FROM resource_sync_metadata
WHERE last_synced_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

### Security

- ⚠️ **NOOIT** de service account key committen naar git
- Gebruik environment variables of secrets manager
- Service account heeft **alleen read** toegang nodig
- Gebruik `.gitignore` voor `.env.local` en JSON keys

### API Quota

Google Drive API heeft quota limits:
- **Queries per dag**: 1,000,000,000 (1 miljard)
- **Queries per 100 seconden per user**: 1,000

Voor normale gebruik is dit ruim voldoende. Bij problemen:
1. Ga naar Google Cloud Console
2. "APIs & Services" → "Quotas"
3. Verhoog de quota indien nodig

## Troubleshooting

### "Google Drive API is not configured"

Check:
- ✓ Service account key in `.env.local`
- ✓ JSON key is valid (test met `JSON.parse()`)
- ✓ Email adres klopt

### "Failed to list files: 404"

Check:
- ✓ Folder ID is correct
- ✓ Folder is gedeeld met service account email
- ✓ Service account heeft Viewer rechten

### "Permission denied"

Check:
- ✓ Service account email heeft toegang tot folder
- ✓ Alle subfolders zijn toegankelijk (inheritance)

### Files worden niet gedownload

Check:
- ✓ File size binnen limiet (`DRIVE_MAX_FILE_SIZE_MB`)
- ✓ File type wordt ondersteund
- ✓ Geen errors in sync log
- ✓ Disk space beschikbaar

### Sync is traag

Dit is normaal bij eerste sync met veel bestanden. Optimalisaties:
- Grotere `DRIVE_MAX_FILE_SIZE_MB` als je veel kleine files hebt
- Betere server internet verbinding
- Minder subfolders (flattere structuur)

## Onderhoud

### Manual Cleanup

Verwijder alle synced files:
```bash
rm -rf public/resources/community/*
```

Reset sync metadata:
```sql
TRUNCATE TABLE resource_sync_metadata;
TRUNCATE TABLE resource_sync_log;
```

Daarna trigger een nieuwe sync.

### Update Google Drive Folder

Als je naar een andere folder wilt switchen:
1. Deel nieuwe folder met service account
2. Update `GOOGLE_DRIVE_COMMUNITY_FOLDER_ID` in `.env.local`
3. Restart server
4. Trigger handmatige sync

### Disable Sync

Tijdelijk:
```bash
DRIVE_SYNC_AUTO_ENABLED=false
```

Permanent:
1. Verwijder Google Drive configuratie uit `.env.local`
2. Restart server

## Support

Bij problemen:
1. Check deze documentatie
2. Check console logs
3. Check admin sync UI voor errors
4. Verify Google Cloud setup
5. Test handmatige sync eerst

Veel succes! 🚀
