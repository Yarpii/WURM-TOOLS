// ============================================================================
// CHAT ANALYZER - CONSTANTS
// ============================================================================

// ============================================================================
// ALGORITHM MODES - Selectable detection presets
// ============================================================================

export type AlgorithmMode =
  | "balanced"      // Default - good balance of accuracy and false positive rate
  | "strict"        // Conservative - fewer false positives, may miss some alts
  | "sensitive"     // Aggressive - catches more alts, but more false positives
  | "temporal"      // Focus on timing patterns (handoff, never online together)
  | "linguistic"    // Focus on writing style (function words, n-grams, typos)
  | "wurm";         // Wurm Online optimized - tuned for game-specific patterns

export interface AlgorithmConfig {
  name: string;
  description: string;
  // Minimum thresholds
  minMessages: number;          // Minimum messages per player
  minScoreToReport: number;     // Minimum total score to report
  minStrongReasons: number;     // Minimum strong reasons required
  // Weight multipliers for each category (1.0 = normal)
  temporalWeight: number;
  linguisticWeight: number;
  behavioralWeight: number;
  networkWeight: number;
  // Specific feature weights
  functionWordWeight: number;   // Function words are most reliable
  ngramWeight: number;
  typoWeight: number;
  rareWordWeight: number;
  handoffWeight: number;
  // Thresholds for triggering features
  ngramThresholdHigh: number;   // N-gram similarity for high score
  ngramThresholdMed: number;    // N-gram similarity for medium score
  functionWordThresholdHigh: number;
  functionWordThresholdMed: number;
  // Confidence calculation
  confidenceMultiplier: number;
  confidenceBase: number;
}

export const ALGORITHM_CONFIGS: Record<AlgorithmMode, AlgorithmConfig> = {
  balanced: {
    name: "Balanced (v4.0)",
    description: "Default algorithm with good accuracy and low false positives",
    minMessages: 20,
    minScoreToReport: 70,
    minStrongReasons: 2,
    temporalWeight: 1.0,
    linguisticWeight: 1.0,
    behavioralWeight: 1.0,
    networkWeight: 1.0,
    functionWordWeight: 1.0,
    ngramWeight: 1.0,
    typoWeight: 1.0,
    rareWordWeight: 1.0,
    handoffWeight: 1.0,
    ngramThresholdHigh: 0.97,
    ngramThresholdMed: 0.94,
    functionWordThresholdHigh: 0.92,
    functionWordThresholdMed: 0.85,
    confidenceMultiplier: 0.40,
    confidenceBase: 12,
  },
  strict: {
    name: "Strict (Low False Positives)",
    description: "Conservative mode - only reports high-confidence matches",
    minMessages: 30,
    minScoreToReport: 100,
    minStrongReasons: 3,
    temporalWeight: 1.2,
    linguisticWeight: 1.0,
    behavioralWeight: 0.8,
    networkWeight: 0.5,
    functionWordWeight: 1.3,
    ngramWeight: 0.8,
    typoWeight: 1.2,
    rareWordWeight: 1.0,
    handoffWeight: 1.2,
    ngramThresholdHigh: 0.98,
    ngramThresholdMed: 0.96,
    functionWordThresholdHigh: 0.94,
    functionWordThresholdMed: 0.88,
    confidenceMultiplier: 0.35,
    confidenceBase: 15,
  },
  sensitive: {
    name: "Sensitive (Catch More)",
    description: "Aggressive mode - catches more potential alts, may have false positives",
    minMessages: 15,
    minScoreToReport: 50,
    minStrongReasons: 1,
    temporalWeight: 1.0,
    linguisticWeight: 1.2,
    behavioralWeight: 1.2,
    networkWeight: 1.0,
    functionWordWeight: 1.0,
    ngramWeight: 1.2,
    typoWeight: 1.0,
    rareWordWeight: 1.2,
    handoffWeight: 1.0,
    ngramThresholdHigh: 0.95,
    ngramThresholdMed: 0.90,
    functionWordThresholdHigh: 0.88,
    functionWordThresholdMed: 0.78,
    confidenceMultiplier: 0.45,
    confidenceBase: 10,
  },
  temporal: {
    name: "Temporal Focus",
    description: "Emphasizes timing patterns - handoffs, never online together",
    minMessages: 20,
    minScoreToReport: 60,
    minStrongReasons: 2,
    temporalWeight: 1.5,
    linguisticWeight: 0.7,
    behavioralWeight: 0.8,
    networkWeight: 1.2,
    functionWordWeight: 0.8,
    ngramWeight: 0.7,
    typoWeight: 0.8,
    rareWordWeight: 0.8,
    handoffWeight: 1.5,
    ngramThresholdHigh: 0.97,
    ngramThresholdMed: 0.94,
    functionWordThresholdHigh: 0.92,
    functionWordThresholdMed: 0.85,
    confidenceMultiplier: 0.42,
    confidenceBase: 10,
  },
  linguistic: {
    name: "Linguistic Focus",
    description: "Emphasizes writing style - function words, n-grams, typos",
    minMessages: 25,
    minScoreToReport: 70,
    minStrongReasons: 2,
    temporalWeight: 0.7,
    linguisticWeight: 1.4,
    behavioralWeight: 1.0,
    networkWeight: 0.6,
    functionWordWeight: 1.5,
    ngramWeight: 1.3,
    typoWeight: 1.3,
    rareWordWeight: 1.2,
    handoffWeight: 0.7,
    ngramThresholdHigh: 0.96,
    ngramThresholdMed: 0.92,
    functionWordThresholdHigh: 0.90,
    functionWordThresholdMed: 0.82,
    confidenceMultiplier: 0.40,
    confidenceBase: 12,
  },
  wurm: {
    name: "Wurm Online Optimized",
    description: "Tuned for Wurm Online chat patterns and terminology",
    minMessages: 20,
    minScoreToReport: 65,
    minStrongReasons: 2,
    temporalWeight: 1.2,  // Important - alts often don't overlap
    linguisticWeight: 1.1,
    behavioralWeight: 1.2, // Wurm has specific behavioral patterns
    networkWeight: 0.8,   // Less weight - people often don't interact in general chat
    functionWordWeight: 1.0,
    ngramWeight: 1.0,
    typoWeight: 1.1,
    rareWordWeight: 1.3,  // Important - Wurm-specific vocabulary
    handoffWeight: 1.3,   // Multiboxing/alt-switching is common
    ngramThresholdHigh: 0.96,
    ngramThresholdMed: 0.93,
    functionWordThresholdHigh: 0.90,
    functionWordThresholdMed: 0.83,
    confidenceMultiplier: 0.42,
    confidenceBase: 11,
  },
};

