/**
 * WURM ONLINE CRAFTING FORMULAS
 * ==============================
 *
 * Core skill check mechanics are from decompiled Wurm Unlimited Java source.
 * The game uses a Gaussian probability distribution with cubic polynomial bias
 * for ALL success/failure and quality determinations.
 *
 * Sources:
 * - Wurmpedia: The Curve (Epic), Max Creation QL, Sweet Spot QL
 * - Decompiled WU: rollGaussian, effectiveWithItem, skillCheck (via tehasdf/grinder)
 * - Decompiled WU: checkAdvance stat dividers 5.0/45.0 (via Luceat/skillmod)
 * - Decompiled WU: action timer +3s base (via bdew-wurm/timerfix)
 */

// ========== INTERNAL HELPERS (from decompiled WU source) ==========

/** Standard Normal CDF - Abramowitz & Stegun approximation (accuracy ~1.5e-7) */
function normalCDF(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
}

/**
 * Effective skill with tool quality (decompiled from WU effectiveWithItem)
 *
 * When toolQL < skill: averages them (tool drags you down)
 * When toolQL >= skill: diminishing returns bonus from better tool
 * Bonus (from parent skills etc.) capped at 70, applied with diminishing returns
 */
function effectiveWithItem(skill: number, toolQL: number, bonus: number = 0): number {
  if (bonus > 70) bonus = 70;
  let bonusSkill: number;
  if (toolQL < skill) {
    bonusSkill = (skill + toolQL) / 2;
  } else {
    const range = toolQL - skill;
    bonusSkill = skill + skill * range / 100;
  }
  if (bonus > 0) {
    const cap = (100 + bonusSkill) / 2;
    const room = Math.min(bonusSkill, cap - bonusSkill);
    bonusSkill += room * bonus / 100;
  }
  return bonusSkill;
}

/**
 * Gaussian roll parameters (decompiled from WU rollGaussian)
 *
 * slide = cubic polynomial bias: (skill^3 - diff^3)/50000 + (skill - diff)
 * w = base width: 30 - |skill - diff|/4
 * sigma = distribution spread: w + |slide|/6
 *
 * The actual roll is: result = N(0,1) * sigma + slide
 * Success = result > 0, and result magnitude = item quality
 */
function getGaussianParams(effective: number, difficulty: number): { slide: number; sigma: number } {
  const slide = (Math.pow(effective, 3) - Math.pow(difficulty, 3)) / 50000
                + (effective - difficulty);
  const w = 30 - Math.abs(effective - difficulty) / 4;
  const sigma = Math.max(0.1, w + Math.abs(slide) / 6);
  return { slide, sigma };
}

// ========== CORE WURM FORMULAS ==========

/**
 * The Curve - Converts raw skill to effective skill
 * Formula: y = 2x - (x/10)²
 *
 * Examples:
 * - Skill 50: effective = 2*50 - (50/10)² = 100 - 25 = 75
 * - Skill 70: effective = 2*70 - (70/10)² = 140 - 49 = 91
 * - Skill 100: effective = 2*100 - (100/10)² = 200 - 100 = 100
 */
export function calculateEffectiveSkill(rawSkill: number): number {
  const clamped = Math.max(0, Math.min(100, rawSkill));
  return 2 * clamped - Math.pow(clamped / 10, 2);
}

/**
 * Inverse Curve - Get raw skill needed for target effective skill
 * Solved from: y = 2x - (x/10)²
 * x = 10 - 10*sqrt(1 - y/100)  (for y <= 100)
 */
export function rawSkillForEffective(effectiveSkill: number): number {
  const clamped = Math.max(0, Math.min(100, effectiveSkill));
  if (clamped >= 100) return 100;
  return 10 * (10 - Math.sqrt(100 - clamped));
}

/**
 * Maximum Creation Quality based on skill
 * Formula: maxQL = skill * 0.77 + 23
 *
 * Examples:
 * - Skill 1: maxQL = 23.77
 * - Skill 50: maxQL = 61.5
 * - Skill 70: maxQL = 76.9
 * - Skill 100: maxQL = 100
 */
