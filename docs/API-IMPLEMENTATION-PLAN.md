# Wurm Tools API Implementation Plan

> **Doel**: Externe API voor Discord bots en third-party integraties
> **Domein**: `api.wurm.tools`
> **Status**: Planning fase

---

## Overzicht

Dit document beschrijft de implementatie van een publieke API voor Wurm Tools.
De API maakt het mogelijk voor:
- Discord bots om live data op te halen
- Externe websites om te integreren
- Developers om tools te bouwen voor de Wurm community

---

## Fase 1: Basis API Systeem

### 1.1 Database Migratie

**Bestand**: `scripts/migrations/add-api-keys.sql`

```sql
-- API Keys tabel
CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,              -- "Mijn Discord Bot"
    key_hash VARCHAR(255) NOT NULL,          -- Gehashte key (SHA-256)
    key_prefix VARCHAR(12) NOT NULL,         -- "wt_abc12345" voor display
    description TEXT,                        -- Optionele beschrijving
    scopes JSON DEFAULT '["read:public"]',   -- Permissies
    rate_limit_per_minute INT DEFAULT 60,    -- Requests per minuut
    is_active BOOLEAN DEFAULT TRUE,
    request_count BIGINT DEFAULT 0,          -- Totaal requests
    last_used_at TIMESTAMP NULL,
    last_used_ip VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,               -- NULL = nooit
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_key_hash (key_hash),
    INDEX idx_user_id (user_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- API Request Logging (optioneel, voor analytics)
CREATE TABLE IF NOT EXISTS api_request_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    api_key_id INT NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT NOT NULL,
    response_time_ms INT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
    INDEX idx_api_key_id (api_key_id),
    INDEX idx_created_at (created_at),
    INDEX idx_endpoint (endpoint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cleanup oude logs (event scheduler)
-- DELETE FROM api_request_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### 1.2 API Key Library

**Bestand**: `src/lib/api-keys.ts`

```typescript
import crypto from "crypto";
import { query } from "./db/core";

// ========== TYPES ==========

export interface ApiKey {
  id: number;
  user_id: number;
  name: string;
  key_prefix: string;
  description?: string;
  scopes: string[];
  rate_limit_per_minute: number;
  is_active: boolean;
  request_count: number;
  last_used_at?: string;
  created_at: string;
  expires_at?: string;
}

export interface ApiKeyWithUser extends ApiKey {
  username: string;
}

// ========== KEY GENERATION ==========

/**
 * Genereer een nieuwe API key
 * Format: wt_[32 random chars] = 35 chars totaal
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const randomPart = crypto.randomBytes(24).toString("base64url"); // 32 chars
  const key = `wt_${randomPart}`;
  const hash = hashApiKey(key);
  const prefix = key.substring(0, 12); // "wt_abc12345..."

  return { key, hash, prefix };
}

/**
 * Hash een API key voor opslag (SHA-256)
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// ========== CRUD OPERATIONS ==========

/**
 * Maak een nieuwe API key aan
 */
