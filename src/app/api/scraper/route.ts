import { NextResponse } from "next/server";
import {
  getItemByName,
  addItem,
  addRecipeIngredient,
  getAllItems,
  getRecipe,
  updateItem,
  deleteRecipeIngredient,
} from "@/lib/database";
import Database from "better-sqlite3";
import path from "path";

// ==================== TYPES ====================

interface ScrapedItem {
  name: string;
  category: string;
  isBaseMaterial: boolean;
  description: string;
  ingredients: Array<{ name: string; quantity: number }>;
  wikiUrl?: string;
}

interface ScrapeResult {
  success: boolean;
  items_found: number;
  items_added: number;
  items_updated: number;
  items_skipped: number;
  recipes_added: number;
  recipes_updated: number;
  recipes_skipped: number;
  api_calls_saved: number;
  cache_hits: number;
  retries: number;
  errors: string[];
  scraped_items: ScrapedItem[];
  existing_items: string[];
  mode: ScrapeMode;
  resumed_from?: string;
  progress_saved?: boolean;
}

interface DryRunResult {
  success: boolean;
  mode: "dry-run";
  would_fetch: number;
  would_skip: number;
  would_update: number;
  would_add: number;
  existing_items: string[];
  new_items: string[];
  category: string;
}

interface ScrapeProgress {
  id?: number;
  category: string;
  last_item: string;
  items_processed: number;
  total_items: number;
  started_at: string;
  updated_at: string;
  status: "in_progress" | "completed" | "failed";
  error?: string;
}

interface ItemCache {
  item_name: string;
  wiki_url: string;
  last_modified: string | null;
  etag: string | null;
  last_fetched: string;
}

type ScrapeMode = "skip" | "update" | "force" | "dry-run";

// ==================== CONSTANTS ====================

const WIKI_CATEGORIES: Record<string, { urls: string[]; dbCategory: string }> = {
  tools: {
    urls: ["https://www.wurmpedia.com/index.php/Category:Tools"],
    dbCategory: "tool",
  },
  vehicles: {
    urls: ["https://www.wurmpedia.com/index.php/Category:Vehicles"],
    dbCategory: "vehicle",
  },
  building: {
    urls: ["https://www.wurmpedia.com/index.php/Category:Building_materials"],
    dbCategory: "building",
  },
  weapons: {
    urls: ["https://www.wurmpedia.com/index.php/Category:Weapons"],
    dbCategory: "weapon",
  },
  armor: {
    urls: ["https://www.wurmpedia.com/index.php/Category:Armour"],
    dbCategory: "armor",
  },
  containers: {
    urls: ["https://www.wurmpedia.com/index.php/Category:Containers"],
    dbCategory: "misc",
  },
  furniture: {
    urls: ["https://www.wurmpedia.com/index.php/Category:Furniture"],
    dbCategory: "misc",
  },
  resources: {
    urls: ["https://www.wurmpedia.com/index.php/Category:Resources"],
    dbCategory: "material",
  },
  food: {
    urls: ["https://www.wurmpedia.com/index.php/Category:Food"],
    dbCategory: "food",
  },
  clothing: {
    urls: ["https://www.wurmpedia.com/index.php/Category:Clothing"],
    dbCategory: "armor",
  },
};

// MediaWiki API base URL
const WIKI_API_URL = "https://www.wurmpedia.com/api.php";

// Retry configuration
const MAX_RETRIES = 4;
const BASE_DELAY_MS = 2000;

// ==================== SCRAPER DATABASE ====================

const SCRAPER_DB_PATH = path.join(process.cwd(), "scraper-cache.sqlite");
let scraperDb: Database.Database | null = null;

function getScraperDb(): Database.Database {
  if (!scraperDb) {
    scraperDb = new Database(SCRAPER_DB_PATH);
    scraperDb.pragma("journal_mode = WAL");
    initScraperDatabase(scraperDb);
  }
  return scraperDb;
}