export function calculateMaxCreationQL(skill: number): number {
  return Math.min(100, skill * 0.77 + 23);
}

/**
 * Sweet Spot QL for optimal skill gain
 * Items at this QL give double skill gain
 * Formula: sweetSpotQL = skill * 0.77 + 23
 */
export function calculateSweetSpotQL(skill: number): number {
  return skill * 0.77 + 23;
}

/**
 * Effective QL considering damage
 * Formula: effectiveQL = ql * (100 - damage) / 100
 */
export function calculateEffectiveQL(ql: number, damage: number): number {
  return ql * (100 - Math.min(100, Math.max(0, damage))) / 100;
}

// ========== SUCCESS RATE CALCULATIONS ==========

export interface SuccessFactors {
  skill: number;           // Player's skill level (0-100)
  difficulty: number;      // Item difficulty (0-100)
  toolQL: number;          // Tool quality (0-100)
  materialQL: number;      // Material quality (kept for interface compat, does NOT affect success)
  parentSkillBonus?: number; // Parent skill level (0-100), contributes via rollGaussian/10
  runeBonus?: number;      // Bonus from runes (0-15)
  sleepBonus?: boolean;    // Whether sleep bonus is active
}

/**
 * Calculate success chance for a crafting action
 * Uses the actual Wurm Gaussian skill check model:
 *
 * 1. Parent skill contributes: max(0, E[rollGaussian(parentSkill, diff)] / 10)
 * 2. Effective skill = effectiveWithItem(skill, toolQL, bonus)
 * 3. Roll = N(slide, sigma^2) where slide = (eff^3 - diff^3)/50000 + (eff - diff)
 * 4. Success = P(roll > 0) = Phi(slide / sigma)
 *
 * Note: Material QL does NOT affect success chance - it only caps result quality.
 *
 * Returns: 1-99 percentage
 */
export function calculateSuccessChance(factors: SuccessFactors): number {
  // Parent skill contributes expected value of rollGaussian(parentSkill, difficulty) / 10
  let bonus = 0;
  if (factors.parentSkillBonus && factors.parentSkillBonus > 0) {
    const parentParams = getGaussianParams(factors.parentSkillBonus, factors.difficulty);
    bonus += Math.max(0, parentParams.slide / 10);
  }
  bonus += factors.runeBonus || 0;

  // Effective skill incorporating tool QL and bonus (decompiled formula)
  const effective = effectiveWithItem(factors.skill, factors.toolQL, bonus);

  // Gaussian distribution parameters
  const { slide, sigma } = getGaussianParams(effective, factors.difficulty);

  // Success = P(roll > 0) where roll ~ N(slide, sigma^2)
  const successProb = normalCDF(slide / sigma) * 100;

  return Math.max(1, Math.min(99, successProb));
}

/**
 * Calculate success rate category for UI display
 */
export function getSuccessCategory(successChance: number): {
  label: string;
  color: string;
  description: string;
} {
  if (successChance >= 90) {
    return { label: "Very Easy", color: "#22c55e", description: "Almost guaranteed success" };
  } else if (successChance >= 75) {
    return { label: "Easy", color: "#84cc16", description: "High chance of success" };
  } else if (successChance >= 50) {
    return { label: "Normal", color: "#eab308", description: "Moderate success chance, good for skill gain" };
  } else if (successChance >= 25) {
    return { label: "Hard", color: "#f97316", description: "Challenging, expect some failures" };
  } else {
    return { label: "Very Hard", color: "#ef4444", description: "High failure rate, not recommended" };
  }
}

// ========== QUALITY PREDICTION ==========

export interface QualityPrediction {
  averageQL: number;
  minQL: number;
  maxQL: number;
  variance: number;
}

/**
 * Predict the quality of crafted items using Wurm's Gaussian model
 *
 * In the actual game, creation quality = power from skillCheck (the Gaussian roll).
 * Positive roll = success, and the roll magnitude IS the item QL.
 * Result is capped by material QL and maxCreationQL.
 *
 * We compute E[roll | roll > 0] using truncated normal distribution math.
 *
 * @param difficulty - Item difficulty (default 20 if not known)
 */
