# WURM-TOOLS Verbeterpunten

> Dit document bevat een grondige analyse van de codebase met verbeterpunten voor toekomstige sessies.
> Gegenereerd op: 2026-01-05

---

## Samenvatting

| Categorie | Aantal | Ernst | Inspanning |
|-----------|--------|-------|------------|
| Kritieke Bugs | 2 | HOOG | KLEIN |
| Ontbrekende Error Handling | 6 | HOOG | MEDIUM |
| Type Safety | 3 | MEDIUM | KLEIN |
| Performance | 4 | MEDIUM | MEDIUM |
| Testing | 1 | MEDIUM | GROOT |
| Documentatie | 3 | LAAG | KLEIN |
| Code Quality | 5 | LAAG | KLEIN |
| Security | 2 | MEDIUM | KLEIN |

**Totaal**: 26 issues
- **Quick wins (< 1 uur)**: 8-10 issues
- **Medium term (1-3 dagen)**: 12-15 issues
- **Long term (1+ week)**: 3-4 issues

---

## 🔴 KRITIEK (Direct fixen)

### 1. Ontbrekende `await` Keywords in API Routes

**Locaties:**
- `/src/app/api/calculate/route.ts` (regels 23-24, 33-34)
- `/src/app/api/items/route.ts` (regels 24-25, 30-31, 36, 41, 56, 84, 92)
- `/src/app/api/alliances/route.ts` (regels 17, 22, 26, 45, 51, 88)
- `/src/app/api/auth/login/route.ts` (regel 17)

**Probleem:** Database functies zijn async maar worden niet geawait, waardoor Promises worden gereturned ipv data.

**Oplossing:**
```typescript
// FOUT (huidig):
const item = getItem(itemId);  // Returns Promise<Item | undefined>

// CORRECT (moet zijn):
const item = await getItem(itemId);
```

**Prioriteit:** HOOG | **Inspanning:** KLEIN

---

### 2. Inconsistente Error Handling in API Routes

**Locaties:**
- `/src/app/api/items/route.ts` - regels 24-42 (GET handler mist try-catch)
- `/src/app/api/alliances/route.ts` - regels 7-33 (GET handler mist try-catch)
- Meerdere andere API routes

**Probleem:** Sommige routes hebben error handling, anderen niet.

**Oplossing:** Wrap alle async operaties in try-catch blokken.

**Prioriteit:** HOOG | **Inspanning:** MEDIUM

---

## 🟠 HOGE PRIORITEIT

### 3. In-Memory Rate Limiting Niet Production-Ready

**Locatie:** `/src/middleware.ts` (regels 17-54) en `/src/lib/security.ts` (regels 104-122)

**Probleem:** Rate limiter gebruikt in-memory Map, werkt niet met load balancing of serverless.

**Oplossing:**
- Documenteer Redis requirement voor productie
- OF implementeer Redis integratie

**Impact:** Single-server only; faalt bij meerdere instances.

**Prioriteit:** HOOG | **Inspanning:** MEDIUM

---

### 4. Ontbrekende Input Validatie in Paginatie

**Locatie:** `/src/app/api/calculate/route.ts` (regel 13)

**Probleem:** `parseInt()` gebruikt op user input zonder validatie, kan NaN returnen.

**Oplossing:** Gebruik `validateNumericInput()` uit security module.

**Security Impact:** DoS vulnerability met unbounded values.

**Prioriteit:** HOOG | **Inspanning:** KLEIN

---

## 🟡 MEDIUM PRIORITEIT

### 5. Type Safety: Onnodige Type Casts

**Locatie:** `/src/lib/auth.ts` (regel 144)

**Probleem:** `user as unknown as UserDbRow` - dubbele cast suggereert type mismatch.

**Oplossing:** Fix de type bij de bron (createUser functie) ipv casten.

**Prioriteit:** MEDIUM | **Inspanning:** KLEIN

---

### 6. Database Query Duplicatie

**Locaties:**
- `/src/lib/database.ts` (regels 119-124)
- `/src/lib/auth.ts` (regels 219-244)
- `/src/middleware.ts`

