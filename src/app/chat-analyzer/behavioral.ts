// ============================================================================
// CHAT ANALYZER - BEHAVIORAL ANALYSIS (v4.1 - Social Insights)
// ============================================================================

import type {
  ChatMessage,
  AdvancedPlayerStats,
  WurmTopicOverlap,
  SocialInsight,
  ConversationPair,
  SlipPattern,
  SelfTalkIndicator
} from "./types";
import { STOP_WORDS, TOPIC_WORDS, WURM_TERMS, COMMON_GAMING_WORDS } from "./constants";
import { cosineSimilarity } from "./utils";

/**
 * Extract topic fingerprint based on topic words
 */
export function extractTopicFingerprint(messages: string[]): Map<string, number> {
  const topics = new Map<string, number>();
  const allText = messages.join(" ").toLowerCase();

  for (const word of TOPIC_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = allText.match(regex);
    if (matches) {
      topics.set(word, matches.length);
    }
  }

  return topics;
}

/**
 * Find who a player responds to
 */
export function findResponsePartners(
  playerName: string,
  messages: ChatMessage[]
): Map<string, number> {
  const partners = new Map<string, number>();

  for (let i = 1; i < messages.length; i++) {
    if (messages[i].player === playerName) {
      // Look at previous message(s) within 60 seconds
      for (let j = i - 1; j >= 0 && j >= i - 5; j--) {
        const timeDiff = messages[i].timeSeconds - messages[j].timeSeconds;
        if (timeDiff > 0 && timeDiff < 60 && messages[j].player !== playerName) {
          const partner = messages[j].player;
          partners.set(partner, (partners.get(partner) || 0) + 1);
          break;
        }
      }
    }
  }

  return partners;
}

/**
 * Find mentioned players
 */
export function findMentionedPlayers(messages: string[], allPlayers: string[]): Set<string> {
  const mentioned = new Set<string>();
  const allText = messages.join(" ").toLowerCase();

  for (const player of allPlayers) {
    if (allText.includes(player.toLowerCase())) {
      mentioned.add(player);
    }
  }

  return mentioned;
}

/**
 * Extract common words from messages
 */
export function extractCommonWords(messages: string[]): string[] {
  const wordCounts: Record<string, number> = {};

  for (const msg of messages) {
    const words = msg.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      const clean = word.replace(/[^a-z]/g, "");
      if (clean && !STOP_WORDS.has(clean)) {
        wordCounts[clean] = (wordCounts[clean] || 0) + 1;
      }
    }
  }

  return Object.entries(wordCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word);
}

/**
 * Extract common phrases from messages
 */
export function extractCommonPhrases(messages: string[]): string[] {
  const phraseCounts: Record<string, number> = {};

  for (const msg of messages) {
    const words = msg.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const phrase2 = `${words[i]} ${words[i + 1]}`;
      if (phrase2.length > 5) {
        phraseCounts[phrase2] = (phraseCounts[phrase2] || 0) + 1;
      }
      if (i < words.length - 2) {
        const phrase3 = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        phraseCounts[phrase3] = (phraseCounts[phrase3] || 0) + 1;
      }
    }
  }

  return Object.entries(phraseCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([phrase]) => phrase);
}

/**
 * Extract Wurm-specific topics
 */
export function extractWurmTopics(messages: string[]): Map<string, number> {
  const topics = new Map<string, number>();
  const allText = messages.join(" ").toLowerCase();

  for (const term of WURM_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, "gi");
    const matches = allText.match(regex);
    if (matches) {
      topics.set(term, matches.length);
    }
  }

  return topics;
}

/**
 * Detect Wurm topic overlap between two players
 */
