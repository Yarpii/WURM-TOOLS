// ============================================================================
// CHAT ANALYZER - CONSTANTS
// ============================================================================

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