export function predictCraftingQuality(
  skill: number,
  toolQL: number,
  materialQL: number,
  difficulty: number = 20
): QualityPrediction {
  const maxCreationQL = calculateMaxCreationQL(skill);
  const hardCap = Math.min(maxCreationQL, materialQL);

  // Effective skill with tool (decompiled formula)
  const effective = effectiveWithItem(skill, toolQL);

  // Gaussian parameters
  const { slide, sigma } = getGaussianParams(effective, difficulty);

  // Average QL = E[roll | roll > 0] (truncated normal mean)
  // Formula: mu + sigma * phi(-mu/sigma) / Phi(mu/sigma)
  const z = slide / sigma;
  const successProb = normalCDF(z);
  let avgQL: number;
  if (successProb > 0.001) {
    avgQL = slide + sigma * normalPDF(-z) / successProb;
  } else {
    avgQL = 1;
  }
  avgQL = Math.max(1, Math.min(hardCap, avgQL));

  // Truncated normal variance for spread estimates
  const lambda = successProb > 0.001 ? normalPDF(-z) / successProb : 0;
  const truncatedVar = sigma * sigma * Math.max(0, 1 - lambda * (lambda + z));
  const truncatedStdDev = Math.sqrt(truncatedVar);

  // 10th and 90th percentile estimates
  const minQL = Math.max(1, avgQL - 1.28 * truncatedStdDev);
  const maxQL = Math.min(hardCap, avgQL + 1.28 * truncatedStdDev);

  return {
    averageQL: Math.round(avgQL * 10) / 10,
    minQL: Math.round(minQL * 10) / 10,
    maxQL: Math.round(maxQL * 10) / 10,
    variance: Math.round(truncatedStdDev * 10) / 10
  };
}

// ========== MATERIAL WASTE CALCULATIONS ==========

export interface MaterialWasteResult {
  baseQuantity: number;        // Quantity if 100% success
  expectedQuantity: number;    // Average with failures
  worstCaseQuantity: number;   // If you're unlucky (95th percentile)
  failureRate: number;         // Expected failure rate
  expectedAttempts: number;    // How many attempts to craft X items
}

/**
 * Calculate expected material waste due to crafting failures
 * This helps players know how many materials to really gather
 */
export function calculateMaterialWaste(
  targetQuantity: number,
  basePerItem: number,
  successChance: number
): MaterialWasteResult {
  const successRate = successChance / 100;
  const failureRate = 1 - successRate;

  // Expected attempts = targetQuantity / successRate
  const expectedAttempts = targetQuantity / successRate;

  // Expected materials = basePerItem * expectedAttempts
  const expectedQuantity = basePerItem * expectedAttempts;

  // Worst case (95th percentile) using inverse binomial approximation
  // For large n, we use normal approximation
  const variance = targetQuantity * failureRate / (successRate * successRate);
  const stdDev = Math.sqrt(variance);
  const worstCaseAttempts = expectedAttempts + 1.645 * stdDev; // 95th percentile
  const worstCaseQuantity = basePerItem * worstCaseAttempts;

  return {
    baseQuantity: basePerItem * targetQuantity,
    expectedQuantity: Math.ceil(expectedQuantity * 100) / 100,
    worstCaseQuantity: Math.ceil(worstCaseQuantity * 100) / 100,
    failureRate: Math.round(failureRate * 1000) / 10, // As percentage
    expectedAttempts: Math.ceil(expectedAttempts * 10) / 10
  };
}

// ========== CRAFTING TIME CALCULATIONS ==========

export interface CraftingTimeResult {
  baseTimeSeconds: number;
  modifiedTimeSeconds: number;
  totalTimeSeconds: number;
  totalTimeFormatted: string;
  ticksRequired: number;
}

/**
 * Base crafting times in seconds for different action types
 */