**Probleem:** Meerdere implementaties van pagination validatie.

**Oplossing:** Maak één `validatePagination()` utility en gebruik overal.

**Prioriteit:** MEDIUM | **Inspanning:** KLEIN

---

### 7. Ontbrekende Database Indexes

**Locatie:** `/scripts/schema-mysql.sql`

**Probleem:** Geen indexes voor veelgebruikte query filters.

**Oplossing:** Voeg toe:
```sql
CREATE INDEX idx_price_history_item_recorded ON price_history(item_name, recorded_at);
CREATE INDEX idx_orders_created_status ON orders(created_at, status);
CREATE INDEX idx_users_created ON users(created_at);
```

**Performance Impact:** Kan dashboard/analytics queries 50%+ versnellen.

**Prioriteit:** MEDIUM | **Inspanning:** KLEIN

---

### 8. Potentiële N+1 Queries

**Locatie:** `/src/lib/database.ts` (regels 354-396 - findCraftableFrom, findAllCraftableFrom)

**Probleem:** Recursieve functie roept `getItem()` aan in loops, kan veel queries veroorzaken.

**Oplossing:** Gebruik batch queries met JOIN ipv recursieve loops.

**Voorbeeld:** Zoeken naar alle craftable items van iron ore kan 100+ database queries doen.

**Prioriteit:** MEDIUM | **Inspanning:** MEDIUM

---

### 9. Recursive Tree Building

**Locatie:** `/src/lib/database.ts` (regels 234-269 - buildCraftingTree)

**Probleem:** Recursieve queries voor elke node in crafting tree, max depth 10.

**Oplossing:** Gebruik één SQL query met recursive CTE (Common Table Expression).

**Performance:** Kan queries reduceren van O(n) naar O(1).

**Prioriteit:** MEDIUM | **Inspanning:** MEDIUM

---

### 10. Ontbrekende Test Coverage

**Locatie:** Geen test files gevonden in `/src`

**Probleem:** Geen test coverage voor kritieke paden.

**Oplossing:** Voeg test suite toe:
- Unit tests voor `calculateSuccessChance()` en andere formulas
- Integration tests voor API routes
- Database tests voor data persistence

**Kritieke Paden om te Testen:**
- Authentication (login/register/session)
- Crafting calculator formulas
- Database operaties

**Prioriteit:** MEDIUM | **Inspanning:** GROOT

---

### 11. Accessibility Issues

**Locatie:** `/src/components/Header.tsx`

**Problemen:**
- SVG icons zonder alt text
- Navigation links gebruiken divs ipv semantic elements

**Oplossing:**
- Vervang `<div>` met `<nav>` voor navigation
- Voeg aria-labels toe aan icon buttons
- Voeg keyboard navigation toe (Tab focus, Enter/Space activation)

**Prioriteit:** MEDIUM | **Inspanning:** MEDIUM

---

## 🟢 LAGE PRIORITEIT

### 12. Ontbrekende JSDoc Comments

**Locatie:** `/src/lib/database.ts` - utility functions missen documentatie

**Oplossing:** Voeg JSDoc comments toe:
```typescript
/**
 * Calculate all base materials needed for crafting an item
 * @param itemId - The item to calculate materials for
 * @param quantity - Number of items to craft (default: 1)
 * @returns Map of item IDs to quantities needed
 */
export async function calculateBaseMaterials(
  itemId: number,
  quantity: number = 1
): Promise<Map<number, number>> {
```

**Prioriteit:** LAAG | **Inspanning:** KLEIN

---

### 13. Inconsistente NULL Handling

**Locatie:** `/src/lib/database.ts` (regels 206-214)

**Probleem:** `getItem()` returned `undefined`, maar sommige callers checken voor `null`.

**Oplossing:** Kies één conventie (undefined voor missing, null voor explicitly stored).

**Prioriteit:** LAAG | **Inspanning:** KLEIN

---

### 14. Console Logging in Production Code