// ============================================================================
// WURM ONLINE SPECIFIC PATTERNS
// ============================================================================

// Wurm trade chat patterns - WTS/WTB/WTT/PC prefixes
export const WURM_TRADE_PATTERNS = [
  /^wts\b/i,   // Want to sell
  /^wtb\b/i,   // Want to buy
  /^wtt\b/i,   // Want to trade
  /^pc\b/i,    // Price check
];

// Wurm-specific abbreviations that are fingerprinting
export const WURM_ABBREVIATIONS = new Set([
  "bsb",      // Bulk storage bin
  "fsb",      // Food storage bin
  "ql",       // Quality level
  "coc",      // Circle of Cunning
  "woa",      // Wind of Ages
  "botd",     // Blessings of the Dark
  "aosp",     // Aura of Shared Pain
  "lt",       // Life Transfer
  "nim",      // Nimbleness
  "ms",       // Mindstealer
  "fa",       // Flaming Aura
  "fb",       // Frostbrand
  "rt",       // Rotting Touch
  "imp",      // Improve/improving
  "ench",     // Enchant/enchantment
  "sac",      // Sacrifice
  "carp",     // Carpentry
  "bc",       // Blacksmithing/body control
  "ws",       // Weaponsmithing
  "js",       // Jewelry smithing
  "fc",       // Fine carpentry
  "sc",       // Ship building / stone cutting
  "nat",      // Natural substances
  "hfc",      // Hot food cooking
  "mb",       // Masonry/body strength
]);

// Wurm kingdom/server specific greetings
export const WURM_KINGDOM_GREETINGS = [
  "hots",     // Horde of the Summoned
  "jk",       // Jenn-Kellon
  "mr",       // Mol-Rehan
  "bl",       // Blacklight
  "wl",       // Whitelight
];

