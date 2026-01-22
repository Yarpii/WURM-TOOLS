# Wurmpedia Items API

Standalone API voor items.wurm.online - serveert Wurmpedia data.

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

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/search?q=barrel` | Search pages by title |
| GET | `/api/pages/:slug` | Get page by slug |
| GET | `/api/pages/:slug/infobox` | Get infobox for page |
| GET | `/api/pages/:slug/sections` | Get body sections for page |

## Frontend

Open `http://localhost:3030` in je browser voor de DB Viewer.
