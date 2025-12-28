import Database from "better-sqlite3";
import path from "path";
import type {
  Item,
  Recipe,
  RecipeWithNames,
  CraftingNode,
  MaterialResult,
  CraftableResult,
  ImportStats,
  CsvPreviewResult,
  CraftingSettings,
  AdvancedMaterialResult,
  CraftingPrediction,
  AdvancedCalculationResult,
  SkillGrindStep,
  MarketOrder,
  CreateOrderInput,
  OrderType,
  OrderStatus,
  Merchant,
  CreateMerchantInput,
  MerchantCategory,
} from "./types";
import {
  calculateSuccessChance,
  getSuccessCategory,
  predictCraftingQuality,
  calculateMaterialWaste,
  calculateCraftingTime,
  calculateToolWear,
  predictSkillGain,
  generateSkillPath,
  getItemDifficulty,
} from "./wurm-formulas";

const DB_PATH = path.join(process.cwd(), "wurmcalc.sqlite");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initDatabase(db);
  }
  return db;
}

function initDatabase(db: Database.Database): void {
  const tableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='items'"
    )
    .get();

  if (!tableExists) {
    db.exec(`
      CREATE TABLE items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        category TEXT DEFAULT 'misc',
        is_base_material INTEGER DEFAULT 0,
        description TEXT
      );

      CREATE TABLE recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        result_item_id INTEGER NOT NULL,
        ingredient_item_id INTEGER NOT NULL,
        quantity REAL NOT NULL DEFAULT 1,
        FOREIGN KEY (result_item_id) REFERENCES items(id),
        FOREIGN KEY (ingredient_item_id) REFERENCES items(id)
      );

      CREATE INDEX idx_recipes_result ON recipes(result_item_id);
      CREATE INDEX idx_recipes_ingredient ON recipes(ingredient_item_id);
    `);

    seedData(db);
  }

  // Initialize orders table if it doesn't exist
  const ordersTableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='orders'"
    )
    .get();

  if (!ordersTableExists) {
    db.exec(`
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_type TEXT NOT NULL CHECK(order_type IN ('buy', 'sell', 'trade')),
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        quality INTEGER,
        price REAL,
        currency TEXT DEFAULT 'silver',
        trade_for TEXT,
        location TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled', 'expired')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX idx_orders_user ON orders(user_id);
      CREATE INDEX idx_orders_status ON orders(status);
      CREATE INDEX idx_orders_type ON orders(order_type);
      CREATE INDEX idx_orders_item ON orders(item_name);
    `);
  }

  // Initialize merchants table if it doesn't exist
  const merchantsTableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='merchants'"
    )
    .get();

  if (!merchantsTableExists) {
    db.exec(`
      CREATE TABLE merchants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        location TEXT NOT NULL,
        server TEXT NOT NULL,
        coordinates TEXT,
        category TEXT NOT NULL DEFAULT 'misc',
        stock_list TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX idx_merchants_user ON merchants(user_id);
      CREATE INDEX idx_merchants_active ON merchants(is_active);
      CREATE INDEX idx_merchants_category ON merchants(category);
      CREATE INDEX idx_merchants_server ON merchants(server);
    `);
  }
}

function seedData(db: Database.Database): void {
  const insertItem = db.prepare(
    "INSERT INTO items (name, category, is_base_material, description) VALUES (?, ?, ?, ?)"
  );

  const baseMaterials = [
    ["Log", "wood", 1, "Harvested from trees"],
    ["Iron Ore", "ore", 1, "Mined from rock"],
    ["Clay", "material", 1, "Dug from clay tiles"],
    ["Cotton", "material", 1, "Harvested from cotton plants"],
    ["Water", "material", 1, "Collected from wells or tiles"],
    ["Rock Shards", "material", 1, "Mined from rock"],
    ["Pelt", "material", 1, "From killed animals"],
    ["Leather", "material", 1, "Processed from hides"],
  ];

  const craftedItems = [
    ["Plank", "wood", 0, "Sawn from logs"],
    ["Shaft", "wood", 0, "Carved from logs"],
    ["Small Nail", "metal", 0, "Made from iron lumps"],
    ["Large Nail", "metal", 0, "Made from iron lumps"],
    ["Iron Lump", "metal", 0, "Smelted from iron ore"],
    ["Wheel", "vehicle", 0, "Used in carts and wagons"],
    ["Wheel Axle", "vehicle", 0, "Connects wheels"],
    ["Cart", "vehicle", 0, "Small transport vehicle"],
    ["Large Cart", "vehicle", 0, "Larger transport vehicle"],
    ["Rope", "material", 0, "Made from cotton"],
    ["Brick", "building", 0, "Made from clay"],
    ["Mortar", "building", 0, "Made from clay and sand"],
    ["Mallet", "tool", 0, "Wooden hammer"],
    ["Hammer", "tool", 0, "Metal hammer"],
    ["Saw", "tool", 0, "For cutting planks"],
    ["Spindle", "tool", 0, "For making rope"],
  ];

  const insertMany = db.transaction(() => {
    for (const mat of baseMaterials) {
      insertItem.run(...mat);
    }
    for (const item of craftedItems) {
      insertItem.run(...item);
    }
  });
  insertMany();

  const items = db
    .prepare("SELECT id, name FROM items")
    .all() as { id: number; name: string }[];
  const itemIds: Record<string, number> = {};
  for (const item of items) {
    itemIds[item.name] = item.id;
  }

  const recipes = [
    ["Plank", "Log", 1],
    ["Shaft", "Log", 1],
    ["Iron Lump", "Iron Ore", 1],
    ["Small Nail", "Iron Lump", 0.1],
    ["Large Nail", "Iron Lump", 0.2],
    ["Rope", "Cotton", 2],
    ["Spindle", "Shaft", 1],
    ["Mallet", "Shaft", 1],
    ["Mallet", "Plank", 1],
    ["Hammer", "Shaft", 1],
    ["Hammer", "Iron Lump", 1],
    ["Saw", "Shaft", 1],
    ["Saw", "Iron Lump", 2],
    ["Wheel Axle", "Shaft", 1],
    ["Wheel Axle", "Small Nail", 2],
    ["Wheel", "Plank", 3],
    ["Wheel", "Shaft", 1],
    ["Wheel", "Small Nail", 4],
    ["Cart", "Wheel", 2],
    ["Cart", "Wheel Axle", 1],
    ["Cart", "Plank", 10],
    ["Cart", "Shaft", 2],
    ["Cart", "Rope", 1],
    ["Cart", "Large Nail", 10],
    ["Large Cart", "Wheel", 4],
    ["Large Cart", "Wheel Axle", 2],
    ["Large Cart", "Plank", 20],
    ["Large Cart", "Shaft", 4],
    ["Large Cart", "Rope", 2],
    ["Large Cart", "Large Nail", 20],
    ["Brick", "Clay", 1],
    ["Mortar", "Clay", 1],
    ["Mortar", "Rock Shards", 1],
  ];

  const insertRecipe = db.prepare(
    "INSERT INTO recipes (result_item_id, ingredient_item_id, quantity) VALUES (?, ?, ?)"
  );
  const insertRecipes = db.transaction(() => {
    for (const [result, ingredient, qty] of recipes) {
      const resultId = itemIds[result as string];
      const ingredientId = itemIds[ingredient as string];
      if (resultId && ingredientId) {
        insertRecipe.run(resultId, ingredientId, qty);
      }
    }
  });
  insertRecipes();
}

