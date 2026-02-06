# WURM-TOOLS Deep Analysis - February 2026

> Comprehensive codebase analysis with 20 new improvement opportunities beyond those in IMPROVEMENTS-TODO.md.
> Generated: 2026-02-06

---

## Summary

| Category | Count | Severity | Effort |
|----------|-------|----------|--------|
| Security Issues | 6 | HIGH-MEDIUM | SMALL-MEDIUM |
| Data Integrity | 1 | HIGH | MEDIUM |
| Performance | 1 | MEDIUM | MEDIUM |
| Code Quality | 6 | MEDIUM-LOW | SMALL |
| Reliability | 2 | MEDIUM | SMALL-MEDIUM |
| Compliance | 1 | MEDIUM | SMALL |
| UX / PWA | 2 | LOW | SMALL |
| TypeScript Config | 1 | LOW | SMALL |

**Total**: 20 new issues (separate from the 26 in IMPROVEMENTS-TODO.md)

---

## CRITICAL (Fix First)

### 1. Missing JSON Parse Error Handling Across API Routes

**Severity:** HIGH | **Effort:** SMALL

**Files affected:**
- `src/app/api/orders/route.ts`
- `src/app/api/webhooks/route.ts`
- `src/app/api/settings/route.ts`
- `src/app/api/merchants/[id]/route.ts`
- `src/app/api/upload/route.ts`
- Multiple other POST/PUT routes

**Problem:** `await request.json()` is not wrapped in try-catch. Invalid JSON bodies cause 500 Internal Server Error instead of 400 Bad Request.

**Fix:**
```typescript
// BEFORE:
const body = await request.json();

// AFTER:
let body;
try {
  body = await request.json();
} catch {
  return NextResponse.json(
    { error: "Invalid JSON in request body" },
    { status: 400 }
  );
}
```

---

### 2. Import/Export Bulk Operations Missing Transaction Support

**Severity:** HIGH | **Effort:** MEDIUM

**File:** `src/lib/db/import-export.ts` (lines 16-92, 270-309)

**Problem:** `importFromJson`, `importItemsFromCsv`, and `importRecipesFromCsv` perform sequential inserts/updates without transactions. If an error occurs mid-import, the database is left in a partially-imported inconsistent state.

**Fix:** Wrap bulk operations in database transactions using `withTransaction()`.

---

### 3. Upload Route - MIME Type Can Be Spoofed

**Severity:** HIGH | **Effort:** SMALL

**File:** `src/app/api/upload/route.ts` (lines 38-56)

**Problem:** Validates `file.type` (client-provided MIME header) but doesn't verify actual file content via magic bytes. An attacker can upload a malicious file disguised as `image/jpeg`.

**Fix:** Validate magic bytes (file signatures) of the uploaded buffer:
```typescript
const MAGIC_BYTES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  gif: [0x47, 0x49, 0x46],
  webp: [0x52, 0x49, 0x46, 0x46], // + 'WEBP' at offset 8
};
```

---

## HIGH PRIORITY

### 4. Webhook Test Endpoint - No Rate Limiting (DoS Vector)

**Severity:** MEDIUM | **Effort:** SMALL

**File:** `src/app/api/webhooks/route.ts` (lines 182-240)

**Problem:** The "test" webhook action sends outbound HTTP requests to user-provided URLs with no rate limit. Could be exploited to flood external services.

**Fix:** Add per-user rate limiting to the test action (e.g., 3 tests per minute per webhook).

---

### 5. Members API - N+1 Query Problem

**Severity:** MEDIUM | **Effort:** MEDIUM

**File:** `src/app/api/members/route.ts` (lines 7-19)

**Problem:** Fetches all members, then calls `getUserPrimaryRole()` individually for each member via `Promise.all`. Still N database round-trips.

**Fix:** Use a single JOIN query:
```sql
SELECT u.*, r.role_name, r.role_display_name, r.role_color, r.role_icon
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.show_in_members_list = 1 AND u.is_banned = 0
```

---