function initScraperDatabase(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS item_cache (
      item_name TEXT PRIMARY KEY,
      wiki_url TEXT NOT NULL,
      last_modified TEXT,
      etag TEXT,
      last_fetched TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scrape_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      last_item TEXT,
      items_processed INTEGER DEFAULT 0,
      total_items INTEGER DEFAULT 0,
      started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT DEFAULT 'in_progress',
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_progress_category ON scrape_progress(category);
    CREATE INDEX IF NOT EXISTS idx_progress_status ON scrape_progress(status);
  `);
}

// ==================== CACHE FUNCTIONS ====================

function getItemCache(itemName: string): ItemCache | null {
  const db = getScraperDb();
  return db
    .prepare("SELECT * FROM item_cache WHERE item_name = ?")
    .get(itemName) as ItemCache | null;
}

function setItemCache(cache: ItemCache): void {
  const db = getScraperDb();
  db.prepare(`
    INSERT OR REPLACE INTO item_cache (item_name, wiki_url, last_modified, etag, last_fetched)
    VALUES (?, ?, ?, ?, ?)
  `).run(cache.item_name, cache.wiki_url, cache.last_modified, cache.etag, cache.last_fetched);
}

// ==================== PROGRESS FUNCTIONS ====================

function getActiveProgress(category: string): ScrapeProgress | null {
  const db = getScraperDb();
  return db
    .prepare(
      "SELECT * FROM scrape_progress WHERE category = ? AND status = 'in_progress' ORDER BY id DESC LIMIT 1"
    )
    .get(category) as ScrapeProgress | null;
}

function saveProgress(progress: ScrapeProgress): number {
  const db = getScraperDb();
  if (progress.id) {
    db.prepare(`
      UPDATE scrape_progress
      SET last_item = ?, items_processed = ?, total_items = ?, updated_at = ?, status = ?, error = ?
      WHERE id = ?
    `).run(
      progress.last_item,
      progress.items_processed,
      progress.total_items,
      new Date().toISOString(),
      progress.status,
      progress.error || null,
      progress.id
    );
    return progress.id;
  } else {
    const result = db.prepare(`
      INSERT INTO scrape_progress (category, last_item, items_processed, total_items, started_at, updated_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      progress.category,
      progress.last_item,
      progress.items_processed,
      progress.total_items,
      new Date().toISOString(),
      new Date().toISOString(),
      progress.status
    );
    return result.lastInsertRowid as number;
  }
}

function completeProgress(progressId: number, status: "completed" | "failed", error?: string): void {
  const db = getScraperDb();
  db.prepare(`
    UPDATE scrape_progress SET status = ?, error = ?, updated_at = ? WHERE id = ?
  `).run(status, error || null, new Date().toISOString(), progressId);
}

// ==================== ITEM CACHE ====================

let existingItemsCache: Map<string, number> = new Map();

function loadExistingItemsCache(): Map<string, number> {
  const items = getAllItems();
  const cache = new Map<string, number>();
  for (const item of items) {
    cache.set(item.name.toLowerCase(), item.id);
  }
  return cache;
}

function itemExistsInCache(name: string): boolean {
  return existingItemsCache.has(name.toLowerCase());
}

function getItemIdFromCache(name: string): number | undefined {
  return existingItemsCache.get(name.toLowerCase());
}

// ==================== FETCH WITH RETRY ====================

interface FetchResult {
  html: string;
  lastModified: string | null;
  etag: string | null;
  notModified: boolean;
  retries: number;
}

async function fetchWithRetry(
  url: string,
  options: {
    ifModifiedSince?: string;
    ifNoneMatch?: string;
  } = {}
): Promise<FetchResult> {
  let lastError: Error | null = null;
  let retries = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const headers: Record<string, string> = {
        "User-Agent": "WurmCalc Scraper/2.0 (Educational Purpose)",
      };

      if (options.ifModifiedSince) {
        headers["If-Modified-Since"] = options.ifModifiedSince;
      }
      if (options.ifNoneMatch) {
        headers["If-None-Match"] = options.ifNoneMatch;
      }

      const res = await fetch(url, { headers });

      // Handle 304 Not Modified
      if (res.status === 304) {
        return {
          html: "",
          lastModified: res.headers.get("Last-Modified"),
          etag: res.headers.get("ETag"),
          notModified: true,
          retries,
        };
      }

      // Handle rate limiting and server errors with exponential backoff
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          console.log(`[Scraper] Got ${res.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise((r) => setTimeout(r, delay));
          retries++;
          continue;
        }
        throw new Error(`Server returned ${res.status} after ${MAX_RETRIES} retries`);
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status}`);
      }

      return {
        html: await res.text(),
        lastModified: res.headers.get("Last-Modified"),
        etag: res.headers.get("ETag"),
        notModified: false,
        retries,
      };
    } catch (error) {
      lastError = error as Error;

      // Network errors - retry with backoff
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.log(`[Scraper] Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((r) => setTimeout(r, delay));
        retries++;
        continue;
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url}`);
}