// STOP WORDS for analysis - common words to filter out
export const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "need", "dare",
  "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
  "into", "through", "during", "before", "after", "above", "below",
  "between", "under", "again", "further", "then", "once", "here",
  "there", "when", "where", "why", "how", "all", "each", "few", "more",
  "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "so", "than", "too", "very", "just", "and", "but", "if", "or",
  "because", "until", "while", "about", "against",
  "i", "me", "my", "myself", "we", "our", "you", "your", "he", "him",
  "she", "her", "it", "its", "they", "them", "their", "what", "which",
  "who", "whom", "this", "that", "these", "those", "am", "im", "ive",
  "dont", "doesnt", "didnt", "wont", "wouldnt", "cant", "couldnt",
  "yeah", "yes", "ok", "okay", "oh", "ah", "lol", "haha", "hehe",
]);

// Common words that should NEVER be considered "rare" - they're just normal vocabulary
export const COMMON_GAMING_WORDS = new Set([
  // Common English words that slip through
  "just", "like", "really", "think", "know", "want", "need", "good", "nice",
  "back", "going", "getting", "making", "doing", "trying", "looking", "coming",
  "yeah", "yep", "nope", "maybe", "probably", "actually", "basically", "literally",
  "pretty", "quite", "very", "much", "well", "also", "still", "even", "though",
  "something", "anything", "nothing", "everything", "someone", "anyone", "everyone",
  "stuff", "thing", "things", "place", "time", "people", "person", "guys", "dude",
  "work", "working", "works", "worked", "play", "playing", "player", "players",
  // Common gaming terms
  "game", "server", "online", "offline", "login", "logout", "spawn", "respawn",
  "kill", "killed", "death", "dead", "died", "alive", "health", "damage", "attack",
  "level", "skill", "skills", "grind", "grinding", "farm", "farming", "loot",
  "item", "items", "gear", "armor", "weapon", "weapons", "tool", "tools",
  "quest", "mission", "event", "update", "patch", "buff", "nerf", "stats",
  "guild", "clan", "alliance", "team", "group", "party", "friend", "friends",
  "noob", "newbie", "veteran", "admin", "moderator", "owner",
  // Common Wurm terms (everyone uses these)
  "deed", "village", "kingdom", "priest", "horse", "cart", "boat", "ship",
  "mine", "mining", "forge", "anvil", "skill", "improve", "improving", "quality",
  "rare", "supreme", "fantastic", "drake", "scale", "troll", "unique",
  "bulk", "crate", "wagon", "highway", "road", "bridge", "house", "building",
  "wood", "iron", "steel", "silver", "gold", "copper", "stone", "rock",
  "water", "food", "meat", "fish", "wheat", "cotton", "leather", "cloth",
  // Wurm skills and actions (common gameplay vocabulary)
  "faith", "favor", "prayer", "channeling", "exorcism", "preaching",
  "casted", "casting", "enchant", "enchanted", "enchanting", "dispel",
  "imping", "imped", "mending", "repairing", "repaired", "creating",
  "digging", "flattening", "leveling", "paving", "planning", "building",
  "chopping", "cutting", "woodcutting", "logging", "planting", "harvesting",
  "sowing", "farming", "tending", "picking", "foraging", "botanizing",
  "fishing", "cooking", "baking", "roasting", "butchering", "milking",
  "taming", "breeding", "grooming", "leading", "hitching", "riding",
  "sailing", "mooring", "embarking", "disembarking", "loading", "unloading",
  "smithing", "smelting", "casting", "tempering", "sharpening", "polishing",
  "masonry", "carpentry", "tailoring", "leatherworking", "pottery", "alchemy",
  "meditation", "meditating", "fighting", "archery", "shielding", "healing",
  "prospecting", "analyzing", "examining", "repairing", "lockpicking",
  // Wurm items, resources, and materials
  "potato", "potatoes", "garlic", "onion", "onions", "pumpkin", "pumpkins",
  "corn", "barley", "oat", "oats", "rye", "wemp", "reed", "rice",
  "strawberry", "blueberry", "raspberry", "lingonberry", "cherry", "lemon",
  "olive", "olives", "grape", "grapes", "apple", "maple", "birch", "cedar",
  "willow", "walnut", "chestnut", "linden", "lavender", "camellia", "oleander",
  "rose", "acorn", "hazelnut", "nutmeg", "fennel", "ginger", "basil",
  "oregano", "parsley", "rosemary", "thyme", "sage", "cumin", "paprika",
  "turmeric", "sassafras", "lovage", "nettles",
  "plank", "planks", "shaft", "shafts", "brick", "bricks", "mortar",
  "concrete", "slate", "marble", "sandstone", "pottery", "clay",
  "lump", "lumps", "ribbon", "string", "rope", "chain", "rivet",
  "nails", "fence", "fences", "gate", "gates", "door", "floor",
  "oven", "kiln", "campfire", "fireplace", "still", "cauldron",
  "needle", "spindle", "loom", "grindstone", "whetstone",
  "pickaxe", "shovel", "hatchet", "hammer", "mallet", "chisel",
  "rake", "scythe", "sickle", "trowel", "knife", "saw", "file",
  "longsword", "shortsword", "twohander", "spear", "halberd", "shield",
  "staff", "scepter", "statuette", "altar", "coffin", "fountain",
  "lamp", "torch", "lantern", "candelabra", "brazier",
  "saddle", "horseshoe", "bridle", "barding",
  "rowboat", "sailboat", "corbita", "cog", "knarr", "caravel",
  "dredge", "anchor", "mooring",
  "backpack", "satchel", "knapsack", "quiver", "toolbelt",
  "barrel", "bucket", "flask", "jar", "bowl", "plate", "cup",
  "pelt", "hide", "fleece", "wool", "fur",
  "zinc", "tin", "lead", "bronze", "brass", "electrum", "adamantine",
  "glimmersteel", "seryll", "moonmetal",
  // Wurm creatures and mobs
  "spider", "scorpion", "goblin", "crocodile", "anaconda",
  "hellhound", "hellhorse", "lava", "fiend", "dragon", "hatchling",
  "unicorn", "bison", "deer", "pheasant", "rooster", "chicken", "hen",
  "cattle", "bull", "calf", "sheep", "lamb", "pig", "dog", "cat",
  "wolf", "bear", "lion", "gorilla", "hyena", "jackal", "cobra",
  // Wurm enchantments and spells
  "nimbleness", "mindstealer", "frostbrand", "flaming", "venom",
  "rotting", "lifetransfer", "lurker", "opulence", "demise",
  "blessing", "aura", "genesis", "strongwall", "charm",
  "courier", "dark", "messenger", "reveal",
  // Wurm game mechanics terms
  "wurm", "karma", "sleep", "bonus", "affinity", "affinities",
  "stamina", "nutrition", "thirst", "alignment", "reputation",
  "favor", "difficulty", "timer", "cooldown", "decay",
  "damage", "quality", "weight", "volume", "temperature",
  "premium", "trader", "merchant", "token", "upkeep", "coffers",
  "highway", "catseye", "waystone", "mailbox", "spirit",
  "guard", "guards", "tower", "lighthouse", "colossus",
  "rift", "source", "crystal", "fragment", "journal",
  "terraforming", "flattening", "leveling", "surface",
  "underground", "reinforced", "collapsed", "ceiling",
  "perimeter", "border", "tile", "tiles", "slope",
  // Server names and common places
  "harmony", "melody", "cadence", "independence", "deliverance", "exodus",
  "celebration", "xanadu", "pristine", "release", "defiance", "chaos", "elevation",
]);

