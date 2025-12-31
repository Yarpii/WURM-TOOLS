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
  Alliance,
  AllianceMember,
  AllianceInvite,
  AllianceRole,
  InviteStatus,
  CreateAllianceInput,
  UpdateAllianceInput,
  PriceHistory,
  PriceAnalytics,
  TrendingItem,
  PriceAlert,
  CreatePriceAlertInput,
  Project,
  ProjectItem,
  ProjectMaterial,
  ProjectStatus,
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectItemInput,
  TradeMatch,
  MatchStatus,
  UserRating,
  UserReputation,
  CreateRatingInput,
  BarterSuggestion,
  MapLocation,
  LocationType,
  WurmServer,
  CreateLocationInput,
  UpdateLocationInput,
  Achievement,
  UserAchievement,
  UserXP,
  LeaderboardEntry,
  AchievementCategory,
  DiscordWebhook,
  CreateWebhookInput,
  DiscordEmbed,
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
        description TEXT,
        difficulty INTEGER DEFAULT NULL,
        skill_type TEXT DEFAULT NULL,
        base_time INTEGER DEFAULT NULL,
        tool_type TEXT DEFAULT NULL
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

  // Migration: Add new crafting columns to items table if they don't exist
  const columnCheck = db.prepare("PRAGMA table_info(items)").all() as { name: string }[];
  const columnNames = columnCheck.map(c => c.name);

  if (!columnNames.includes("difficulty")) {
    db.exec("ALTER TABLE items ADD COLUMN difficulty INTEGER DEFAULT NULL");
  }
  if (!columnNames.includes("skill_type")) {
    db.exec("ALTER TABLE items ADD COLUMN skill_type TEXT DEFAULT NULL");
  }
  if (!columnNames.includes("base_time")) {
    db.exec("ALTER TABLE items ADD COLUMN base_time INTEGER DEFAULT NULL");
  }
  if (!columnNames.includes("tool_type")) {
    db.exec("ALTER TABLE items ADD COLUMN tool_type TEXT DEFAULT NULL");
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

  // Initialize alliances table if it doesn't exist
  const alliancesTableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='alliances'"
    )
    .get();

  if (!alliancesTableExists) {
    db.exec(`
      CREATE TABLE alliances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        tag TEXT,
        leader_id INTEGER NOT NULL,
        is_public INTEGER DEFAULT 1,
        max_members INTEGER DEFAULT 50,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (leader_id) REFERENCES users(id)
      );

      CREATE TABLE alliance_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alliance_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('leader', 'officer', 'member')),
        joined_at TEXT NOT NULL DEFAULT (datetime('now')),
        invited_by INTEGER,
        FOREIGN KEY (alliance_id) REFERENCES alliances(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id),
        UNIQUE(alliance_id, user_id)
      );

      CREATE TABLE alliance_invites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alliance_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        invited_by INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'expired')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT,
        FOREIGN KEY (alliance_id) REFERENCES alliances(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id)
      );

      CREATE INDEX idx_alliances_leader ON alliances(leader_id);
      CREATE INDEX idx_alliance_members_alliance ON alliance_members(alliance_id);
      CREATE INDEX idx_alliance_members_user ON alliance_members(user_id);
      CREATE INDEX idx_alliance_invites_alliance ON alliance_invites(alliance_id);
      CREATE INDEX idx_alliance_invites_user ON alliance_invites(user_id);
      CREATE INDEX idx_alliance_invites_status ON alliance_invites(status);
    `);
  }

  // Initialize price_history table if it doesn't exist
  const priceHistoryTableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='price_history'"
    )
    .get();

  if (!priceHistoryTableExists) {
    db.exec(`
      CREATE TABLE price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT NOT NULL,
        price REAL NOT NULL,
        quality INTEGER DEFAULT 50,
        order_type TEXT NOT NULL CHECK(order_type IN ('buy', 'sell')),
        currency TEXT DEFAULT 'silver',
        recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE price_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        target_price REAL NOT NULL,
        condition TEXT NOT NULL CHECK(condition IN ('above', 'below')),
        is_active INTEGER DEFAULT 1,
        triggered_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_price_history_item ON price_history(item_name);
      CREATE INDEX idx_price_history_date ON price_history(recorded_at);
      CREATE INDEX idx_price_alerts_user ON price_alerts(user_id);
      CREATE INDEX idx_price_alerts_item ON price_alerts(item_name);
    `);
  }

  // Initialize projects tables if they don't exist
  const projectsTableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='projects'"
    )
    .get();

  if (!projectsTableExists) {
    db.exec(`
      CREATE TABLE projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning', 'in_progress', 'completed', 'archived')),
        is_shared INTEGER DEFAULT 0,
        alliance_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (alliance_id) REFERENCES alliances(id) ON DELETE SET NULL
      );

      CREATE TABLE project_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        completed_quantity INTEGER DEFAULT 0,
        notes TEXT,
        priority INTEGER DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      CREATE INDEX idx_projects_user ON projects(user_id);
      CREATE INDEX idx_projects_alliance ON projects(alliance_id);
      CREATE INDEX idx_projects_status ON projects(status);
      CREATE INDEX idx_project_items_project ON project_items(project_id);
    `);
  }

  // Initialize trade matching tables if they don't exist
  const tradeMatchesTableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='trade_matches'"
    )
    .get();

  if (!tradeMatchesTableExists) {
    db.exec(`
      CREATE TABLE trade_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        buy_order_id INTEGER NOT NULL,
        sell_order_id INTEGER NOT NULL,
        buyer_id INTEGER NOT NULL,
        seller_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        buy_price REAL,
        sell_price REAL,
        match_score INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'contacted', 'completed', 'declined', 'expired')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        contacted_at TEXT,
        FOREIGN KEY (buy_order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (sell_order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (buyer_id) REFERENCES users(id),
        FOREIGN KEY (seller_id) REFERENCES users(id)
      );

      CREATE TABLE user_ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rater_id INTEGER NOT NULL,
        rated_user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        trade_match_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (rated_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (trade_match_id) REFERENCES trade_matches(id) ON DELETE SET NULL
      );

      CREATE INDEX idx_trade_matches_buyer ON trade_matches(buyer_id);
      CREATE INDEX idx_trade_matches_seller ON trade_matches(seller_id);
      CREATE INDEX idx_trade_matches_status ON trade_matches(status);
      CREATE INDEX idx_trade_matches_item ON trade_matches(item_name);
      CREATE INDEX idx_user_ratings_rater ON user_ratings(rater_id);
      CREATE INDEX idx_user_ratings_rated ON user_ratings(rated_user_id);
    `);
  }

  // Initialize map_locations table if it doesn't exist
  const mapLocationsTableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='map_locations'"
    )
    .get();

  if (!mapLocationsTableExists) {
    db.exec(`
      CREATE TABLE map_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        location_type TEXT NOT NULL CHECK(location_type IN ('deed', 'merchant', 'landmark', 'resource', 'spawn', 'other')),
        server TEXT NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        is_public INTEGER DEFAULT 1,
        is_verified INTEGER DEFAULT 0,
        alliance_id INTEGER,
        merchant_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (alliance_id) REFERENCES alliances(id) ON DELETE SET NULL,
        FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL
      );

      CREATE INDEX idx_map_locations_server ON map_locations(server);
      CREATE INDEX idx_map_locations_type ON map_locations(location_type);
      CREATE INDEX idx_map_locations_user ON map_locations(user_id);
      CREATE INDEX idx_map_locations_coords ON map_locations(x, y);
    `);
  }

  // Initialize gamification tables if they don't exist
  const userXpTableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='user_xp'"
    )
    .get();

  if (!userXpTableExists) {
    db.exec(`
      CREATE TABLE user_xp (
        user_id INTEGER PRIMARY KEY,
        total_xp INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        achievement_id TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, achievement_id)
      );

      CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
      CREATE INDEX idx_user_achievements_completed ON user_achievements(completed);
    `);
  }

  // Initialize discord_webhooks table if it doesn't exist
  const discordWebhooksTableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='discord_webhooks'"
    )
    .get();

  if (!discordWebhooksTableExists) {
    db.exec(`
      CREATE TABLE discord_webhooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        notify_trades INTEGER DEFAULT 1,
        notify_matches INTEGER DEFAULT 1,
        notify_price_alerts INTEGER DEFAULT 1,
        notify_alliance INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_discord_webhooks_user ON discord_webhooks(user_id);
      CREATE INDEX idx_discord_webhooks_active ON discord_webhooks(is_active);
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

// ========== PAGINATION TYPES ==========

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// SECURITY: Default and maximum limits to prevent DoS
const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;

function validatePagination(params?: PaginationParams): { offset: number; limit: number; page: number } {
  const page = Math.max(1, Math.floor(params?.page || 1));
  const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Math.floor(params?.limit || DEFAULT_PAGE_LIMIT)));
  const offset = (page - 1) * limit;
  return { offset, limit, page };
}

// ========== QUERY FUNCTIONS ==========

export function getAllItems(): Item[] {
  return getDb().prepare("SELECT * FROM items ORDER BY name").all() as Item[];
}

// SECURITY: Paginated version to prevent DoS via unbounded queries
export function getItemsPaginated(params?: PaginationParams): PaginatedResult<Item> {
  const { offset, limit, page } = validatePagination(params);
  const db = getDb();

  const total = (db.prepare("SELECT COUNT(*) as count FROM items").get() as { count: number }).count;
  const data = db.prepare("SELECT * FROM items ORDER BY name LIMIT ? OFFSET ?").all(limit, offset) as Item[];

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
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

/**
 * Get direct recipe ingredients (recipe book style)
 * Only returns the immediate ingredients, not recursively calculated base materials
 * Example: Cart → [2x Wheel, 1x Wheel Axle, 10x Plank, ...] (NOT Logs, Iron Ore, etc.)
 */
export function getDirectIngredients(
  itemId: number,
  quantity: number = 1
): MaterialResult[] {
  const item = getItem(itemId);
  if (!item) return [];

  // Base materials have no recipe - they ARE the ingredient
  if (item.is_base_material) {
    return [{
      id: itemId,
      name: item.name,
      category: item.category,
      quantity: quantity,
      formatted: formatQuantity(quantity),
    }];
  }

  const recipe = getRecipe(itemId);
  if (recipe.length === 0) {
    // No recipe found, treat as base material
    return [{
      id: itemId,
      name: item.name,
      category: item.category,
      quantity: quantity,
      formatted: formatQuantity(quantity),
    }];
  }

  const results: MaterialResult[] = [];

  for (const ingredient of recipe) {
    const ingredientItem = getItem(ingredient.ingredient_item_id);
    if (ingredientItem) {
      const qty = ingredient.quantity * quantity;
      results.push({
        id: ingredient.ingredient_item_id,
        name: ingredientItem.name,
        category: ingredientItem.category,
        quantity: qty,
        formatted: formatQuantity(qty),
      });
    }
  }

  // Sort by category, then name
  results.sort((a, b) => {
    const catCmp = a.category.localeCompare(b.category);
    return catCmp !== 0 ? catCmp : a.name.localeCompare(b.name);
  });

  return results;
}

/**
 * Build a shallow crafting tree (only one level deep)
 * Shows direct ingredients without recursion
 */
export function buildShallowCraftingTree(
  itemId: number,
  quantity: number = 1
): CraftingNode | null {
  const item = getItem(itemId);
  if (!item) return null;

  const node: CraftingNode = {
    id: itemId,
    name: item.name,
    category: item.category,
    quantity,
    is_base: Boolean(item.is_base_material),
    depth: 0,
    children: [],
  };

  if (item.is_base_material) {
    return node;
  }

  const recipe = getRecipe(itemId);
  for (const ingredient of recipe) {
    const ingredientItem = getItem(ingredient.ingredient_item_id);
    if (ingredientItem) {
      node.children.push({
        id: ingredient.ingredient_item_id,
        name: ingredientItem.name,
        category: ingredientItem.category,
        quantity: ingredient.quantity * quantity,
        is_base: Boolean(ingredientItem.is_base_material),
        depth: 1,
        children: [], // No further recursion
      });
    }
  }

  return node;
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

export interface AddItemOptions {
  name: string;
  category: string;
  isBaseMaterial: boolean;
  description?: string;
  difficulty?: number | null;
  skillType?: string | null;
  baseTime?: number | null;
  toolType?: string | null;
}

export function addItem(
  name: string,
  category: string,
  isBaseMaterial: boolean,
  description: string = "",
  options?: {
    difficulty?: number | null;
    skillType?: string | null;
    baseTime?: number | null;
    toolType?: string | null;
  }
): number {
  const result = getDb()
    .prepare(
      `INSERT INTO items (name, category, is_base_material, description, difficulty, skill_type, base_time, tool_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      category,
      isBaseMaterial ? 1 : 0,
      description,
      options?.difficulty ?? null,
      options?.skillType ?? null,
      options?.baseTime ?? null,
      options?.toolType ?? null
    );
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

/**
 * Update crafting-specific fields for an item
 */
export function updateItemCraftingData(
  id: number,
  data: {
    difficulty?: number | null;
    skillType?: string | null;
    baseTime?: number | null;
    toolType?: string | null;
  }
): boolean {
  const fields: string[] = [];
  const values: (number | string | null)[] = [];

  if (data.difficulty !== undefined) {
    fields.push("difficulty = ?");
    values.push(data.difficulty);
  }
  if (data.skillType !== undefined) {
    fields.push("skill_type = ?");
    values.push(data.skillType);
  }
  if (data.baseTime !== undefined) {
    fields.push("base_time = ?");
    values.push(data.baseTime);
  }
  if (data.toolType !== undefined) {
    fields.push("tool_type = ?");
    values.push(data.toolType);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const result = getDb()
    .prepare(`UPDATE items SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values);

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
    difficulty?: number | null;
    skill_type?: string | null;
    base_time?: number | null;
    tool_type?: string | null;
  }>;
  recipes: Array<{ result: string; ingredient: string; quantity: number }>;
} {
  const items = getAllItems();
  const recipes = getAllRecipes();

  return {
    version: "2.0",
    exported_at: new Date().toISOString(),
    items: items.map((i) => ({
      name: i.name,
      category: i.category,
      is_base_material: Boolean(i.is_base_material),
      description: i.description || "",
      difficulty: i.difficulty,
      skill_type: i.skill_type,
      base_time: i.base_time,
      tool_type: i.tool_type,
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
        item.description || "",
        {
          difficulty: item.difficulty ?? null,
          skillType: item.skill_type ?? null,
          baseTime: item.base_time ?? null,
          toolType: item.tool_type ?? null,
        }
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
  with_difficulty: number;
  with_skill_type: number;
  with_base_time: number;
  with_tool_type: number;
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

  // Extended data stats
  const withDifficulty = db
    .prepare("SELECT COUNT(*) as count FROM items WHERE difficulty IS NOT NULL")
    .get() as { count: number };
  const withSkillType = db
    .prepare("SELECT COUNT(*) as count FROM items WHERE skill_type IS NOT NULL")
    .get() as { count: number };
  const withBaseTime = db
    .prepare("SELECT COUNT(*) as count FROM items WHERE base_time IS NOT NULL")
    .get() as { count: number };
  const withToolType = db
    .prepare("SELECT COUNT(*) as count FROM items WHERE tool_type IS NOT NULL")
    .get() as { count: number };

  return {
    items: items.count,
    recipes: recipes.count,
    base_materials: baseMaterials.count,
    craftable: craftable.count,
    categories: categories.count,
    with_difficulty: withDifficulty.count,
    with_skill_type: withSkillType.count,
    with_base_time: withBaseTime.count,
    with_tool_type: withToolType.count,
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

// SECURITY: Paginated version to prevent DoS via unbounded queries
export function getOrdersPaginated(
  filters?: {
    status?: OrderStatus;
    order_type?: OrderType;
    item_name?: string;
    user_id?: number;
  },
  pagination?: PaginationParams
): PaginatedResult<MarketOrder> {
  const { offset, limit, page } = validatePagination(pagination);

  let whereClause = "WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters?.status) {
    whereClause += " AND o.status = ?";
    params.push(filters.status);
  }
  if (filters?.order_type) {
    whereClause += " AND o.order_type = ?";
    params.push(filters.order_type);
  }
  if (filters?.item_name) {
    whereClause += " AND LOWER(o.item_name) LIKE LOWER(?)";
    params.push(`%${filters.item_name}%`);
  }
  if (filters?.user_id) {
    whereClause += " AND o.user_id = ?";
    params.push(filters.user_id);
  }

  const db = getDb();
  const countQuery = `SELECT COUNT(*) as count FROM orders o ${whereClause}`;
  const total = (db.prepare(countQuery).get(...params) as { count: number }).count;

  const dataQuery = `
    SELECT o.*, u.username
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const rows = db.prepare(dataQuery).all(...params, limit, offset) as OrderWithUsername[];

  return {
    data: rows.map(mapOrderRowToMarketOrder),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
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

  // Record price history for analytics (only for buy/sell with prices)
  if (input.price && (input.order_type === "buy" || input.order_type === "sell")) {
    recordPrice(
      input.item_name,
      input.price,
      input.quality ?? 50,
      input.order_type,
      input.currency ?? "silver"
    );
  }

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

// SECURITY: Paginated version to prevent DoS via unbounded queries
export function getMerchantsPaginated(
  filters?: {
    is_active?: boolean;
    category?: MerchantCategory;
    server?: string;
    search?: string;
    user_id?: number;
  },
  pagination?: PaginationParams
): PaginatedResult<Merchant> {
  const { offset, limit, page } = validatePagination(pagination);

  let whereClause = "WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters?.is_active !== undefined) {
    whereClause += " AND m.is_active = ?";
    params.push(filters.is_active ? 1 : 0);
  }
  if (filters?.category) {
    whereClause += " AND m.category = ?";
    params.push(filters.category);
  }
  if (filters?.server) {
    whereClause += " AND m.server = ?";
    params.push(filters.server);
  }
  if (filters?.search) {
    whereClause += " AND (LOWER(m.name) LIKE LOWER(?) OR LOWER(m.stock_list) LIKE LOWER(?) OR LOWER(m.location) LIKE LOWER(?))";
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  if (filters?.user_id) {
    whereClause += " AND m.user_id = ?";
    params.push(filters.user_id);
  }

  const db = getDb();
  const countQuery = `SELECT COUNT(*) as count FROM merchants m ${whereClause}`;
  const total = (db.prepare(countQuery).get(...params) as { count: number }).count;

  const dataQuery = `
    SELECT m.*, u.username
    FROM merchants m
    JOIN users u ON m.user_id = u.id
    ${whereClause}
    ORDER BY m.updated_at DESC
    LIMIT ? OFFSET ?
  `;
  const rows = db.prepare(dataQuery).all(...params, limit, offset) as MerchantWithUsername[];

  return {
    data: rows.map(mapMerchantRowToMerchant),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
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

// ========== ALLIANCE FUNCTIONS ==========

interface AllianceRow {
  id: number;
  name: string;
  description: string | null;
  tag: string | null;
  leader_id: number;
  is_public: number;
  max_members: number;
  created_at: string;
  updated_at: string;
}

interface AllianceWithLeader extends AllianceRow {
  leader_username: string;
  member_count: number;
}

function mapAllianceRow(row: AllianceWithLeader): Alliance {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    tag: row.tag || undefined,
    leader_id: row.leader_id,
    leader_username: row.leader_username,
    is_public: Boolean(row.is_public),
    max_members: row.max_members,
    member_count: row.member_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function getAllAlliances(includePrivate: boolean = false): Alliance[] {
  let query = `
    SELECT a.*, u.username as leader_username,
           (SELECT COUNT(*) FROM alliance_members WHERE alliance_id = a.id) as member_count
    FROM alliances a
    JOIN users u ON a.leader_id = u.id
  `;

  if (!includePrivate) {
    query += " WHERE a.is_public = 1";
  }

  query += " ORDER BY a.name ASC";

  const rows = getDb().prepare(query).all() as AllianceWithLeader[];
  return rows.map(mapAllianceRow);
}

// SECURITY: Paginated version to prevent DoS via unbounded queries
export function getAlliancesPaginated(
  includePrivate: boolean = false,
  pagination?: PaginationParams
): PaginatedResult<Alliance> {
  const { offset, limit, page } = validatePagination(pagination);
  const db = getDb();

  const whereClause = includePrivate ? "" : "WHERE a.is_public = 1";

  const countQuery = `SELECT COUNT(*) as count FROM alliances a ${whereClause}`;
  const total = (db.prepare(countQuery).get() as { count: number }).count;

  const dataQuery = `
    SELECT a.*, u.username as leader_username,
           (SELECT COUNT(*) FROM alliance_members WHERE alliance_id = a.id) as member_count
    FROM alliances a
    JOIN users u ON a.leader_id = u.id
    ${whereClause}
    ORDER BY a.name ASC
    LIMIT ? OFFSET ?
  `;
  const rows = db.prepare(dataQuery).all(limit, offset) as AllianceWithLeader[];

  return {
    data: rows.map(mapAllianceRow),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function getAllianceById(id: number): Alliance | null {
  const row = getDb()
    .prepare(`
      SELECT a.*, u.username as leader_username,
             (SELECT COUNT(*) FROM alliance_members WHERE alliance_id = a.id) as member_count
      FROM alliances a
      JOIN users u ON a.leader_id = u.id
      WHERE a.id = ?
    `)
    .get(id) as AllianceWithLeader | undefined;

  return row ? mapAllianceRow(row) : null;
}

export function getUserAlliance(userId: number): Alliance | null {
  const row = getDb()
    .prepare(`
      SELECT a.*, u.username as leader_username,
             (SELECT COUNT(*) FROM alliance_members WHERE alliance_id = a.id) as member_count
      FROM alliances a
      JOIN users u ON a.leader_id = u.id
      JOIN alliance_members am ON am.alliance_id = a.id
      WHERE am.user_id = ?
    `)
    .get(userId) as AllianceWithLeader | undefined;

  return row ? mapAllianceRow(row) : null;
}

export function createAlliance(userId: number, input: CreateAllianceInput): number {
  const db = getDb();

  // Check if user is already in an alliance
  const existingMembership = db
    .prepare("SELECT id FROM alliance_members WHERE user_id = ?")
    .get(userId);

  if (existingMembership) {
    throw new Error("User is already in an alliance");
  }

  // Create alliance
  const result = db
    .prepare(`
      INSERT INTO alliances (name, description, tag, leader_id, is_public, max_members)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.name,
      input.description || null,
      input.tag || null,
      userId,
      input.is_public !== false ? 1 : 0,
      input.max_members || 50
    );

  const allianceId = result.lastInsertRowid as number;

  // Add creator as leader
  db.prepare(`
    INSERT INTO alliance_members (alliance_id, user_id, role)
    VALUES (?, ?, 'leader')
  `).run(allianceId, userId);

  return allianceId;
}

export function updateAlliance(
  allianceId: number,
  userId: number,
  input: UpdateAllianceInput,
  isAdmin: boolean = false
): boolean {
  const alliance = getAllianceById(allianceId);
  if (!alliance) return false;

  // Check permissions
  if (!isAdmin) {
    const member = getAllianceMember(allianceId, userId);
    if (!member || (member.role !== "leader" && member.role !== "officer")) {
      return false;
    }
  }

  const fields: string[] = ["updated_at = datetime('now')"];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description || null);
  }
  if (input.tag !== undefined) {
    fields.push("tag = ?");
    values.push(input.tag || null);
  }
  if (input.is_public !== undefined) {
    fields.push("is_public = ?");
    values.push(input.is_public ? 1 : 0);
  }
  if (input.max_members !== undefined) {
    fields.push("max_members = ?");
    values.push(input.max_members);
  }

  values.push(allianceId);
  const result = getDb()
    .prepare(`UPDATE alliances SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values);

  return result.changes > 0;
}

export function deleteAlliance(allianceId: number, userId: number, isAdmin: boolean = false): boolean {
  const alliance = getAllianceById(allianceId);
  if (!alliance) return false;

  // Only leader or admin can delete
  if (!isAdmin && alliance.leader_id !== userId) {
    return false;
  }

  const result = getDb().prepare("DELETE FROM alliances WHERE id = ?").run(allianceId);
  return result.changes > 0;
}

// ========== ALLIANCE MEMBERS ==========

interface AllianceMemberRow {
  id: number;
  alliance_id: number;
  user_id: number;
  role: string;
  joined_at: string;
  invited_by: number | null;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  invited_by_username: string | null;
}

function mapMemberRow(row: AllianceMemberRow): AllianceMember {
  return {
    id: row.id,
    alliance_id: row.alliance_id,
    user_id: row.user_id,
    username: row.username,
    display_name: row.display_name || undefined,
    avatar_url: row.avatar_url || undefined,
    role: row.role as AllianceRole,
    joined_at: row.joined_at,
    invited_by: row.invited_by || undefined,
    invited_by_username: row.invited_by_username || undefined,
  };
}

export function getAllianceMembers(allianceId: number): AllianceMember[] {
  const rows = getDb()
    .prepare(`
      SELECT am.*, u.username, u.display_name, u.avatar_url,
             iu.username as invited_by_username
      FROM alliance_members am
      JOIN users u ON am.user_id = u.id
      LEFT JOIN users iu ON am.invited_by = iu.id
      WHERE am.alliance_id = ?
      ORDER BY
        CASE am.role
          WHEN 'leader' THEN 1
          WHEN 'officer' THEN 2
          ELSE 3
        END,
        am.joined_at ASC
    `)
    .all(allianceId) as AllianceMemberRow[];

  return rows.map(mapMemberRow);
}

export function getAllianceMember(allianceId: number, userId: number): AllianceMember | null {
  const row = getDb()
    .prepare(`
      SELECT am.*, u.username, u.display_name, u.avatar_url,
             iu.username as invited_by_username
      FROM alliance_members am
      JOIN users u ON am.user_id = u.id
      LEFT JOIN users iu ON am.invited_by = iu.id
      WHERE am.alliance_id = ? AND am.user_id = ?
    `)
    .get(allianceId, userId) as AllianceMemberRow | undefined;

  return row ? mapMemberRow(row) : null;
}

export function updateMemberRole(
  allianceId: number,
  targetUserId: number,
  newRole: AllianceRole,
  actingUserId: number,
  isAdmin: boolean = false
): boolean {
  const alliance = getAllianceById(allianceId);
  if (!alliance) return false;

  // Check permissions
  if (!isAdmin) {
    const actingMember = getAllianceMember(allianceId, actingUserId);
    if (!actingMember || actingMember.role !== "leader") {
      return false;
    }
  }

  // Can't change leader's role (must transfer leadership)
  if (targetUserId === alliance.leader_id && newRole !== "leader") {
    return false;
  }

  const result = getDb()
    .prepare("UPDATE alliance_members SET role = ? WHERE alliance_id = ? AND user_id = ?")
    .run(newRole, allianceId, targetUserId);

  return result.changes > 0;
}

export function transferLeadership(
  allianceId: number,
  currentLeaderId: number,
  newLeaderId: number
): boolean {
  const db = getDb();
  const alliance = getAllianceById(allianceId);
  if (!alliance || alliance.leader_id !== currentLeaderId) return false;

  // Check new leader is a member
  const newLeaderMember = getAllianceMember(allianceId, newLeaderId);
  if (!newLeaderMember) return false;

  // Update in transaction
  const transfer = db.transaction(() => {
    // Demote current leader to officer
    db.prepare("UPDATE alliance_members SET role = 'officer' WHERE alliance_id = ? AND user_id = ?")
      .run(allianceId, currentLeaderId);

    // Promote new leader
    db.prepare("UPDATE alliance_members SET role = 'leader' WHERE alliance_id = ? AND user_id = ?")
      .run(allianceId, newLeaderId);

    // Update alliance leader_id
    db.prepare("UPDATE alliances SET leader_id = ?, updated_at = datetime('now') WHERE id = ?")
      .run(newLeaderId, allianceId);
  });

  transfer();
  return true;
}

export function removeMember(
  allianceId: number,
  targetUserId: number,
  actingUserId: number,
  isAdmin: boolean = false
): boolean {
  const alliance = getAllianceById(allianceId);
  if (!alliance) return false;

  // Leader can't be removed (must transfer or delete alliance)
  if (targetUserId === alliance.leader_id) return false;

  // Check permissions (self-leave, officer/leader kick, or admin)
  if (!isAdmin && actingUserId !== targetUserId) {
    const actingMember = getAllianceMember(allianceId, actingUserId);
    if (!actingMember || actingMember.role === "member") {
      return false;
    }
  }

  const result = getDb()
    .prepare("DELETE FROM alliance_members WHERE alliance_id = ? AND user_id = ?")
    .run(allianceId, targetUserId);

  return result.changes > 0;
}

// ========== ALLIANCE INVITES ==========

interface AllianceInviteRow {
  id: number;
  alliance_id: number;
  user_id: number;
  invited_by: number;
  status: string;
  created_at: string;
  expires_at: string | null;
  alliance_name: string;
  username: string;
  invited_by_username: string;
}

function mapInviteRow(row: AllianceInviteRow): AllianceInvite {
  return {
    id: row.id,
    alliance_id: row.alliance_id,
    alliance_name: row.alliance_name,
    user_id: row.user_id,
    username: row.username,
    invited_by: row.invited_by,
    invited_by_username: row.invited_by_username,
    status: row.status as InviteStatus,
    created_at: row.created_at,
    expires_at: row.expires_at || undefined,
  };
}

export function getUserInvites(userId: number): AllianceInvite[] {
  // Expire old invites first
  getDb()
    .prepare(`
      UPDATE alliance_invites
      SET status = 'expired'
      WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < datetime('now')
    `)
    .run();

  const rows = getDb()
    .prepare(`
      SELECT ai.*, a.name as alliance_name, u.username, iu.username as invited_by_username
      FROM alliance_invites ai
      JOIN alliances a ON ai.alliance_id = a.id
      JOIN users u ON ai.user_id = u.id
      JOIN users iu ON ai.invited_by = iu.id
      WHERE ai.user_id = ? AND ai.status = 'pending'
      ORDER BY ai.created_at DESC
    `)
    .all(userId) as AllianceInviteRow[];

  return rows.map(mapInviteRow);
}

export function getAllianceInvites(allianceId: number): AllianceInvite[] {
  const rows = getDb()
    .prepare(`
      SELECT ai.*, a.name as alliance_name, u.username, iu.username as invited_by_username
      FROM alliance_invites ai
      JOIN alliances a ON ai.alliance_id = a.id
      JOIN users u ON ai.user_id = u.id
      JOIN users iu ON ai.invited_by = iu.id
      WHERE ai.alliance_id = ? AND ai.status = 'pending'
      ORDER BY ai.created_at DESC
    `)
    .all(allianceId) as AllianceInviteRow[];

  return rows.map(mapInviteRow);
}

export function createInvite(
  allianceId: number,
  targetUserId: number,
  invitedBy: number
): number | null {
  const db = getDb();
  const alliance = getAllianceById(allianceId);
  if (!alliance) return null;

  // Check if inviter has permission
  const inviterMember = getAllianceMember(allianceId, invitedBy);
  if (!inviterMember || inviterMember.role === "member") {
    return null;
  }

  // Check if target is already in an alliance
  const existingMembership = db
    .prepare("SELECT id FROM alliance_members WHERE user_id = ?")
    .get(targetUserId);

  if (existingMembership) return null;

  // Check if invite already exists
  const existingInvite = db
    .prepare(`
      SELECT id FROM alliance_invites
      WHERE alliance_id = ? AND user_id = ? AND status = 'pending'
    `)
    .get(allianceId, targetUserId);

  if (existingInvite) return null;

  // Check member limit
  if (alliance.member_count && alliance.member_count >= alliance.max_members) {
    return null;
  }

  // Create invite (expires in 7 days)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const result = db
    .prepare(`
      INSERT INTO alliance_invites (alliance_id, user_id, invited_by, expires_at)
      VALUES (?, ?, ?, ?)
    `)
    .run(allianceId, targetUserId, invitedBy, expiresAt);

  return result.lastInsertRowid as number;
}

export function respondToInvite(
  inviteId: number,
  userId: number,
  accept: boolean
): boolean {
  const db = getDb();

  const invite = db
    .prepare("SELECT * FROM alliance_invites WHERE id = ? AND user_id = ? AND status = 'pending'")
    .get(inviteId, userId) as { alliance_id: number; invited_by: number } | undefined;

  if (!invite) return false;

  if (accept) {
    // Check if user is already in an alliance
    const existingMembership = db
      .prepare("SELECT id FROM alliance_members WHERE user_id = ?")
      .get(userId);

    if (existingMembership) {
      db.prepare("UPDATE alliance_invites SET status = 'declined' WHERE id = ?").run(inviteId);
      return false;
    }

    // Check member limit
    const alliance = getAllianceById(invite.alliance_id);
    if (alliance && alliance.member_count && alliance.member_count >= alliance.max_members) {
      return false;
    }

    // Add to alliance
    db.prepare(`
      INSERT INTO alliance_members (alliance_id, user_id, role, invited_by)
      VALUES (?, ?, 'member', ?)
    `).run(invite.alliance_id, userId, invite.invited_by);

    db.prepare("UPDATE alliance_invites SET status = 'accepted' WHERE id = ?").run(inviteId);

    // Decline other pending invites for this user
    db.prepare(`
      UPDATE alliance_invites SET status = 'declined'
      WHERE user_id = ? AND status = 'pending' AND id != ?
    `).run(userId, inviteId);
  } else {
    db.prepare("UPDATE alliance_invites SET status = 'declined' WHERE id = ?").run(inviteId);
  }

  return true;
}

export function cancelInvite(inviteId: number, actingUserId: number, isAdmin: boolean = false): boolean {
  const db = getDb();

  const invite = db
    .prepare("SELECT alliance_id FROM alliance_invites WHERE id = ? AND status = 'pending'")
    .get(inviteId) as { alliance_id: number } | undefined;

  if (!invite) return false;

  if (!isAdmin) {
    const member = getAllianceMember(invite.alliance_id, actingUserId);
    if (!member || member.role === "member") {
      return false;
    }
  }

  const result = db
    .prepare("UPDATE alliance_invites SET status = 'expired' WHERE id = ?")
    .run(inviteId);

  return result.changes > 0;
}

// ========== ALLIANCE STATS ==========

export function getAllianceStats(): {
  total: number;
  public_count: number;
  total_members: number;
} {
  const db = getDb();
  const total = db.prepare("SELECT COUNT(*) as count FROM alliances").get() as { count: number };
  const publicCount = db.prepare("SELECT COUNT(*) as count FROM alliances WHERE is_public = 1").get() as { count: number };
  const totalMembers = db.prepare("SELECT COUNT(*) as count FROM alliance_members").get() as { count: number };

  return {
    total: total.count,
    public_count: publicCount.count,
    total_members: totalMembers.count,
  };
}

// ========== PRICE HISTORY & ANALYTICS FUNCTIONS ==========

export function recordPrice(
  itemName: string,
  price: number,
  quality: number,
  orderType: "buy" | "sell",
  currency: string = "silver"
): number {
  const result = getDb()
    .prepare(
      `INSERT INTO price_history (item_name, price, quality, order_type, currency)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(itemName, price, quality, orderType, currency);

  return result.lastInsertRowid as number;
}

export function getPriceHistory(
  itemName: string,
  days: number = 30
): PriceHistory[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM price_history
       WHERE LOWER(item_name) = LOWER(?)
       AND recorded_at >= datetime('now', '-' || ? || ' days')
       ORDER BY recorded_at ASC`
    )
    .all(itemName, days) as PriceHistory[];

  return rows;
}

export function getPriceAnalytics(itemName: string): PriceAnalytics | null {
  const db = getDb();

  const current = db
    .prepare(
      `SELECT
        item_name,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        COUNT(*) as total_orders,
        SUM(CASE WHEN order_type = 'buy' THEN 1 ELSE 0 END) as buy_orders,
        SUM(CASE WHEN order_type = 'sell' THEN 1 ELSE 0 END) as sell_orders
       FROM price_history
       WHERE LOWER(item_name) = LOWER(?)`
    )
    .get(itemName) as {
      item_name: string;
      avg_price: number;
      min_price: number;
      max_price: number;
      total_orders: number;
      buy_orders: number;
      sell_orders: number;
    } | undefined;

  if (!current || !current.avg_price) return null;

  // Calculate 24h change
  const yesterday = db
    .prepare(
      `SELECT AVG(price) as avg_price FROM price_history
       WHERE LOWER(item_name) = LOWER(?)
       AND recorded_at >= datetime('now', '-1 day')
       AND recorded_at < datetime('now')`
    )
    .get(itemName) as { avg_price: number | null };

  const dayBefore = db
    .prepare(
      `SELECT AVG(price) as avg_price FROM price_history
       WHERE LOWER(item_name) = LOWER(?)
       AND recorded_at >= datetime('now', '-2 days')
       AND recorded_at < datetime('now', '-1 day')`
    )
    .get(itemName) as { avg_price: number | null };

  // Calculate 7d change
  const lastWeek = db
    .prepare(
      `SELECT AVG(price) as avg_price FROM price_history
       WHERE LOWER(item_name) = LOWER(?)
       AND recorded_at >= datetime('now', '-7 days')`
    )
    .get(itemName) as { avg_price: number | null };

  const weekBefore = db
    .prepare(
      `SELECT AVG(price) as avg_price FROM price_history
       WHERE LOWER(item_name) = LOWER(?)
       AND recorded_at >= datetime('now', '-14 days')
       AND recorded_at < datetime('now', '-7 days')`
    )
    .get(itemName) as { avg_price: number | null };

  const change24h = yesterday?.avg_price && dayBefore?.avg_price
    ? ((yesterday.avg_price - dayBefore.avg_price) / dayBefore.avg_price) * 100
    : 0;

  const change7d = lastWeek?.avg_price && weekBefore?.avg_price
    ? ((lastWeek.avg_price - weekBefore.avg_price) / weekBefore.avg_price) * 100
    : 0;

  return {
    item_name: current.item_name,
    avg_price: current.avg_price,
    min_price: current.min_price,
    max_price: current.max_price,
    price_change_24h: Math.round(change24h * 100) / 100,
    price_change_7d: Math.round(change7d * 100) / 100,
    total_orders: current.total_orders,
    buy_orders: current.buy_orders,
    sell_orders: current.sell_orders,
  };
}

export function getTrendingItems(limit: number = 10): TrendingItem[] {
  const db = getDb();

  // Get items with most activity in the last 7 days
  const trending = db
    .prepare(
      `SELECT
        item_name,
        COUNT(*) as order_count,
        SUM(CASE WHEN order_type = 'sell' THEN 1 ELSE 0 END) as sell_count,
        AVG(price) as avg_price
       FROM price_history
       WHERE recorded_at >= datetime('now', '-7 days')
       GROUP BY LOWER(item_name)
       ORDER BY order_count DESC
       LIMIT ?`
    )
    .all(limit) as {
      item_name: string;
      order_count: number;
      sell_count: number;
      avg_price: number;
    }[];

  return trending.map((item) => {
    // Calculate trend by comparing recent vs older prices
    const recentAvg = db
      .prepare(
        `SELECT AVG(price) as avg FROM price_history
         WHERE LOWER(item_name) = LOWER(?)
         AND recorded_at >= datetime('now', '-3 days')`
      )
      .get(item.item_name) as { avg: number | null };

    const olderAvg = db
      .prepare(
        `SELECT AVG(price) as avg FROM price_history
         WHERE LOWER(item_name) = LOWER(?)
         AND recorded_at >= datetime('now', '-7 days')
         AND recorded_at < datetime('now', '-3 days')`
      )
      .get(item.item_name) as { avg: number | null };

    let trend: "up" | "down" | "stable" = "stable";
    let trendPercentage = 0;

    if (recentAvg?.avg && olderAvg?.avg) {
      trendPercentage = ((recentAvg.avg - olderAvg.avg) / olderAvg.avg) * 100;
      if (trendPercentage > 5) trend = "up";
      else if (trendPercentage < -5) trend = "down";
    }

    return {
      item_name: item.item_name,
      order_count: item.order_count,
      total_quantity: item.sell_count,
      avg_price: Math.round(item.avg_price * 100) / 100,
      trend,
      trend_percentage: Math.round(trendPercentage * 100) / 100,
    };
  });
}

export function getBestDeals(limit: number = 10): MarketOrder[] {
  // Get sell orders with prices significantly below average
  const deals = getDb()
    .prepare(
      `SELECT o.*, u.username,
        (SELECT AVG(ph.price) FROM price_history ph WHERE LOWER(ph.item_name) = LOWER(o.item_name)) as avg_price
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.order_type = 'sell'
       AND o.status = 'active'
       AND o.price IS NOT NULL
       AND o.price < (SELECT AVG(ph.price) * 0.85 FROM price_history ph WHERE LOWER(ph.item_name) = LOWER(o.item_name))
       ORDER BY (o.price / COALESCE((SELECT AVG(ph.price) FROM price_history ph WHERE LOWER(ph.item_name) = LOWER(o.item_name)), o.price)) ASC
       LIMIT ?`
    )
    .all(limit) as (OrderWithUsername & { avg_price: number })[];

  return deals.map(mapOrderRowToMarketOrder);
}

// Helper for mapOrderRowToMarketOrder - need to define interface
interface OrderWithUsername {
  id: number;
  user_id: number;
  username: string;
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

// Price Alerts
export function createPriceAlert(
  userId: number,
  input: CreatePriceAlertInput
): number {
  const result = getDb()
    .prepare(
      `INSERT INTO price_alerts (user_id, item_name, target_price, condition)
       VALUES (?, ?, ?, ?)`
    )
    .run(userId, input.item_name, input.target_price, input.condition);

  return result.lastInsertRowid as number;
}

export function getUserPriceAlerts(userId: number): PriceAlert[] {
  return getDb()
    .prepare(
      `SELECT * FROM price_alerts WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(userId) as PriceAlert[];
}

export function deletePriceAlert(alertId: number, userId: number): boolean {
  const result = getDb()
    .prepare("DELETE FROM price_alerts WHERE id = ? AND user_id = ?")
    .run(alertId, userId);
  return result.changes > 0;
}

export function checkPriceAlerts(): PriceAlert[] {
  const db = getDb();
  const triggeredAlerts: PriceAlert[] = [];

  // Get active alerts
  const alerts = db
    .prepare("SELECT * FROM price_alerts WHERE is_active = 1")
    .all() as PriceAlert[];

  for (const alert of alerts) {
    // Get latest price for item
    const latestPrice = db
      .prepare(
        `SELECT price FROM price_history
         WHERE LOWER(item_name) = LOWER(?)
         ORDER BY recorded_at DESC LIMIT 1`
      )
      .get(alert.item_name) as { price: number } | undefined;

    if (!latestPrice) continue;

    const shouldTrigger =
      (alert.condition === "below" && latestPrice.price <= alert.target_price) ||
      (alert.condition === "above" && latestPrice.price >= alert.target_price);

    if (shouldTrigger) {
      db.prepare(
        "UPDATE price_alerts SET is_active = 0, triggered_at = datetime('now') WHERE id = ?"
      ).run(alert.id);
      triggeredAlerts.push({ ...alert, triggered_at: new Date().toISOString() });
    }
  }

  return triggeredAlerts;
}

// ========== PROJECT PLANNER FUNCTIONS ==========

interface ProjectRow {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  status: string;
  is_shared: number;
  alliance_id: number | null;
  created_at: string;
  updated_at: string;
  username?: string;
  alliance_name?: string;
  total_items?: number;
  completed_items?: number;
}

function mapProjectRow(row: ProjectRow): Project {
  const totalItems = row.total_items || 0;
  const completedItems = row.completed_items || 0;
  return {
    id: row.id,
    user_id: row.user_id,
    username: row.username,
    name: row.name,
    description: row.description || undefined,
    status: row.status as ProjectStatus,
    is_shared: Boolean(row.is_shared),
    alliance_id: row.alliance_id || undefined,
    alliance_name: row.alliance_name || undefined,
    total_items: totalItems,
    completed_items: completedItems,
    progress_percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function getUserProjects(userId: number): Project[] {
  const rows = getDb()
    .prepare(
      `SELECT p.*, u.username, a.name as alliance_name,
        (SELECT COUNT(*) FROM project_items WHERE project_id = p.id) as total_items,
        (SELECT COUNT(*) FROM project_items WHERE project_id = p.id AND completed_quantity >= quantity) as completed_items
       FROM projects p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN alliances a ON p.alliance_id = a.id
       WHERE p.user_id = ?
       ORDER BY p.updated_at DESC`
    )
    .all(userId) as ProjectRow[];

  return rows.map(mapProjectRow);
}

export function getSharedProjects(allianceId: number): Project[] {
  const rows = getDb()
    .prepare(
      `SELECT p.*, u.username, a.name as alliance_name,
        (SELECT COUNT(*) FROM project_items WHERE project_id = p.id) as total_items,
        (SELECT COUNT(*) FROM project_items WHERE project_id = p.id AND completed_quantity >= quantity) as completed_items
       FROM projects p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN alliances a ON p.alliance_id = a.id
       WHERE p.alliance_id = ? AND p.is_shared = 1
       ORDER BY p.updated_at DESC`
    )
    .all(allianceId) as ProjectRow[];

  return rows.map(mapProjectRow);
}

export function getProjectById(projectId: number): Project | null {
  const row = getDb()
    .prepare(
      `SELECT p.*, u.username, a.name as alliance_name,
        (SELECT COUNT(*) FROM project_items WHERE project_id = p.id) as total_items,
        (SELECT COUNT(*) FROM project_items WHERE project_id = p.id AND completed_quantity >= quantity) as completed_items
       FROM projects p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN alliances a ON p.alliance_id = a.id
       WHERE p.id = ?`
    )
    .get(projectId) as ProjectRow | undefined;

  return row ? mapProjectRow(row) : null;
}

export function createProject(userId: number, input: CreateProjectInput): number {
  const result = getDb()
    .prepare(
      `INSERT INTO projects (user_id, name, description, is_shared, alliance_id)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      input.name,
      input.description || null,
      input.is_shared ? 1 : 0,
      input.alliance_id || null
    );

  return result.lastInsertRowid as number;
}

export function updateProject(
  projectId: number,
  userId: number,
  input: UpdateProjectInput
): boolean {
  const project = getProjectById(projectId);
  if (!project || project.user_id !== userId) return false;

  const fields: string[] = ["updated_at = datetime('now')"];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description || null);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (input.is_shared !== undefined) {
    fields.push("is_shared = ?");
    values.push(input.is_shared ? 1 : 0);
  }

  values.push(projectId);
  const result = getDb()
    .prepare(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values);

  return result.changes > 0;
}

export function deleteProject(projectId: number, userId: number): boolean {
  const project = getProjectById(projectId);
  if (!project || project.user_id !== userId) return false;

  const result = getDb().prepare("DELETE FROM projects WHERE id = ?").run(projectId);
  return result.changes > 0;
}

// Project Items
export function getProjectItems(projectId: number): ProjectItem[] {
  const rows = getDb()
    .prepare(
      `SELECT pi.*, i.name as item_name
       FROM project_items pi
       JOIN items i ON pi.item_id = i.id
       WHERE pi.project_id = ?
       ORDER BY pi.priority DESC, i.name ASC`
    )
    .all(projectId) as (ProjectItem & { item_name: string })[];

  return rows.map((row) => ({
    ...row,
    is_completed: row.completed_quantity >= row.quantity,
  }));
}

export function addProjectItem(
  projectId: number,
  userId: number,
  input: AddProjectItemInput
): number | null {
  const project = getProjectById(projectId);
  if (!project || project.user_id !== userId) return null;

  const result = getDb()
    .prepare(
      `INSERT INTO project_items (project_id, item_id, quantity, notes, priority)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(projectId, input.item_id, input.quantity, input.notes || null, input.priority || 0);

  // Update project timestamp
  getDb()
    .prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?")
    .run(projectId);

  return result.lastInsertRowid as number;
}

export function updateProjectItemProgress(
  itemId: number,
  projectId: number,
  userId: number,
  completedQuantity: number
): boolean {
  const project = getProjectById(projectId);
  if (!project || project.user_id !== userId) return false;

  const result = getDb()
    .prepare(
      "UPDATE project_items SET completed_quantity = ? WHERE id = ? AND project_id = ?"
    )
    .run(completedQuantity, itemId, projectId);

  if (result.changes > 0) {
    getDb()
      .prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?")
      .run(projectId);
  }

  return result.changes > 0;
}

export function removeProjectItem(
  itemId: number,
  projectId: number,
  userId: number
): boolean {
  const project = getProjectById(projectId);
  if (!project || project.user_id !== userId) return false;

  const result = getDb()
    .prepare("DELETE FROM project_items WHERE id = ? AND project_id = ?")
    .run(itemId, projectId);

  return result.changes > 0;
}

export function getProjectMaterials(projectId: number): ProjectMaterial[] {
  const items = getProjectItems(projectId);
  const materialsMap = new Map<number, ProjectMaterial>();

  for (const projectItem of items) {
    // Calculate base materials for each item
    const baseMaterials = getMaterialsList(projectItem.item_id, projectItem.quantity);

    for (const mat of baseMaterials) {
      const existing = materialsMap.get(mat.id);
      if (existing) {
        existing.required_quantity += mat.quantity;
      } else {
        materialsMap.set(mat.id, {
          item_id: mat.id,
          item_name: mat.name,
          category: mat.category,
          required_quantity: mat.quantity,
          completed_quantity: 0,
          remaining_quantity: mat.quantity,
        });
      }
    }
  }

  // Calculate completed quantities based on item progress
  for (const projectItem of items) {
    if (projectItem.completed_quantity > 0) {
      const completionRatio = projectItem.completed_quantity / projectItem.quantity;
      const baseMaterials = getMaterialsList(projectItem.item_id, projectItem.quantity);

      for (const mat of baseMaterials) {
        const existing = materialsMap.get(mat.id);
        if (existing) {
          existing.completed_quantity += mat.quantity * completionRatio;
        }
      }
    }
  }

  // Calculate remaining
  for (const mat of materialsMap.values()) {
    mat.remaining_quantity = Math.max(0, mat.required_quantity - mat.completed_quantity);
    mat.completed_quantity = Math.round(mat.completed_quantity * 100) / 100;
    mat.remaining_quantity = Math.round(mat.remaining_quantity * 100) / 100;
  }

  return Array.from(materialsMap.values()).sort((a, b) =>
    a.category.localeCompare(b.category) || a.item_name.localeCompare(b.item_name)
  );
}

// ========== TRADE MATCHING FUNCTIONS ==========

interface TradeMatchRow {
  id: number;
  buy_order_id: number;
  sell_order_id: number;
  buyer_id: number;
  seller_id: number;
  item_name: string;
  quantity: number;
  buy_price: number | null;
  sell_price: number | null;
  match_score: number;
  status: string;
  created_at: string;
  contacted_at: string | null;
  buyer_username?: string;
  seller_username?: string;
}

function mapTradeMatchRow(row: TradeMatchRow): TradeMatch {
  return {
    id: row.id,
    buy_order_id: row.buy_order_id,
    sell_order_id: row.sell_order_id,
    buyer_id: row.buyer_id,
    buyer_username: row.buyer_username || "",
    seller_id: row.seller_id,
    seller_username: row.seller_username || "",
    item_name: row.item_name,
    quantity: row.quantity,
    buy_price: row.buy_price || undefined,
    sell_price: row.sell_price || undefined,
    match_score: row.match_score,
    status: row.status as MatchStatus,
    created_at: row.created_at,
    contacted_at: row.contacted_at || undefined,
  };
}

export function findMatches(): TradeMatch[] {
  const db = getDb();

  // Find matching buy and sell orders
  const matches = db
    .prepare(
      `SELECT
        bo.id as buy_order_id,
        so.id as sell_order_id,
        bo.user_id as buyer_id,
        so.user_id as seller_id,
        bo.item_name,
        MIN(bo.quantity, so.quantity) as quantity,
        bo.price as buy_price,
        so.price as sell_price,
        bu.username as buyer_username,
        su.username as seller_username
       FROM orders bo
       JOIN orders so ON LOWER(bo.item_name) = LOWER(so.item_name)
       JOIN users bu ON bo.user_id = bu.id
       JOIN users su ON so.user_id = su.id
       WHERE bo.order_type = 'buy'
       AND so.order_type = 'sell'
       AND bo.status = 'active'
       AND so.status = 'active'
       AND bo.user_id != so.user_id
       AND (bo.price IS NULL OR so.price IS NULL OR bo.price >= so.price)
       AND NOT EXISTS (
         SELECT 1 FROM trade_matches tm
         WHERE tm.buy_order_id = bo.id AND tm.sell_order_id = so.id
         AND tm.status IN ('pending', 'contacted')
       )`
    )
    .all() as {
      buy_order_id: number;
      sell_order_id: number;
      buyer_id: number;
      seller_id: number;
      item_name: string;
      quantity: number;
      buy_price: number | null;
      sell_price: number | null;
      buyer_username: string;
      seller_username: string;
    }[];

  const createdMatches: TradeMatch[] = [];

  for (const match of matches) {
    // Calculate match score (0-100)
    let score = 50; // Base score

    // Price compatibility bonus
    if (match.buy_price && match.sell_price) {
      const priceDiff = ((match.buy_price - match.sell_price) / match.sell_price) * 100;
      score += Math.min(25, priceDiff); // Up to 25 points for price margin
    }

    // Quantity match bonus
    score += 15; // Flat bonus for matching items

    // Check quality match if applicable
    const buyOrder = getOrderById(match.buy_order_id);
    const sellOrder = getOrderById(match.sell_order_id);

    if (buyOrder?.quality && sellOrder?.quality) {
      if (sellOrder.quality >= buyOrder.quality) {
        score += 10; // Quality meets requirements
      }
    }

    score = Math.min(100, Math.max(0, score));

    // Create match record
    const result = db
      .prepare(
        `INSERT INTO trade_matches
         (buy_order_id, sell_order_id, buyer_id, seller_id, item_name, quantity, buy_price, sell_price, match_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        match.buy_order_id,
        match.sell_order_id,
        match.buyer_id,
        match.seller_id,
        match.item_name,
        match.quantity,
        match.buy_price,
        match.sell_price,
        Math.round(score)
      );

    createdMatches.push({
      id: result.lastInsertRowid as number,
      buy_order_id: match.buy_order_id,
      sell_order_id: match.sell_order_id,
      buyer_id: match.buyer_id,
      buyer_username: match.buyer_username,
      seller_id: match.seller_id,
      seller_username: match.seller_username,
      item_name: match.item_name,
      quantity: match.quantity,
      buy_price: match.buy_price || undefined,
      sell_price: match.sell_price || undefined,
      match_score: Math.round(score),
      status: "pending",
      created_at: new Date().toISOString(),
    });
  }

  return createdMatches;
}

export function getUserMatches(userId: number): TradeMatch[] {
  const rows = getDb()
    .prepare(
      `SELECT tm.*, bu.username as buyer_username, su.username as seller_username
       FROM trade_matches tm
       JOIN users bu ON tm.buyer_id = bu.id
       JOIN users su ON tm.seller_id = su.id
       WHERE (tm.buyer_id = ? OR tm.seller_id = ?)
       AND tm.status IN ('pending', 'contacted')
       ORDER BY tm.match_score DESC, tm.created_at DESC`
    )
    .all(userId, userId) as TradeMatchRow[];

  return rows.map(mapTradeMatchRow);
}

export function getMatchById(matchId: number): TradeMatch | null {
  const row = getDb()
    .prepare(
      `SELECT tm.*, bu.username as buyer_username, su.username as seller_username
       FROM trade_matches tm
       JOIN users bu ON tm.buyer_id = bu.id
       JOIN users su ON tm.seller_id = su.id
       WHERE tm.id = ?`
    )
    .get(matchId) as TradeMatchRow | undefined;

  return row ? mapTradeMatchRow(row) : null;
}

export function updateMatchStatus(
  matchId: number,
  userId: number,
  status: MatchStatus
): boolean {
  const match = getMatchById(matchId);
  if (!match) return false;

  // Only participants can update
  if (match.buyer_id !== userId && match.seller_id !== userId) return false;

  const updates: string[] = ["status = ?"];
  const values: (string | number)[] = [status];

  if (status === "contacted" && !match.contacted_at) {
    updates.push("contacted_at = datetime('now')");
  }

  values.push(matchId);
  const result = getDb()
    .prepare(`UPDATE trade_matches SET ${updates.join(", ")} WHERE id = ?`)
    .run(...values);

  // If completed, update orders
  if (status === "completed" && result.changes > 0) {
    getDb()
      .prepare("UPDATE orders SET status = 'completed' WHERE id IN (?, ?)")
      .run(match.buy_order_id, match.sell_order_id);
  }

  return result.changes > 0;
}

// User Ratings
export function createRating(raterId: number, input: CreateRatingInput): number {
  // Check if user already rated this user for this trade
  if (input.trade_match_id) {
    const existing = getDb()
      .prepare(
        `SELECT id FROM user_ratings
         WHERE rater_id = ? AND rated_user_id = ? AND trade_match_id = ?`
      )
      .get(raterId, input.rated_user_id, input.trade_match_id);

    if (existing) {
      throw new Error("Already rated this trade");
    }
  }

  const result = getDb()
    .prepare(
      `INSERT INTO user_ratings (rater_id, rated_user_id, rating, comment, trade_match_id)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(raterId, input.rated_user_id, input.rating, input.comment || null, input.trade_match_id || null);

  return result.lastInsertRowid as number;
}

export function getUserRatings(userId: number): UserRating[] {
  const rows = getDb()
    .prepare(
      `SELECT ur.*,
        ru.username as rater_username,
        rdu.username as rated_username
       FROM user_ratings ur
       JOIN users ru ON ur.rater_id = ru.id
       JOIN users rdu ON ur.rated_user_id = rdu.id
       WHERE ur.rated_user_id = ?
       ORDER BY ur.created_at DESC`
    )
    .all(userId) as UserRating[];

  return rows;
}

export function getUserReputation(userId: number): UserReputation | null {
  const db = getDb();

  const user = db
    .prepare("SELECT id, username FROM users WHERE id = ?")
    .get(userId) as { id: number; username: string } | undefined;

  if (!user) return null;

  const stats = db
    .prepare(
      `SELECT
        AVG(rating) as avg_rating,
        COUNT(*) as total_ratings
       FROM user_ratings
       WHERE rated_user_id = ?`
    )
    .get(userId) as { avg_rating: number | null; total_ratings: number };

  const trades = db
    .prepare(
      `SELECT COUNT(*) as count FROM trade_matches
       WHERE (buyer_id = ? OR seller_id = ?) AND status = 'completed'`
    )
    .get(userId, userId) as { count: number };

  const matches = db
    .prepare(
      `SELECT COUNT(*) as count FROM trade_matches
       WHERE (buyer_id = ? OR seller_id = ?) AND status IN ('completed', 'contacted')`
    )
    .get(userId, userId) as { count: number };

  return {
    user_id: user.id,
    username: user.username,
    avg_rating: stats.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0,
    total_ratings: stats.total_ratings,
    completed_trades: trades.count,
    successful_matches: matches.count,
  };
}

export function getBarterSuggestions(userId: number): BarterSuggestion[] {
  // Find potential barter opportunities
  const userOrders = getDb()
    .prepare(
      `SELECT o.*, u.username FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.user_id = ? AND o.status = 'active'`
    )
    .all(userId) as OrderWithUsername[];

  const suggestions: BarterSuggestion[] = [];

  for (const userOrder of userOrders) {
    // Find complementary orders
    const complementary = getDb()
      .prepare(
        `SELECT o.*, u.username FROM orders o
         JOIN users u ON o.user_id = u.id
         WHERE o.user_id != ?
         AND o.status = 'active'
         AND o.order_type != ?
         AND (
           (o.order_type = 'trade' AND LOWER(o.trade_for) LIKE LOWER(?))
           OR (? = 'trade' AND LOWER(o.item_name) LIKE LOWER(?))
         )
         LIMIT 5`
      )
      .all(
        userId,
        userOrder.order_type,
        `%${userOrder.item_name}%`,
        userOrder.order_type,
        userOrder.trade_for || ""
      ) as OrderWithUsername[];

    for (const other of complementary) {
      suggestions.push({
        your_order: mapOrderRowToMarketOrder(userOrder),
        their_order: mapOrderRowToMarketOrder(other),
        match_reason: `They want ${userOrder.item_name}, you want ${other.item_name}`,
        compatibility_score: 75,
      });
    }
  }

  return suggestions.slice(0, 10);
}

export function expireOldMatches(): number {
  const result = getDb()
    .prepare(
      `UPDATE trade_matches
       SET status = 'expired'
       WHERE status = 'pending'
       AND created_at < datetime('now', '-7 days')`
    )
    .run();

  return result.changes;
}

// ========== MAP LOCATIONS FUNCTIONS ==========

interface MapLocationRow {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  location_type: string;
  server: string;
  x: number;
  y: number;
  is_public: number;
  is_verified: number;
  alliance_id: number | null;
  merchant_id: number | null;
  created_at: string;
  updated_at: string;
  username?: string;
}

function mapLocationRow(row: MapLocationRow): MapLocation {
  return {
    id: row.id,
    user_id: row.user_id,
    username: row.username,
    name: row.name,
    description: row.description || undefined,
    location_type: row.location_type as LocationType,
    server: row.server as WurmServer,
    x: row.x,
    y: row.y,
    is_public: Boolean(row.is_public),
    is_verified: Boolean(row.is_verified),
    alliance_id: row.alliance_id || undefined,
    merchant_id: row.merchant_id || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function getMapLocations(
  server?: WurmServer,
  locationType?: LocationType,
  includePrivate: boolean = false
): MapLocation[] {
  let query = `
    SELECT ml.*, u.username
    FROM map_locations ml
    JOIN users u ON ml.user_id = u.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (!includePrivate) {
    query += " AND ml.is_public = 1";
  }
  if (server) {
    query += " AND ml.server = ?";
    params.push(server);
  }
  if (locationType) {
    query += " AND ml.location_type = ?";
    params.push(locationType);
  }

  query += " ORDER BY ml.created_at DESC";

  const rows = getDb().prepare(query).all(...params) as MapLocationRow[];
  return rows.map(mapLocationRow);
}

export function getLocationById(id: number): MapLocation | null {
  const row = getDb()
    .prepare(
      `SELECT ml.*, u.username
       FROM map_locations ml
       JOIN users u ON ml.user_id = u.id
       WHERE ml.id = ?`
    )
    .get(id) as MapLocationRow | undefined;

  return row ? mapLocationRow(row) : null;
}

export function createLocation(
  userId: number,
  input: CreateLocationInput
): number {
  const result = getDb()
    .prepare(
      `INSERT INTO map_locations
       (user_id, name, description, location_type, server, x, y, is_public, alliance_id, merchant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      input.name,
      input.description || null,
      input.location_type,
      input.server,
      input.x,
      input.y,
      input.is_public !== false ? 1 : 0,
      input.alliance_id || null,
      input.merchant_id || null
    );

  // Award XP for adding location
  addXP(userId, 10);

  return result.lastInsertRowid as number;
}

export function updateLocation(
  id: number,
  userId: number,
  input: UpdateLocationInput,
  isAdmin: boolean = false
): boolean {
  const location = getLocationById(id);
  if (!location) return false;
  if (!isAdmin && location.user_id !== userId) return false;

  const fields: string[] = ["updated_at = datetime('now')"];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description || null);
  }
  if (input.location_type !== undefined) {
    fields.push("location_type = ?");
    values.push(input.location_type);
  }
  if (input.x !== undefined) {
    fields.push("x = ?");
    values.push(input.x);
  }
  if (input.y !== undefined) {
    fields.push("y = ?");
    values.push(input.y);
  }
  if (input.is_public !== undefined) {
    fields.push("is_public = ?");
    values.push(input.is_public ? 1 : 0);
  }

  values.push(id);
  const result = getDb()
    .prepare(`UPDATE map_locations SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values);

  return result.changes > 0;
}

export function deleteLocation(
  id: number,
  userId: number,
  isAdmin: boolean = false
): boolean {
  const location = getLocationById(id);
  if (!location) return false;
  if (!isAdmin && location.user_id !== userId) return false;

  const result = getDb()
    .prepare("DELETE FROM map_locations WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

export function verifyLocation(id: number): boolean {
  const result = getDb()
    .prepare("UPDATE map_locations SET is_verified = 1 WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

// ========== GAMIFICATION & ACHIEVEMENTS FUNCTIONS ==========

// Achievement definitions (stored in code, not database)
const ACHIEVEMENTS: Achievement[] = [
  // Trading achievements
  { id: "first_trade", name: "First Steps", description: "Complete your first trade", category: "trading", icon: "handshake", xp_reward: 50, requirement_type: "trades_completed", requirement_value: 1, is_hidden: false },
  { id: "trader_10", name: "Apprentice Trader", description: "Complete 10 trades", category: "trading", icon: "coins", xp_reward: 100, requirement_type: "trades_completed", requirement_value: 10, is_hidden: false },
  { id: "trader_50", name: "Seasoned Merchant", description: "Complete 50 trades", category: "trading", icon: "gem", xp_reward: 250, requirement_type: "trades_completed", requirement_value: 50, is_hidden: false },
  { id: "trader_100", name: "Master Trader", description: "Complete 100 trades", category: "trading", icon: "crown", xp_reward: 500, requirement_type: "trades_completed", requirement_value: 100, is_hidden: false },
  { id: "five_star", name: "Five Star Service", description: "Maintain a 5-star rating", category: "trading", icon: "star", xp_reward: 200, requirement_type: "rating", requirement_value: 5, is_hidden: false },

  // Community achievements
  { id: "first_order", name: "Open for Business", description: "Create your first market order", category: "community", icon: "store", xp_reward: 25, requirement_type: "orders_created", requirement_value: 1, is_hidden: false },
  { id: "alliance_member", name: "Stronger Together", description: "Join an alliance", category: "community", icon: "users", xp_reward: 50, requirement_type: "alliance_joined", requirement_value: 1, is_hidden: false },
  { id: "alliance_leader", name: "Born Leader", description: "Create an alliance", category: "community", icon: "flag", xp_reward: 150, requirement_type: "alliance_created", requirement_value: 1, is_hidden: false },
  { id: "helpful_10", name: "Helpful Hand", description: "Receive 10 positive ratings", category: "community", icon: "thumbs-up", xp_reward: 100, requirement_type: "positive_ratings", requirement_value: 10, is_hidden: false },

  // Exploration achievements
  { id: "cartographer", name: "Cartographer", description: "Add 5 locations to the map", category: "exploration", icon: "map", xp_reward: 75, requirement_type: "locations_added", requirement_value: 5, is_hidden: false },
  { id: "explorer", name: "Explorer", description: "Add 25 locations to the map", category: "exploration", icon: "compass", xp_reward: 200, requirement_type: "locations_added", requirement_value: 25, is_hidden: false },
  { id: "merchant_finder", name: "Merchant Finder", description: "Register 10 merchants", category: "exploration", icon: "search", xp_reward: 100, requirement_type: "merchants_added", requirement_value: 10, is_hidden: false },

  // Crafting achievements
  { id: "planner", name: "Project Planner", description: "Create your first project", category: "crafting", icon: "clipboard", xp_reward: 25, requirement_type: "projects_created", requirement_value: 1, is_hidden: false },
  { id: "project_master", name: "Project Master", description: "Complete 10 projects", category: "crafting", icon: "check-circle", xp_reward: 200, requirement_type: "projects_completed", requirement_value: 10, is_hidden: false },

  // Special achievements
  { id: "early_adopter", name: "Early Adopter", description: "One of the first 100 users", category: "special", icon: "rocket", xp_reward: 500, requirement_type: "user_id", requirement_value: 100, is_hidden: true },
  { id: "verified_contributor", name: "Verified Contributor", description: "Have a location verified by admins", category: "special", icon: "badge-check", xp_reward: 100, requirement_type: "verified_locations", requirement_value: 1, is_hidden: false },
];

export function getAchievements(): Achievement[] {
  return ACHIEVEMENTS.filter(a => !a.is_hidden);
}

export function getAllAchievements(): Achievement[] {
  return ACHIEVEMENTS;
}

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

export function getUserAchievements(userId: number): UserAchievement[] {
  return getDb()
    .prepare(
      `SELECT * FROM user_achievements WHERE user_id = ? ORDER BY completed DESC, created_at DESC`
    )
    .all(userId) as UserAchievement[];
}

export function getCompletedAchievements(userId: number): Achievement[] {
  const completed = getDb()
    .prepare(
      `SELECT achievement_id FROM user_achievements WHERE user_id = ? AND completed = 1`
    )
    .all(userId) as { achievement_id: string }[];

  const completedIds = new Set(completed.map(c => c.achievement_id));
  return ACHIEVEMENTS.filter(a => completedIds.has(a.id));
}

export function updateAchievementProgress(
  userId: number,
  achievementId: string,
  progress: number
): boolean {
  const achievement = getAchievementById(achievementId);
  if (!achievement) return false;

  const completed = progress >= achievement.requirement_value;

  const existing = getDb()
    .prepare(
      "SELECT id, completed FROM user_achievements WHERE user_id = ? AND achievement_id = ?"
    )
    .get(userId, achievementId) as { id: number; completed: number } | undefined;

  if (existing) {
    if (existing.completed) return false; // Already completed

    getDb()
      .prepare(
        `UPDATE user_achievements
         SET progress = ?, completed = ?, completed_at = CASE WHEN ? THEN datetime('now') ELSE NULL END
         WHERE id = ?`
      )
      .run(progress, completed ? 1 : 0, completed ? 1 : 0, existing.id);
  } else {
    getDb()
      .prepare(
        `INSERT INTO user_achievements (user_id, achievement_id, progress, completed, completed_at)
         VALUES (?, ?, ?, ?, CASE WHEN ? THEN datetime('now') ELSE NULL END)`
      )
      .run(userId, achievementId, progress, completed ? 1 : 0, completed ? 1 : 0);
  }

  // Award XP if completed
  if (completed && (!existing || !existing.completed)) {
    addXP(userId, achievement.xp_reward);
  }

  return completed;
}

export function checkAndUpdateAchievements(userId: number): Achievement[] {
  const db = getDb();
  const newlyCompleted: Achievement[] = [];

  // Get user stats
  const tradesCompleted = db
    .prepare(
      `SELECT COUNT(*) as count FROM trade_matches
       WHERE (buyer_id = ? OR seller_id = ?) AND status = 'completed'`
    )
    .get(userId, userId) as { count: number };

  const ordersCreated = db
    .prepare("SELECT COUNT(*) as count FROM orders WHERE user_id = ?")
    .get(userId) as { count: number };

  const locationsAdded = db
    .prepare("SELECT COUNT(*) as count FROM map_locations WHERE user_id = ?")
    .get(userId) as { count: number };

  const projectsCreated = db
    .prepare("SELECT COUNT(*) as count FROM projects WHERE user_id = ?")
    .get(userId) as { count: number };

  const projectsCompleted = db
    .prepare("SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status = 'completed'")
    .get(userId) as { count: number };

  const allianceMember = db
    .prepare("SELECT COUNT(*) as count FROM alliance_members WHERE user_id = ?")
    .get(userId) as { count: number };

  const allianceLeader = db
    .prepare("SELECT COUNT(*) as count FROM alliances WHERE leader_id = ?")
    .get(userId) as { count: number };

  const positiveRatings = db
    .prepare("SELECT COUNT(*) as count FROM user_ratings WHERE rated_user_id = ? AND rating >= 4")
    .get(userId) as { count: number };

  const merchantsAdded = db
    .prepare("SELECT COUNT(*) as count FROM merchants WHERE user_id = ?")
    .get(userId) as { count: number };

  const verifiedLocations = db
    .prepare("SELECT COUNT(*) as count FROM map_locations WHERE user_id = ? AND is_verified = 1")
    .get(userId) as { count: number };

  // Check each achievement
  const statsMap: Record<string, number> = {
    trades_completed: tradesCompleted.count,
    orders_created: ordersCreated.count,
    locations_added: locationsAdded.count,
    projects_created: projectsCreated.count,
    projects_completed: projectsCompleted.count,
    alliance_joined: allianceMember.count,
    alliance_created: allianceLeader.count,
    positive_ratings: positiveRatings.count,
    merchants_added: merchantsAdded.count,
    verified_locations: verifiedLocations.count,
    user_id: userId,
  };

  for (const achievement of ACHIEVEMENTS) {
    const progress = statsMap[achievement.requirement_type] || 0;
    const completed = updateAchievementProgress(userId, achievement.id, progress);
    if (completed) {
      newlyCompleted.push(achievement);
    }
  }

  return newlyCompleted;
}

// XP Functions
export function getUserXP(userId: number): UserXP | null {
  const db = getDb();

  const user = db
    .prepare("SELECT id, username FROM users WHERE id = ?")
    .get(userId) as { id: number; username: string } | undefined;

  if (!user) return null;

  const xpRow = db
    .prepare("SELECT total_xp FROM user_xp WHERE user_id = ?")
    .get(userId) as { total_xp: number } | undefined;

  const totalXp = xpRow?.total_xp || 0;
  const level = calculateLevel(totalXp);
  const xpForCurrentLevel = getXPForLevel(level);
  const xpForNextLevel = getXPForLevel(level + 1);

  // Get rank
  const rankRow = db
    .prepare(
      `SELECT COUNT(*) + 1 as rank FROM user_xp WHERE total_xp > ?`
    )
    .get(totalXp) as { rank: number };

  return {
    user_id: userId,
    username: user.username,
    total_xp: totalXp,
    level,
    xp_to_next_level: xpForNextLevel - totalXp,
    rank: rankRow.rank,
  };
}

export function addXP(userId: number, amount: number): number {
  const db = getDb();

  const existing = db
    .prepare("SELECT total_xp FROM user_xp WHERE user_id = ?")
    .get(userId) as { total_xp: number } | undefined;

  if (existing) {
    db.prepare("UPDATE user_xp SET total_xp = total_xp + ? WHERE user_id = ?").run(
      amount,
      userId
    );
    return existing.total_xp + amount;
  } else {
    db.prepare("INSERT INTO user_xp (user_id, total_xp) VALUES (?, ?)").run(
      userId,
      amount
    );
    return amount;
  }
}

function calculateLevel(xp: number): number {
  // Level formula: level = floor(sqrt(xp / 100))
  // Level 1: 0-99, Level 2: 100-399, Level 3: 400-899, etc.
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function getXPForLevel(level: number): number {
  // Inverse of level formula
  return Math.pow(level - 1, 2) * 100;
}

export function getLeaderboard(limit: number = 20): LeaderboardEntry[] {
  const rows = getDb()
    .prepare(
      `SELECT u.id as user_id, u.username, u.display_name, u.avatar_url,
        COALESCE(ux.total_xp, 0) as total_xp,
        (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id AND ua.completed = 1) as achievements_count
       FROM users u
       LEFT JOIN user_xp ux ON u.id = ux.user_id
       WHERE u.is_banned = 0
       ORDER BY total_xp DESC
       LIMIT ?`
    )
    .all(limit) as {
      user_id: number;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      total_xp: number;
      achievements_count: number;
    }[];

  return rows.map((row, index) => ({
    rank: index + 1,
    user_id: row.user_id,
    username: row.username,
    display_name: row.display_name || undefined,
    total_xp: row.total_xp,
    level: calculateLevel(row.total_xp),
    achievements_count: row.achievements_count,
    avatar_url: row.avatar_url || undefined,
  }));
}

// ========== DISCORD WEBHOOK FUNCTIONS ==========

export function getUserWebhooks(userId: number): DiscordWebhook[] {
  return getDb()
    .prepare("SELECT * FROM discord_webhooks WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as DiscordWebhook[];
}

export function getWebhookById(id: number): DiscordWebhook | null {
  return getDb()
    .prepare("SELECT * FROM discord_webhooks WHERE id = ?")
    .get(id) as DiscordWebhook | null;
}

export function createWebhook(userId: number, input: CreateWebhookInput): number {
  const result = getDb()
    .prepare(
      `INSERT INTO discord_webhooks
       (user_id, name, webhook_url, notify_trades, notify_matches, notify_price_alerts, notify_alliance)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      input.name,
      input.webhook_url,
      input.notify_trades !== false ? 1 : 0,
      input.notify_matches !== false ? 1 : 0,
      input.notify_price_alerts !== false ? 1 : 0,
      input.notify_alliance ? 1 : 0
    );

  return result.lastInsertRowid as number;
}

export function updateWebhook(
  id: number,
  userId: number,
  updates: Partial<CreateWebhookInput> & { is_active?: boolean }
): boolean {
  const webhook = getWebhookById(id);
  if (!webhook || webhook.user_id !== userId) return false;

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.webhook_url !== undefined) {
    fields.push("webhook_url = ?");
    values.push(updates.webhook_url);
  }
  if (updates.is_active !== undefined) {
    fields.push("is_active = ?");
    values.push(updates.is_active ? 1 : 0);
  }
  if (updates.notify_trades !== undefined) {
    fields.push("notify_trades = ?");
    values.push(updates.notify_trades ? 1 : 0);
  }
  if (updates.notify_matches !== undefined) {
    fields.push("notify_matches = ?");
    values.push(updates.notify_matches ? 1 : 0);
  }
  if (updates.notify_price_alerts !== undefined) {
    fields.push("notify_price_alerts = ?");
    values.push(updates.notify_price_alerts ? 1 : 0);
  }
  if (updates.notify_alliance !== undefined) {
    fields.push("notify_alliance = ?");
    values.push(updates.notify_alliance ? 1 : 0);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const result = getDb()
    .prepare(`UPDATE discord_webhooks SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values);

  return result.changes > 0;
}

export function deleteWebhook(id: number, userId: number): boolean {
  const webhook = getWebhookById(id);
  if (!webhook || webhook.user_id !== userId) return false;

  const result = getDb()
    .prepare("DELETE FROM discord_webhooks WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

export async function sendDiscordNotification(
  userId: number,
  notificationType: "trades" | "matches" | "price_alerts" | "alliance",
  embed: DiscordEmbed
): Promise<void> {
  const webhooks = getDb()
    .prepare(
      `SELECT * FROM discord_webhooks WHERE user_id = ? AND is_active = 1 AND notify_${notificationType} = 1`
    )
    .all(userId) as DiscordWebhook[];

  for (const webhook of webhooks) {
    try {
      await fetch(webhook.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });
    } catch (error) {
      console.error("Failed to send Discord notification:", error);
    }
  }
}

export function getActiveWebhooksForNotification(
  notificationType: "trades" | "matches" | "price_alerts" | "alliance"
): DiscordWebhook[] {
  const column = `notify_${notificationType}`;
  return getDb()
    .prepare(
      `SELECT * FROM discord_webhooks WHERE is_active = 1 AND ${column} = 1`
    )
    .all() as DiscordWebhook[];
}
