# Wurmpedia Items API

Standalone API voor items.wurm.tools - serveert Wurmpedia data.

## Setup

```bash
cd api
npm install
cp .env.example .env
# Edit .env with your database credentials
node index.js
```

## Database

Importeer eerst het schema:

```bash
mysql -u root -p wurmpedia < schema.sql
```

## Endpoints

### Pages (Wurmpedia)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + DB status |
| GET | `/api/search?q=barrel` | Search pages by title |
| GET | `/api/pages/:slug` | Get page by slug |
| GET | `/api/pages/:slug/infobox` | Get infobox for page |
| GET | `/api/pages/:slug/sections` | Get body sections for page |

### Items (Crafting)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items?q=&category=&limit=50&offset=0` | List items with infobox |
| GET | `/api/items/:slug` | Get item with full infobox + recipe data |
| GET | `/api/items/:slug/recipe` | Get recipe/materials for item |
| GET | `/api/categories` | List all categories with counts |

### Example Response: `/api/items/:slug`

```json
{
  "slug": "small_barrel",
  "title": "Small barrel",
  "image": "https://...",
  "skill": "Fine carpentry",
  "materials": [
    { "raw": "7.00 kg plank", "links": [{ "href": "/wiki/Plank", "text": "plank" }] }
  ],
  "tools": [...],
  "categories": ["Containers", "Carpentry items"]
}
```

## Frontend

Open `http://localhost:3030` in je browser voor de DB Viewer.