// ========== QUERY FUNCTIONS ==========

export function getAllItems(): Item[] {
  return getDb().prepare("SELECT * FROM items ORDER BY name").all() as Item[];
}

export function getItem(id: number): Item | undefined {
  return getDb().prepare("SELECT * FROM items WHERE id = ?").get(id) as
    | Item
    | undefined;
}

export function getItemByName(name: string): Item | undefined {
  return getDb()
    .prepare("SELECT * FROM items WHERE LOWER(name) = LOWER(?)")
    .get(name) as Item | undefined;
}

export function searchItems(query: string): Item[] {
  return getDb()
    .prepare("SELECT * FROM items WHERE LOWER(name) LIKE LOWER(?) ORDER BY name")
    .all(`%${query}%`) as Item[];
}

export function getCategories(): string[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT category FROM items ORDER BY category")
    .all() as { category: string }[];
  return rows.map((r) => r.category);
}

export function getRecipe(itemId: number): Recipe[] {
  return getDb()
    .prepare("SELECT * FROM recipes WHERE result_item_id = ?")
    .all(itemId) as Recipe[];
}

export function getAllRecipes(): RecipeWithNames[] {
  return getDb()
    .prepare(
      `
    SELECT
      r.*,
      ri.name as result_name,
      ii.name as ingredient_name
    FROM recipes r
    JOIN items ri ON r.result_item_id = ri.id
    JOIN items ii ON r.ingredient_item_id = ii.id
    ORDER BY ri.name, ii.name
  `
    )
    .all() as RecipeWithNames[];
}

// ========== CALCULATOR FUNCTIONS ==========

export function formatQuantity(qty: number): string {
  if (Number.isInteger(qty)) return qty.toString();
  return qty.toFixed(2).replace(/\.?0+$/, "");
}

export function calculateBaseMaterials(
  itemId: number,
  quantity: number = 1
): Map<number, number> {
  const item = getItem(itemId);
  if (!item) return new Map();

  if (item.is_base_material) {
    return new Map([[itemId, quantity]]);
  }

  const recipe = getRecipe(itemId);
  if (recipe.length === 0) {
    return new Map([[itemId, quantity]]);
  }

  const materials = new Map<number, number>();

  for (const ingredient of recipe) {
    const needed = ingredient.quantity * quantity;
    const subMaterials = calculateBaseMaterials(
      ingredient.ingredient_item_id,
      needed
    );

    for (const [matId, matQty] of subMaterials) {
      materials.set(matId, (materials.get(matId) || 0) + matQty);
    }
  }

  return materials;
}

export function buildCraftingTree(
  itemId: number,
  quantity: number = 1,
  depth: number = 0
): CraftingNode | null {
  const item = getItem(itemId);
  if (!item) return null;

  const node: CraftingNode = {
    id: itemId,
    name: item.name,
    category: item.category,
    quantity,
    is_base: Boolean(item.is_base_material),
    depth,
    children: [],
  };

  if (item.is_base_material || depth > 10) {
    return node;
  }

  const recipe = getRecipe(itemId);
  for (const ingredient of recipe) {
    const child = buildCraftingTree(
      ingredient.ingredient_item_id,
      ingredient.quantity * quantity,
      depth + 1
    );
    if (child) {
      node.children.push(child);
    }
  }

  return node;
}

export function getMaterialsList(
  itemId: number,
  quantity: number
): MaterialResult[] {
  const materials = calculateBaseMaterials(itemId, quantity);
  const results: MaterialResult[] = [];

  for (const [matId, qty] of materials) {
    const item = getItem(matId);
    if (item) {
      results.push({
        id: matId,
        name: item.name,
        category: item.category,
        quantity: qty,
        formatted: formatQuantity(qty),
      });
    }
  }

  results.sort((a, b) => {
    const catCmp = a.category.localeCompare(b.category);
    return catCmp !== 0 ? catCmp : a.name.localeCompare(b.name);
  });

  return results;
}

// ========== REVERSE LOOKUP ==========

