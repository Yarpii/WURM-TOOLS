# Wurmpedia Page Harvester

Standalone scripts to harvest and categorize all pages from the Wurmpedia API.

## Scripts

### Basic Harvester (`harvest.js`)
Simple harvester - just fetches all page titles.

```bash
node harvest.js
# or
npm run harvest
```

**Output:** `wurmpedia-pages.json`

### Enhanced Harvester (`harvest-enhanced.js`) ⭐
Advanced harvester with categorization and classification.

```bash
node harvest-enhanced.js
# or
npm run harvest:enhanced
```

**Output:**
- `wurmpedia-pages.json` - Simple list (backwards compatible)
- `wurmpedia-categorized.json` - Full categorized data

## Enhanced Output Format

```json
{
  "fetched_at": "2025-01-30T12:00:00Z",
  "stats": {
    "total_pages": 5000,
    "pages_with_wiki_categories": 4200,
    "auto_category_counts": {
      "skills": 150,
      "tools": 89,
      "weapons": 75,
      "creatures": 120,
      ...
    },
    "top_wiki_categories": {
      "Items": 800,
      "Skills": 150,
      ...
    }
  },
  "by_auto_category": {
    "skills": [
      { "pageid": 123, "title": "Blacksmithing" },
      ...
    ],
    "tools": [...],
    "weapons": [...],
    "creatures": [...],
    "materials": [...],
    "food": [...],
    "buildings": [...],
    "furniture": [...],
    "vehicles": [...],
    "containers": [...],
    "gods": [...],
    "enchantments": [...],
    "mechanics": [...],
    "uncategorized": [...]
  },
  "by_wiki_category": {
    "Items": [...],
    "Skills": [...],
    ...
  },
  "all_pages": [
    {
      "pageid": 123,
      "title": "Hammer",
      "ns": 0,
      "wiki_categories": ["Items", "Tools"],
      "auto_categories": ["tools"]
    },
    ...
  ]
}
```

## Auto-Classification Categories

The enhanced harvester automatically classifies pages based on title patterns:

| Category | Examples |
|----------|----------|
| `skills` | Blacksmithing, Mining, Carpentry |
| `tools` | Hammer, Pickaxe, Saw |
| `weapons` | Longsword, Huge axe, Long bow |
| `armor` | Plate helm, Chain jacket |
| `creatures` | Wolf, Troll, Dragon |
| `materials` | Iron, Oak, Leather |
| `food` | Meal, Stew, Bread |
| `buildings` | House, Tower, Bridge |
| `furniture` | Bed, Table, Chest |
| `vehicles` | Cart, Sailboat, Knarr |
| `containers` | Barrel, Backpack, Crate |
| `gods` | Fo, Magranon, Vynora |
| `enchantments` | Circle of Cunning, Wind of Ages |
| `mechanics` | Skill gain, Affinity, Karma |
| `uncategorized` | Pages that don't match patterns |

## Features

- **Two-phase harvesting**: First collects all pages, then fetches wiki categories
- **Auto-classification**: Pattern-based detection for common item types
- **Wiki categories**: Real categories from Wurmpedia
- **Deduplication**: By page ID
- **Rate limiting**: 2 seconds between API calls
- **Retry on error**: 3 attempts with 5s delay
- **Progress logging**: See what's happening
- **Statistics**: Category counts and summaries

## Requirements

- Node.js 18+ (uses native `fetch`)