**Locatie:** `/src/app/api/scraper/route.ts`

**Probleem:** Debug logging achtergebleven in productie code.

**Oplossing:** Vervang door proper logging library (Winston, Pino) met log levels.

**Prioriteit:** LAAG | **Inspanning:** MEDIUM

---

### 15. Unused Database Functions

**Locatie:** `/src/lib/database.ts` (regels 1835-1837)

**Probleem:** `getAllAchievements()` is een wrapper voor `getAchievements()` zonder logica.

**Oplossing:** Verwijder duplicaat of consolideer.

**Prioriteit:** LAAG | **Inspanning:** KLEIN

---

### 16. Inconsistente Error Message Patterns

**Locatie:** API routes in `/src/app/api/`

**Probleem:** Sommige gebruiken `sanitizeError()`, anderen plain error strings.

**Oplossing:** Maak consistente error response helper:
```typescript
function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}
```

**Prioriteit:** LAAG | **Inspanning:** KLEIN

---

### 17. Ontbrekende Environment Variable Validatie

**Locatie:** `/src/lib/db-config.ts`

**Probleem:** Alleen DATABASE_URL wordt gevalideerd, andere critical env vars niet.

**Oplossing:** Maak comprehensive env validatie bij app startup.

**Prioriteit:** LAAG | **Inspanning:** KLEIN

---

### 18. Ontbrekende API Documentatie

**Locatie:** Geen OpenAPI/Swagger documentatie

**Probleem:** API endpoints alleen gedocumenteerd in README.md.

**Oplossing:** Voeg Swagger/OpenAPI documentatie toe of genereer vanuit code.

**Prioriteit:** LAAG | **Inspanning:** MEDIUM

---

## ✅ WAT AL GOED IS

### Security
- ✅ **Session Cookie Security** - httpOnly, secure, SameSite=strict
- ✅ **Password Hashing** - PBKDF2-SHA512 met 10.000 iterations
- ✅ **SQL Injection Prevention** - Alle queries gebruiken parameterized statements
- ✅ **CSRF Protection** - SameSite=strict cookies
- ✅ **CSP Headers** - Comprehensive Content-Security-Policy

### Dependencies
- ✅ `mysql2` v3.16.0 - Actief maintained
- ✅ `next` v16.1.1 - Latest
- ✅ `react` v19.2.3 - Latest
- ✅ `typescript` v5.9.3 - Latest
- ✅ `tailwindcss` v4.1.18 - Latest
- ✅ Geen onnodige dependencies

---

## Aanbevolen Aanpak

### Week 1 (Kritieke Fixes)
- [ ] Voeg ontbrekende `await` statements toe
- [ ] Voeg try-catch toe aan alle API routes
- [ ] Fix pagination validatie
- [ ] Fix auth async/await

### Week 2 (Security & Performance)
- [ ] Documenteer Redis requirement voor rate limiting
- [ ] Voeg database indexes toe
- [ ] Fix type safety issues
- [ ] Consolideer pagination logic

### Maand 1 (Quality Improvements)
- [ ] Voeg comprehensive test coverage toe
- [ ] Implementeer proper logging
- [ ] Voeg API documentatie toe
- [ ] Refactor N+1 queries

### Ongoing
- [ ] Accessibility improvements
- [ ] Performance monitoring
- [ ] Documentation updates

---

## Quick Wins Checklist

Kleine fixes die snel gedaan kunnen worden:

- [ ] `await` toevoegen in `/src/app/api/calculate/route.ts`
- [ ] `await` toevoegen in `/src/app/api/items/route.ts`
- [ ] `await` toevoegen in `/src/app/api/alliances/route.ts`
- [ ] `await` toevoegen in `/src/app/api/auth/login/route.ts`
- [ ] Indexes toevoegen aan schema-mysql.sql
- [ ] Type cast fixen in `/src/lib/auth.ts`
- [ ] Unused function verwijderen uit database.ts
- [ ] Error helper functie maken voor API routes

---

*Dit document kan worden bijgewerkt naarmate issues worden opgelost.*