export function findCraftableFrom(itemId: number): CraftableResult[] {
  const recipes = getDb()
    .prepare("SELECT DISTINCT result_item_id, quantity FROM recipes WHERE ingredient_item_id = ?")
    .all(itemId) as { result_item_id: number; quantity: number }[];

  const results: CraftableResult[] = [];
  for (const r of recipes) {
    const item = getItem(r.result_item_id);
    if (item) {
      results.push({ item, quantity_needed: r.quantity });
    }
  }

  results.sort((a, b) => a.item.name.localeCompare(b.item.name));
  return results;
}

export function findAllCraftableFrom(
  itemId: number,
  visited: Set<number> = new Set()
): CraftableResult[] {
  if (visited.has(itemId)) return [];
  visited.add(itemId);

  const direct = findCraftableFrom(itemId);
  const all = [...direct];

  for (const result of direct) {
    const indirect = findAllCraftableFrom(result.item.id, visited);
    for (const ind of indirect) {
      if (!all.some((a) => a.item.id === ind.item.id)) {
        all.push(ind);
      }
    }
  }

  return all;
}

// ========== ADMIN FUNCTIONS ==========

export function addItem(
  name: string,
  category: string,
  isBaseMaterial: boolean,
  description: string = ""
): number {
  const result = getDb()
    .prepare(
      "INSERT INTO items (name, category, is_base_material, description) VALUES (?, ?, ?, ?)"
    )
    .run(name, category, isBaseMaterial ? 1 : 0, description);
  return result.lastInsertRowid as number;
}

export function updateItem(
  id: number,
  name: string,
  category: string,
  isBaseMaterial: boolean,
  description: string = ""
): boolean {
  const result = getDb()
    .prepare(
      "UPDATE items SET name = ?, category = ?, is_base_material = ?, description = ? WHERE id = ?"
    )
    .run(name, category, isBaseMaterial ? 1 : 0, description, id);
  return result.changes > 0;
}

export function deleteItem(id: number): boolean {
  const db = getDb();
  db.prepare(
    "DELETE FROM recipes WHERE result_item_id = ? OR ingredient_item_id = ?"
  ).run(id, id);
  const result = db.prepare("DELETE FROM items WHERE id = ?").run(id);
  return result.changes > 0;
}

function wouldCreateCycle(
  resultItemId: number,
  ingredientItemId: number,
  visited: Set<number> = new Set()
): boolean {
  if (resultItemId === ingredientItemId) return true;
  if (visited.has(ingredientItemId)) return false;

  visited.add(ingredientItemId);
  const recipe = getRecipe(ingredientItemId);

  for (const ing of recipe) {
    if (ing.ingredient_item_id === resultItemId) return true;
    if (wouldCreateCycle(resultItemId, ing.ingredient_item_id, visited)) {
      return true;
    }
  }

  return false;
}

export function addRecipeIngredient(
  resultItemId: number,
  ingredientItemId: number,
  quantity: number
): number | null {
  if (wouldCreateCycle(resultItemId, ingredientItemId)) {
    return null;
  }

  const result = getDb()
    .prepare(
      "INSERT INTO recipes (result_item_id, ingredient_item_id, quantity) VALUES (?, ?, ?)"
    )
    .run(resultItemId, ingredientItemId, quantity);
  return result.lastInsertRowid as number;
}

export function updateRecipeIngredient(
  recipeId: number,
  quantity: number
): boolean {
  const result = getDb()
    .prepare("UPDATE recipes SET quantity = ? WHERE id = ?")
    .run(quantity, recipeId);
  return result.changes > 0;
}

export function deleteRecipeIngredient(recipeId: number): boolean {
  const result = getDb()
    .prepare("DELETE FROM recipes WHERE id = ?")
    .run(recipeId);
  return result.changes > 0;
}

// ========== DATA IMPORT/EXPORT ==========

export function exportToJson(): {
  version: string;
  exported_at: string;
  items: Array<{
    name: string;
    category: string;
    is_base_material: boolean;
    description: string;
  }>;
  recipes: Array<{ result: string; ingredient: string; quantity: number }>;
} {
  const items = getAllItems();
  const recipes = getAllRecipes();

  return {
    version: "1.0",
    exported_at: new Date().toISOString(),
    items: items.map((i) => ({
      name: i.name,
      category: i.category,
      is_base_material: Boolean(i.is_base_material),
      description: i.description || "",
    })),
    recipes: recipes.map((r) => ({
      result: r.result_name,
      ingredient: r.ingredient_name,
      quantity: r.quantity,
    })),
  };
}

export function importFromJson(
  data: ReturnType<typeof exportToJson>,
  replace: boolean = false
): ImportStats {
  const stats: ImportStats = {
    items_added: 0,
    items_skipped: 0,
    recipes_added: 0,
    recipes_skipped: 0,
    errors: [],
  };

  const db = getDb();

  if (replace) {
    db.exec("DELETE FROM recipes; DELETE FROM items;");
  }

  for (const item of data.items || []) {
    if (!item.name) {
      stats.errors.push("Item missing name");
      continue;
    }

    const existing = getItemByName(item.name);
    if (existing) {
      stats.items_skipped++;
      continue;
    }

    try {
      addItem(
        item.name,
        item.category || "misc",
        item.is_base_material || false,
        item.description || ""
      );
      stats.items_added++;
    } catch (e) {
      stats.errors.push(`Error adding item ${item.name}: ${e}`);
    }
  }

  for (const recipe of data.recipes || []) {
    if (!recipe.result || !recipe.ingredient) {
      stats.errors.push("Recipe missing result or ingredient");
      continue;
    }

    const resultItem = getItemByName(recipe.result);
    const ingredientItem = getItemByName(recipe.ingredient);

    if (!resultItem) {
      stats.errors.push(`Recipe result not found: ${recipe.result}`);
      continue;
    }
    if (!ingredientItem) {
      stats.errors.push(`Recipe ingredient not found: ${recipe.ingredient}`);
      continue;
    }

    const existing = getRecipe(resultItem.id).find(
      (r) => r.ingredient_item_id === ingredientItem.id
    );
    if (existing) {
      stats.recipes_skipped++;
      continue;
    }

    const id = addRecipeIngredient(
      resultItem.id,
      ingredientItem.id,
      recipe.quantity || 1
    );
    if (id === null) {
      stats.errors.push(
        `Circular dependency: ${recipe.ingredient} -> ${recipe.result}`
      );
    } else {
      stats.recipes_added++;
    }
  }

  return stats;
}