export function detectWurmTopicOverlap(p1: AdvancedPlayerStats, p2: AdvancedPlayerStats): WurmTopicOverlap {
  const sharedTopics: string[] = [];

  for (const [topic, count1] of p1.wurmTopics) {
    const count2 = p2.wurmTopics.get(topic);
    if (count2 && count2 > 0) {
      // Both use this Wurm term
      sharedTopics.push(topic);
    }
  }

  // Score based on shared unique topics (excluding very common ones)
  const commonTopics = new Set(["deed", "village", "priest", "skill", "mine"]);
  const uniqueShared = sharedTopics.filter(t => !commonTopics.has(t));

  let score = 0;
  if (uniqueShared.length >= 5) score = 15;
  else if (uniqueShared.length >= 3) score = 10;
  else if (uniqueShared.length >= 1) score = 5;

  return { score, sharedTopics };
}

/**
 * Build rare word index across all players
 */
export function buildRareWordIndex(allStats: AdvancedPlayerStats[]): Map<string, Set<string>> {
  const wordToPlayers = new Map<string, Set<string>>();

  for (const stats of allStats) {
    const allText = stats.allMessages.join(" ").toLowerCase();
    const words = allText.split(/\s+/)
      .map(w => w.replace(/[^a-z]/g, ""))
      .filter(w => w.length > 3);

    const uniqueWords = new Set(words);
    for (const word of uniqueWords) {
      if (!wordToPlayers.has(word)) {
        wordToPlayers.set(word, new Set());
      }
      wordToPlayers.get(word)!.add(stats.name);
    }
  }

  return wordToPlayers;
}

/**
 * Detect shared rare words between two players
 */
export function detectSharedRareWords(
  p1: AdvancedPlayerStats,
  p2: AdvancedPlayerStats,
  rareIndex: Map<string, Set<string>>,
  totalPlayers: number
): string[] {
  const p1Text = p1.allMessages.join(" ").toLowerCase();
  const p2Text = p2.allMessages.join(" ").toLowerCase();

  // Require longer words (5+ chars) to filter out common short words
  const p1Words = new Set(
    p1Text.split(/\s+/)
      .map(w => w.replace(/[^a-z]/g, ""))
      .filter(w => w.length >= 5 && !COMMON_GAMING_WORDS.has(w))
  );

  const p2Words = new Set(
    p2Text.split(/\s+/)
      .map(w => w.replace(/[^a-z]/g, ""))
      .filter(w => w.length >= 5 && !COMMON_GAMING_WORDS.has(w))
  );

  const sharedRare: string[] = [];
  // STRICT: Only words used by exactly 1-2 people are truly rare
  const rareThreshold = 2;

  for (const word of p1Words) {
    if (p2Words.has(word)) {
      const usageCount = rareIndex.get(word)?.size || 0;
      // Must be used by only these 2 players (or just 1 in the index due to timing)
      if (usageCount > 0 && usageCount <= rareThreshold) {
        sharedRare.push(word);
      }
    }
  }

  // Sort by rarity (fewer users = more rare)
  return sharedRare.sort((a, b) => {
    const aCount = rareIndex.get(a)?.size || 0;
    const bCount = rareIndex.get(b)?.size || 0;
    return aCount - bCount;
  }).slice(0, 10);
}

// ============================================================================
// SOCIAL ANALYSIS FUNCTIONS (v4.1)
// ============================================================================

/**
 * Analyze conversation pairs - who talks to who
 * Returns detailed interaction data for each pair
 */
