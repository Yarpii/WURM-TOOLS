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
  // NEW types
  FunctionWordProfile,
  ActivityPattern,
  // v4.1 Social Analysis types
  SocialInsight,
  ConversationPair,
  SlipPattern,
  SelfTalkIndicator,
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
  // Algorithm modes
  ALGORITHM_CONFIGS,
  type AlgorithmMode,
  type AlgorithmConfig,
} from "./constants";

// Utilities
export { getPlayerColor, cosineSimilarity, distributionSimilarity } from "./utils";

// Parser
export { parseTimeToSeconds, parseDateFromLine, parseChatLine, parseChat, parseMultipleChats, isSystemPlayer } from "./parser";

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
  // NEW exports
  extractWordBigrams,
  analyzeFunctionWords,
  calculateSimpsonsD,
  calculateBrunetsW,
  analyzePunctuationFrequency,
  calculateMessageLengthDistribution,
  analyzeActivityPattern,
  detectGreetingStyle,
  detectFarewellStyle,
  extractCommonEnders,
  compareFunctionWordProfiles,
  compareActivityPatterns,
  compareWordBigrams,
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
  // v4.1 Social Analysis
  analyzeConversationPairs,
  detectSelfTalk,
  detectConflicts,
  detectSlips,
  generateSocialInsights,
} from "./behavioral";

// Player analysis
export { analyzePlayerAdvanced, generateHumanExplanation } from "./playerAnalysis";

// Alt detection
export { detectHandoffPattern, detectAltsAdvanced } from "./altDetection";