export function clearAllData(): void {
  const db = getDb();
  db.exec("DELETE FROM recipes; DELETE FROM items;");
}

export function getStats(): {
  items: number;
  recipes: number;
  base_materials: number;
  craftable: number;
  categories: number;
} {
  const db = getDb();
  const items = db.prepare("SELECT COUNT(*) as count FROM items").get() as {
    count: number;
  };
  const recipes = db.prepare("SELECT COUNT(*) as count FROM recipes").get() as {
    count: number;
  };
  const baseMaterials = db
    .prepare("SELECT COUNT(*) as count FROM items WHERE is_base_material = 1")
    .get() as { count: number };
  const craftable = db
    .prepare("SELECT COUNT(*) as count FROM items WHERE is_base_material = 0")
    .get() as { count: number };
  const categories = db
    .prepare("SELECT COUNT(DISTINCT category) as count FROM items")
    .get() as { count: number };

  return {
    items: items.count,
    recipes: recipes.count,
    base_materials: baseMaterials.count,
    craftable: craftable.count,
    categories: categories.count,
  };
}

// ========== CSV IMPORT FUNCTIONS ==========

interface CsvItemRow {
  name: string;
  category: string;
  is_base_material: boolean;
  description: string;
}

interface CsvRecipeRow {
  result: string;
  ingredient: string;
  quantity: number;
}

interface CsvParseResult<T> {
  valid: T[];
  invalid: Array<{ row: number; data: string[]; error: string }>;
  duplicates: T[];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

export function parseItemsCsv(csvContent: string): CsvParseResult<CsvItemRow> {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());
  const result: CsvParseResult<CsvItemRow> = {
    valid: [],
    invalid: [],
    duplicates: [],
  };

  if (lines.length === 0) {
    return result;
  }

  // Parse header
  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
  const nameIdx = header.indexOf("name");
  const categoryIdx = header.indexOf("category");
  const baseIdx = header.findIndex(
    (h) => h === "is_base_material" || h === "base" || h === "is_base"
  );
  const descIdx = header.findIndex(
    (h) => h === "description" || h === "desc"
  );

  if (nameIdx === -1) {
    result.invalid.push({
      row: 0,
      data: header,
      error: 'Missing required column "name"',
    });
    return result;
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);

    if (fields.length === 0 || (fields.length === 1 && !fields[0])) {
      continue; // Skip empty lines
    }

    const name = fields[nameIdx]?.trim() || "";
    const category = (categoryIdx !== -1 ? fields[categoryIdx] : "misc")?.trim() || "misc";
    const baseValue = baseIdx !== -1 ? fields[baseIdx]?.trim().toLowerCase() : "0";
    const isBase =
      baseValue === "1" ||
      baseValue === "true" ||
      baseValue === "yes";
    const description =
      descIdx !== -1 ? fields[descIdx]?.trim() || "" : "";

    if (!name) {
      result.invalid.push({
        row: i,
        data: fields,
        error: "Missing name",
      });
      continue;
    }

    if (name.length > 100) {
      result.invalid.push({
        row: i,
        data: fields,
        error: "Name too long (max 100 chars)",
      });
      continue;
    }

    const item: CsvItemRow = {
      name,
      category,
      is_base_material: isBase,
      description,
    };

    // Check for duplicates in the CSV itself
    if (result.valid.some((v) => v.name.toLowerCase() === name.toLowerCase())) {
      result.duplicates.push(item);
      continue;
    }

    // Check for existing item in database
    const existing = getItemByName(name);
    if (existing) {
      result.duplicates.push(item);
      continue;
    }

    result.valid.push(item);
  }

  return result;
}

export function parseRecipesCsv(
  csvContent: string
): CsvParseResult<CsvRecipeRow> {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());
  const result: CsvParseResult<CsvRecipeRow> = {
    valid: [],
    invalid: [],
    duplicates: [],
  };

  if (lines.length === 0) {
    return result;
  }

  // Parse header
  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
  const resultIdx = header.findIndex(
    (h) => h === "result" || h === "result_item" || h === "product"
  );
  const ingredientIdx = header.findIndex(
    (h) => h === "ingredient" || h === "ingredient_item" || h === "material"
  );
  const quantityIdx = header.findIndex(
    (h) => h === "quantity" || h === "qty" || h === "amount"
  );

  if (resultIdx === -1) {
    result.invalid.push({
      row: 0,
      data: header,
      error: 'Missing required column "result"',
    });
    return result;
  }
  if (ingredientIdx === -1) {
    result.invalid.push({
      row: 0,
      data: header,
      error: 'Missing required column "ingredient"',
    });
    return result;
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);

    if (fields.length === 0 || (fields.length === 1 && !fields[0])) {
      continue;
    }

    const resultName = fields[resultIdx]?.trim() || "";
    const ingredientName = fields[ingredientIdx]?.trim() || "";
    const quantityStr =
      quantityIdx !== -1 ? fields[quantityIdx]?.trim() : "1";
    const quantity = parseFloat(quantityStr) || 1;

    if (!resultName) {
      result.invalid.push({
        row: i,
        data: fields,
        error: "Missing result item name",
      });
      continue;
    }

    if (!ingredientName) {
      result.invalid.push({
        row: i,
        data: fields,
        error: "Missing ingredient name",
      });
      continue;
    }

    if (quantity <= 0 || quantity > 10000) {
      result.invalid.push({
        row: i,
        data: fields,
        error: "Invalid quantity (must be 0-10000)",
      });
      continue;
    }

    // Check if items exist
    const resultItem = getItemByName(resultName);
    const ingredientItem = getItemByName(ingredientName);

    if (!resultItem) {
      result.invalid.push({
        row: i,
        data: fields,
        error: `Result item not found: ${resultName}`,
      });
      continue;
    }

    if (!ingredientItem) {
      result.invalid.push({
        row: i,
        data: fields,
        error: `Ingredient not found: ${ingredientName}`,
      });
      continue;
    }

    // Check if recipe already exists
    const existingRecipes = getRecipe(resultItem.id);
    if (
      existingRecipes.some((r) => r.ingredient_item_id === ingredientItem.id)
    ) {
      result.duplicates.push({
        result: resultName,
        ingredient: ingredientName,
        quantity,
      });
      continue;
    }

    result.valid.push({
      result: resultName,
      ingredient: ingredientName,
      quantity,
    });
  }

  return result;
}

