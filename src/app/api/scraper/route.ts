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

interface ScrapedItem {
  name: string;
  category: string;
  isBaseMaterial: boolean;
  description: string;
  ingredients: Array<{ name: string; quantity: number }>;
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
  errors: string[];
  scraped_items: ScrapedItem[];
  existing_items: string[];
  mode: ScrapeMode;
}

type ScrapeMode = "skip" | "update" | "force";

// Wiki category URLs and their corresponding database categories
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

// Cache for existing items - loaded once before scraping
let existingItemsCache: Map<string, number> = new Map();

// Load all existing items into cache (case-insensitive lookup)
function loadExistingItemsCache(): Map<string, number> {
  const items = getAllItems();
  const cache = new Map<string, number>();
  for (const item of items) {
    cache.set(item.name.toLowerCase(), item.id);
  }
  return cache;
}

// Check if item exists in cache
function itemExistsInCache(name: string): boolean {
  return existingItemsCache.has(name.toLowerCase());
}

// Get item ID from cache
function getItemIdFromCache(name: string): number | undefined {
  return existingItemsCache.get(name.toLowerCase());
}

// Fetch HTML from a URL
async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "WurmCalc Scraper/1.0 (Educational Purpose)",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.text();
}

// Parse category page to get item links
function parseItemLinks(html: string): Array<{ href: string; name: string }> {
  const links: Array<{ href: string; name: string }> = [];
  const seen = new Set<string>();

  // Match links in category pages - they usually have format /index.php/ItemName
  const categoryRegex = /<a[^>]+href="(\/index\.php\/([^"#:]+))"[^>]*>([^<]+)<\/a>/gi;
  let match;

  while ((match = categoryRegex.exec(html)) !== null) {
    const href = match[1];
    const urlName = match[2];
    const displayName = match[3];

    // Skip category links, special pages, and file links
    if (
      href.includes("Category:") ||
      href.includes("Special:") ||
      href.includes("File:") ||
      href.includes("Help:") ||
      href.includes("Template:") ||
      href.includes("Talk:") ||
      displayName.includes("Category") ||
      displayName.length < 2
    ) {
      continue;
    }

    // Normalize the name
    const itemName = decodeURIComponent(urlName).replace(/_/g, " ");
    const normalizedKey = itemName.toLowerCase();

    // Only add unique links
    if (!seen.has(normalizedKey)) {
      seen.add(normalizedKey);
      links.push({ href, name: itemName });
    }
  }

  return links;
}

// Filter out items that already exist in database
function filterExistingItems(
  links: Array<{ href: string; name: string }>,
  mode: ScrapeMode
): {
  toScrape: Array<{ href: string; name: string }>;
  skipped: string[];
} {
  if (mode === "force") {
    // Force mode: scrape everything
    return { toScrape: links, skipped: [] };
  }

  const toScrape: Array<{ href: string; name: string }> = [];
  const skipped: string[] = [];

  for (const link of links) {
    if (itemExistsInCache(link.name)) {
      if (mode === "skip") {
        skipped.push(link.name);
      } else {
        // update mode: still need to scrape to get new data
        toScrape.push(link);
      }
    } else {
      toScrape.push(link);
    }
  }

  return { toScrape, skipped };
}

