// ============================================================================
// CHAT ANALYZER - BEHAVIORAL ANALYSIS
// ============================================================================

import type { ChatMessage, AdvancedPlayerStats, WurmTopicOverlap } from "./types";
import { STOP_WORDS, TOPIC_WORDS, WURM_TERMS, COMMON_GAMING_WORDS } from "./constants";

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