export function importItemsFromCsv(items: CsvItemRow[]): {
  added: number;
  errors: string[];
} {
  const result = { added: 0, errors: [] as string[] };

  for (const item of items) {
    try {
      addItem(item.name, item.category, item.is_base_material, item.description);
      result.added++;
    } catch (e) {
      result.errors.push(`Failed to add ${item.name}: ${e}`);
    }
  }

  return result;
}

export function importRecipesFromCsv(
  recipes: CsvRecipeRow[]
): { added: number; errors: string[] } {
  const result = { added: 0, errors: [] as string[] };

  for (const recipe of recipes) {
    const resultItem = getItemByName(recipe.result);
    const ingredientItem = getItemByName(recipe.ingredient);

    if (!resultItem || !ingredientItem) {
      result.errors.push(
        `Items not found: ${recipe.result} or ${recipe.ingredient}`
      );
      continue;
    }

    try {
      const id = addRecipeIngredient(
        resultItem.id,
        ingredientItem.id,
        recipe.quantity
      );
      if (id === null) {
        result.errors.push(
          `Circular dependency: ${recipe.ingredient} -> ${recipe.result}`
        );
      } else {
        result.added++;
      }
    } catch (e) {
      result.errors.push(`Failed to add recipe: ${e}`);
    }
  }

  return result;
}

// ========== ADVANCED CRAFTING CALCULATIONS ==========

/**
 * Default crafting settings for calculations
 */
export const DEFAULT_CRAFTING_SETTINGS: CraftingSettings = {
  playerSkill: 50,
  toolQL: 50,
  materialQL: 50,
  hasSleepBonus: false,
  parentSkill: 0,
  windOfAges: 0,
  circleOfCunning: 0
};

/**
 * Calculate advanced materials with failure rates and predictions
 */
export function calculateAdvancedMaterials(
  itemId: number,
  quantity: number,
  settings: Partial<CraftingSettings> = {}
): AdvancedCalculationResult | null {
  const item = getItem(itemId);
  if (!item) return null;

  // Merge with defaults
  const craftSettings: CraftingSettings = {
    ...DEFAULT_CRAFTING_SETTINGS,
    ...settings
  };

  // Get base materials (perfect success scenario)
  const baseMaterials = getMaterialsList(itemId, quantity);
  const tree = buildCraftingTree(itemId, quantity);

  if (!tree) return null;

  // Get item difficulty
  const difficulty = item.difficulty || getItemDifficulty(item.name);

  // Calculate success chance
  const successChance = calculateSuccessChance({
    skill: craftSettings.playerSkill,
    difficulty,
    toolQL: craftSettings.toolQL,
    materialQL: craftSettings.materialQL,
    parentSkillBonus: craftSettings.parentSkill
  });

  const successCategory = getSuccessCategory(successChance);

  // Calculate quality prediction
  const qualityPred = predictCraftingQuality(
    craftSettings.playerSkill,
    craftSettings.toolQL,
    craftSettings.materialQL
  );

  // Calculate total base materials needed
  const totalBaseMaterials = baseMaterials.reduce((sum, m) => sum + m.quantity, 0);

  // Calculate material waste
  const wasteResult = calculateMaterialWaste(quantity, totalBaseMaterials / quantity, successChance);

  // Calculate expected materials for each base material
  const expectedMaterials: AdvancedMaterialResult[] = baseMaterials.map(mat => {
    const wasteForMat = calculateMaterialWaste(
      quantity,
      mat.quantity / quantity,
      successChance
    );

    return {
      ...mat,
      expectedQuantity: wasteForMat.expectedQuantity,
      expectedFormatted: formatQuantity(wasteForMat.expectedQuantity),
      worstCaseQuantity: wasteForMat.worstCaseQuantity,
      worstCaseFormatted: formatQuantity(wasteForMat.worstCaseQuantity)
    };
  });

  // Calculate crafting time
  const timeResult = calculateCraftingTime(
    item.skill_type ? `create_${item.skill_type}` : "default_create",
    Math.ceil(wasteResult.expectedAttempts),
    craftSettings.playerSkill,
    craftSettings.toolQL,
    qualityPred.averageQL,
    craftSettings.windOfAges
  );

  // Calculate tool wear
  const toolWear = calculateToolWear(
    Math.ceil(wasteResult.expectedAttempts),
    craftSettings.toolQL,
    difficulty,
    craftSettings.circleOfCunning
  );

  // Calculate skill gain
  const skillGain = predictSkillGain(
    craftSettings.playerSkill,
    difficulty,
    timeResult.modifiedTimeSeconds,
    Math.ceil(wasteResult.expectedAttempts),
    craftSettings.hasSleepBonus
  );

  // Build prediction object
  const prediction: CraftingPrediction = {
    successChance,
    successLabel: successCategory.label,
    successColor: successCategory.color,
    averageQL: qualityPred.averageQL,
    minQL: qualityPred.minQL,
    maxQL: qualityPred.maxQL,
    timePerItem: timeResult.modifiedTimeSeconds,
    totalTime: timeResult.totalTimeSeconds,
    totalTimeFormatted: timeResult.totalTimeFormatted,
    failureRate: wasteResult.failureRate,
    wasteMultiplier: wasteResult.expectedQuantity / wasteResult.baseQuantity,
    toolDamagePerAction: toolWear.damagePerAction,
    repairsNeeded: toolWear.repairsNeeded,
    skillGainPerAction: skillGain.gainPerAction,
    totalSkillGain: skillGain.totalGain,
    newSkillLevel: skillGain.newSkillLevel,
    actionsToNextLevel: skillGain.actionsToNextLevel,
    isOptimalDifficulty: skillGain.isOptimalDifficulty
  };

  return {
    baseMaterials,
    expectedMaterials,
    tree,
    prediction
  };
}