// Parse an item page for crafting info
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
    // Pattern: * 1x [[Item Name]] or * 1 x [[Item Name]]
    /\*\s*(\d+(?:\.\d+)?)\s*x?\s*\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/gi,
    // Pattern: * [[Item Name]] x1
    /\*\s*\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\s*x?\s*(\d+(?:\.\d+)?)/gi,
    // Pattern: 1x Item (no wiki links)
    /\*\s*(\d+(?:\.\d+)?)\s*x\s+([A-Za-z][A-Za-z\s]+[A-Za-z])/gi,
    // Pattern in tables: | 1 || [[Item]]
    /\|\s*(\d+(?:\.\d+)?)\s*\|\|\s*\[\[([^\]|]+)/gi,
  ];

  // Check if page mentions "Creation" or "Materials" section
  const creationSectionMatch =
    html.match(/==\s*Creation\s*==[\s\S]*?(?===|$)/i) ||
    html.match(/==\s*Materials?\s*==[\s\S]*?(?===|$)/i) ||
    html.match(/==\s*Recipe\s*==[\s\S]*?(?===|$)/i);

  const searchArea = creationSectionMatch ? creationSectionMatch[0] : html;

  const foundIngredients: Map<string, number> = new Map();

  for (const pattern of ingredientPatterns) {
    let match;
    pattern.lastIndex = 0; // Reset regex

    while ((match = pattern.exec(searchArea)) !== null) {
      let quantity: number;
      let ingredientName: string;

      // Check which capture group has the number
      if (/^\d/.test(match[1])) {
        quantity = parseFloat(match[1]);
        ingredientName = match[2];
      } else {
        ingredientName = match[1];
        quantity = parseFloat(match[2]);
      }

      // Clean up ingredient name
      ingredientName = ingredientName
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Skip invalid entries
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

      // Add or update quantity
      const existing = foundIngredients.get(ingredientName) || 0;
      foundIngredients.set(ingredientName, existing + quantity);
    }
  }

  // Convert to array
  item.ingredients = Array.from(foundIngredients.entries()).map(([name, qty]) => ({
    name,
    quantity: qty,
  }));

  // Determine if it's a base material (no crafting recipe found)
  if (item.ingredients.length === 0) {
    // Check for keywords that indicate base materials
    const baseKeywords = ["harvested", "mined", "foraged", "gathered", "dropped", "found", "dug"];
    const lowerDesc = item.description.toLowerCase();
    item.isBaseMaterial = baseKeywords.some((k) => lowerDesc.includes(k));
  }

  return item;
}

// Scrape a single category with smart filtering
async function scrapeCategory(
  categoryKey: string,
  maxItems: number = 20,
  mode: ScrapeMode = "skip"
): Promise<{
  items: ScrapedItem[];
  errors: string[];
  skippedItems: string[];
  apiCallsSaved: number;
}> {
  const category = WIKI_CATEGORIES[categoryKey];
  if (!category) {
    return {
      items: [],
      errors: [`Unknown category: ${categoryKey}`],
      skippedItems: [],
      apiCallsSaved: 0,
    };
  }

  const items: ScrapedItem[] = [];
  const errors: string[] = [];
  let allSkipped: string[] = [];
  let apiCallsSaved = 0;

  // Load cache before scraping
  existingItemsCache = loadExistingItemsCache();

  for (const categoryUrl of category.urls) {
    try {
      // Fetch category page
      const categoryHtml = await fetchPage(categoryUrl);
      const allLinks = parseItemLinks(categoryHtml);

      // Filter out existing items BEFORE fetching individual pages
      const { toScrape, skipped } = filterExistingItems(allLinks.slice(0, maxItems), mode);
      allSkipped = [...allSkipped, ...skipped];
      apiCallsSaved += skipped.length;

      console.log(
        `[Scraper] Category ${categoryKey}: ${allLinks.length} found, ` +
          `${toScrape.length} to scrape, ${skipped.length} skipped (mode: ${mode})`
      );

      for (const link of toScrape) {
        try {
          const itemUrl = `https://www.wurmpedia.com${link.href}`;
          const itemHtml = await fetchPage(itemUrl);

          const item = parseItemPage(itemHtml, link.name);
          if (item) {
            item.category = category.dbCategory;
            items.push(item);
          }

          // Small delay to be nice to the server
          await new Promise((r) => setTimeout(r, 200));
        } catch (e) {
          errors.push(`Error scraping ${link.name}: ${e}`);
        }
      }
    } catch (e) {
      errors.push(`Error fetching category ${categoryUrl}: ${e}`);
    }
  }

  return { items, errors, skippedItems: allSkipped, apiCallsSaved };
}