export const BASE_ACTION_TIMES: Record<string, number> = {
  // Woodworking
  "saw_plank": 10,
  "carve_shaft": 8,
  "create_tool": 15,

  // Smithing
  "smelt_ore": 30,
  "create_nail": 5,
  "create_tool_metal": 20,
  "improve_metal": 12,

  // Building
  "create_brick": 8,
  "build_wall": 60,

  // General
  "default_create": 10,
  "default_improve": 8,
  "default_continue": 5
};

/**
 * Calculate crafting time for an action
 *
 * From decompiled WU getStandardActionTime:
 * time = (rawTime / serverMultiplier) + 3.0
 * The +3 seconds is a fixed floor added AFTER all modifiers.
 *
 * Modifiers: skill (up to -50%), tool QL (up to -30%),
 * target QL (up to +100%), Wind of Ages (up to -30%)
 */
export function calculateCraftingTime(
  actionType: string,
  quantity: number,
  skill: number,
  toolQL: number,
  targetQL: number = 20,
  windOfAgesBonus: number = 0 // WoA enchant power (0-100)
): CraftingTimeResult {
  const baseTime = BASE_ACTION_TIMES[actionType] || BASE_ACTION_TIMES["default_create"];

  // Skill modifier: Higher skill = faster (up to 50% faster at 100 skill)
  const skillMod = 1 - (skill / 200);

  // Tool modifier: Higher QL = faster (up to 30% faster at 100 QL)
  const toolMod = 1 - (toolQL / 333);

  // Target QL modifier: Higher QL = slower (up to 100% slower at 100 QL)
  const qlMod = 1 + (targetQL / 100);

  // Wind of Ages: Direct speed bonus (up to 30% faster)
  const woaMod = 1 - (windOfAgesBonus * 0.003);

  // Raw time with modifiers, then +3s fixed base (decompiled from WU)
  const rawTime = baseTime * skillMod * toolMod * qlMod * woaMod;
  const finalTimePerAction = rawTime + 3;

  // Total time for all items
  const totalTime = finalTimePerAction * quantity;

  // Format time
  const hours = Math.floor(totalTime / 3600);
  const minutes = Math.floor((totalTime % 3600) / 60);
  const seconds = Math.floor(totalTime % 60);

  let formatted = "";
  if (hours > 0) formatted += `${hours}h `;
  if (minutes > 0 || hours > 0) formatted += `${minutes}m `;
  formatted += `${seconds}s`;

  return {
    baseTimeSeconds: baseTime,
    modifiedTimeSeconds: Math.round(finalTimePerAction * 10) / 10,
    totalTimeSeconds: Math.round(totalTime),
    totalTimeFormatted: formatted.trim(),
    ticksRequired: quantity
  };
}

// ========== TOOL WEAR CALCULATIONS ==========

export interface ToolWearResult {
  damagePerAction: number;
  actionsUntilRepair: number;
  repairsNeeded: number;
  finalToolDamage: number;
}

/**
 * Calculate tool wear for crafting actions
 * Tools take damage based on:
 * - Action difficulty
 * - Tool quality (higher QL = less damage)
 * - Circle of Cunning enchant (reduces wear)
 */
export function calculateToolWear(
  actions: number,
  toolQL: number,
  difficulty: number = 20,
  circleOfCunningPower: number = 0 // CoC enchant power (0-100)
): ToolWearResult {
  // Base damage per action (typically 0.001-0.01 per action)
  let baseDamage = 0.003 + (difficulty / 5000);

  // Higher QL tools take less damage
  baseDamage *= (100 - toolQL * 0.3) / 100;

  // Circle of Cunning reduces wear
  baseDamage *= (100 - circleOfCunningPower * 0.3) / 100;

  // Calculate total damage
  const totalDamage = baseDamage * actions;

  // Damage capped at 10 (tool becomes unusable, needs repair)
  const damageThreshold = 10;
  const actionsUntilRepair = Math.floor(damageThreshold / baseDamage);
  const repairsNeeded = Math.floor(totalDamage / damageThreshold);
  const finalDamage = totalDamage % damageThreshold;

  return {
    damagePerAction: Math.round(baseDamage * 10000) / 10000,
    actionsUntilRepair,
    repairsNeeded,
    finalToolDamage: Math.round(finalDamage * 100) / 100
  };
}

