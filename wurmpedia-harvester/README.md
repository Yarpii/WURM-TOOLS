# Wurmpedia Page Harvester

Standalone script to harvest all page titles from the Wurmpedia API.

## Usage

```bash
# Using Node.js (v18+)
node harvest.js

# Using TypeScript
npx ts-node harvest.ts

# Or via npm scripts
npm run harvest
```

## Output

Creates `wurmpedia-pages.json`:

```json
{
  "fetched_at": "2025-01-30T12:00:00Z",
  "total_pages": 5000,
  "pages": [
    { "pageid": 123, "title": "Hammer" },
    ...
  ]
}
```

## Features

- Paginates through all Wurmpedia pages (500 per request)
- Rate limited: 2 seconds between API calls
- Automatic retry on errors (3 attempts, 5s delay)
- Deduplication by page ID
- Progress logging
