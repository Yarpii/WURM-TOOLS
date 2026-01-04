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

// ========== PROSPECT INFO TYPES ==========

export type ProspectStatus = "potential" | "contacted" | "interested" | "recruited" | "declined" | "inactive";
export type ProspectPriority = "low" | "medium" | "high" | "urgent";
export type ProspectQuality = 1 | 2 | 3 | 4 | 5;

export interface ProspectPage {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Prospect {
  id: number;
  page_id: number;
  user_id: number;
  name: string;
  character_name?: string;
  server?: string;
  location?: string;
  status: ProspectStatus;
  priority: ProspectPriority;
  quality_rating: ProspectQuality;
  skills?: string;
  notes?: string;
  contact_info?: string;
  last_contact?: string;
  source?: string;
  tags?: string;
  custom_fields?: string;
  created_at: string;
  updated_at: string;
}

export interface ProspectWithPage extends Prospect {
  page_name?: string;
  page_color?: string;
  page_icon?: string;
}

export interface CreateProspectPageInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateProspectPageInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
}

export interface CreateProspectInput {
  page_id: number;
  name: string;
  character_name?: string;
  server?: string;
  location?: string;
  status?: ProspectStatus;
  priority?: ProspectPriority;
  quality_rating?: ProspectQuality;
  skills?: string;
  notes?: string;
  contact_info?: string;
  source?: string;
  tags?: string;
  custom_fields?: string;
}

export interface UpdateProspectInput {
  page_id?: number;
  name?: string;
  character_name?: string;
  server?: string;
  location?: string;
  status?: ProspectStatus;
  priority?: ProspectPriority;
  quality_rating?: ProspectQuality;
  skills?: string;
  notes?: string;
  contact_info?: string;
  last_contact?: string;
  source?: string;
  tags?: string;
  custom_fields?: string;
}

export interface ProspectStats {
  total: number;
  by_status: Record<ProspectStatus, number>;
  by_priority: Record<ProspectPriority, number>;
  by_quality: Record<number, number>;
  recent_contacts: number;
  conversion_rate: number;
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