// ==================== MEDIAWIKI API ====================

interface CategoryMember {
  pageid: number;
  ns: number;
  title: string;
}

async function fetchCategoryMembers(categoryName: string): Promise<string[]> {
  const members: string[] = [];
  let continueToken: string | undefined;

  // Extract category name from URL if full URL provided
  const catName = categoryName.includes("Category:")
    ? categoryName.split("Category:")[1]
    : categoryName;

  do {
    const params = new URLSearchParams({
      action: "query",
      list: "categorymembers",
      cmtitle: `Category:${catName}`,
      cmlimit: "500",
      cmtype: "page",
      format: "json",
    });

    if (continueToken) {
      params.set("cmcontinue", continueToken);
    }

    try {
      const res = await fetchWithRetry(`${WIKI_API_URL}?${params.toString()}`);
      const data = JSON.parse(res.html);

      if (data.query?.categorymembers) {
        for (const member of data.query.categorymembers as CategoryMember[]) {
          // Skip subcategories (namespace 14)
          if (member.ns === 0) {
            members.push(member.title);
          }
        }
      }

      continueToken = data.continue?.cmcontinue;
    } catch (error) {
      console.error(`[Scraper] Error fetching category members: ${error}`);
      break;
    }
  } while (continueToken);

  return members;
}

// ==================== PARSING FUNCTIONS ====================