// Wurm-specific terminology
export const WURM_TERMS = [
  "deed", "village", "alliance", "kingdom",
  "kos", "templars", "highway", "rift", "unique",
  "priest", "vyn", "mag", "fo", "lib", "nahjo",
  "drake", "scale", "rare", "supreme", "fantastic",
  "terraform", "mine", "forge", "imp", "improving",
  "channeling", "prayer", "benediction", "sermon",
  "pvp", "pve", "defiance", "chaos", "elevation",
  "independence", "deliverance", "exodus", "celebration",
  "xanadu", "pristine", "release", "harmony", "melody", "cadence",
  "troll", "dragon", "goblin", "spider", "hell", "valrei",
  "wurm", "karma", "sleep", "bonus", "affinity",
  "bulk", "bsb", "fsb", "crate", "wagon", "knarr",
  "corbita", "caravel", "sailboat", "rowboat",
  "longsword", "shortsword", "maul", "axe", "pickaxe",
  "shovel", "rake", "scythe", "sickle", "hammer",
];

// Common short responses that should be ignored in similarity analysis
export const WURM_COMMON_RESPONSES = new Set([
  "ok", "ty", "thx", "thanks", "np", "yw", "yes", "no", "yeah", "yep",
  "nope", "sure", "done", "nice", "cool", "lol", "haha", "xd",
  "gl", "gj", "gz", "gratz", "wb", "brb", "afk", "back",
]);

