# WurmCalc

A crafting calculator for [WURM Online](https://www.wurmonline.com/) built with Next.js, TypeScript, and SQLite.

## Features

- **Material Calculator** - Calculate total base materials needed for any craftable item
- **Crafting Tree** - Visual breakdown of the complete crafting hierarchy
- **Reverse Lookup** - Find out what items you can craft with a specific material
- **Admin Panel** - Manage items and recipes with full CRUD operations
- **Data Management** - Import/export data as JSON for backup and sharing
- **Autocomplete Search** - Quick item search with keyboard navigation
- **Dark Theme** - Easy on the eyes with a custom dark color scheme
- **Market System** - Track merchants, orders, and alliances
- **User Authentication** - Secure session-based authentication with role management

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **better-sqlite3** - Fast SQLite database
- **Tailwind CSS v4** - Utility-first styling

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Required for production
NODE_ENV=production

# Optional: Custom database paths (defaults to project root)
# DATABASE_URL=./data/wurmcalc.sqlite
# SCRAPER_DB_PATH=./data/scraper-cache.sqlite
```

## Security Features

This application includes comprehensive security hardening:

### Authentication & Authorization
- Session-based authentication with secure httpOnly cookies
- PBKDF2-SHA512 password hashing with random salts
- Role-based access control (admin/user)
- All admin endpoints require authentication

### CSRF Protection
- `sameSite: "strict"` cookies prevent cross-site request forgery
- Secure flag enabled in production (HTTPS only)

### Rate Limiting
- In-memory rate limiting (100 requests/minute per IP)
- **Note:** For horizontal scaling, implement Redis-based rate limiting

### Security Headers
- Content Security Policy (CSP)
- X-Frame-Options: DENY (clickjacking protection)
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- HSTS enabled in production

### Input Validation & Sanitization
- All user inputs validated and sanitized
- XSS protection via HTML entity encoding
- SQL injection prevention via parameterized queries
- URL validation (HTTPS-only for external resources)

### Error Handling
- Production-safe error messages (no stack traces leaked)
- Detailed logging for debugging (server-side only)

### API Pagination
- All list endpoints support pagination to prevent DoS
- Usage: `?paginate=true&page=1&limit=50`
- Maximum 200 items per page

## Production Deployment Checklist

Before deploying to production, ensure:

- [ ] Set `NODE_ENV=production`
- [ ] Configure HTTPS with valid SSL certificate
- [ ] Set up proper database backups
- [ ] Replace in-memory rate limiting with Redis for horizontal scaling
- [ ] Configure proper logging and monitoring
- [ ] Review and restrict CORS if needed
- [ ] Set up proper firewall rules

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main calculator page
│   ├── admin/page.tsx        # Admin panel
│   ├── data/page.tsx         # Data import/export
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   └── api/
│       ├── auth/             # Authentication endpoints
│       ├── items/            # Items CRUD API
│       ├── calculate/        # Calculate materials API
│       ├── reverse/          # Reverse lookup API
│       ├── admin/            # Admin-only endpoints
│       ├── orders/           # Market orders API
│       ├── merchants/        # Merchants API
│       ├── alliances/        # Alliances API
│       └── data/             # Import/export API
├── lib/
│   ├── database.ts           # SQLite database layer
│   ├── auth.ts               # Authentication logic
│   ├── security.ts           # Security utilities
│   └── types.ts              # TypeScript interfaces
└── middleware.ts             # Rate limiting & security headers
```

## Usage

### Calculator Mode

1. Search for an item using the autocomplete
2. Set the quantity you want to craft
3. View the total base materials and crafting tree

### Reverse Lookup Mode

1. Switch to "Reverse Lookup" mode
2. Search for a material
3. See all items that can be crafted using that material
4. Toggle "Include indirect uses" for full dependency tree

### Admin Panel

- Add, edit, and delete items
- Manage recipe ingredients with quantity
- Automatic circular dependency detection
- Requires admin authentication

### Data Management

- Export all data as JSON backup
- Import data from JSON files
- Clear all data (with confirmation)
- Admin authentication required for dangerous operations

## API Reference

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/session` - Check session status

### Items (Admin auth required for mutations)
- `GET /api/items` - List items (supports `?paginate=true`)
- `POST /api/items` - Create item
- `PUT /api/items/[id]` - Update item
- `DELETE /api/items/[id]` - Delete item

### Market (Auth required)
- `GET /api/orders` - List orders (supports pagination)
- `GET /api/merchants` - List merchants (supports pagination)
- `GET /api/alliances` - List alliances (supports pagination)

## License

MIT