export async function createApiKey(
  userId: number,
  name: string,
  options?: {
    description?: string;
    scopes?: string[];
    rate_limit_per_minute?: number;
    expires_at?: Date;
  }
): Promise<{ success: true; key: string; apiKey: ApiKey } | { success: false; error: string }> {
  // Check max keys per user (limit: 5)
  const countResult = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM api_keys WHERE user_id = ?",
    [userId]
  );

  if (countResult.rows[0].count >= 5) {
    return { success: false, error: "Maximum 5 API keys per user" };
  }

  // Genereer key
  const { key, hash, prefix } = generateApiKey();

  // Insert
  const scopes = options?.scopes || ["read:public"];
  const rateLimit = options?.rate_limit_per_minute || 60;

  await query(
    `INSERT INTO api_keys
     (user_id, name, key_hash, key_prefix, description, scopes, rate_limit_per_minute, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      name,
      hash,
      prefix,
      options?.description || null,
      JSON.stringify(scopes),
      rateLimit,
      options?.expires_at || null,
    ]
  );

  // Get inserted key
  const result = await query<ApiKey>(
    "SELECT * FROM api_keys WHERE key_hash = ?",
    [hash]
  );

  return {
    success: true,
    key, // Dit is de ENIGE keer dat de volledige key getoond wordt!
    apiKey: parseApiKeyRow(result.rows[0]),
  };
}

/**
 * Valideer een API key en return user info
 */
export async function validateApiKey(
  key: string
): Promise<{ valid: true; apiKey: ApiKeyWithUser } | { valid: false; error: string }> {
  if (!key.startsWith("wt_")) {
    return { valid: false, error: "Invalid API key format" };
  }

  const hash = hashApiKey(key);

  const result = await query<ApiKeyWithUser & { scopes: string }>(
    `SELECT ak.*, u.username
     FROM api_keys ak
     JOIN users u ON u.id = ak.user_id
     WHERE ak.key_hash = ?`,
    [hash]
  );

  if (result.rows.length === 0) {
    return { valid: false, error: "Invalid API key" };
  }

  const apiKey = result.rows[0];

  // Check if active
  if (!apiKey.is_active) {
    return { valid: false, error: "API key is disabled" };
  }

  // Check expiration
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  // Check if user is banned
  const userResult = await query<{ is_banned: number }>(
    "SELECT is_banned FROM users WHERE id = ?",
    [apiKey.user_id]
  );

  if (userResult.rows[0]?.is_banned) {
    return { valid: false, error: "User account is banned" };
  }

  // Update last used
  await query(
    "UPDATE api_keys SET last_used_at = NOW(), request_count = request_count + 1 WHERE id = ?",
    [apiKey.id]
  );

  return {
    valid: true,
    apiKey: {
      ...parseApiKeyRow(apiKey),
      username: apiKey.username,
    },
  };
}

/**
 * Haal alle API keys van een user op
 */
export async function getUserApiKeys(userId: number): Promise<ApiKey[]> {
  const result = await query<ApiKey & { scopes: string }>(
    "SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );

  return result.rows.map(parseApiKeyRow);
}

/**
 * Verwijder een API key
 */
export async function deleteApiKey(keyId: number, userId: number): Promise<boolean> {
  const result = await query(
    "DELETE FROM api_keys WHERE id = ? AND user_id = ?",
    [keyId, userId]
  );

  return result.rowCount > 0;
}

/**
 * Regenerate API key (nieuwe key, zelfde settings)
 */
export async function regenerateApiKey(
  keyId: number,
  userId: number
): Promise<{ success: true; key: string } | { success: false; error: string }> {
  // Get existing key
  const existing = await query<ApiKey>(
    "SELECT * FROM api_keys WHERE id = ? AND user_id = ?",
    [keyId, userId]
  );

  if (existing.rows.length === 0) {
    return { success: false, error: "API key not found" };
  }

  // Generate new key
  const { key, hash, prefix } = generateApiKey();

  // Update
  await query(
    "UPDATE api_keys SET key_hash = ?, key_prefix = ?, last_used_at = NULL WHERE id = ?",
    [hash, prefix, keyId]
  );

  return { success: true, key };
}

// ========== HELPERS ==========

function parseApiKeyRow(row: ApiKey & { scopes?: string }): ApiKey {
  return {
    ...row,
    scopes: typeof row.scopes === "string" ? JSON.parse(row.scopes) : row.scopes,
  };
}

// ========== SCOPES ==========

export const API_SCOPES = {
  // Read scopes
  "read:public": "Read public data (items, prices, servers)",
  "read:members": "Read member profiles",
  "read:market": "Read market data and orders",
  "read:alliances": "Read alliance information",
  "read:events": "Read events calendar",
  "read:map": "Read map locations",

  // Write scopes (voor later)
  "write:orders": "Create and manage orders",
  "write:merchants": "Manage merchant listings",
  "write:webhooks": "Manage webhook subscriptions",
} as const;

export type ApiScope = keyof typeof API_SCOPES;

/**
 * Check of een API key een bepaalde scope heeft
 */
export function hasScope(apiKey: ApiKey, scope: ApiScope): boolean {
  return apiKey.scopes.includes(scope) || apiKey.scopes.includes("*");
}
```

### 1.3 API Middleware

**Bestand**: `src/lib/api-middleware.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, type ApiKeyWithUser, type ApiScope } from "./api-keys";

// ========== TYPES ==========

export interface ApiContext {
  apiKey: ApiKeyWithUser;
  userId: number;
  username: string;
}

// ========== RATE LIMITING ==========

// In-memory rate limit store (vervang door Redis voor productie)
const rateLimitStore = new Map<number, { count: number; resetAt: number }>();

function checkRateLimit(apiKeyId: number, limit: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuut

  let entry = rateLimitStore.get(apiKeyId);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitStore.set(apiKeyId, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

// ========== MIDDLEWARE ==========

/**
 * Middleware voor API authenticatie
 * Gebruik: const ctx = await requireApiKey(request);
 */
export async function requireApiKey(
  request: NextRequest,
  requiredScope?: ApiScope
): Promise<
  | { success: true; context: ApiContext; response?: never }
  | { success: false; response: NextResponse; context?: never }
> {
  // Extract token from Authorization header
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Missing Authorization header", code: "AUTH_MISSING" },
        { status: 401 }
      ),
    };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid Authorization format. Use: Bearer <api_key>", code: "AUTH_INVALID_FORMAT" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  // Validate token
  const validation = await validateApiKey(token);

  if (!validation.valid) {
    return {
      success: false,
      response: NextResponse.json(
        { error: validation.error, code: "AUTH_INVALID_KEY" },
        { status: 401 }
      ),
    };
  }

  const { apiKey } = validation;

  // Check rate limit
  const rateLimit = checkRateLimit(apiKey.id, apiKey.rate_limit_per_minute);

  if (!rateLimit.allowed) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Rate limit exceeded",
          code: "RATE_LIMIT_EXCEEDED",
          retry_after: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": apiKey.rate_limit_per_minute.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString(),
            "Retry-After": Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      ),
    };
  }

  // Check required scope
  if (requiredScope && !hasScope(apiKey, requiredScope)) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: `Missing required scope: ${requiredScope}`,
          code: "INSUFFICIENT_SCOPE",
          required_scope: requiredScope,
          your_scopes: apiKey.scopes,
        },
        { status: 403 }
      ),
    };
  }

  // Success!
  return {
    success: true,
    context: {
      apiKey,
      userId: apiKey.user_id,
      username: apiKey.username,
    },
  };
}

/**
 * Helper om rate limit headers toe te voegen aan response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  apiKeyId: number,
  limit: number
): NextResponse {
  const entry = rateLimitStore.get(apiKeyId);

  if (entry) {
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", Math.max(0, limit - entry.count).toString());
    response.headers.set("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000).toString());
  }

  return response;
}
```

### 1.4 API Routes Structuur

**Nieuwe map**: `src/app/api/v1/`

```
src/app/api/v1/
├── items/
│   ├── route.ts          # GET /api/v1/items - Lijst items
│   └── [id]/
│       └── route.ts      # GET /api/v1/items/:id - Item details
├── prices/
│   └── route.ts          # GET /api/v1/prices - Markt prijzen
├── members/
│   ├── route.ts          # GET /api/v1/members - Leden lijst
│   └── [id]/
│       └── route.ts      # GET /api/v1/members/:id - Member profiel
├── servers/
│   └── route.ts          # GET /api/v1/servers - Server lijst
├── health/
│   └── route.ts          # GET /api/v1/health - Health check (geen auth)
└── me/
    └── route.ts          # GET /api/v1/me - API key info
```

### 1.5 Voorbeeld API Endpoint

**Bestand**: `src/app/api/v1/items/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireApiKey, addRateLimitHeaders } from "@/lib/api-middleware";
import { query } from "@/lib/db/core";

export async function GET(request: NextRequest) {
  // Authenticate
  const auth = await requireApiKey(request, "read:public");
  if (!auth.success) return auth.response;

  const { context } = auth;
  const { searchParams } = new URL(request.url);

  // Parse query params
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category");
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));
  const offset = parseInt(searchParams.get("offset") || "0");

  // Build query
  let sql = "SELECT id, name, category, quality_levels, description FROM items WHERE 1=1";
  const params: unknown[] = [];

  if (search) {
    sql += " AND name LIKE ?";
    params.push(`%${search}%`);
  }

  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }

  sql += " ORDER BY name ASC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  // Execute
  const result = await query(sql, params);

  // Count total
  const countResult = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM items" + (search ? " WHERE name LIKE ?" : ""),
    search ? [`%${search}%`] : []
  );

  // Response
  let response = NextResponse.json({
    success: true,
    data: result.rows,
    pagination: {
      total: countResult.rows[0].count,
      limit,
      offset,
      has_more: offset + result.rows.length < countResult.rows[0].count,
    },
    _meta: {
      api_version: "v1",
      request_id: crypto.randomUUID(),
    },
  });

  // Add rate limit headers
  response = addRateLimitHeaders(response, context.apiKey.id, context.apiKey.rate_limit_per_minute);

  return response;
}
```

### 1.6 Health Check (Geen Auth)

**Bestand**: `src/app/api/v1/health/route.ts`

```typescript
import { NextResponse } from "next/server";
import { query } from "@/lib/db/core";

export async function GET() {
  let dbStatus = "unknown";

  try {
    await query("SELECT 1");
    dbStatus = "healthy";
  } catch {
    dbStatus = "unhealthy";
  }

  return NextResponse.json({
    status: dbStatus === "healthy" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    services: {
      database: dbStatus,
      api: "healthy",
    },
  });
}
```

---

## Fase 2: API Key Management UI

### 2.1 User Settings Page

**Bestand**: `src/app/settings/api-keys/page.tsx`

Features:
- Lijst van API keys (naam, prefix, created, last used)
- "Create New Key" button
- Copy key (alleen bij creatie)
- Delete key
- Regenerate key
- Key details (scopes, rate limit, usage stats)

### 2.2 Admin API Keys Overview

**Bestand**: `src/app/admin/api-keys/page.tsx`

Features:
- Alle API keys in systeem
- Filter op user
- Disable/enable keys
- Usage statistics
- Revoke keys

---

## Fase 3: Discord Bot Integratie

### 3.1 Bot Commands via API

```typescript
// Discord bot kan dan:
const response = await fetch("https://api.wurm.tools/v1/items?search=longsword", {
  headers: {
    "Authorization": `Bearer ${process.env.WURM_API_KEY}`,
  },
});

const data = await response.json();
// -> Embed maken met item info
```

### 3.2 Webhook Events (Later)

```typescript
// Outgoing webhooks voor events
POST https://your-bot.com/webhook
{
  "event": "price_alert",
  "data": {
    "item": "Iron Lump",
    "old_price": 1.5,
    "new_price": 1.2,
  },
  "signature": "sha256=..."
}
```

---

## API Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  },
  "_meta": {
    "api_version": "v1",
    "request_id": "uuid",
    "rate_limit": {
      "limit": 60,
      "remaining": 58,
      "reset": 1234567890
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Human readable error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `AUTH_MISSING` | 401 | No Authorization header |
| `AUTH_INVALID_FORMAT` | 401 | Wrong format (not Bearer) |
| `AUTH_INVALID_KEY` | 401 | Invalid or expired key |
| `INSUFFICIENT_SCOPE` | 403 | Missing required scope |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid parameters |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Endpoints Planning

### v1 Endpoints (Fase 1)

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/v1/health` | - | Health check |
| GET | `/v1/me` | any | API key info |
| GET | `/v1/items` | read:public | List items |
| GET | `/v1/items/:id` | read:public | Item details |
| GET | `/v1/prices` | read:public | Market prices |
| GET | `/v1/servers` | read:public | Server list |
| GET | `/v1/members` | read:members | Member list |
| GET | `/v1/members/:id` | read:members | Member profile |

### v1 Endpoints (Fase 2)

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/v1/alliances` | read:alliances | Alliance list |
| GET | `/v1/alliances/:id` | read:alliances | Alliance details |
| GET | `/v1/events` | read:events | Events calendar |
| GET | `/v1/map/locations` | read:map | Map locations |
| GET | `/v1/crafting/:item` | read:public | Crafting recipe |

### v1 Endpoints (Fase 3 - Write)

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| POST | `/v1/orders` | write:orders | Create order |
| PUT | `/v1/orders/:id` | write:orders | Update order |
| DELETE | `/v1/orders/:id` | write:orders | Delete order |

---

## CORS Configuratie

**Bestand**: `next.config.ts` of middleware

```typescript
// Voor api.wurm.tools subdomain
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Of specifieke domeinen
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};
```

---

## Checklist

### Fase 1 (Basis)
- [ ] Database migratie `api_keys` tabel
- [ ] `src/lib/api-keys.ts` - Key management
- [ ] `src/lib/api-middleware.ts` - Auth middleware
- [ ] `/api/v1/health` endpoint
- [ ] `/api/v1/me` endpoint
- [ ] `/api/v1/items` endpoint
- [ ] `/api/v1/prices` endpoint
- [ ] Rate limiting (in-memory)
- [ ] Error handling & codes
- [ ] Basic documentation

### Fase 2 (Management)
- [ ] User API keys page
- [ ] Admin API keys overview
- [ ] Key creation UI
- [ ] Key deletion/regeneration
- [ ] Usage statistics

### Fase 3 (Advanced)
- [ ] Redis rate limiting
- [ ] More endpoints (alliances, events, map)
- [ ] Write endpoints
- [ ] Webhook system
- [ ] OpenAPI/Swagger docs

---

## Notities

- API keys worden gehashed opgeslagen (SHA-256)
- De volledige key wordt ALLEEN getoond bij creatie
- Rate limits zijn per API key, niet per IP
- Standaard rate limit: 60 req/min (1 per seconde)
- API versioning via URL path (`/v1/`, `/v2/`)
- Alle responses in JSON format
- Timestamps in ISO 8601 format (UTC)
