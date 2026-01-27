// ============================================================================
// CHAT ANALYZER - TYPE DEFINITIONS
// ============================================================================

export interface ChatMessage {
  timestamp: string;
  player: string;
  message: string;
  lineNumber: number;
  timeSeconds: number; // Seconds since midnight for temporal analysis
  dayIndex: number; // Which day (0, 1, 2, ...) for multi-day analysis
  absoluteTime: number; // Absolute time for handoff detection (dayIndex * 86400 + timeSeconds)
}

export interface AdvancedPlayerStats {
  name: string;
  messageCount: number;
  wordCount: number;
  avgWordsPerMessage: number;

  // Temporal patterns
  activeMinutes: Set<number>; // Minutes in the day they were active
  activeDayMinutes: Map<number, Set<number>>; // Per day: minutes active
  sessionGaps: number[]; // Gaps between messages in seconds
  avgResponseTime: number;
  activityPattern: ActivityPattern; // NEW: Time-of-day activity fingerprint

  // Linguistic fingerprint
  charNgrams: Map<string, number>; // Character trigrams
  wordBigrams: Map<string, number>; // NEW: Word pairs (bigrams)
  typoPatterns: string[]; // Common misspellings
  punctuationStyle: PunctuationStyle;
  punctuationFrequency: Map<string, number>; // NEW: Punctuation usage frequency
  letterSubstitutions: Map<string, number>; // u->you, r->are, etc.
  microPatterns: MicroPatterns; // Detailed micro-patterns
  emoticonStyle: EmoticonStyle; // Emoticon fingerprint
  functionWords: FunctionWordProfile; // NEW: Function word fingerprint (most reliable!)

  // Statistical stylometry
  vocabularyRichness: number; // Unique words / total words (TTR)
  hapaxRatio: number; // Words used only once / total unique
  yulesK: number; // Yule's characteristic K
  simpsonsD: number; // NEW: Simpson's Diversity Index
  brunetsW: number; // NEW: Brunet's W statistic
  avgWordLength: number;
  wordLengthDistribution: number[]; // Distribution of word lengths 1-15+
  messageLengthDistribution: number[]; // NEW: Distribution of message lengths
  sentencePatterns: string[]; // Common sentence structures

  // Behavioral
  commonWords: string[];
  commonPhrases: string[];
  commonStarters: string[];
  commonEnders: string[]; // NEW: Common ending words/phrases
  greetingStyle: string[]; // NEW: How they greet (hi, hey, hello, yo)
  farewellStyle: string[]; // NEW: How they say bye (cya, bye, later, bb)
  responsePartners: Map<string, number>; // Who they respond to most
  mentionedPlayers: Set<string>; // Players they mention
  topicFingerprint: Map<string, number>; // Topic word frequencies
  wurmTopics: Map<string, number>; // Wurm-specific topic usage

  // Raw data for comparison
  allMessages: string[];
  messageTimes: number[];
  absoluteTimes: number[]; // For handoff detection
}

// Function word profile - MOST RELIABLE stylometry feature
export interface FunctionWordProfile {
  // Relative frequencies of function word categories (0-1)
  articles: number;       // the, a, an
  pronouns: number;       // I, you, he, she, it, we, they, me, him, her, us, them
  prepositions: number;   // in, on, at, to, for, with, by, from, about
  conjunctions: number;   // and, but, or, so, because, if, when, while
  auxiliaries: number;    // is, are, was, were, have, has, had, do, does, did, will, would, can, could
  quantifiers: number;    // all, some, any, many, much, few, more, most, every
  // Specific high-value markers
  iVsWe: number;          // Ratio of "I" to "we" usage
  butVsAnd: number;       // Ratio of "but" to "and" (indicates argumentative style)
  questionMarks: number;  // Frequency of questions asked
}

// Activity pattern fingerprint
export interface ActivityPattern {
  morningActive: number;  // 6am-12pm activity percentage
  afternoonActive: number; // 12pm-6pm
  eveningActive: number;  // 6pm-12am
  nightActive: number;    // 12am-6am
  burstiness: number;     // How "bursty" vs steady the messaging is (0-1)
  avgSessionLength: number; // Average session length in minutes
}

export interface AltSuspicion {
  player1: string;
  player2: string;
  confidence: number;
  category: "critical" | "high" | "medium" | "low";
  reasons: AltReason[];
  neverOnlineTogether: boolean;
  similarityScore: number;
  scoreBreakdown: ScoreBreakdown; // Detailed breakdown for UI
  humanExplanation: string; // Readable explanation
  sharedRareWords: string[]; // Rare words both use
  handoffScore: number; // Handoff pattern score
}

export interface AltReason {
  type: string;
  description: string;
  weight: number;
  evidence?: string;
}

export interface SimilarityMatrix {
  players: string[];
  scores: number[][];
}

// Micro-patterns for forensic fingerprinting
export interface MicroPatterns {
  lowercaseI: boolean;        // writes "i" instead of "I"
  noCapitalStart: boolean;    // starts sentences without capital
  allLowercase: boolean;      // all lowercase
  excessiveCaps: boolean;     // USES LOTS OF CAPS
  numberSubstitution: boolean; // "2" for "to", "4" for "for"
  doubleSpaces: boolean;      // two spaces  between words
  noSpaceAfterPunct: boolean; // no space after.punctuation
}

// Emoticon style fingerprint
export interface EmoticonStyle {
  usesNose: boolean;      // :-) vs :)
  usesEmoji: boolean;     // Uses unicode emoji
  commonEmotes: string[]; // ["xD", "lol", ":P"]
  emoteFrequency: number; // per 100 messages
}

// Score breakdown per category for UI
export interface ScoreBreakdown {
  temporal: number;
  linguistic: number;
  behavioral: number;
  network: number;
  rareWords: number;
  handoff: number;
  bonus: number;
}

// Punctuation style fingerprint
export interface PunctuationStyle {
  spaceBefore: boolean; // Space before ? or !
  doublePunctuation: boolean; // !! or ??
  ellipsisStyle: string; // ... or .. or ...
  commaSpacing: boolean;
}

// Parsed line result
export interface ParsedLine {
  message: ChatMessage | null;
  dateChange: string | null;
}

// Handoff detection result
export interface HandoffResult {
  score: number;
  handoffCount: number;
  totalTransitions: number;
}

// Wurm topic overlap result
export interface WurmTopicOverlap {
  score: number;
  sharedTopics: string[];
}