export function analyzeConversationPairs(
  stats: AdvancedPlayerStats[],
  messages: ChatMessage[]
): ConversationPair[] {
  const pairs: ConversationPair[] = [];

  for (let i = 0; i < stats.length; i++) {
    for (let j = i + 1; j < stats.length; j++) {
      const p1 = stats[i];
      const p2 = stats[j];

      // Count how many times they respond to each other
      const p1ToP2 = p1.responsePartners.get(p2.name) || 0;
      const p2ToP1 = p2.responsePartners.get(p1.name) || 0;

      // Check if they mention each other
      const p1MentionsP2 = p1.mentionedPlayers.has(p2.name);
      const p2MentionsP1 = p2.mentionedPlayers.has(p1.name);

      // Calculate time they're both online
      const overlap = new Set([...p1.activeMinutes].filter(m => p2.activeMinutes.has(m)));
      const onlineTogetherMinutes = overlap.size;

      // Calculate stylistic similarity using n-grams
      const stylisticSimilarity = cosineSimilarity(p1.charNgrams, p2.charNgrams);

      // Key insight: are they both active but NOT interacting?
      const bothActiveButNoInteraction =
        onlineTogetherMinutes >= 30 && // Both online for 30+ overlapping minutes
        p1ToP2 === 0 && p2ToP1 === 0 && // Never respond to each other
        !p1MentionsP2 && !p2MentionsP1 && // Never mention each other
        p1.messageCount >= 20 && p2.messageCount >= 20; // Both actively chatting

      pairs.push({
        player1: p1.name,
        player2: p2.name,
        p1ToP2Count: p1ToP2,
        p2ToP1Count: p2ToP1,
        totalInteractions: p1ToP2 + p2ToP1 + (p1MentionsP2 ? 1 : 0) + (p2MentionsP1 ? 1 : 0),
        stylisticSimilarity,
        onlineTogetherMinutes,
        bothActiveButNoInteraction,
      });
    }
  }

  return pairs;
}

/**
 * Detect self-talk patterns - accounts talking to each other with same writing style
 * This is VERY suspicious: real friends have DIFFERENT writing styles
 */
export function detectSelfTalk(
  stats: AdvancedPlayerStats[],
  messages: ChatMessage[]
): SelfTalkIndicator[] {
  const indicators: SelfTalkIndicator[] = [];
  const STYLE_THRESHOLD = 0.92; // Very high similarity = suspicious

  for (let i = 0; i < stats.length; i++) {
    for (let j = i + 1; j < stats.length; j++) {
      const p1 = stats[i];
      const p2 = stats[j];

      // Do they interact with each other?
      const p1ToP2 = p1.responsePartners.get(p2.name) || 0;
      const p2ToP1 = p2.responsePartners.get(p1.name) || 0;
      const p1MentionsP2 = p1.mentionedPlayers.has(p2.name);
      const p2MentionsP1 = p2.mentionedPlayers.has(p1.name);

      const talkToEachOther = p1ToP2 >= 3 || p2ToP1 >= 3 || (p1MentionsP2 && p2MentionsP1);

      if (!talkToEachOther) continue;

      // Calculate writing style similarity
      const ngramSim = cosineSimilarity(p1.charNgrams, p2.charNgrams);

      // Check function word similarity (unconscious patterns)
      const functionWordSim = compareFunctionWordSimilarity(p1, p2);

      // Check for matching typos (people slip up!)
      const sharedTypos = p1.typoPatterns.filter(t => p2.typoPatterns.includes(t));

      // Check micro-pattern matches
      const microMatches = countMicroPatternMatches(p1, p2);

      const sameWritingStyle = ngramSim >= STYLE_THRESHOLD ||
        (functionWordSim >= 0.90 && ngramSim >= 0.88) ||
        (sharedTypos.length >= 3) ||
        (microMatches >= 3 && ngramSim >= 0.85);

      if (sameWritingStyle) {
        let suspicionScore = 0;
        const reasons: string[] = [];

        if (ngramSim >= STYLE_THRESHOLD) {
          suspicionScore += 40;
          reasons.push(`Identical character patterns (${Math.round(ngramSim * 100)}%)`);
        }
        if (functionWordSim >= 0.90) {
          suspicionScore += 30;
          reasons.push(`Same unconscious word usage (${Math.round(functionWordSim * 100)}%)`);
        }
        if (sharedTypos.length >= 2) {
          suspicionScore += 25;
          reasons.push(`Same typos: ${sharedTypos.join(", ")}`);
        }
        if (microMatches >= 2) {
          suspicionScore += 15;
          reasons.push(`${microMatches} identical typing quirks`);
        }

        // BONUS: talking to each other + same style = VERY suspicious
        if (p1ToP2 >= 5 && p2ToP1 >= 5) {
          suspicionScore += 20;
          reasons.push(`Active conversation (${p1ToP2 + p2ToP1} exchanges)`);
        }

        indicators.push({
          player1: p1.name,
          player2: p2.name,
          talkToEachOther,
          sameWritingStyle,
          suspicionScore,
          reasoning: reasons.join(" | "),
        });
      }
    }
  }

  return indicators.sort((a, b) => b.suspicionScore - a.suspicionScore);
}