### 6. Health Check Exposes Timing Information

**Severity:** MEDIUM | **Effort:** SMALL

**File:** `src/app/api/health/route.ts` (lines 32-44)

**Problem:** Returns `responseTime` and `database.responseTime` in production. Attackers can use this to profile database load and detect slow queries.

**Fix:** Only include timing data in non-production environments.

---

### 7. Admin Member Update - Missing Field Length Validation

**Severity:** MEDIUM | **Effort:** SMALL

**File:** `src/app/api/admin/members/[id]/route.ts` (lines 84-105)

**Problem:** PUT endpoint validates `role` but not `display_name`, `bio`, `location`, or `wurm_server` string lengths. The regular profile update route (`/api/profile`) does validate these.

**Fix:** Apply same `INPUT_LIMITS` validation as the profile route.

---

### 8. Service Worker - No Cache Invalidation Strategy

**Severity:** MEDIUM | **Effort:** MEDIUM

**File:** `public/sw.js`

**Problem:** Hardcoded `CACHE_NAME = 'wurm-tools-v1'` never changes. After deployment, users keep stale cached assets indefinitely until the cache name is manually bumped.

**Fix:** Include a build hash or version number in the cache name. Implement an `activate` event handler that cleans up old caches.

---

## MEDIUM PRIORITY

### 9. Account Deletion - No Audit Logging

**Severity:** MEDIUM | **Effort:** SMALL

**File:** `src/app/api/account/delete/route.ts`

**Problem:** Account deletions are not logged anywhere. Important for GDPR compliance, security investigations, and detecting account takeovers.

**Fix:** Log to the existing `audit_logs` table with action type `account_deleted`.

---

### 10. Settings Route - Boolean Type Coercion

**Severity:** MEDIUM | **Effort:** SMALL

**File:** `src/app/api/settings/route.ts` (lines 40-60)

**Problem:** Boolean settings like `show_in_members_list` aren't type-validated. Strings like `"true"` or numbers like `1` could be accepted, leading to inconsistent database values.

**Fix:** Validate `typeof field === 'boolean'` before accepting.

---

### 11. Database Pool Config - No Bounds Validation

**Severity:** MEDIUM | **Effort:** SMALL

**File:** `src/lib/db-config.ts` (lines 75-87)

**Problem:** `DATABASE_POOL_MIN` and `DATABASE_POOL_MAX` are parsed from env vars without checking that min < max or that values are reasonable (e.g., not 0 or 99999).

**Fix:** Validate ranges (e.g., min: 1-50, max: min-100) and throw a clear startup error.

---

### 12. Password Hash Upgrade - Silent Failure

**Severity:** MEDIUM | **Effort:** SMALL

**File:** `src/lib/auth.ts` (lines 583-586)

**Problem:** Legacy PBKDF2-to-Argon2 hash upgrade uses `.catch(() => {})` -- completely silent on failure. Users stay on weak hashing with no visibility.

**Fix:** Log failures with `console.warn()` so they appear in monitoring.

---

### 13. getSessionAsync - Swallows All Errors

**Severity:** MEDIUM | **Effort:** SMALL

**File:** `src/lib/auth.ts` (lines 1147-1172)

**Problem:** Catches all errors and returns `null`. Database connection failures, network errors, and invalid sessions all look the same. Makes debugging auth issues nearly impossible.

**Fix:** Log unexpected errors (not build-time `cookies()` errors) before returning null.

---

### 14. Profile Sanitization - Basic HTML Entity Encoding Only

**Severity:** MEDIUM | **Effort:** MEDIUM

**File:** `src/app/api/profile/route.ts` (lines 130-148)

**Problem:** Uses manual regex-based HTML entity replacement. While basic, this is harder to audit and may miss edge cases compared to a proper sanitization library.

**Fix:** Consider using `DOMPurify` (via `isomorphic-dompurify`) for robust sanitization, or verify that React's built-in JSX escaping covers all rendering contexts.

---

## LOW PRIORITY

### 15. Session Refresh Race Condition

