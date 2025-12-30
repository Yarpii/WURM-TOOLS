export type SkillType =
  | "blacksmithing"
  | "carpentry"
  | "fine_carpentry"
  | "masonry"
  | "tailoring"
  | "leatherworking"
  | "pottery"
  | "jewelry_smithing"
  | "weapon_smithing"
  | "armour_smithing"
  | "ship_building"
  | "ropemaking"
  | "cloth_tailoring"
  | "cooking"
  | null;

export type ToolType =
  | "hammer"
  | "mallet"
  | "saw"
  | "carving_knife"
  | "pickaxe"
  | "shovel"
  | "file"
  | "trowel"
  | "needle"
  | "awl"
  | "spindle"
  | "chisel"
  | "tongs"
  | null;

export interface Item {
  id: number;
  name: string;
  category: string;
  is_base_material: number;
  description: string | null;
  // Advanced crafting fields (now stored in database)
  difficulty: number | null;     // Base difficulty (0-100), null = unknown
  skill_type: SkillType;         // Required skill (e.g., "blacksmithing")
  base_time: number | null;      // Base crafting time in seconds
  tool_type: ToolType;           // Required tool type
}

export interface Recipe {
  id: number;
  result_item_id: number;
  ingredient_item_id: number;
  quantity: number;
}

export interface RecipeWithNames extends Recipe {
  result_name: string;
  ingredient_name: string;
}

export interface CraftingNode {
  id: number;
  name: string;
  category: string;
  quantity: number;
  is_base: boolean;
  depth: number;
  children: CraftingNode[];
}

export interface MaterialResult {
  id: number;
  name: string;
  category: string;
  quantity: number;
  formatted: string;
}

export interface CraftableResult {
  item: Item;
  quantity_needed: number;
}

export interface ImportStats {
  items_added: number;
  items_skipped: number;
  recipes_added: number;
  recipes_skipped: number;
  errors: string[];
}

export interface CsvPreviewResult {
  valid: Array<Record<string, unknown>>;
  invalid: Array<{ row: number; data: string[]; error: string }>;
  duplicates: Array<Record<string, unknown>>;
}

export type Category =
  | "wood"
  | "ore"
  | "material"
  | "metal"
  | "vehicle"
  | "building"
  | "tool"
  | "food"
  | "armor"
  | "weapon"
  | "misc";

// ========== ADVANCED CRAFTING TYPES ==========

export interface CraftingSettings {
  playerSkill: number;         // Player's skill level (0-100)
  toolQL: number;              // Tool quality (1-100)
  materialQL: number;          // Average material quality (1-100)
  hasSleepBonus: boolean;      // Sleep bonus active
  parentSkill: number;         // Parent skill level for bonuses
  windOfAges: number;          // WoA enchant power (0-100)
  circleOfCunning: number;     // CoC enchant power (0-100)
}

export interface AdvancedMaterialResult extends MaterialResult {
  // Expected quantity accounting for failures
  expectedQuantity: number;
  expectedFormatted: string;
  // Worst case (95% confidence)
  worstCaseQuantity: number;
  worstCaseFormatted: string;
}

export interface CraftingPrediction {
  // Success info
  successChance: number;
  successLabel: string;
  successColor: string;

  // Quality prediction
  averageQL: number;
  minQL: number;
  maxQL: number;

  // Time estimates
  timePerItem: number;
  totalTime: number;
  totalTimeFormatted: string;

  // Material waste
  failureRate: number;
  wasteMultiplier: number;

  // Tool wear
  toolDamagePerAction: number;
  repairsNeeded: number;

  // Skill gain
  skillGainPerAction: number;
  totalSkillGain: number;
  newSkillLevel: number;
  actionsToNextLevel: number;
  isOptimalDifficulty: boolean;
}

export interface SkillGrindStep {
  skillFrom: number;
  skillTo: number;
  targetQL: number;
  actionsNeeded: number;
  successRate: number;
  description: string;
  materialsNeeded: number;
  timeEstimate: string;
}

export interface AdvancedCalculationResult {
  // Basic materials (100% success assumption)
  baseMaterials: MaterialResult[];
  // Expected materials (with failure rate)
  expectedMaterials: AdvancedMaterialResult[];
  // Crafting tree
  tree: CraftingNode;
  // Predictions
  prediction: CraftingPrediction;
  // Skill grinding path (optional)
  skillPath?: SkillGrindStep[];
}

// ========== MARKET/TRADING TYPES ==========

export type OrderType = "buy" | "sell" | "trade";
export type OrderStatus = "active" | "completed" | "cancelled" | "expired";

export interface MarketOrder {
  id: number;
  user_id: number;
  username: string;
  order_type: OrderType;
  item_name: string;
  quantity: number;
  quality?: number;
  price?: number;
  currency?: string;
  trade_for?: string;
  location?: string;
  notes?: string;
  status: OrderStatus;
  created_at: string;
  expires_at?: string;
}