/**
 * Generate skill grinding path for an item
 */
export function getSkillGrindingPath(
  itemId: number,
  currentSkill: number,
  targetSkill: number,
  toolQL: number = 50
): SkillGrindStep[] {
  const item = getItem(itemId);
  if (!item) return [];

  const rawPath = generateSkillPath(currentSkill, targetSkill, toolQL);

  // Get base materials for the item to estimate material usage
  const baseMaterials = getMaterialsList(itemId, 1);
  const totalMaterialsPerItem = baseMaterials.reduce((sum, m) => sum + m.quantity, 0);

  return rawPath.map(step => {
    // Calculate materials needed for this step
    const wasteResult = calculateMaterialWaste(
      step.actionsNeeded,
      totalMaterialsPerItem,
      step.successRate
    );

    // Estimate time for this step
    const timeResult = calculateCraftingTime(
      "default_create",
      step.actionsNeeded,
      (step.skillRange.from + step.skillRange.to) / 2,
      toolQL
    );

    return {
      skillFrom: step.skillRange.from,
      skillTo: step.skillRange.to,
      targetQL: step.targetQL,
      actionsNeeded: step.actionsNeeded,
      successRate: step.successRate,
      description: step.description,
      materialsNeeded: Math.ceil(wasteResult.expectedQuantity),
      timeEstimate: timeResult.totalTimeFormatted
    };
  });
}

/**
 * Find the optimal item to craft for skill training at current level
 */
export function findOptimalTrainingItem(
  skill: number,
  category?: string
): { item: Item; difficulty: number; successChance: number }[] {
  const allItems = getAllItems().filter(i => !i.is_base_material);

  // Filter by category if specified
  const candidates = category
    ? allItems.filter(i => i.category === category)
    : allItems;

  // Calculate optimal difficulty range (skill - 10 to skill + 10 for 50% success)
  const optimalMin = Math.max(0, skill - 10);
  const optimalMax = skill + 10;

  // Score and sort items
  const scored = candidates.map(item => {
    const difficulty = item.difficulty || getItemDifficulty(item.name);
    const successChance = calculateSuccessChance({
      skill,
      difficulty,
      toolQL: 50,
      materialQL: 50
    });

    // Optimal is around 50% success
    const distanceFromOptimal = Math.abs(successChance - 50);

    return {
      item,
      difficulty,
      successChance,
      score: 100 - distanceFromOptimal
    };
  });

  // Sort by score (closest to 50% success)
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 10).map(({ item, difficulty, successChance }) => ({
    item,
    difficulty,
    successChance
  }));
}

/**
 * Calculate batch crafting efficiency
 * Helps determine optimal batch sizes based on inventory capacity
 */
export function calculateBatchEfficiency(
  itemId: number,
  batchSize: number,
  inventorySlots: number,
  settings: Partial<CraftingSettings> = {}
): {
  batchesNeeded: number;
  materialsPerBatch: number;
  totalTrips: number;
  efficiencyScore: number;
} {
  const baseMaterials = getMaterialsList(itemId, batchSize);
  const totalMaterialTypes = baseMaterials.length;
  const totalMaterialQuantity = baseMaterials.reduce((sum, m) => sum + Math.ceil(m.quantity), 0);

  // Calculate how many inventory slots materials take
  // Assuming each material stack is one slot
  const slotsNeededPerBatch = Math.min(inventorySlots, totalMaterialTypes + 1); // +1 for tool

  // Calculate batches needed
  const batchesNeeded = Math.ceil(inventorySlots / slotsNeededPerBatch);

  // Calculate trips (assuming you need to bank materials)
  const totalTrips = Math.ceil(totalMaterialQuantity / (inventorySlots * 100)); // 100 per stack

  // Efficiency score (higher is better)
  const efficiencyScore = Math.round((batchSize / totalTrips) * 10);

  return {
    batchesNeeded,
    materialsPerBatch: Math.ceil(totalMaterialQuantity),
    totalTrips,
    efficiencyScore
  };
}

// ========== MARKET ORDER FUNCTIONS ==========

interface OrderRow {
  id: number;
  user_id: number;
  order_type: string;
  item_name: string;
  quantity: number;
  quality: number | null;
  price: number | null;
  currency: string | null;
  trade_for: string | null;
  location: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
}

interface OrderWithUsername extends OrderRow {
  username: string;
}

function mapOrderRowToMarketOrder(row: OrderWithUsername): MarketOrder {
  return {
    id: row.id,
    user_id: row.user_id,
    username: row.username,
    order_type: row.order_type as OrderType,
    item_name: row.item_name,
    quantity: row.quantity,
    quality: row.quality ?? undefined,
    price: row.price ?? undefined,
    currency: row.currency ?? undefined,
    trade_for: row.trade_for ?? undefined,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status as OrderStatus,
    created_at: row.created_at,
    expires_at: row.expires_at ?? undefined,
  };
}