**Severity:** LOW | **Effort:** SMALL

**File:** `src/app/api/auth/session/route.ts` (lines 5-41)

**Problem:** Session is validated, then refreshed in a separate call. The session could expire between validation and refresh. Unlikely but could cause sporadic errors.

**Fix:** Wrap `refreshSession` call in try-catch.

---

### 16. Inconsistent API Response Formats

**Severity:** LOW | **Effort:** SMALL

**Pattern across API routes.**

Some routes return `{ success: true, profile: {...} }`, others `{ members: [...] }`, others `{ success: true }`. No consistent envelope.

**Fix:** Standardize on a format:
```typescript
// Success: { success: true, data: {...} }
// Error:   { error: "message" }
```

---

### 17. BetaBanner Hydration Pattern

**Severity:** LOW | **Effort:** TINY

**File:** `src/components/BetaBanner.tsx`

**Problem:** Reads `localStorage` inside `useState` initializer. Works but is non-standard for SSR. Could cause hydration mismatches.

**Fix:** Use `useEffect` to read `localStorage` after mount.

---

### 18. PWA Manifest Missing Fields

**Severity:** LOW | **Effort:** SMALL

**File:** `public/manifest.json`

**Missing:**
- `scope` field
- `screenshots` (empty array - needed for install prompts on Android)
- Multiple icon sizes (only has SVG; need 192x192 and 512x512 PNGs for full PWA support)

---

### 19. In-Memory Rate Limiter Cleanup Frequency

**Severity:** LOW | **Effort:** SMALL

**File:** `src/lib/rate-limit.ts` (lines 113-120)

**Problem:** Only purges expired entries every 5 minutes. Under high traffic, could accumulate thousands of stale entries.

**Fix:** Add size-based cleanup trigger (e.g., purge when map exceeds 10,000 entries).

---

### 20. TypeScript Config - Missing Strict Options

**Severity:** LOW | **Effort:** SMALL

**File:** `tsconfig.json`

**Missing recommended options:**
- `noUnusedLocals: true` - catches dead variables
- `noUnusedParameters: true` - catches dead parameters
- `noFallthroughCasesInSwitch: true` - prevents switch bugs

---

## Recommended Implementation Order

### Sprint 1 - Quick Wins (security + data integrity)
- [ ] #1 - Add JSON parse error handling to all POST/PUT routes
- [ ] #3 - Add magic byte validation to upload route
- [ ] #4 - Rate limit webhook test endpoint
- [ ] #6 - Hide timing data in production health check
- [ ] #7 - Add field validation to admin member update
- [ ] #12 - Log password upgrade failures

### Sprint 2 - Core Quality
- [ ] #2 - Add transaction support to import/export
- [ ] #5 - Fix members N+1 query with JOIN
- [ ] #9 - Add account deletion audit logging
- [ ] #10 - Validate boolean types in settings
- [ ] #11 - Validate pool config bounds
- [ ] #13 - Improve getSessionAsync error logging

### Sprint 3 - Polish
- [ ] #8 - Implement proper service worker cache invalidation
- [ ] #14 - Improve HTML sanitization
- [ ] #15 - Handle session refresh race condition
- [ ] #16 - Standardize API response format
- [ ] #17-20 - Remaining low-priority items

---

## What's Already Good

The project has strong fundamentals:

- **Modern stack** - Next.js 16, React 19, TypeScript 5.9 (all latest)
- **Argon2 password hashing** with automatic PBKDF2 legacy upgrade
- **Parameterized SQL queries** throughout (no SQL injection)
- **CSP headers** and security middleware in place
- **Modular database layer** - 22 well-organized DB modules
- **Comprehensive feature set** - 40+ pages, 110+ API endpoints
- **Clean separation of concerns** - API routes / DB layer / components
- **Professional deployment** - PM2, Caddy, backup scripts, health checks
- **Dependencies are minimal and current** - no bloat

---

*This analysis complements the existing IMPROVEMENTS-TODO.md (26 issues) with 20 additional findings.*
