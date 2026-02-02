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
  slug?: string;
  skill?: string | null;
  difficulty?: number | null;
  base_time_seconds?: number | null;
  base_time?: number | null;
  image_url?: string | null;
  is_base_material: boolean | number;
  visible?: boolean;
  category?: Category | string | null;
  skill_type?: SkillType | string | null;
  tool_type?: ToolType | string | null;
  description?: string | null;
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
  skill?: string | null;
  quantity: number;
  is_base: boolean;
  depth: number;
  children: CraftingNode[];
  category?: Category | string | null;
}

export interface MaterialResult {
  id: number;
  name: string;
  skill?: string | null;
  quantity: number;
  formatted: string;
  is_base?: boolean;
  category?: Category | string | null;
}

export interface CraftableResult {
  item: Item;
  quantity_needed: number;
}

export interface ImportStats {
  items_added: number;
  items_updated: number;
  items_failed: number;
  recipes_added: number;
  recipes_updated: number;
  recipes_failed: number;
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
  itemName: string;
  quantity: number;
  successChance: number;
  qualityPrediction: number;
  estimatedTime: number;
  expectedAttempts: number;
}

export interface SkillGrindStep {
  itemName: string;
  itemId: number;
  startSkill: number;
  targetSkill: number;
  estimatedItems: number;
  skillGainPerItem: number;
  difficulty: number;
}

export interface AdvancedCalculationResult {
  // Advanced materials with waste calculations
  materials: AdvancedMaterialResult[];
  // Total crafting steps
  totalCraftingSteps: number;
  // Predictions per step
  predictions: CraftingPrediction[];
  // Summary statistics
  summary: {
    estimatedTime: number;
    totalMaterials: number;
    uniqueMaterials: number;
    expectedWaste: number;
    successProbability: number;
  };
  // Skill grinding path (optional)
  skillPath?: SkillGrindStep[];
}

// ========== CHARACTER SHOWCASE TYPES ==========

export type WurmReligion = "Fo" | "Vynora" | "Magranon" | "Libila" | "None";
export type Playstyle = "pve" | "pvp" | "both" | "casual" | "hardcore";

export interface Character {
  id: number;
  user_id: number;
  username?: string;
  name: string;
  server?: string;
  religion?: WurmReligion;
  avatar_url?: string;
  premium_until?: string;
  is_primary: boolean;
  bio?: string;
  deed_name?: string;
  playstyle?: Playstyle;
  created_at: string;
  updated_at: string;
}

export interface CreateCharacterInput {
  name: string;
  server?: string;
  religion?: WurmReligion;
  avatar_url?: string;
  premium_until?: string;
  is_primary?: boolean;
  bio?: string;
  deed_name?: string;
  playstyle?: Playstyle;
}

export interface UpdateCharacterInput {
  name?: string;
  server?: string;
  religion?: WurmReligion;
  avatar_url?: string;
  premium_until?: string;
  is_primary?: boolean;
  bio?: string;
  deed_name?: string;
  playstyle?: Playstyle;
}