/**
 * Detect potential conflicts - players online together but ignoring each other
 */
export function detectConflicts(
  stats: AdvancedPlayerStats[],
  messages: ChatMessage[]
): SocialInsight[] {
  const insights: SocialInsight[] = [];
  const pairs = analyzeConversationPairs(stats, messages);

  for (const pair of pairs) {
    if (pair.bothActiveButNoInteraction) {
      // Find how much they talk to OTHERS
      const p1Stats = stats.find(s => s.name === pair.player1)!;
      const p2Stats = stats.find(s => s.name === pair.player2)!;

      const p1TotalResponses = [...p1Stats.responsePartners.values()].reduce((a, b) => a + b, 0);
      const p2TotalResponses = [...p2Stats.responsePartners.values()].reduce((a, b) => a + b, 0);

      // If they respond to others but not each other = possible conflict
      if (p1TotalResponses >= 10 && p2TotalResponses >= 10) {
        insights.push({
          player1: pair.player1,
          player2: pair.player2,
          insightType: "conflict_detected",
          confidence: Math.min(85, 50 + pair.onlineTogetherMinutes / 2),
          description: `${pair.player1} and ${pair.player2} are both active but never interact`,
          evidence: [
            `Online together: ${pair.onlineTogetherMinutes} minutes`,
            `${pair.player1} responds to ${p1Stats.responsePartners.size} other players`,
            `${pair.player2} responds to ${p2Stats.responsePartners.size} other players`,
            `Zero interactions between them`,
          ],
        });
      }
    }
  }

  return insights;
}

/**
 * Detect "slips" - inconsistent typing patterns within one account
 * Someone pretending to be different may "slip" back to their real style
 */
export function detectSlips(
  stats: AdvancedPlayerStats[],
  messages: ChatMessage[]
): SlipPattern[] {
  const slips: SlipPattern[] = [];

  for (const player of stats) {
    if (player.messageCount < 30) continue;

    const playerMessages = messages.filter(m => m.player === player.name);

    // Split messages into time windows and analyze style consistency
    const earlyMsgs = playerMessages.slice(0, Math.floor(playerMessages.length / 3));
    const midMsgs = playerMessages.slice(
      Math.floor(playerMessages.length / 3),
      Math.floor(2 * playerMessages.length / 3)
    );
    const lateMsgs = playerMessages.slice(Math.floor(2 * playerMessages.length / 3));

    // Check for capitalization inconsistency
    const earlyLowercase = countLowercaseRatio(earlyMsgs.map(m => m.message));
    const midLowercase = countLowercaseRatio(midMsgs.map(m => m.message));
    const lateLowercase = countLowercaseRatio(lateMsgs.map(m => m.message));

    const capsVariation = Math.max(
      Math.abs(earlyLowercase - midLowercase),
      Math.abs(midLowercase - lateLowercase),
      Math.abs(earlyLowercase - lateLowercase)
    );

    if (capsVariation > 0.3) {
      slips.push({
        playerName: player.name,
        slipType: "style_shift",
        description: "Capitalization style changes significantly during the session",
        evidence: [
          `Early: ${Math.round(earlyLowercase * 100)}% lowercase`,
          `Mid: ${Math.round(midLowercase * 100)}% lowercase`,
          `Late: ${Math.round(lateLowercase * 100)}% lowercase`,
        ],
        suspicionLevel: capsVariation > 0.5 ? "high" : "medium",
      });
    }

    // Check for typo inconsistency (typos appear/disappear)
    const earlyTypos = detectTyposInMessages(earlyMsgs.map(m => m.message));
    const lateTypos = detectTyposInMessages(lateMsgs.map(m => m.message));

    // Typos that appear in one part but not the other
    const inconsistentTypos = [
      ...earlyTypos.filter(t => !lateTypos.includes(t)),
      ...lateTypos.filter(t => !earlyTypos.includes(t)),
    ];

    if (inconsistentTypos.length >= 3) {
      slips.push({
        playerName: player.name,
        slipType: "typo_inconsistency",
        description: "Typo patterns change during session (possible character switch)",
        evidence: [
          `Early typos: ${earlyTypos.join(", ") || "none"}`,
          `Late typos: ${lateTypos.join(", ") || "none"}`,
          `Inconsistent: ${inconsistentTypos.join(", ")}`,
        ],
        suspicionLevel: inconsistentTypos.length >= 5 ? "high" : "medium",
      });
    }
  }

  return slips;
}

