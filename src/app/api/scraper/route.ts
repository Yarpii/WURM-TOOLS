import { NextResponse } from "next/server";
import { getItemByName, addItem, addRecipeIngredient } from "@/lib/database";

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
  items_skipped: number;
  recipes_added: number;
  recipes_skipped: number;
  errors: string[];
  scraped_items: ScrapedItem[];
}

// Wiki category URLs and their corresponding database categories
const WIKI_CATEGORIES: Record<string, { urls: string[]; dbCategory: string }> = {
  tools: {
    urls: [
      "https://www.wurmpedia.com/index.php/Category:Tools",
    ],
    dbCategory: "tool",
  },
  vehicles: {
    urls: [
      "https://www.wurmpedia.com/index.php/Category:Vehicles",
    ],
    dbCategory: "vehicle",
  },
  building: {
    urls: [
      "https://www.wurmpedia.com/index.php/Category:Building_materials",
    ],
    dbCategory: "building",
  },
  weapons: {
    urls: [
      "https://www.wurmpedia.com/index.php/Category:Weapons",
    ],
    dbCategory: "weapon",
  },
  armor: {
    urls: [
      "https://www.wurmpedia.com/index.php/Category:Armour",
    ],
    dbCategory: "armor",
  },
  containers: {
    urls: [
      "https://www.wurmpedia.com/index.php/Category:Containers",
    ],
    dbCategory: "misc",
  },
};

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
function parseItemLinks(html: string): string[] {
  const links: string[] = [];

  // Match links in category pages - they usually have format /index.php/ItemName
  const categoryRegex = /<a[^>]+href="(\/index\.php\/[^"#:]+)"[^>]*>([^<]+)<\/a>/gi;
  let match;

  while ((match = categoryRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2];

    // Skip category links, special pages, and file links
    if (
      href.includes("Category:") ||
      href.includes("Special:") ||
      href.includes("File:") ||
      href.includes("Help:") ||
      href.includes("Template:") ||
      href.includes("Talk:") ||
      text.includes("Category") ||
      text.length < 2
    ) {
      continue;
    }

    // Only add unique links
    if (!links.includes(href)) {
      links.push(href);
    }
  }

  return links;
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
  // Common wiki patterns:
  // * 1x Item Name
  // * Item Name x1
  // [[Item Name]] x1

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
  const creationSectionMatch = html.match(/==\s*Creation\s*==[\s\S]*?(?===|$)/i) ||
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
    item.isBaseMaterial = baseKeywords.some(k => lowerDesc.includes(k));
  }

  return item;
}

// Scrape a single category
async function scrapeCategory(
  categoryKey: string,
  maxItems: number = 20
): Promise<{ items: ScrapedItem[]; errors: string[] }> {
  const category = WIKI_CATEGORIES[categoryKey];
  if (!category) {
    return { items: [], errors: [`Unknown category: ${categoryKey}`] };
  }

  const items: ScrapedItem[] = [];
  const errors: string[] = [];

  for (const categoryUrl of category.urls) {
    try {
      // Fetch category page
      const categoryHtml = await fetchPage(categoryUrl);
      const itemLinks = parseItemLinks(categoryHtml);

      // Limit items to scrape
      const linksToScrape = itemLinks.slice(0, maxItems);

      for (const link of linksToScrape) {
        try {
          const itemUrl = `https://www.wurmpedia.com${link}`;
          const itemHtml = await fetchPage(itemUrl);

          // Extract item name from URL
          const itemName = decodeURIComponent(link.replace("/index.php/", ""))
            .replace(/_/g, " ");

          const item = parseItemPage(itemHtml, itemName);
          if (item) {
            item.category = category.dbCategory;
            items.push(item);
          }

          // Small delay to be nice to the server
          await new Promise(r => setTimeout(r, 200));
        } catch (e) {
          errors.push(`Error scraping ${link}: ${e}`);
        }
      }
    } catch (e) {
      errors.push(`Error fetching category ${categoryUrl}: ${e}`);
    }
  }

  return { items, errors };
}

// Import scraped items into database
function importScrapedItems(items: ScrapedItem[]): {
  items_added: number;
  items_skipped: number;
  recipes_added: number;
  recipes_skipped: number;
  errors: string[];
} {
  const result = {
    items_added: 0,
    items_skipped: 0,
    recipes_added: 0,
    recipes_skipped: 0,
    errors: [] as string[],
  };

  // First pass: add all items
  for (const item of items) {
    const existing = getItemByName(item.name);
    if (existing) {
      result.items_skipped++;
      continue;
    }

    try {
      addItem(item.name, item.category, item.isBaseMaterial, item.description);
      result.items_added++;
    } catch (e) {
      result.errors.push(`Error adding item ${item.name}: ${e}`);
    }
  }

  // Also add any ingredients that don't exist yet
  for (const item of items) {
    for (const ing of item.ingredients) {
      const existing = getItemByName(ing.name);
      if (!existing) {
        try {
          // Add as misc category, assume base material if we don't have recipe
          addItem(ing.name, "material", true, "");
          result.items_added++;
        } catch (e) {
          // Might already exist, that's fine
        }
      }
    }
  }

  // Second pass: add recipes
  for (const item of items) {
    if (item.ingredients.length === 0) continue;

    const resultItem = getItemByName(item.name);
    if (!resultItem) {
      result.errors.push(`Result item not found: ${item.name}`);
      continue;
    }

    for (const ing of item.ingredients) {
      const ingredientItem = getItemByName(ing.name);
      if (!ingredientItem) {
        result.errors.push(`Ingredient not found: ${ing.name}`);
        continue;
      }

      try {
        const recipeId = addRecipeIngredient(
          resultItem.id,
          ingredientItem.id,
          ing.quantity
        );
        if (recipeId === null) {
          result.recipes_skipped++;
        } else {
          result.recipes_added++;
        }
      } catch (e) {
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
      categories: Object.keys(WIKI_CATEGORIES).map(key => ({
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        dbCategory: WIKI_CATEGORIES[key].dbCategory,
      })),
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, category, maxItems = 10, preview = false } = body;

    if (action === "scrape") {
      if (!category) {
        return NextResponse.json(
          { error: "Category is required" },
          { status: 400 }
        );
      }

      const result: ScrapeResult = {
        success: false,
        items_found: 0,
        items_added: 0,
        items_skipped: 0,
        recipes_added: 0,
        recipes_skipped: 0,
        errors: [],
        scraped_items: [],
      };

      // Scrape the category
      const { items, errors } = await scrapeCategory(category, maxItems);
      result.items_found = items.length;
      result.scraped_items = items;
      result.errors = errors;

      if (preview) {
        // Just return the scraped items without importing
        result.success = true;
        return NextResponse.json(result);
      }

      // Import into database
      const importResult = importScrapedItems(items);
      result.items_added = importResult.items_added;
      result.items_skipped = importResult.items_skipped;
      result.recipes_added = importResult.recipes_added;
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

      // Scrape a single page
      const html = await fetchPage(url);
      const itemName = decodeURIComponent(
        url.replace("https://www.wurmpedia.com/index.php/", "")
      ).replace(/_/g, " ");

      const item = parseItemPage(html, itemName);

      return NextResponse.json({ item });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Scraper error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