// Import scraped items into database with mode support
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

  // Reload cache before import
  existingItemsCache = loadExistingItemsCache();

  // First pass: add or update items
  for (const item of items) {
    const existingId = getItemIdFromCache(item.name);

    if (existingId) {
      if (mode === "skip") {
        result.items_skipped++;
        continue;
      }

      // Update existing item (update or force mode)
      try {
        updateItem(existingId, item.name, item.category, item.isBaseMaterial, item.description);
        result.items_updated++;

        // In force mode, also delete existing recipes to replace them
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
      // Add new item
      try {
        addItem(item.name, item.category, item.isBaseMaterial, item.description);
        result.items_added++;
        // Add to cache for recipe processing
        existingItemsCache.set(item.name.toLowerCase(), -1); // placeholder ID
      } catch (e) {
        result.errors.push(`Error adding item ${item.name}: ${e}`);
      }
    }
  }

  // Reload cache to get correct IDs after inserts
  existingItemsCache = loadExistingItemsCache();

  // Also add any ingredients that don't exist yet
  for (const item of items) {
    for (const ing of item.ingredients) {
      if (!itemExistsInCache(ing.name)) {
        try {
          // Add as material category, assume base material if we don't have recipe
          addItem(ing.name, "material", true, "");
          result.items_added++;
          existingItemsCache.set(ing.name.toLowerCase(), -1);
        } catch {
          // Might already exist, that's fine
        }
      }
    }
  }

  // Reload cache again after adding ingredients
  existingItemsCache = loadExistingItemsCache();

  // Second pass: add recipes
  for (const item of items) {
    if (item.ingredients.length === 0) continue;

    const resultItem = getItemByName(item.name);
    if (!resultItem) {
      result.errors.push(`Result item not found: ${item.name}`);
      continue;
    }

    // Check existing recipes for this item
    const existingRecipes = getRecipe(resultItem.id);
    const existingIngredientIds = new Set(existingRecipes.map((r) => r.ingredient_item_id));

    for (const ing of item.ingredients) {
      const ingredientItem = getItemByName(ing.name);
      if (!ingredientItem) {
        result.errors.push(`Ingredient not found: ${ing.name}`);
        continue;
      }

      // Check if this recipe already exists
      if (existingIngredientIds.has(ingredientItem.id)) {
        if (mode === "skip") {
          result.recipes_skipped++;
          continue;
        }
        // In update/force mode, recipe was already deleted (force) or we skip (update)
        if (mode === "update") {
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
    // Return stats about existing items
    existingItemsCache = loadExistingItemsCache();
    return NextResponse.json({
      existingItems: existingItemsCache.size,
      categories: Object.keys(WIKI_CATEGORIES).length,
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

    // Validate mode
    const validModes: ScrapeMode[] = ["skip", "update", "force"];
    const scrapeMode: ScrapeMode = validModes.includes(mode) ? mode : "skip";

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
        errors: [],
        scraped_items: [],
        existing_items: [],
        mode: scrapeMode,
      };

      // Scrape the category with smart filtering
      const { items, errors, skippedItems, apiCallsSaved } = await scrapeCategory(
        category,
        maxItems,
        scrapeMode
      );

      result.items_found = items.length + skippedItems.length;
      result.scraped_items = items;
      result.existing_items = skippedItems;
      result.api_calls_saved = apiCallsSaved;
      result.errors = errors;

      if (preview) {
        // Just return the scraped items without importing
        result.items_skipped = skippedItems.length;
        result.success = true;
        return NextResponse.json(result);
      }

      // Import into database
      const importResult = importScrapedItems(items, scrapeMode);
      result.items_added = importResult.items_added;
      result.items_updated = importResult.items_updated;
      result.items_skipped = importResult.items_skipped + skippedItems.length;
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

      // Load cache for existence check
      existingItemsCache = loadExistingItemsCache();

      // Scrape a single page
      const html = await fetchPage(url);
      const itemName = decodeURIComponent(
        url.replace("https://www.wurmpedia.com/index.php/", "")
      ).replace(/_/g, " ");

      const item = parseItemPage(html, itemName);
      const exists = itemExistsInCache(itemName);

      return NextResponse.json({
        item,
        exists,
        existingId: exists ? getItemIdFromCache(itemName) : null,
      });
    }

    if (action === "check-existing") {
      // Check which items from a list already exist
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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Scraper error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