// ========== SKILL GAIN CALCULATIONS ==========

export interface SkillGainPrediction {
  gainPerAction: number;
  totalGain: number;
  newSkillLevel: number;
  actionsToNextLevel: number;
  isOptimalDifficulty: boolean;
  sweetSpotRange: { min: number; max: number };
}

/**
 * Predict skill gain from crafting actions
 *
 * From decompiled WU checkAdvance (Luceat/skillmod bytecode analysis):
 * - Stat divider: 5.0 for skills below 31, 45.0 for skills 31+
 *   (this creates the well-known "skill wall" at 31)
 * - Action time modifier: longer actions = proportionally more gain
 * - Sleep bonus: 2x gain (verified Wurmpedia)
 * - Sweet spot: 2x gain when difficulty is in sweet spot range (verified Wurmpedia)
 */
export function predictSkillGain(
  currentSkill: number,
  difficulty: number,
  actionTime: number,
  actionCount: number,
  hasSleepBonus: boolean = false
): SkillGainPrediction {
  // Stat divider from decompiled checkAdvance: 5.0 below skill 31, 45.0 above
  // This is the primary skill gain rate limiter
  const statDivider = currentSkill < 31 ? 5.0 : 45.0;

  // Base gain inversely proportional to (divider + skill)
  // Higher skill = slower gains, with sharp cliff at 31
  const skillFactor = 1 / (statDivider + currentSkill);

  // Difficulty modifier: best gains when difficulty is close to skill
  // Uses the Gaussian model: gain scales with how challenging the action is
  const difficultyDiff = Math.abs(difficulty - currentSkill);
  const difficultyMod = difficultyDiff <= 10 ? 1.0 :
                        difficultyDiff <= 20 ? 0.8 :
                        difficultyDiff <= 30 ? 0.5 : 0.3;

  // Action time modifier (longer actions = more gain, sqrt scaling)
  const timeMod = Math.sqrt(Math.max(3, actionTime) / 10);

  // Base gain per action
  let gainPerAction = skillFactor * difficultyMod * timeMod;

  // Sleep bonus doubles gain (verified Wurmpedia)
  if (hasSleepBonus) {
    gainPerAction *= 2;
  }

  // Sweet spot bonus: 2x gain when in sweet spot range (verified Wurmpedia)
  const sweetSpotQL = calculateSweetSpotQL(currentSkill);
  const inSweetSpot = difficulty >= sweetSpotQL && difficulty <= sweetSpotQL + 10;
  if (inSweetSpot) {
    gainPerAction *= 2;
  }

  // Total gain
  const totalGain = gainPerAction * actionCount;
  const newSkill = Math.min(100, currentSkill + totalGain);

  // Actions to next whole level
  const nextLevel = Math.floor(currentSkill) + 1;
  const gainNeeded = nextLevel - currentSkill;
  const actionsToNext = gainPerAction > 0 ? Math.ceil(gainNeeded / gainPerAction) : Infinity;

  return {
    gainPerAction: Math.round(gainPerAction * 10000) / 10000,
    totalGain: Math.round(totalGain * 1000) / 1000,
    newSkillLevel: Math.round(newSkill * 100) / 100,
    actionsToNextLevel: actionsToNext,
    isOptimalDifficulty: difficultyDiff <= 10,
    sweetSpotRange: {
      min: Math.round(sweetSpotQL),
      max: Math.round(sweetSpotQL + 10)
    }
  };
}

// ========== SKILL GRINDING OPTIMIZER ==========

export interface SkillPathStep {
  targetQL: number;
  skillRange: { from: number; to: number };
  actionsNeeded: number;
  successRate: number;
  description: string;
}

/**
 * Generate optimal skill grinding path
 * Returns recommended QL targets for efficient leveling
 */
