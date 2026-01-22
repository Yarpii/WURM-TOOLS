/**
 * Items Transform Service
 * Fetches data from items.wurm.tools API and transforms it to the format
 * expected by the crafting page.
 */

import { itemsApi, ItemDetail, MaterialItem, ItemSearchResult } from "./items-api";
import type { Item, Recipe, RecipeWithNames, SkillType, ToolType, MaterialResult, CraftingNode } from "./types";

// Generate a consistent numeric ID from a slug
function slugToId(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    const char = slug.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Ensure positive number
  return Math.abs(hash) || 1;
}

// Map Wurmpedia skill names to SkillType
function mapSkillType(skill: string | null): SkillType {
  if (!skill) return null;

  const skillLower = skill.toLowerCase().trim();

  const skillMap: Record<string, SkillType> = {
    "blacksmithing": "blacksmithing",
    "carpentry": "carpentry",
    "fine carpentry": "fine_carpentry",
    "masonry": "masonry",
    "tailoring": "tailoring",
    "leatherworking": "leatherworking",
    "pottery": "pottery",
    "jewelry smithing": "jewelry_smithing",
    "jewelrysmithing": "jewelry_smithing",
    "weapon smithing": "weapon_smithing",
    "weaponsmithing": "weapon_smithing",
    "armour smithing": "armour_smithing",
    "armoursmithing": "armour_smithing",
    "ship building": "ship_building",
    "shipbuilding": "ship_building",
    "ropemaking": "ropemaking",
    "rope making": "ropemaking",
    "cloth tailoring": "cloth_tailoring",
    "cooking": "cooking",
  };

  return skillMap[skillLower] || null;
}

// Map tool names to ToolType
function mapToolType(tools: MaterialItem[]): ToolType {
  if (!tools || tools.length === 0) return null;

  const toolText = tools.map(t => t.raw.toLowerCase()).join(" ");

  if (toolText.includes("hammer")) return "hammer";
  if (toolText.includes("mallet")) return "mallet";
  if (toolText.includes("saw")) return "saw";
  if (toolText.includes("carving knife")) return "carving_knife";
  if (toolText.includes("pickaxe")) return "pickaxe";
  if (toolText.includes("shovel")) return "shovel";
  if (toolText.includes("file")) return "file";
  if (toolText.includes("trowel")) return "trowel";
  if (toolText.includes("needle")) return "needle";
  if (toolText.includes("awl")) return "awl";
  if (toolText.includes("spindle")) return "spindle";
  if (toolText.includes("chisel")) return "chisel";
  if (toolText.includes("tongs")) return "tongs";

  return null;
}

// Extract category from Wurmpedia categories or breadcrumbs
function extractCategory(categories: string[], breadcrumbs: string[]): string {
  // Priority categories for crafting
  const craftCategories = [
    "carpentry items", "blacksmithing items", "masonry items",
    "tailoring items", "containers", "tools", "weapons", "armor",
    "furniture", "decorations", "food", "materials"
  ];

  for (const cat of categories) {
    const catLower = cat.toLowerCase();
    for (const craftCat of craftCategories) {
      if (catLower.includes(craftCat)) {
        return catLower.replace(" items", "").replace(" ", "_");
      }
    }
  }

  // Fallback to first category or misc
  if (categories.length > 0) {
    return categories[0].toLowerCase().replace(/ /g, "_");
  }

  return "misc";
}

// Check if item is a base material (raw resource)
function isBaseMaterial(categories: string[], title: string): boolean {
  const baseCategories = [
    "ores", "logs", "rocks", "raw materials", "meat", "fish",
    "vegetables", "fruits", "herbs", "seeds", "clay", "sand"
  ];

  const baseMaterials = [
    "iron lump", "copper lump", "tin lump", "lead lump", "zinc lump",
    "gold lump", "silver lump", "log", "plank", "shaft", "clay",
    "sand", "rock shards", "stone brick", "mortar", "leather",
    "wool", "cotton", "string", "rope", "nail", "ribbon"
  ];

  const titleLower = title.toLowerCase();
  const catsLower = categories.map(c => c.toLowerCase());

  // Check if any category suggests base material
  for (const cat of catsLower) {
    for (const baseCat of baseCategories) {
      if (cat.includes(baseCat)) return true;
    }
  }

  // Check if title matches known base materials
  for (const mat of baseMaterials) {
    if (titleLower.includes(mat)) return true;
  }

  return false;
}

