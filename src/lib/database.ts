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
} from "./types";

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

export function getStats(): { items: number; recipes: number } {
  const db = getDb();
  const items = db.prepare("SELECT COUNT(*) as count FROM items").get() as {
    count: number;
  };
  const recipes = db.prepare("SELECT COUNT(*) as count FROM recipes").get() as {
    count: number;
  };
  return { items: items.count, recipes: recipes.count };
}