export function getAllOrders(filters?: {
  status?: OrderStatus;
  order_type?: OrderType;
  item_name?: string;
  user_id?: number;
}): MarketOrder[] {
  let query = `
    SELECT o.*, u.username
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (filters?.status) {
    query += " AND o.status = ?";
    params.push(filters.status);
  }
  if (filters?.order_type) {
    query += " AND o.order_type = ?";
    params.push(filters.order_type);
  }
  if (filters?.item_name) {
    query += " AND LOWER(o.item_name) LIKE LOWER(?)";
    params.push(`%${filters.item_name}%`);
  }
  if (filters?.user_id) {
    query += " AND o.user_id = ?";
    params.push(filters.user_id);
  }

  query += " ORDER BY o.created_at DESC";

  const rows = getDb().prepare(query).all(...params) as OrderWithUsername[];
  return rows.map(mapOrderRowToMarketOrder);
}

export function getOrderById(id: number): MarketOrder | null {
  const row = getDb()
    .prepare(
      `SELECT o.*, u.username
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`
    )
    .get(id) as OrderWithUsername | undefined;

  return row ? mapOrderRowToMarketOrder(row) : null;
}

export function getUserOrders(userId: number): MarketOrder[] {
  const rows = getDb()
    .prepare(
      `SELECT o.*, u.username
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`
    )
    .all(userId) as OrderWithUsername[];

  return rows.map(mapOrderRowToMarketOrder);
}

export function createOrder(userId: number, input: CreateOrderInput): number {
  const expiresAt = input.expires_days
    ? new Date(Date.now() + input.expires_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const result = getDb()
    .prepare(
      `INSERT INTO orders (
        user_id, order_type, item_name, quantity, quality,
        price, currency, trade_for, location, notes, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      input.order_type,
      input.item_name,
      input.quantity,
      input.quality ?? null,
      input.price ?? null,
      input.currency ?? "silver",
      input.trade_for ?? null,
      input.location ?? null,
      input.notes ?? null,
      expiresAt
    );

  return result.lastInsertRowid as number;
}