export function generateSkillPath(
  currentSkill: number,
  targetSkill: number,
  toolQL: number = 50
): SkillPathStep[] {
  const steps: SkillPathStep[] = [];
  let skill = currentSkill;

  while (skill < targetSkill) {
    // Calculate sweet spot QL for current skill
    const sweetSpotQL = calculateSweetSpotQL(skill);

    // Optimal improving range: skill + 10 to skill + 20
    const optimalQLMin = Math.min(100, Math.max(1, skill + 10));
    const optimalQLMax = Math.min(100, Math.max(1, skill + 20));
    const targetQL = Math.round((optimalQLMin + optimalQLMax) / 2);

    // Calculate success rate at this QL
    const successChance = calculateSuccessChance({
      skill,
      difficulty: targetQL,
      toolQL,
      materialQL: 50
    });

    // Estimate actions to gain ~5 skill levels
    const nextCheckpoint = Math.min(targetSkill, Math.floor(skill / 5) * 5 + 5);
    const skillToGain = nextCheckpoint - skill;

    // Very rough estimate: 100 actions per skill point at skill 50
    const actionsPerPoint = 50 + skill * 2;
    const actionsNeeded = Math.round(actionsPerPoint * skillToGain);

    steps.push({
      targetQL,
      skillRange: { from: Math.round(skill * 10) / 10, to: nextCheckpoint },
      actionsNeeded,
      successRate: Math.round(successChance),
      description: `Improve items to QL ${targetQL} (${Math.round(successChance)}% success)`
    });

    skill = nextCheckpoint;
  }

  return steps;
}

// ========== DIFFICULTY RATINGS ==========

/**
 * Standard difficulty ratings for different item categories
 * Based on Wurm mechanics where difficulty affects success chance
 */
export const ITEM_DIFFICULTIES: Record<string, number> = {
  // Basic materials (very easy)
  "plank": 5,
  "shaft": 5,
  "brick": 10,

  // Simple tools
  "mallet": 15,
  "spindle": 10,
  "needle": 20,

  // Metal items
  "iron_lump": 15,
  "small_nail": 10,
  "large_nail": 15,
  "small_anvil": 40,
  "large_anvil": 50,

  // Complex tools
  "hammer": 25,
  "saw": 30,
  "pickaxe": 35,
  "hatchet": 30,

  // Weapons
  "short_sword": 40,
  "long_sword": 50,
  "two_handed_sword": 60,
  "small_axe": 30,
  "large_axe": 45,

  // Armor
  "chain_armour": 55,
  "plate_armour": 70,
  "leather_armour": 35,

  // Vehicles
  "wheel": 20,
  "wheel_axle": 25,
  "cart": 35,
  "large_cart": 45,
  "wagon": 55,
  "small_sailing_boat": 50,
  "corbita": 70,
  "caravel": 80,

  // Building
  "wooden_wall": 20,
  "stone_wall": 30,
  "fence": 15,
  "door": 25,

  // Default
  "default": 20
};

/**
 * Get difficulty for an item by name (fuzzy match)
 */
