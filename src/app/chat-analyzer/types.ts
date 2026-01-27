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

  // Linguistic fingerprint
  charNgrams: Map<string, number>; // Character trigrams
  typoPatterns: string[]; // Common misspellings
  punctuationStyle: PunctuationStyle;
  letterSubstitutions: Map<string, number>; // u->you, r->are, etc.
  microPatterns: MicroPatterns; // Detailed micro-patterns
  emoticonStyle: EmoticonStyle; // Emoticon fingerprint

  // Statistical stylometry
  vocabularyRichness: number; // Unique words / total words (TTR)
  hapaxRatio: number; // Words used only once / total unique
  yulesK: number; // Yule's characteristic K
  avgWordLength: number;
  wordLengthDistribution: number[]; // Distribution of word lengths 1-15+
  sentencePatterns: string[]; // Common sentence structures

  // Behavioral
  commonWords: string[];
  commonPhrases: string[];
  commonStarters: string[];
  responsePartners: Map<string, number>; // Who they respond to most
  mentionedPlayers: Set<string>; // Players they mention
  topicFingerprint: Map<string, number>; // Topic word frequencies
  wurmTopics: Map<string, number>; // Wurm-specific topic usage

  // Raw data for comparison
  allMessages: string[];
  messageTimes: number[];
  absoluteTimes: number[]; // For handoff detection
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