export interface CharacterWithStats extends Character {
  orders_count: number;
  merchants_count: number;
  projects_count: number;
  skills_count: number;
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
  skill?: string | null;
  required_quantity: number;
  completed_quantity: number;
  remaining_quantity: number;
  category?: Category | string | null;
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

// ========== MAP & LOCATIONS TYPES ==========

export type LocationType = "deed" | "merchant" | "landmark" | "resource" | "spawn" | "other";
export type WurmServer = "harmony" | "melody" | "cadence" | "defiance" | "elevation" | "desertion" | "affliction" | "chaos" | "independence" | "deliverance" | "exodus" | "celebration" | "pristine" | "release" | "xanadu" | "other";

export interface MapLocation {
  id: number;
  user_id: number;
  username?: string;
  name: string;
  description?: string;
  location_type: LocationType;
  server: WurmServer;
  x: number;
  y: number;
  is_public: boolean;
  is_verified: boolean;
  alliance_id?: number;
  merchant_id?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationInput {
  name: string;
  description?: string;
  location_type: LocationType;
  server: WurmServer;
  x: number;
  y: number;
  is_public?: boolean;
  alliance_id?: number;
  merchant_id?: number;
}

export interface UpdateLocationInput {
  name?: string;
  description?: string;
  location_type?: LocationType;
  x?: number;
  y?: number;
  is_public?: boolean;
}

// ========== GAMIFICATION & ACHIEVEMENTS TYPES ==========

export type AchievementCategory = "trading" | "crafting" | "community" | "exploration" | "special";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  xp_reward: number;
  requirement_type: string;
  requirement_value: number;
  is_hidden: boolean;
}

export interface UserAchievement {
  id: number;
  user_id: number;
  achievement_id: string;
  progress: number;
  completed: boolean;
  completed_at?: string;
  created_at: string;
}

export interface UserXP {
  user_id: number;
  username: string;
  total_xp: number;
  level: number;
  xp_to_next_level: number;
  rank?: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  display_name?: string;
  total_xp: number;
  level: number;
  achievements_count: number;
  avatar_url?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  category: AchievementCategory;
}

// ========== DISCORD INTEGRATION TYPES ==========

export interface DiscordWebhook {
  id: number;
  user_id: number;
  name: string;
  webhook_url: string;
  is_active: boolean;
  notify_trades: boolean;
  notify_matches: boolean;
  notify_price_alerts: boolean;
  notify_alliance: boolean;
  created_at: string;
}

export interface CreateWebhookInput {
  name: string;
  webhook_url: string;
  notify_trades?: boolean;
  notify_matches?: boolean;
  notify_price_alerts?: boolean;
  notify_alliance?: boolean;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

// ========== PLAYER HUB - SKILL TRACKING ==========

export interface UserSkill {
  id: number;
  user_id: number;
  skill_name: string;
  current_level: number;
  target_level?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SkillHistory {
  id: number;
  user_skill_id: number;
  old_level: number;
  new_level: number;
  recorded_at: string;
}

export interface WurmSkill {
  id: number;
  name: string;
  category: string;
  parent_skill?: string;
  max_level: number;
  description?: string;
}

export interface CreateSkillInput {
  skill_name: string;
  current_level: number;
  target_level?: number;
  notes?: string;
}

export interface UpdateSkillInput {
  current_level?: number;
  target_level?: number;
  notes?: string;
}

// Skill gain calculation helpers
export interface SkillGainEstimate {
  skill_name: string;
  current_level: number;
  target_level: number;
  estimated_actions: number;
  estimated_time_hours: number;
  with_sleep_bonus: {
    estimated_actions: number;
    estimated_time_hours: number;
  };
}

// ========== PLAYER HUB - TIMERS ==========

export type TimerType =
  | "sleep_bonus"
  | "fatigue"
  | "crop"
  | "animal"
  | "sermon"
  | "meditation"
  | "custom"
  | "cooldown"
  | "bulk";

export interface UserTimer {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  timer_type: TimerType;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_interval?: number;
  notify_discord: boolean;
  is_active: boolean;
  color: string;
  icon?: string;
  created_at: string;
}

export interface TimerPreset {
  id: number;
  user_id?: number;
  name: string;
  timer_type: TimerType;
  duration_minutes: number;
  description?: string;
  color: string;
  icon?: string;
  is_public: boolean;
}

export interface CreateTimerInput {
  name: string;
  description?: string;
  timer_type: TimerType;
  duration_minutes: number;
  is_recurring?: boolean;
  recurrence_interval?: number;
  notify_discord?: boolean;
  color?: string;
  icon?: string;
}

export interface UpdateTimerInput {
  name?: string;
  description?: string;
  is_recurring?: boolean;
  recurrence_interval?: number;
  notify_discord?: boolean;
  is_active?: boolean;
  color?: string;
}

// ========== PLAYER HUB - EVENTS / CALENDAR ==========

export type EventType =
  | "impalong"
  | "rift"
  | "unique"
  | "sermon_group"
  | "market"
  | "pvp"
  | "community"
  | "personal"
  | "other";

export type AttendeeStatus = "interested" | "going" | "maybe" | "not_going";

export interface WurmEvent {
  id: number;
  user_id: number;
  username?: string;
  title: string;
  description?: string;
  event_type: EventType;
  server?: WurmServer;
  location?: string;
  coordinates?: string;
  start_date: string;
  end_date?: string;
  is_all_day: boolean;
  is_public: boolean;
  is_featured: boolean;
  max_attendees?: number;
  contact_info?: string;
  external_link?: string;
  image_url?: string;
  attendee_count?: number;
  user_status?: AttendeeStatus;
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  id: number;
  event_id: number;
  user_id: number;
  username?: string;
  status: AttendeeStatus;
  character_name?: string;
  notes?: string;
  created_at: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  event_type: EventType;
  server?: WurmServer;
  location?: string;
  coordinates?: string;
  start_date: string;
  end_date?: string;
  is_all_day?: boolean;
  is_public?: boolean;
  max_attendees?: number;
  contact_info?: string;
  external_link?: string;
  image_url?: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  event_type?: EventType;
  server?: WurmServer;
  location?: string;
  coordinates?: string;
  start_date?: string;
  end_date?: string;
  is_all_day?: boolean;
  is_public?: boolean;
  is_featured?: boolean;
  max_attendees?: number;
  contact_info?: string;
  external_link?: string;
  image_url?: string;
}

export interface UpdateAttendanceInput {
  status: AttendeeStatus;
  character_name?: string;
  notes?: string;
}

// ========== RECIPE SUBMISSIONS ==========

export type RecipeSubmissionStatus = "pending" | "approved" | "rejected";

export interface RecipeSubmission {
  id: number;
  user_id: number;
  username?: string;
  item_name: string;
  ingredients: string; // JSON array of { name: string, quantity: number }
  source_url?: string;
  notes?: string;
  status: RecipeSubmissionStatus;
  admin_notes?: string;
  reviewed_by?: number;
  reviewed_by_username?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface RecipeIngredientInput {
  name: string;
  quantity: number;
}

export interface CreateRecipeSubmissionInput {
  item_name: string;
  ingredients: RecipeIngredientInput[];
  source_url?: string;
  notes?: string;
}

export interface ReviewRecipeSubmissionInput {
  status: "approved" | "rejected";
  admin_notes?: string;
}

// ========== TREASURE HUNTING ==========

export type TreasureDifficulty = "easy" | "challenging" | "difficult";
export type TreasureHuntStatus = "new" | "reading" | "searching" | "found" | "digging" | "completed" | "abandoned";
export type TreasureChestType = "open" | "locked" | "high_security";
export type TreasureLootRarity = "rare" | "supreme" | "fantastic";
export type SharedTreasureType = "treasure_chest" | "rare_spawn" | "unique_item" | "hidden_cache" | "archaeology" | "other";
export type SharedTreasureStatus = "active" | "claimed" | "expired" | "invalid";

// Personal treasure hunt tracking
export interface TreasureHunt {
  id: number;
  user_id: number;
  username?: string;
  character_id?: number;
  character_name?: string;
  parent_hunt_id?: number; // For chained maps (map found in another chest)
  parent_hunt_name?: string;
  name: string;
  description?: string;
  server: string;
  map_quality?: number;
  difficulty: TreasureDifficulty;
  x?: number;
  y?: number;
  status: TreasureHuntStatus;
  chest_type?: TreasureChestType;
  requires_key: boolean;
  is_public: boolean;
  alliance_id?: number;
  alliance_name?: string;
  screenshot_url?: string; // Screenshot of map or location
  found_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  loot_count?: number;
  child_hunts?: TreasureHunt[]; // Maps found in this chest
}

export interface CreateTreasureHuntInput {
  name: string;
  description?: string;
  server: string;
  map_quality?: number;
  difficulty?: TreasureDifficulty;
  character_id?: number;
  is_public?: boolean;
  alliance_id?: number;
  parent_hunt_id?: number; // Link to parent hunt if this map was found in a chest
  screenshot_url?: string;
}

export interface UpdateTreasureHuntInput {
  name?: string;
  description?: string;
  server?: string;
  map_quality?: number;
  difficulty?: TreasureDifficulty;
  x?: number;
  y?: number;
  status?: TreasureHuntStatus;
  chest_type?: TreasureChestType;
  requires_key?: boolean;
  is_public?: boolean;
  parent_hunt_id?: number;
  screenshot_url?: string;
}

// Treasure loot tracking
export interface TreasureLoot {
  id: number;
  treasure_hunt_id: number;
  item_name: string;
  quantity: number;
  quality?: number;
  rarity?: TreasureLootRarity;
  notes?: string;
  created_at: string;
}

export interface AddTreasureLootInput {
  item_name: string;
  quantity?: number;
  quality?: number;
  rarity?: TreasureLootRarity;
  notes?: string;
}

// Shared/community treasure locations
export interface SharedTreasure {
  id: number;
  user_id: number;
  username?: string;
  name: string;
  description?: string;
  server: string;
  x: number;
  y: number;
  treasure_type: SharedTreasureType;
  status: SharedTreasureStatus;
  is_verified: boolean;
  verified_by?: number;
  verified_by_username?: string;
  verified_at?: string;
  upvotes: number;
  downvotes: number;
  user_vote?: "up" | "down" | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSharedTreasureInput {
  name: string;
  description?: string;
  server: string;
  x: number;
  y: number;
  treasure_type: SharedTreasureType;
}

export interface UpdateSharedTreasureInput {
  name?: string;
  description?: string;
  x?: number;
  y?: number;
  treasure_type?: SharedTreasureType;
  status?: SharedTreasureStatus;
}

// Treasure statistics
export interface TreasureStats {
  total_hunts: number;
  completed_hunts: number;
  abandoned_hunts: number;
  in_progress_hunts: number;
  total_loot_items: number;
  rare_finds: number;
  by_difficulty: {
    easy: number;
    challenging: number;
    difficult: number;
  };
  by_server: Record<string, number>;
}

// Private treasure hunt sharing with friends
export interface TreasureHuntShare {
  id: number;
  treasure_hunt_id: number;
  hunt_name?: string;
  shared_by_user_id: number;
  shared_by_username?: string;
  shared_with_user_id: number;
  shared_with_username?: string;
  message?: string;
  can_edit: boolean;
  created_at: string;
}

export interface ShareTreasureHuntInput {
  treasure_hunt_id: number;
  shared_with_user_id: number;
  message?: string;
  can_edit?: boolean;
}

// ========== COMMUNITY RESOURCES ==========

export type ResourceType = 'guide' | 'tool' | 'data' | 'media' | 'template' | 'other';

export interface CommunityResource {
  id: number;
  alliance_id?: number;
  alliance_name?: string;
  resource_type: ResourceType;
  name: string;
  description?: string;
  external_url?: string;
  file_path?: string;
  file_size?: number;
  category: string;
  tags?: string[];
  created_by: number;
  creator_username?: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  download_count: number;
  is_approved: boolean;
  is_featured: boolean;
  average_rating?: number;
  rating_count?: number;
}

export interface ResourceVersion {
  id: number;
  resource_id: number;
  version: string;
  file_path: string;
  file_size?: number;
  uploaded_by: number;
  uploader_username?: string;
  uploaded_at: string;
  changelog?: string;
}

export interface ResourceRating {
  id: number;
  resource_id: number;
  user_id: number;
  username?: string;
  rating: number;
  review?: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceComment {
  id: number;
  resource_id: number;
  user_id: number;
  username?: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface CreateResourceInput {
  alliance_id?: number;
  resource_type: ResourceType;
  name: string;
  description?: string;
  external_url?: string;
  file_path?: string;
  file_size?: number;
  category: string;
  tags?: string[];
}

export interface UpdateResourceInput {
  name?: string;
  description?: string;
  external_url?: string;
  category?: string;
  tags?: string[];
  is_featured?: boolean;
}

export interface CreateResourceVersionInput {
  resource_id: number;
  version: string;
  file_path: string;
  file_size?: number;
  changelog?: string;
}

export interface CreateResourceRatingInput {
  resource_id: number;
  rating: number;
  review?: string;
}

export interface ResourceFilters {
  resource_type?: ResourceType;
  category?: string;
  tags?: string[];
  alliance_id?: number;
  created_by?: number;
  is_featured?: boolean;
  search?: string;
}

// ========== WURMPEDIA RECIPE IMPORT ==========

export type WurmpediaRecipeType = 'misc' | 'cooking' | 'smithing' | 'carpentry' | 'tailoring' | 'masonry' | 'fishing' | 'alchemy' | 'other';

// Input format from Wurmpedia JSON export
export interface WurmpediaRecipeInput {
  id: number;
  name: string;
  categories?: string[];
  image?: string;
  creation?: {
    tools?: string[];
    target?: string;
    targetQuantity?: number | null;
    menu?: string | null;
    steps?: string[];
  };
  materials?: Array<{
    name: string;
    quantity?: number;
    optional?: boolean;
  }>;
  result?: {
    name?: string;
    weight?: number | null;
    quantity?: number;
  };
  skill?: string;
  difficulty?: number;
  canImprove?: boolean;
  improveWith?: string | null;
  properties?: string[];
  notes?: string[];
  isCooking?: boolean;
  hasMaterials?: boolean;
  type?: string;
}

// Database model
export interface WurmpediaRecipe {
  id: number;
  wurmpedia_id: number | null;
  name: string;
  slug: string | null;
  image_url: string | null;
  categories: string[] | null;
  creation_tools: string[] | null;
  creation_target: string | null;
  creation_target_quantity: number | null;
  creation_menu: string | null;
  creation_steps: string[] | null;
  materials: Array<{ name: string; quantity?: number; optional?: boolean }> | null;
  result_name: string | null;
  result_weight: number | null;
  result_quantity: number;
  skill: string | null;
  difficulty: number | null;
  can_improve: boolean;
  improve_with: string | null;
  properties: string[] | null;
  notes: string[] | null;
  is_cooking: boolean;
  has_materials: boolean;
  recipe_type: WurmpediaRecipeType;
  activated_at: string | null;
  imported_at: string;
  updated_at: string;
}

export interface WurmpediaImportLog {
  id: number;
  imported_by: number | null;
  recipes_added: number;
  recipes_updated: number;
  recipes_failed: number;
  error_details: string[] | null;
  imported_at: string;
}

export interface WurmpediaImportResult {
  success: boolean;
  recipes_added: number;
  recipes_updated: number;
  recipes_failed: number;
  errors: string[];
  log_id?: number;
}

export interface WurmpediaRecipeFilters {
  search?: string;
  skill?: string;
  recipe_type?: WurmpediaRecipeType;
  is_cooking?: boolean;
  has_materials?: boolean;
  can_improve?: boolean;
  category?: string;
  activated?: boolean;
}

export interface WurmpediaStats {
  total_recipes: number;
  cooking_recipes: number;
  improvable_recipes: number;
  recipes_with_materials: number;
  unique_skills: number;
  unique_categories: number;
  by_type: Record<string, number>;
}

export interface BulkActivationStats {
  total_recipes: number;
  with_materials: number;
  activated: number;
  not_activated: number;
  by_skill: Array<{ skill: string; total: number; activated: number }>;
  by_type: Array<{ recipe_type: string; total: number; activated: number }>;
}

// ========== COOKING SYSTEM ==========

export interface CookingCooker {
  id: number;
  name: string;
  affinity_value: number;
  description: string | null;
  icon_url: string | null;
}

export interface CookingContainer {
  id: number;
  name: string;
  affinity_value: number;
  description: string | null;
  icon_url: string | null;
}

export interface CookingPreparation {
  id: number;
  name: string;
  affinity_modifier: number;
  applies_to: string[] | null;
  description: string | null;
}

export interface CookingIngredientCategory {
  id: number;
  name: string;
  display_order: number;
}

export interface CookingIngredient {
  id: number;
  name: string;
  category_id: number;
  category_name?: string;
  affinity_value: number;
  calories: number;
  carbs: number;
  fats: number;
  proteins: number;
  weight: number | null;
  difficulty_modifier: number;
  icon_url: string | null;
  notes: string | null;
}

export interface CookingSkill {
  id: number;  // 0-137
  name: string;
  category: string | null;
}

export interface CookingRecipe {
  id: number;
  name: string;
  slug: string | null;
  cooker_id: number | null;
  cooker_name?: string;
  container_id: number | null;
  container_name?: string;
  skill_required: string;
  difficulty: number;
  result_name: string | null;
  ccfp_multiplier: number;
  is_verified: boolean;
  fills_all_ccfp: boolean;
  notes: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
  ingredients?: CookingRecipeIngredient[];
}

export interface CookingRecipeIngredient {
  id: number;
  recipe_id: number;
  ingredient_id: number;
  ingredient_name?: string;
  quantity: number;
  is_mandatory: boolean;
  preparation_id: number | null;
  preparation_name?: string;
  notes: string | null;
}

export interface UserPlayerNumber {
  id: number;
  user_id: number;
  player_number: number;
  character_name: string | null;
  discovered_at: string;
}

export interface UserSavedRecipe {
  id: number;
  user_id: number;
  recipe_name: string;
  cooker_id: number | null;
  container_id: number | null;
  ingredients: CookingRecipeComponent[];
  calculated_affinity_skill_id: number | null;
  calculated_affinity_skill_name?: string;
  calculated_ccfp: CCFPValues | null;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface CookingRecipeComponent {
  ingredient_id: number;
  ingredient_name?: string;
  preparation_id: number | null;
  preparation_name?: string;
  quantity: number;
  rarity: 'normal' | 'rare' | 'supreme' | 'fantastic';
}

export interface CCFPValues {
  calories: number;
  carbs: number;
  fats: number;
  proteins: number;
}

export interface CCFPPercentages {
  calories: number;  // % of daily 2000
  carbs: number;     // % of daily 300
  fats: number;      // % of daily 80
  proteins: number;  // % of daily 50
}

export interface AffinityCalculationInput {
  player_number: number;
  cooker_id: number | null;
  container_id: number | null;
  ingredients: Array<{
    ingredient_id: number;
    preparation_id: number | null;
    rarity: 'normal' | 'rare' | 'supreme' | 'fantastic';
  }>;
}

export interface AffinityCalculationResult {
  skill_id: number;
  skill_name: string;
  total_points: number;
  breakdown: {
    cooker: number;
    container: number;
    ingredients: Array<{
      name: string;
      base: number;
      preparation: number;
      rarity: number;
      total: number;
    }>;
  };
}

export interface CCFPCalculationResult {
  totals: CCFPValues;
  percentages: CCFPPercentages;
  per_ingredient: Array<{
    name: string;
    ccfp: CCFPValues;
  }>;
}

export interface CookingRecipeFilters {
  search?: string;
  cooker_id?: number;
  container_id?: number;
  skill_required?: string;
  difficulty_min?: number;
  difficulty_max?: number;
  fills_all_ccfp?: boolean;
  is_verified?: boolean;
  ingredient_id?: number;
}

// Rarity modifiers for affinity calculation
export const RARITY_MODIFIERS = {
  normal: 0,
  rare: 1,
  supreme: 2,
  fantastic: 3,
} as const;

// Daily CCFP targets
export const DAILY_CCFP = {
  calories: 2000,
  carbs: 300,
  fats: 80,
  proteins: 50,
} as const;

// ========== ARCHAEOLOGY PINPOINTS ==========

export type ArchaeologySiteType =
  | "old_deed"
  | "ruins"
  | "settlement"
  | "tower"
  | "guard_tower"
  | "mine"
  | "bridge"
  | "road"
  | "other"
  | "unknown";

export interface ArchaeologyPinpoint {
  id: number;
  user_id: number;
  username?: string;
  name: string;
  description?: string;
  server: string;
  x: number;
  y: number;
  site_type: ArchaeologySiteType;
  deed_name?: string;
  former_owner?: string;
  estimated_age?: string;
  findings?: string;
  notable_items?: string;
  is_public: boolean;
  is_verified: boolean;
  verified_by?: number;
  verified_by_username?: string;
  verified_at?: string;
  upvotes: number;
  downvotes: number;
  user_vote?: "up" | "down" | null;
  created_at: string;
  updated_at: string;
}

export interface CreateArchaeologyPinpointInput {
  name: string;
  description?: string;
  server: string;
  x: number;
  y: number;
  site_type?: ArchaeologySiteType;
  deed_name?: string;
  former_owner?: string;
  estimated_age?: string;
  findings?: string;
  notable_items?: string;
  is_public?: boolean;
}

export interface UpdateArchaeologyPinpointInput {
  name?: string;
  description?: string;
  server?: string;
  x?: number;
  y?: number;
  site_type?: ArchaeologySiteType;
  deed_name?: string;
  former_owner?: string;
  estimated_age?: string;
  findings?: string;
  notable_items?: string;
  is_public?: boolean;
}

export interface ArchaeologyComment {
  id: number;
  pinpoint_id: number;
  user_id: number;
  username?: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface CreateArchaeologyCommentInput {
  pinpoint_id: number;
  comment: string;
}

export interface ArchaeologyFilters {
  server?: string;
  site_type?: ArchaeologySiteType;
  is_public?: boolean;
  user_id?: number;
  search?: string;
}

// ==================== ANIMAL BREEDING ====================

export type AnimalType = 'horse' | 'bison' | 'bull' | 'cow' | 'sheep' | 'pig' | 'hen' | 'rooster' | 'dog' | 'cat' | 'hell_horse' | 'unicorn';
export type AnimalGender = 'male' | 'female';
export type TraitCategory = 'speed' | 'draft' | 'combat' | 'misc' | 'negative';

export interface Stable {
  id: number;
  user_id: number;
  name: string;
  server: string;
  capacity: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  animal_count?: number;
}

export interface Animal {
  id: number;
  user_id: number;
  stable_id?: number;
  name: string;
  animal_type: AnimalType;
  gender: AnimalGender;
  color?: string;
  mother_id?: number;
  father_id?: number;
  generation: number;
  is_alive: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  stable_name?: string;
  mother_name?: string;
  father_name?: string;
  traits?: AnimalTrait[];
}

export interface AnimalTrait {
  id: number;
  animal_id: number;
  trait_name: string;
  trait_category: TraitCategory;
  is_inherited: boolean;
  created_at: string;
}

export interface CreateStableInput {
  name: string;
  server: string;
  capacity?: number;
  notes?: string;
}

export interface UpdateStableInput {
  name?: string;
  server?: string;
  capacity?: number;
  notes?: string;
}

export interface CreateAnimalInput {
  stable_id?: number;
  name: string;
  animal_type: AnimalType;
  gender: AnimalGender;
  color?: string;
  mother_id?: number;
  father_id?: number;
  notes?: string;
}

export interface UpdateAnimalInput {
  stable_id?: number | null;
  name?: string;
  animal_type?: AnimalType;
  gender?: AnimalGender;
  color?: string;
  mother_id?: number | null;
  father_id?: number | null;
  is_alive?: boolean;
  notes?: string;
}

export interface AddAnimalTraitInput {
  animal_id: number;
  trait_name: string;
  trait_category: TraitCategory;
  is_inherited?: boolean;
}

export interface AnimalFamilyNode {
  animal: Animal;
  mother?: AnimalFamilyNode;
  father?: AnimalFamilyNode;
  children?: Animal[];
}