export function updateOrder(
  id: number,
  userId: number,
  input: Partial<CreateOrderInput>
): boolean {
  const order = getOrderById(id);
  if (!order || order.user_id !== userId) {
    return false;
  }

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.item_name !== undefined) {
    fields.push("item_name = ?");
    values.push(input.item_name);
  }
  if (input.quantity !== undefined) {
    fields.push("quantity = ?");
    values.push(input.quantity);
  }
  if (input.quality !== undefined) {
    fields.push("quality = ?");
    values.push(input.quality);
  }
  if (input.price !== undefined) {
    fields.push("price = ?");
    values.push(input.price);
  }
  if (input.currency !== undefined) {
    fields.push("currency = ?");
    values.push(input.currency);
  }
  if (input.trade_for !== undefined) {
    fields.push("trade_for = ?");
    values.push(input.trade_for);
  }
  if (input.location !== undefined) {
    fields.push("location = ?");
    values.push(input.location);
  }
  if (input.notes !== undefined) {
    fields.push("notes = ?");
    values.push(input.notes);
  }

  if (fields.length === 0) {
    return false;
  }

  values.push(id);
  const result = getDb()
    .prepare(`UPDATE orders SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values);

  return result.changes > 0;
}

export function updateOrderStatus(
  id: number,
  userId: number,
  status: OrderStatus,
  isAdmin: boolean = false
): boolean {
  const order = getOrderById(id);
  if (!order) {
    return false;
  }

  // Only owner or admin can update status
  if (order.user_id !== userId && !isAdmin) {
    return false;
  }

  const result = getDb()
    .prepare("UPDATE orders SET status = ? WHERE id = ?")
    .run(status, id);

  return result.changes > 0;
}

export function deleteOrder(id: number, userId: number, isAdmin: boolean = false): boolean {
  const order = getOrderById(id);
  if (!order) {
    return false;
  }

  // Only owner or admin can delete
  if (order.user_id !== userId && !isAdmin) {
    return false;
  }

  const result = getDb().prepare("DELETE FROM orders WHERE id = ?").run(id);
  return result.changes > 0;
}

export function expireOldOrders(): number {
  const result = getDb()
    .prepare(
      `UPDATE orders
       SET status = 'expired'
       WHERE status = 'active'
       AND expires_at IS NOT NULL
       AND expires_at < datetime('now')`
    )
    .run();

  return result.changes;
}

export function getOrderStats(): {
  total: number;
  active: number;
  buy_orders: number;
  sell_orders: number;
  trade_orders: number;
} {
  const db = getDb();
  const total = db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number };
  const active = db
    .prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'active'")
    .get() as { count: number };
  const buy = db
    .prepare("SELECT COUNT(*) as count FROM orders WHERE order_type = 'buy' AND status = 'active'")
    .get() as { count: number };
  const sell = db
    .prepare("SELECT COUNT(*) as count FROM orders WHERE order_type = 'sell' AND status = 'active'")
    .get() as { count: number };
  const trade = db
    .prepare("SELECT COUNT(*) as count FROM orders WHERE order_type = 'trade' AND status = 'active'")
    .get() as { count: number };

  return {
    total: total.count,
    active: active.count,
    buy_orders: buy.count,
    sell_orders: sell.count,
    trade_orders: trade.count,
  };
}

// ========== MERCHANT FUNCTIONS ==========

interface MerchantRow {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  location: string;
  server: string;
  coordinates: string | null;
  category: string;
  stock_list: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface MerchantWithUsername extends MerchantRow {
  username: string;
}

function mapMerchantRowToMerchant(row: MerchantWithUsername): Merchant {
  return {
    id: row.id,
    user_id: row.user_id,
    username: row.username,
    name: row.name,
    description: row.description ?? undefined,
    location: row.location,
    server: row.server,
    coordinates: row.coordinates ?? undefined,
    category: row.category as MerchantCategory,
    stock_list: row.stock_list,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function getAllMerchants(filters?: {
  is_active?: boolean;
  category?: MerchantCategory;
  server?: string;
  search?: string;
  user_id?: number;
}): Merchant[] {
  let query = `
    SELECT m.*, u.username
    FROM merchants m
    JOIN users u ON m.user_id = u.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (filters?.is_active !== undefined) {
    query += " AND m.is_active = ?";
    params.push(filters.is_active ? 1 : 0);
  }
  if (filters?.category) {
    query += " AND m.category = ?";
    params.push(filters.category);
  }
  if (filters?.server) {
    query += " AND m.server = ?";
    params.push(filters.server);
  }
  if (filters?.search) {
    query += " AND (LOWER(m.name) LIKE LOWER(?) OR LOWER(m.stock_list) LIKE LOWER(?) OR LOWER(m.location) LIKE LOWER(?))";
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  if (filters?.user_id) {
    query += " AND m.user_id = ?";
    params.push(filters.user_id);
  }

  query += " ORDER BY m.updated_at DESC";

  const rows = getDb().prepare(query).all(...params) as MerchantWithUsername[];
  return rows.map(mapMerchantRowToMerchant);
}

export function getMerchantById(id: number): Merchant | null {
  const row = getDb()
    .prepare(
      `SELECT m.*, u.username
       FROM merchants m
       JOIN users u ON m.user_id = u.id
       WHERE m.id = ?`
    )
    .get(id) as MerchantWithUsername | undefined;

  return row ? mapMerchantRowToMerchant(row) : null;
}

export function getUserMerchants(userId: number): Merchant[] {
  const rows = getDb()
    .prepare(
      `SELECT m.*, u.username
       FROM merchants m
       JOIN users u ON m.user_id = u.id
       WHERE m.user_id = ?
       ORDER BY m.updated_at DESC`
    )
    .all(userId) as MerchantWithUsername[];

  return rows.map(mapMerchantRowToMerchant);
}

export function createMerchant(userId: number, input: CreateMerchantInput): number {
  const result = getDb()
    .prepare(
      `INSERT INTO merchants (
        user_id, name, description, location, server, coordinates, category, stock_list
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      input.name,
      input.description ?? null,
      input.location,
      input.server,
      input.coordinates ?? null,
      input.category,
      input.stock_list
    );

  return result.lastInsertRowid as number;
}

export function updateMerchant(
  id: number,
  userId: number,
  input: Partial<CreateMerchantInput>,
  isAdmin: boolean = false
): boolean {
  const merchant = getMerchantById(id);
  if (!merchant) {
    return false;
  }

  // Only owner or admin can update
  if (merchant.user_id !== userId && !isAdmin) {
    return false;
  }

  const fields: string[] = ["updated_at = datetime('now')"];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description);
  }
  if (input.location !== undefined) {
    fields.push("location = ?");
    values.push(input.location);
  }
  if (input.server !== undefined) {
    fields.push("server = ?");
    values.push(input.server);
  }
  if (input.coordinates !== undefined) {
    fields.push("coordinates = ?");
    values.push(input.coordinates);
  }
  if (input.category !== undefined) {
    fields.push("category = ?");
    values.push(input.category);
  }
  if (input.stock_list !== undefined) {
    fields.push("stock_list = ?");
    values.push(input.stock_list);
  }

  values.push(id);
  const result = getDb()
    .prepare(`UPDATE merchants SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values);

  return result.changes > 0;
}

export function toggleMerchantActive(
  id: number,
  userId: number,
  isActive: boolean,
  isAdmin: boolean = false
): boolean {
  const merchant = getMerchantById(id);
  if (!merchant) {
    return false;
  }

  // Only owner or admin can toggle
  if (merchant.user_id !== userId && !isAdmin) {
    return false;
  }

  const result = getDb()
    .prepare("UPDATE merchants SET is_active = ?, updated_at = datetime('now') WHERE id = ?")
    .run(isActive ? 1 : 0, id);

  return result.changes > 0;
}

export function deleteMerchant(id: number, userId: number, isAdmin: boolean = false): boolean {
  const merchant = getMerchantById(id);
  if (!merchant) {
    return false;
  }

  // Only owner or admin can delete
  if (merchant.user_id !== userId && !isAdmin) {
    return false;
  }

  const result = getDb().prepare("DELETE FROM merchants WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getMerchantStats(): {
  total: number;
  active: number;
  by_category: Record<string, number>;
  by_server: Record<string, number>;
} {
  const db = getDb();
  const total = db.prepare("SELECT COUNT(*) as count FROM merchants").get() as { count: number };
  const active = db
    .prepare("SELECT COUNT(*) as count FROM merchants WHERE is_active = 1")
    .get() as { count: number };

  const byCategory = db
    .prepare("SELECT category, COUNT(*) as count FROM merchants WHERE is_active = 1 GROUP BY category")
    .all() as { category: string; count: number }[];

  const byServer = db
    .prepare("SELECT server, COUNT(*) as count FROM merchants WHERE is_active = 1 GROUP BY server")
    .all() as { server: string; count: number }[];

  return {
    total: total.count,
    active: active.count,
    by_category: Object.fromEntries(byCategory.map((c) => [c.category, c.count])),
    by_server: Object.fromEntries(byServer.map((s) => [s.server, s.count])),
  };
}

export function getServers(): string[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT server FROM merchants WHERE is_active = 1 ORDER BY server")
    .all() as { server: string }[];
  return rows.map((r) => r.server);
}