// Parse difficulty from infobox fields
function parseDifficulty(fields: Record<string, MaterialItem[]> | null): number | null {
  if (!fields) return null;

  const difficultyField = fields["Difficulty"] || fields["Skill level"];
  if (difficultyField && difficultyField.length > 0) {
    const diffText = difficultyField[0].raw;
    const match = diffText.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

// Parse base crafting time
function parseBaseTime(fields: Record<string, MaterialItem[]> | null): number | null {
  if (!fields) return null;

  const timeField = fields["Time"] || fields["Creation time"];
  if (timeField && timeField.length > 0) {
    const timeText = timeField[0].raw;
    // Parse time like "30 seconds" or "2 minutes"
    const secMatch = timeText.match(/(\d+)\s*(?:sec|second)/i);
    if (secMatch) return parseInt(secMatch[1], 10);

    const minMatch = timeText.match(/(\d+)\s*(?:min|minute)/i);
    if (minMatch) return parseInt(minMatch[1], 10) * 60;
  }

  return null;
}

// Transform Wurmpedia item detail to crafting Item format
export function transformItemDetail(detail: ItemDetail): Item {
  const fields = detail.infobox?.fields || null;

  return {
    id: slugToId(detail.slug),
    name: detail.title,
    category: extractCategory(detail.categories, detail.breadcrumbs),
    is_base_material: isBaseMaterial(detail.categories, detail.title) ? 1 : 0,
    description: detail.breadcrumbs.join(" > ") || null,
    difficulty: parseDifficulty(fields),
    skill_type: mapSkillType(detail.skill),
    base_time: parseBaseTime(fields),
    tool_type: mapToolType(detail.tools),
  };
}

// Transform search result to basic Item format (without full details)
export function transformSearchResult(result: ItemSearchResult): Item {
  return {
    id: slugToId(result.slug),
    name: result.title,
    category: result.page_type || "misc",
    is_base_material: 0,
    description: null,
    difficulty: null,
    skill_type: null,
    base_time: null,
    tool_type: null,
  };
}

// Parse material quantity and name from raw text
// Examples: "7.00 kg plank", "5x iron ribbons", "1 Small nail"
function parseMaterial(raw: string): { quantity: number; name: string } {
  // Pattern: "X.XX kg item" or "Xx item" or "X item"
  const kgMatch = raw.match(/^([\d.]+)\s*kg\s+(.+)$/i);
  if (kgMatch) {
    return { quantity: parseFloat(kgMatch[1]), name: kgMatch[2].trim() };
  }

  const xMatch = raw.match(/^(\d+)x?\s+(.+)$/i);
  if (xMatch) {
    return { quantity: parseInt(xMatch[1], 10), name: xMatch[2].trim() };
  }

  // No quantity found, default to 1
  return { quantity: 1, name: raw.trim() };
}

// Extract recipes from item materials
export function extractRecipes(item: ItemDetail): RecipeWithNames[] {
  const recipes: RecipeWithNames[] = [];
  const resultId = slugToId(item.slug);

  for (const material of item.materials) {
    const { quantity, name } = parseMaterial(material.raw);

    // Try to get slug from links if available
    let ingredientSlug = name.toLowerCase().replace(/\s+/g, "_");
    if (material.links && material.links.length > 0) {
      const href = material.links[0].href;
      // Extract slug from /wiki/Item_Name format
      const match = href.match(/\/wiki\/(.+)$/);
      if (match) {
        ingredientSlug = match[1].toLowerCase();
      }
    }

    const ingredientId = slugToId(ingredientSlug);

    recipes.push({
      id: resultId * 1000 + ingredientId, // Compound ID
      result_item_id: resultId,
      ingredient_item_id: ingredientId,
      quantity: quantity,
      result_name: item.title,
      ingredient_name: name,
    });
  }

  return recipes;
}

// Build a crafting tree for an item
export async function buildItemCraftingTree(
  slug: string,
  quantity: number = 1,
  depth: number = 0,
  maxDepth: number = 5,
  visited: Set<string> = new Set()
): Promise<CraftingNode | null> {
  // Prevent infinite loops
  if (visited.has(slug) || depth > maxDepth) {
    return null;
  }
  visited.add(slug);

  try {
    const detail = await itemsApi.getItem(slug);
    const item = transformItemDetail(detail);

    const node: CraftingNode = {
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: quantity,
      is_base: item.is_base_material === 1,
      depth: depth,
      children: [],
    };

    // If base material or no materials, return leaf node
    if (item.is_base_material === 1 || detail.materials.length === 0) {
      return node;
    }

    // Recursively build children
    for (const material of detail.materials) {
      const { quantity: matQty, name: matName } = parseMaterial(material.raw);

      // Get slug from links if available
      let childSlug = matName.toLowerCase().replace(/\s+/g, "_");
      if (material.links && material.links.length > 0) {
        const href = material.links[0].href;
        const match = href.match(/\/wiki\/(.+)$/);
        if (match) {
          childSlug = match[1].toLowerCase();
        }
      }

      try {
        const childNode = await buildItemCraftingTree(
          childSlug,
          matQty * quantity,
          depth + 1,
          maxDepth,
          visited
        );

        if (childNode) {
          node.children.push(childNode);
        } else {
          // Material not found in Wurmpedia, add as base material
          node.children.push({
            id: slugToId(childSlug),
            name: matName,
            category: "materials",
            quantity: matQty * quantity,
            is_base: true,
            depth: depth + 1,
            children: [],
          });
        }
      } catch {
        // Material not found, add as base material
        node.children.push({
          id: slugToId(childSlug),
          name: matName,
          category: "materials",
          quantity: matQty * quantity,
          is_base: true,
          depth: depth + 1,
          children: [],
        });
      }
    }

    return node;
  } catch {
    return null;
  }
}

// Calculate total base materials needed
export function collectBaseMaterials(node: CraftingNode): MaterialResult[] {
  const materialsMap = new Map<number, MaterialResult>();

  function collect(n: CraftingNode) {
    if (n.is_base || n.children.length === 0) {
      const existing = materialsMap.get(n.id);
      if (existing) {
        existing.quantity += n.quantity;
      } else {
        materialsMap.set(n.id, {
          id: n.id,
          name: n.name,
          category: n.category,
          quantity: n.quantity,
          formatted: "", // Will be filled later
          is_base: true,
        });
      }
    } else {
      for (const child of n.children) {
        collect(child);
      }
    }
  }

  collect(node);

  // Format quantities
  const materials = Array.from(materialsMap.values());
  for (const mat of materials) {
    if (mat.quantity >= 1) {
      mat.formatted = `${Math.ceil(mat.quantity)}x ${mat.name}`;
    } else {
      mat.formatted = `${mat.quantity.toFixed(2)} kg ${mat.name}`;
    }
  }

  return materials.sort((a, b) => a.name.localeCompare(b.name));
}

// Cache for items to avoid repeated API calls
const itemCache = new Map<string, { item: Item; detail: ItemDetail; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedItem(slug: string): Promise<{ item: Item; detail: ItemDetail } | null> {
  const now = Date.now();
  const cached = itemCache.get(slug);

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return { item: cached.item, detail: cached.detail };
  }

  try {
    const detail = await itemsApi.getItem(slug);
    const item = transformItemDetail(detail);
    itemCache.set(slug, { item, detail, timestamp: now });
    return { item, detail };
  } catch {
    return null;
  }
}

// Map item ID back to slug (reverse lookup from cache)
const idToSlugMap = new Map<number, string>();

export function registerIdSlug(id: number, slug: string) {
  idToSlugMap.set(id, slug);
}

export function getSlugById(id: number): string | undefined {
  return idToSlugMap.get(id);
}

// Service class for items.wurm.tools integration
export class ItemsTransformService {
  async getAllItems(): Promise<Item[]> {
    try {
      const response = await itemsApi.searchItems("", { limit: 100 });
      const items = response.items.map(transformSearchResult);

      // Register ID to slug mapping
      for (const searchResult of response.items) {
        const id = slugToId(searchResult.slug);
        registerIdSlug(id, searchResult.slug);
      }

      return items;
    } catch (error) {
      console.error("Failed to fetch items from items.wurm.tools:", error);
      return [];
    }
  }

  async searchItems(query: string): Promise<Item[]> {
    try {
      const response = await itemsApi.searchItems(query);
      const items = response.items.map(transformSearchResult);

      // Register ID to slug mapping
      for (const searchResult of response.items) {
        const id = slugToId(searchResult.slug);
        registerIdSlug(id, searchResult.slug);
      }

      return items;
    } catch (error) {
      console.error("Failed to search items:", error);
      return [];
    }
  }

  async getItem(id: number): Promise<Item | null> {
    const slug = getSlugById(id);
    if (!slug) {
      console.error(`No slug found for item ID: ${id}`);
      return null;
    }

    const cached = await getCachedItem(slug);
    return cached?.item || null;
  }

  async getItemBySlug(slug: string): Promise<Item | null> {
    const cached = await getCachedItem(slug);
    if (cached) {
      registerIdSlug(cached.item.id, slug);
    }
    return cached?.item || null;
  }

  async getCategories(): Promise<string[]> {
    try {
      const categories = await itemsApi.getCategories();
      return categories.map(c => c.name);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      return [];
    }
  }

  async calculateMaterials(itemId: number, quantity: number): Promise<{
    item: Item | null;
    materials: MaterialResult[];
    tree: CraftingNode | null;
  }> {
    const slug = getSlugById(itemId);
    if (!slug) {
      return { item: null, materials: [], tree: null };
    }

    try {
      const tree = await buildItemCraftingTree(slug, quantity);
      if (!tree) {
        return { item: null, materials: [], tree: null };
      }

      const item = await this.getItemBySlug(slug);
      const materials = collectBaseMaterials(tree);

      return { item, materials, tree };
    } catch (error) {
      console.error("Failed to calculate materials:", error);
      return { item: null, materials: [], tree: null };
    }
  }
}

// Export singleton instance
export const itemsTransformService = new ItemsTransformService();