export interface CreateOrderInput {
  order_type: OrderType;
  item_name: string;
  quantity: number;
  quality?: number;
  price?: number;
  currency?: string;
  trade_for?: string;
  location?: string;
  notes?: string;
  expires_days?: number;
}

// ========== MERCHANT TYPES ==========

export type MerchantCategory =
  | "tools"
  | "weapons"
  | "armor"
  | "materials"
  | "food"
  | "animals"
  | "vehicles"
  | "furniture"
  | "misc";

export interface Merchant {
  id: number;
  user_id: number;
  username: string;
  name: string;
  description?: string;
  location: string;
  server: string;
  coordinates?: string;
  category: MerchantCategory;
  stock_list: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMerchantInput {
  name: string;
  description?: string;
  location: string;
  server: string;
  coordinates?: string;
  category: MerchantCategory;
  stock_list: string;
}

// ========== ALLIANCE TYPES ==========

export type AllianceRole = "leader" | "officer" | "member";
export type InviteStatus = "pending" | "accepted" | "declined" | "expired";

export interface Alliance {
  id: number;
  name: string;
  description?: string;
  tag?: string;
  leader_id: number;
  leader_username?: string;
  is_public: boolean;
  max_members: number;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

export interface AllianceMember {
  id: number;
  alliance_id: number;
  user_id: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
  role: AllianceRole;
  joined_at: string;
  invited_by?: number;
  invited_by_username?: string;
}

export interface AllianceInvite {
  id: number;
  alliance_id: number;
  alliance_name?: string;
  user_id: number;
  username?: string;
  invited_by: number;
  invited_by_username?: string;
  status: InviteStatus;
  created_at: string;
  expires_at?: string;
}

export interface CreateAllianceInput {
  name: string;
  description?: string;
  tag?: string;
  is_public?: boolean;
  max_members?: number;
}

export interface UpdateAllianceInput {
  name?: string;
  description?: string;
  tag?: string;
  is_public?: boolean;
  max_members?: number;
}

// ========== PRICE HISTORY & ANALYTICS TYPES ==========

export interface PriceHistory {
  id: number;
  item_name: string;
  price: number;
  quality: number;
  order_type: OrderType;
  currency: string;
  recorded_at: string;
}

export interface PriceAnalytics {
  item_name: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_change_24h: number;
  price_change_7d: number;
  total_orders: number;
  buy_orders: number;
  sell_orders: number;
}

export interface TrendingItem {
  item_name: string;
  order_count: number;
  total_quantity: number;
  avg_price: number;
  trend: "up" | "down" | "stable";
  trend_percentage: number;
}

export interface PriceAlert {
  id: number;
  user_id: number;
  item_name: string;
  target_price: number;
  condition: "above" | "below";
  is_active: boolean;
  triggered_at?: string;
  created_at: string;
}

export interface CreatePriceAlertInput {
  item_name: string;
  target_price: number;
  condition: "above" | "below";
}

// ========== PROJECT PLANNER TYPES ==========

export type ProjectStatus = "planning" | "in_progress" | "completed" | "archived";

export interface Project {
  id: number;
  user_id: number;
  username?: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  is_shared: boolean;
  alliance_id?: number;
  alliance_name?: string;
  total_items: number;
  completed_items: number;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectItem {
  id: number;
  project_id: number;
  item_id: number;
  item_name: string;
  quantity: number;
  completed_quantity: number;
  notes?: string;
  priority: number;
  is_completed: boolean;
}

export interface ProjectMaterial {
  item_id: number;
  item_name: string;
  category: string;
  required_quantity: number;
  completed_quantity: number;
  remaining_quantity: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  is_shared?: boolean;
  alliance_id?: number;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  is_shared?: boolean;
}

export interface AddProjectItemInput {
  item_id: number;
  quantity: number;
  notes?: string;
  priority?: number;
}

// ========== TRADE MATCHING TYPES ==========

export type MatchStatus = "pending" | "contacted" | "completed" | "declined" | "expired";

export interface TradeMatch {
  id: number;
  buy_order_id: number;
  sell_order_id: number;
  buyer_id: number;
  buyer_username: string;
  seller_id: number;
  seller_username: string;
  item_name: string;
  quantity: number;
  buy_price?: number;
  sell_price?: number;
  match_score: number;
  status: MatchStatus;
  created_at: string;
  contacted_at?: string;
}

export interface UserRating {
  id: number;
  rater_id: number;
  rater_username: string;
  rated_user_id: number;
  rated_username: string;
  rating: number;
  comment?: string;
  trade_match_id?: number;
  created_at: string;
}

export interface UserReputation {
  user_id: number;
  username: string;
  avg_rating: number;
  total_ratings: number;
  completed_trades: number;
  successful_matches: number;
}

export interface CreateRatingInput {
  rated_user_id: number;
  rating: number;
  comment?: string;
  trade_match_id?: number;
}

export interface BarterSuggestion {
  your_order: MarketOrder;
  their_order: MarketOrder;
  match_reason: string;
  compatibility_score: number;
}