/**
 * Generate social insights combining all analysis
 */
export function generateSocialInsights(
  stats: AdvancedPlayerStats[],
  messages: ChatMessage[]
): SocialInsight[] {
  const insights: SocialInsight[] = [];

  // Add conflict detection
  insights.push(...detectConflicts(stats, messages));

  // Add self-talk detection as insights
  const selfTalkIndicators = detectSelfTalk(stats, messages);
  for (const indicator of selfTalkIndicators) {
    if (indicator.suspicionScore >= 50) {
      insights.push({
        player1: indicator.player1,
        player2: indicator.player2,
        insightType: "self_talk_suspected",
        confidence: Math.min(95, indicator.suspicionScore),
        description: `${indicator.player1} and ${indicator.player2} talk to each other but write identically`,
        evidence: indicator.reasoning.split(" | "),
      });
    }
  }

  return insights.sort((a, b) => b.confidence - a.confidence);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function compareFunctionWordSimilarity(p1: AdvancedPlayerStats, p2: AdvancedPlayerStats): number {
  const f1 = p1.functionWords;
  const f2 = p2.functionWords;

  const diffs = [
    Math.abs(f1.articles - f2.articles),
    Math.abs(f1.pronouns - f2.pronouns),
    Math.abs(f1.prepositions - f2.prepositions),
    Math.abs(f1.conjunctions - f2.conjunctions),
    Math.abs(f1.auxiliaries - f2.auxiliaries),
    Math.abs(f1.quantifiers - f2.quantifiers),
  ];

  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return 1 - avgDiff; // Higher = more similar
}

function countMicroPatternMatches(p1: AdvancedPlayerStats, p2: AdvancedPlayerStats): number {
  let matches = 0;
  const m1 = p1.microPatterns;
  const m2 = p2.microPatterns;

  if (m1.lowercaseI && m2.lowercaseI) matches++;
  if (m1.noCapitalStart && m2.noCapitalStart) matches++;
  if (m1.allLowercase && m2.allLowercase) matches++;
  if (m1.excessiveCaps && m2.excessiveCaps) matches++;
  if (m1.numberSubstitution && m2.numberSubstitution) matches++;
  if (m1.doubleSpaces && m2.doubleSpaces) matches++;
  if (m1.noSpaceAfterPunct && m2.noSpaceAfterPunct) matches++;

  return matches;
}

function countLowercaseRatio(messages: string[]): number {
  if (messages.length === 0) return 0;

  let lowercase = 0;
  let total = 0;

  for (const msg of messages) {
    for (const char of msg) {
      if (/[a-zA-Z]/.test(char)) {
        total++;
        if (char === char.toLowerCase()) lowercase++;
      }
    }
  }

  return total > 0 ? lowercase / total : 0;
}

function detectTyposInMessages(messages: string[]): string[] {
  const COMMON_TYPOS = [
    "teh", "hte", "taht", "waht", "jsut", "dont", "wont", "cant",
    "didnt", "doesnt", "im", "ive", "youre", "theyre", "its",
    "alot", "untill", "recieve", "definately", "occured",
  ];

  const found: string[] = [];
  const text = messages.join(" ").toLowerCase();

  for (const typo of COMMON_TYPOS) {
    if (text.includes(typo)) {
      found.push(typo);
    }
  }

  return found;
}