export function getItemDifficulty(itemName: string): number {
  const normalized = itemName.toLowerCase().replace(/\s+/g, "_");

  // Exact match
  if (ITEM_DIFFICULTIES[normalized]) {
    return ITEM_DIFFICULTIES[normalized];
  }

  // Partial match
  for (const [key, value] of Object.entries(ITEM_DIFFICULTIES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  return ITEM_DIFFICULTIES.default;
}

// ========== SKILL TYPES ==========

/**
 * Skill categories and their relationships
 */
export const SKILL_TREE: Record<string, { parent: string | null; subskills: string[] }> = {
  "body": { parent: null, subskills: ["body_strength", "body_stamina", "body_control"] },
  "mind": { parent: null, subskills: ["mind_logic", "mind_speed"] },
  "soul": { parent: null, subskills: ["soul_strength", "soul_depth"] },

  "smithing": { parent: "mind", subskills: ["blacksmithing", "weapon_smithing", "armour_smithing", "jewelry_smithing", "locksmithing"] },
  "blacksmithing": { parent: "smithing", subskills: [] },
  "weapon_smithing": { parent: "smithing", subskills: [] },
  "armour_smithing": { parent: "smithing", subskills: [] },

  "carpentry": { parent: "mind", subskills: ["fine_carpentry", "ship_building", "bowyery", "fletching"] },
  "fine_carpentry": { parent: "carpentry", subskills: [] },
  "ship_building": { parent: "carpentry", subskills: [] },

  "masonry": { parent: "body", subskills: ["stone_cutting"] },
  "stone_cutting": { parent: "masonry", subskills: [] },

  "tailoring": { parent: "mind", subskills: ["cloth_tailoring", "leatherworking"] },
  "cloth_tailoring": { parent: "tailoring", subskills: [] },
  "leatherworking": { parent: "tailoring", subskills: [] }
};

/**
 * Get parent skill bonus for a given skill
 */
export function getParentSkillBonus(skillName: string, allSkills: Record<string, number>): number {
  const skillInfo = SKILL_TREE[skillName.toLowerCase()];
  if (!skillInfo || !skillInfo.parent) return 0;

  const parentSkill = allSkills[skillInfo.parent] || 0;
  // Parent contributes roughly 1/5 to child skill checks
  return parentSkill * 0.2;
}

// ========== COMPREHENSIVE CALCULATION ==========

export interface AdvancedCraftingResult {
  // Basic info
  itemName: string;
  quantity: number;

  // Success prediction
  successChance: number;
  successCategory: ReturnType<typeof getSuccessCategory>;

  // Quality prediction
  qualityPrediction: QualityPrediction;

  // Material requirements (with waste)
  baseMaterials: Map<string, number>;
  expectedMaterials: Map<string, number>;
  worstCaseMaterials: Map<string, number>;
  materialWaste: MaterialWasteResult;

  // Time estimation
  timeEstimate: CraftingTimeResult;

  // Tool wear
  toolWear: ToolWearResult;

  // Skill gain
  skillGain: SkillGainPrediction;
}

/**
 * Comprehensive crafting calculation combining all factors
 */
export function calculateAdvancedCrafting(
  itemName: string,
  quantity: number,
  skill: number,
  toolQL: number,
  materialQL: number,
  baseMaterialsPerItem: number = 1,
  actionType: string = "default_create",
  parentSkillLevel: number = 0,
  hasSleepBonus: boolean = false
): AdvancedCraftingResult {
  const difficulty = getItemDifficulty(itemName);

  // Calculate success chance
  const successChance = calculateSuccessChance({
    skill,
    difficulty,
    toolQL,
    materialQL,
    parentSkillBonus: parentSkillLevel * 0.2
  });

  // Calculate quality prediction
  const qualityPrediction = predictCraftingQuality(skill, toolQL, materialQL, difficulty);

  // Calculate material waste
  const materialWaste = calculateMaterialWaste(quantity, baseMaterialsPerItem, successChance);

  // Calculate time estimate
  const expectedAttempts = Math.ceil(materialWaste.expectedAttempts);
  const timeEstimate = calculateCraftingTime(actionType, expectedAttempts, skill, toolQL);

  // Calculate tool wear
  const toolWear = calculateToolWear(expectedAttempts, toolQL, difficulty);

  // Calculate skill gain
  const skillGain = predictSkillGain(
    skill,
    difficulty,
    timeEstimate.modifiedTimeSeconds,
    expectedAttempts,
    hasSleepBonus
  );

  // Build material maps
  const baseMaterials = new Map<string, number>();
  const expectedMaterials = new Map<string, number>();
  const worstCaseMaterials = new Map<string, number>();

  baseMaterials.set("materials", materialWaste.baseQuantity);
  expectedMaterials.set("materials", materialWaste.expectedQuantity);
  worstCaseMaterials.set("materials", materialWaste.worstCaseQuantity);

  return {
    itemName,
    quantity,
    successChance,
    successCategory: getSuccessCategory(successChance),
    qualityPrediction,
    baseMaterials,
    expectedMaterials,
    worstCaseMaterials,
    materialWaste,
    timeEstimate,
    toolWear,
    skillGain
  };
}