function parseItemPage(html: string, itemName: string): ScrapedItem | null {
  const item: ScrapedItem = {
    name: itemName,
    category: "misc",
    isBaseMaterial: false,
    description: "",
    ingredients: [],
  };

  // Try to extract description from first paragraph
  const descMatch = html.match(/<p>([^<]+(?:<[^>]+>[^<]*<\/[^>]+>)*[^<]*)<\/p>/i);
  if (descMatch) {
    item.description = descMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
  }

  // Look for "Creation" or "Materials" section
  const ingredientPatterns = [
    /\*\s*(\d+(?:\.\d+)?)\s*x?\s*\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/gi,
    /\*\s*\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\s*x?\s*(\d+(?:\.\d+)?)/gi,
    /\*\s*(\d+(?:\.\d+)?)\s*x\s+([A-Za-z][A-Za-z\s]+[A-Za-z])/gi,
    /\|\s*(\d+(?:\.\d+)?)\s*\|\|\s*\[\[([^\]|]+)/gi,
  ];

  const creationSectionMatch =
    html.match(/==\s*Creation\s*==[\s\S]*?(?===|$)/i) ||
    html.match(/==\s*Materials?\s*==[\s\S]*?(?===|$)/i) ||
    html.match(/==\s*Recipe\s*==[\s\S]*?(?===|$)/i);

  const searchArea = creationSectionMatch ? creationSectionMatch[0] : html;
  const foundIngredients: Map<string, number> = new Map();

  for (const pattern of ingredientPatterns) {
    let match;
    pattern.lastIndex = 0;

    while ((match = pattern.exec(searchArea)) !== null) {
      let quantity: number;
      let ingredientName: string;

      if (/^\d/.test(match[1])) {
        quantity = parseFloat(match[1]);
        ingredientName = match[2];
      } else {
        ingredientName = match[1];
        quantity = parseFloat(match[2]);
      }

      ingredientName = ingredientName.replace(/_/g, " ").replace(/\s+/g, " ").trim();

      if (
        ingredientName.length < 2 ||
        ingredientName.length > 50 ||
        quantity <= 0 ||
        quantity > 1000 ||
        ingredientName.toLowerCase().includes("file:") ||
        ingredientName.toLowerCase().includes("image:") ||
        ingredientName.match(/^\d/)
      ) {
        continue;
      }

      const existing = foundIngredients.get(ingredientName) || 0;
      foundIngredients.set(ingredientName, existing + quantity);
    }
  }

  item.ingredients = Array.from(foundIngredients.entries()).map(([name, qty]) => ({
    name,
    quantity: qty,
  }));

  if (item.ingredients.length === 0) {
    const baseKeywords = ["harvested", "mined", "foraged", "gathered", "dropped", "found", "dug"];
    const lowerDesc = item.description.toLowerCase();
    item.isBaseMaterial = baseKeywords.some((k) => lowerDesc.includes(k));
  }

  return item;
}

// ==================== DRY RUN ====================

async function dryRunScrape(
  categoryKey: string,
  maxItems: number
): Promise<DryRunResult> {
  const category = WIKI_CATEGORIES[categoryKey];
  if (!category) {
    throw new Error(`Unknown category: ${categoryKey}`);
  }

  existingItemsCache = loadExistingItemsCache();

  // Use MediaWiki API for bulk fetching
  const catName = category.urls[0].split("Category:")[1];
  const allItems = await fetchCategoryMembers(catName);
  const itemsToProcess = allItems.slice(0, maxItems);

  const existingItems: string[] = [];
  const newItems: string[] = [];

  for (const itemName of itemsToProcess) {
    if (itemExistsInCache(itemName)) {
      existingItems.push(itemName);
    } else {
      newItems.push(itemName);
    }
  }

  return {
    success: true,
    mode: "dry-run",
    would_fetch: newItems.length,
    would_skip: existingItems.length,
    would_update: 0, // Would need to check cache for this
    would_add: newItems.length,
    existing_items: existingItems,
    new_items: newItems,
    category: categoryKey,
  };
}

// ==================== MAIN SCRAPING LOGIC ====================

async function scrapeCategory(
  categoryKey: string,
  maxItems: number = 20,
  mode: ScrapeMode = "skip",
  resumeFrom?: string
): Promise<{
  items: ScrapedItem[];
  errors: string[];
  skippedItems: string[];
  apiCallsSaved: number;
  cacheHits: number;
  retries: number;
  progressId: number;
}> {
  const category = WIKI_CATEGORIES[categoryKey];
  if (!category) {
    return {
      items: [],
      errors: [`Unknown category: ${categoryKey}`],
      skippedItems: [],
      apiCallsSaved: 0,
      cacheHits: 0,
      retries: 0,
      progressId: 0,
    };
  }

  const items: ScrapedItem[] = [];
  const errors: string[] = [];
  const skippedItems: string[] = [];
  let apiCallsSaved = 0;
  let cacheHits = 0;
  let totalRetries = 0;

  existingItemsCache = loadExistingItemsCache();

  // Use MediaWiki API for bulk category fetching
  const catName = category.urls[0].split("Category:")[1];
  console.log(`[Scraper] Fetching category members via MediaWiki API: ${catName}`);

  let allItems: string[];
  try {
    allItems = await fetchCategoryMembers(catName);
    console.log(`[Scraper] Found ${allItems.length} items in category ${categoryKey}`);
  } catch (error) {
    errors.push(`Failed to fetch category: ${error}`);
    return { items, errors, skippedItems, apiCallsSaved, cacheHits, retries: totalRetries, progressId: 0 };
  }

  // Apply maxItems limit
  let itemsToProcess = allItems.slice(0, maxItems);

  // Handle resume - find where we left off
  let startIndex = 0;
  if (resumeFrom) {
    const resumeIndex = itemsToProcess.findIndex(
      (item) => item.toLowerCase() === resumeFrom.toLowerCase()
    );
    if (resumeIndex >= 0) {
      startIndex = resumeIndex + 1;
      console.log(`[Scraper] Resuming from item ${startIndex}/${itemsToProcess.length}: ${resumeFrom}`);
    }
  }

  // Check for active progress
  let progress = getActiveProgress(categoryKey);
  if (!progress) {
    progress = {
      category: categoryKey,
      last_item: "",
      items_processed: startIndex,
      total_items: itemsToProcess.length,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "in_progress",
    };
  }
  const progressId = saveProgress(progress);
  progress.id = progressId;

  // Filter items based on mode
  for (let i = startIndex; i < itemsToProcess.length; i++) {
    const itemName = itemsToProcess[i];

    try {
      const exists = itemExistsInCache(itemName);

      // Skip mode: don't fetch existing items
      if (mode === "skip" && exists) {
        skippedItems.push(itemName);
        apiCallsSaved++;
        continue;
      }

      // Build wiki URL
      const wikiUrl = `https://www.wurmpedia.com/index.php/${encodeURIComponent(itemName.replace(/ /g, "_"))}`;

      // Check ETag/Last-Modified cache for update mode
      let fetchOptions: { ifModifiedSince?: string; ifNoneMatch?: string } = {};
      if (mode === "update") {
        const cachedItem = getItemCache(itemName);
        if (cachedItem) {
          if (cachedItem.last_modified) {
            fetchOptions.ifModifiedSince = cachedItem.last_modified;
          }
          if (cachedItem.etag) {
            fetchOptions.ifNoneMatch = cachedItem.etag;
          }
        }
      }

      // Fetch the page
      const fetchResult = await fetchWithRetry(wikiUrl, fetchOptions);
      totalRetries += fetchResult.retries;

      // Handle 304 Not Modified
      if (fetchResult.notModified) {
        cacheHits++;
        skippedItems.push(itemName);
        console.log(`[Scraper] Cache hit (304): ${itemName}`);
        continue;
      }

      // Parse the page
      const item = parseItemPage(fetchResult.html, itemName);
      if (item) {
        item.category = category.dbCategory;
        item.wikiUrl = wikiUrl;
        items.push(item);

        // Update cache
        setItemCache({
          item_name: itemName,
          wiki_url: wikiUrl,
          last_modified: fetchResult.lastModified,
          etag: fetchResult.etag,
          last_fetched: new Date().toISOString(),
        });
      }

      // Update progress every 10 items
      if (i % 10 === 0) {
        progress.last_item = itemName;
        progress.items_processed = i + 1;
        saveProgress(progress);
      }

      // Small delay to be nice to the server
      await new Promise((r) => setTimeout(r, 200));
    } catch (error) {
      errors.push(`Error scraping ${itemName}: ${error}`);

      // Save progress on error
      progress.last_item = itemName;
      progress.items_processed = i;
      progress.error = String(error);
      saveProgress(progress);
    }
  }

  // Mark progress as completed
  completeProgress(progressId, "completed");

  return { items, errors, skippedItems, apiCallsSaved, cacheHits, retries: totalRetries, progressId };
}

// ==================== IMPORT LOGIC ====================

function importScrapedItems(
  items: ScrapedItem[],
  mode: ScrapeMode
): {
  items_added: number;
  items_updated: number;
  items_skipped: number;
  recipes_added: number;
  recipes_updated: number;
  recipes_skipped: number;
  errors: string[];
} {
  const result = {
    items_added: 0,
    items_updated: 0,
    items_skipped: 0,
    recipes_added: 0,
    recipes_updated: 0,
    recipes_skipped: 0,
    errors: [] as string[],
  };

  existingItemsCache = loadExistingItemsCache();

  // First pass: add or update items
  for (const item of items) {
    const existingId = getItemIdFromCache(item.name);

    if (existingId) {
      if (mode === "skip") {
        result.items_skipped++;
        continue;
      }

      try {
        updateItem(existingId, item.name, item.category, item.isBaseMaterial, item.description);
        result.items_updated++;

        if (mode === "force") {
          const existingRecipes = getRecipe(existingId);
          for (const recipe of existingRecipes) {
            deleteRecipeIngredient(recipe.id);
          }
        }
      } catch (e) {
        result.errors.push(`Error updating item ${item.name}: ${e}`);
      }
    } else {
      try {
        addItem(item.name, item.category, item.isBaseMaterial, item.description);
        result.items_added++;
        existingItemsCache.set(item.name.toLowerCase(), -1);
      } catch (e) {
        result.errors.push(`Error adding item ${item.name}: ${e}`);
      }
    }
  }

  existingItemsCache = loadExistingItemsCache();

  // Add missing ingredients
  for (const item of items) {
    for (const ing of item.ingredients) {
      if (!itemExistsInCache(ing.name)) {
        try {
          addItem(ing.name, "material", true, "");
          result.items_added++;
          existingItemsCache.set(ing.name.toLowerCase(), -1);
        } catch {
          // Already exists
        }
      }
    }
  }

  existingItemsCache = loadExistingItemsCache();

  // Add recipes
  for (const item of items) {
    if (item.ingredients.length === 0) continue;

    const resultItem = getItemByName(item.name);
    if (!resultItem) {
      result.errors.push(`Result item not found: ${item.name}`);
      continue;
    }

    const existingRecipes = getRecipe(resultItem.id);
    const existingIngredientIds = new Set(existingRecipes.map((r) => r.ingredient_item_id));

    for (const ing of item.ingredients) {
      const ingredientItem = getItemByName(ing.name);
      if (!ingredientItem) {
        result.errors.push(`Ingredient not found: ${ing.name}`);
        continue;
      }

      if (existingIngredientIds.has(ingredientItem.id)) {
        if (mode === "skip" || mode === "update") {
          result.recipes_skipped++;
          continue;
        }
      }

      try {
        const recipeId = addRecipeIngredient(resultItem.id, ingredientItem.id, ing.quantity);
        if (recipeId === null) {
          result.recipes_skipped++;
        } else {
          if (mode === "force" && existingIngredientIds.has(ingredientItem.id)) {
            result.recipes_updated++;
          } else {
            result.recipes_added++;
          }
        }
      } catch {
        result.recipes_skipped++;
      }
    }
  }

  return result;
}

// ==================== API HANDLERS ====================

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "categories") {
    return NextResponse.json({
      categories: Object.keys(WIKI_CATEGORIES).map((key) => ({
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        dbCategory: WIKI_CATEGORIES[key].dbCategory,
      })),
    });
  }

  if (action === "stats") {
    existingItemsCache = loadExistingItemsCache();
    return NextResponse.json({
      existingItems: existingItemsCache.size,
      categories: Object.keys(WIKI_CATEGORIES).length,
    });
  }

  if (action === "progress") {
    const category = searchParams.get("category");
    if (category) {
      const progress = getActiveProgress(category);
      return NextResponse.json({ progress });
    }

    // Return all active progress
    const db = getScraperDb();
    const allProgress = db
      .prepare("SELECT * FROM scrape_progress WHERE status = 'in_progress' ORDER BY updated_at DESC")
      .all();
    return NextResponse.json({ progress: allProgress });
  }

  if (action === "cache-stats") {
    const db = getScraperDb();
    const stats = db
      .prepare("SELECT COUNT(*) as total FROM item_cache")
      .get() as { total: number };
    return NextResponse.json({
      cached_items: stats.total,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action,
      category,
      maxItems = 10,
      preview = false,
      mode = "skip" as ScrapeMode,
    } = body;

    const validModes: ScrapeMode[] = ["skip", "update", "force", "dry-run"];
    const scrapeMode: ScrapeMode = validModes.includes(mode) ? mode : "skip";

    // Dry-run mode
    if (action === "scrape" && scrapeMode === "dry-run") {
      if (!category) {
        return NextResponse.json({ error: "Category is required" }, { status: 400 });
      }

      const dryRunResult = await dryRunScrape(category, maxItems);
      return NextResponse.json(dryRunResult);
    }

    // Resume action
    if (action === "resume") {
      const progress = category
        ? getActiveProgress(category)
        : getScraperDb()
            .prepare("SELECT * FROM scrape_progress WHERE status = 'in_progress' ORDER BY updated_at DESC LIMIT 1")
            .get() as ScrapeProgress | null;

      if (!progress) {
        return NextResponse.json({
          success: false,
          error: "No active scrape to resume",
        });
      }

      const result: ScrapeResult = {
        success: false,
        items_found: 0,
        items_added: 0,
        items_updated: 0,
        items_skipped: 0,
        recipes_added: 0,
        recipes_updated: 0,
        recipes_skipped: 0,
        api_calls_saved: 0,
        cache_hits: 0,
        retries: 0,
        errors: [],
        scraped_items: [],
        existing_items: [],
        mode: scrapeMode,
        resumed_from: progress.last_item,
      };

      const scrapeResult = await scrapeCategory(
        progress.category,
        progress.total_items,
        scrapeMode,
        progress.last_item
      );

      result.items_found = scrapeResult.items.length + scrapeResult.skippedItems.length;
      result.scraped_items = scrapeResult.items;
      result.existing_items = scrapeResult.skippedItems;
      result.api_calls_saved = scrapeResult.apiCallsSaved;
      result.cache_hits = scrapeResult.cacheHits;
      result.retries = scrapeResult.retries;
      result.errors = scrapeResult.errors;

      if (!preview) {
        const importResult = importScrapedItems(scrapeResult.items, scrapeMode);
        result.items_added = importResult.items_added;
        result.items_updated = importResult.items_updated;
        result.items_skipped = importResult.items_skipped + scrapeResult.skippedItems.length;
        result.recipes_added = importResult.recipes_added;
        result.recipes_updated = importResult.recipes_updated;
        result.recipes_skipped = importResult.recipes_skipped;
        result.errors.push(...importResult.errors);
      }

      result.success = true;
      return NextResponse.json(result);
    }

    // Normal scrape action
    if (action === "scrape") {
      if (!category) {
        return NextResponse.json({ error: "Category is required" }, { status: 400 });
      }

      const result: ScrapeResult = {
        success: false,
        items_found: 0,
        items_added: 0,
        items_updated: 0,
        items_skipped: 0,
        recipes_added: 0,
        recipes_updated: 0,
        recipes_skipped: 0,
        api_calls_saved: 0,
        cache_hits: 0,
        retries: 0,
        errors: [],
        scraped_items: [],
        existing_items: [],
        mode: scrapeMode,
      };

      const scrapeResult = await scrapeCategory(category, maxItems, scrapeMode);

      result.items_found = scrapeResult.items.length + scrapeResult.skippedItems.length;
      result.scraped_items = scrapeResult.items;
      result.existing_items = scrapeResult.skippedItems;
      result.api_calls_saved = scrapeResult.apiCallsSaved;
      result.cache_hits = scrapeResult.cacheHits;
      result.retries = scrapeResult.retries;
      result.errors = scrapeResult.errors;
      result.progress_saved = scrapeResult.progressId > 0;

      if (preview) {
        result.items_skipped = scrapeResult.skippedItems.length;
        result.success = true;
        return NextResponse.json(result);
      }

      const importResult = importScrapedItems(scrapeResult.items, scrapeMode);
      result.items_added = importResult.items_added;
      result.items_updated = importResult.items_updated;
      result.items_skipped = importResult.items_skipped + scrapeResult.skippedItems.length;
      result.recipes_added = importResult.recipes_added;
      result.recipes_updated = importResult.recipes_updated;
      result.recipes_skipped = importResult.recipes_skipped;
      result.errors.push(...importResult.errors);
      result.success = true;

      return NextResponse.json(result);
    }

    if (action === "scrape-url") {
      const { url } = body;
      if (!url) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
      }

      existingItemsCache = loadExistingItemsCache();

      const fetchResult = await fetchWithRetry(url);
      const itemName = decodeURIComponent(
        url.replace("https://www.wurmpedia.com/index.php/", "")
      ).replace(/_/g, " ");

      const item = parseItemPage(fetchResult.html, itemName);
      const exists = itemExistsInCache(itemName);

      // Update cache
      if (item) {
        setItemCache({
          item_name: itemName,
          wiki_url: url,
          last_modified: fetchResult.lastModified,
          etag: fetchResult.etag,
          last_fetched: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        item,
        exists,
        existingId: exists ? getItemIdFromCache(itemName) : null,
        retries: fetchResult.retries,
      });
    }

    if (action === "check-existing") {
      const { items } = body;
      if (!Array.isArray(items)) {
        return NextResponse.json({ error: "Items array required" }, { status: 400 });
      }

      existingItemsCache = loadExistingItemsCache();

      const existing: string[] = [];
      const missing: string[] = [];

      for (const itemName of items) {
        if (itemExistsInCache(itemName)) {
          existing.push(itemName);
        } else {
          missing.push(itemName);
        }
      }

      return NextResponse.json({ existing, missing, total: items.length });
    }

    if (action === "clear-progress") {
      const db = getScraperDb();
      if (category) {
        db.prepare("DELETE FROM scrape_progress WHERE category = ?").run(category);
      } else {
        db.prepare("DELETE FROM scrape_progress").run();
      }
      return NextResponse.json({ success: true });
    }

    if (action === "clear-cache") {
      const db = getScraperDb();
      db.prepare("DELETE FROM item_cache").run();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Scraper error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