// Wurm-specific topic words for fingerprinting
export const TOPIC_WORDS = [
  "deed", "village", "kingdom", "pvp", "pve", "skill", "grind",
  "horse", "cart", "boat", "ship", "mine", "forge", "anvil",
  "weapon", "armor", "shield", "sword", "axe", "maul",
  "priest", "mag", "vyn", "fo", "lib", "channeling", "prayer",
  "drake", "scale", "rare", "supreme", "fantastic",
  "newbie", "noob", "vet", "veteran", "old", "new",
  "help", "need", "want", "sell", "buy", "trade", "price",
  "lag", "bug", "fix", "dev", "update", "patch",
  "alliance", "enemy", "friend", "war", "peace",
  "troll", "dragon", "unique", "rift", "valrei",
];

// Typo patterns to detect
export const TYPO_CHECKS = [
  { pattern: /\bteh\b/g, label: "teh->the" },
  { pattern: /\bthier\b/g, label: "thier->their" },
  { pattern: /\byuo\b/g, label: "yuo->you" },
  { pattern: /\bwaht\b/g, label: "waht->what" },
  { pattern: /\btaht\b/g, label: "taht->that" },
  { pattern: /\bhte\b/g, label: "hte->the" },
  { pattern: /\bwith\b/g, label: "wiht->with" },
  { pattern: /\balot\b/g, label: "alot" },
  { pattern: /\bdefinately\b/g, label: "definately" },
  { pattern: /\brecieve\b/g, label: "recieve" },
  { pattern: /\boccured\b/g, label: "occured" },
  { pattern: /\buntill\b/g, label: "untill" },
  { pattern: /\bwich\b/g, label: "wich->which" },
  { pattern: /\bbeacuse\b/g, label: "beacuse" },
  { pattern: /\bfreind\b/g, label: "freind" },
  { pattern: /\bgoverment\b/g, label: "goverment" },
  { pattern: /\bgrammer\b/g, label: "grammer" },
  // Double letters
  { pattern: /([a-z])\1{2,}/g, label: "triple-letters" },
];

// Letter substitution patterns (txtspk)
export const LETTER_SUBSTITUTION_PATTERNS = [
  { pattern: /\bu\b/g, label: "u->you" },
  { pattern: /\br\b/g, label: "r->are" },
  { pattern: /\bur\b/g, label: "ur->your" },
  { pattern: /\by\b/g, label: "y->why" },
  { pattern: /\bk\b/g, label: "k->ok" },
  { pattern: /\bb4\b/g, label: "b4->before" },
  { pattern: /\b2\b(?!\d)/g, label: "2->to/too" },
  { pattern: /\b4\b(?!\d)/g, label: "4->for" },
  { pattern: /\bcuz\b/g, label: "cuz->because" },
  { pattern: /\bplz\b/g, label: "plz->please" },
  { pattern: /\bthx\b/g, label: "thx->thanks" },
  { pattern: /\bppl\b/g, label: "ppl->people" },
  { pattern: /\brn\b/g, label: "rn->right now" },
  { pattern: /\bidk\b/g, label: "idk" },
  { pattern: /\bimo\b/g, label: "imo" },
  { pattern: /\btbh\b/g, label: "tbh" },
  { pattern: /\bngl\b/g, label: "ngl" },
];

// Emoticon patterns to detect
export const EMOTE_PATTERNS = [
  { pattern: /\bxD+\b/gi, name: "xD" },
  { pattern: /\blol\b/gi, name: "lol" },
  { pattern: /\blmao\b/gi, name: "lmao" },
  { pattern: /\brofl\b/gi, name: "rofl" },
  { pattern: /\bhaha+\b/gi, name: "haha" },
  { pattern: /\bhehe+\b/gi, name: "hehe" },
  { pattern: /:[)]/g, name: ":)" },
  { pattern: /:\(/g, name: ":(" },
  { pattern: /:D/g, name: ":D" },
  { pattern: /:P/gi, name: ":P" },
  { pattern: /;\)/g, name: ";)" },
  { pattern: /\bo\.O\b|\bO\.o\b/g, name: "o.O" },
  { pattern: /\^\^/g, name: "^^" },
  { pattern: /<3/g, name: "<3" },
];
