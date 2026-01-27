// ============================================================================
// CHAT ANALYZER - MODULE EXPORTS
// ============================================================================

// Types
export type {
  ChatMessage,
  AdvancedPlayerStats,
  AltSuspicion,
  AltReason,
  SimilarityMatrix,
  MicroPatterns,
  EmoticonStyle,
  ScoreBreakdown,
  PunctuationStyle,
  ParsedLine,
  HandoffResult,
  WurmTopicOverlap,
} from "./types";

// Constants
export {
  STOP_WORDS,
  COMMON_GAMING_WORDS,
  WURM_TERMS,
  WURM_COMMON_RESPONSES,
  TOPIC_WORDS,
  TYPO_CHECKS,
  LETTER_SUBSTITUTION_PATTERNS,
  EMOTE_PATTERNS,
} from "./constants";

// Utilities
export { getPlayerColor, cosineSimilarity, distributionSimilarity } from "./utils";

// Parser
export { parseTimeToSeconds, parseDateFromLine, parseChatLine, parseChat, parseMultipleChats } from "./parser";

// Linguistic analysis
export {
  extractCharNgrams,
  calculateYulesK,
  detectTypoPatterns,
  detectLetterSubstitutions,
  analyzePunctuationStyle,
  calculateWordLengthDistribution,
  detectMicroPatterns,
  detectEmoticonStyle,
} from "./linguistic";

// Behavioral analysis
export {
  extractTopicFingerprint,
  findResponsePartners,
  findMentionedPlayers,
  extractCommonWords,
  extractCommonPhrases,
  extractWurmTopics,
  detectWurmTopicOverlap,
  buildRareWordIndex,
  detectSharedRareWords,
} from "./behavioral";

// Player analysis
export { analyzePlayerAdvanced, generateHumanExplanation } from "./playerAnalysis";

// Alt detection
export { detectHandoffPattern, detectAltsAdvanced } from "./altDetection";
