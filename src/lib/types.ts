export interface Item {
  id: number;
  name: string;
  category: string;
  is_base_material: number;
  description: string | null;
  // Advanced crafting fields
  difficulty?: number;           // Base difficulty (0-100)
  skill_type?: string;           // Required skill (e.g., "blacksmithing")
  base_time?: number;            // Base crafting time in seconds
  tool_type?: string;            // Required tool type
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
