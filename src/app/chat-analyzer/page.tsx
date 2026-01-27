"use client";

import { useState, useCallback, useMemo } from "react";

// ============================================================================
// TYPES
// ============================================================================

interface ChatMessage {
  timestamp: string;
  player: string;
  message: string;
  lineNumber: number;
  timeSeconds: number; // Seconds since midnight for temporal analysis
  dayIndex: number; // Which day (0, 1, 2, ...) for multi-day analysis
  absoluteTime: number; // Absolute time for handoff detection (dayIndex * 86400 + timeSeconds)
}

interface AdvancedPlayerStats {
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
  punctuationStyle: {
    spaceBefore: boolean; // Space before ? or !
    doublePunctuation: boolean; // !! or ??
    ellipsisStyle: string; // ... or .. or …
    commaSpacing: boolean;
  };
  letterSubstitutions: Map<string, number>; // u->you, r->are, etc.
  microPatterns: MicroPatterns; // Fase 2: detailed micro-patterns
  emoticonStyle: EmoticonStyle; // Fase 2: emoticon fingerprint

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

interface AltSuspicion {
  player1: string;
  player2: string;
  confidence: number;
  category: "critical" | "high" | "medium" | "low";
  reasons: AltReason[];
  neverOnlineTogether: boolean;
  similarityScore: number;
  scoreBreakdown: ScoreBreakdown; // Fase 4: detailed breakdown for UI
  humanExplanation: string; // Fase 5: readable explanation
  sharedRareWords: string[]; // Fase 2: rare words both use
  handoffScore: number; // Fase 1: handoff pattern score
}

interface AltReason {
  type: string;
  description: string;
  weight: number;
  evidence?: string;
}

interface SimilarityMatrix {
  players: string[];
  scores: number[][];
}

// Micro-patterns for forensic fingerprinting (Fase 2)
interface MicroPatterns {
  lowercaseI: boolean;        // schrijft "i" ipv "I"
  noCapitalStart: boolean;    // begint zinnen zonder hoofdletter
  allLowercase: boolean;      // alles lowercase
  excessiveCaps: boolean;     // VEEL CAPS GEBRUIKEN
  numberSubstitution: boolean; // "2" voor "to", "4" voor "for"
  doubleSpaces: boolean;      // twee spaties  tussen woorden
  noSpaceAfterPunct: boolean; // geen spatie na.punt
}

// Emoticon style fingerprint (Fase 2)
interface EmoticonStyle {
  usesNose: boolean;      // :-) vs :)
  usesEmoji: boolean;     // 😊
  commonEmotes: string[]; // ["xD", "lol", ":P"]
  emoteFrequency: number; // per 100 berichten
}

// Score breakdown per category for UI
interface ScoreBreakdown {
  temporal: number;
  linguistic: number;
  behavioral: number;
  network: number;
  rareWords: number;
  handoff: number;
  bonus: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getPlayerColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 65%)`;
}

function parseTimeToSeconds(timestamp: string): number {
  const [h, m, s] = timestamp.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

// Parse date from various formats
function parseDateFromLine(line: string): string | null {
  // Format 1: [2024-01-15 21:25:05] <Player> message
  const fullMatch = line.match(/^\[(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}:\d{2}\]/);
  if (fullMatch) return fullMatch[1];

  // Format 2: --- Day changed to 2024-01-15 ---
  const dayChangeMatch = line.match(/---\s*Day changed to (\d{4}-\d{2}-\d{2})\s*---/i);
  if (dayChangeMatch) return dayChangeMatch[1];

  return null;
}

interface ParsedLine {
  message: ChatMessage | null;
  dateChange: string | null;
}

function parseChatLine(line: string, lineNumber: number, currentDayIndex: number): ParsedLine {
  // Check for date change marker
  const dateChange = parseDateFromLine(line);
  if (dateChange && line.includes("Day changed")) {
    return { message: null, dateChange };
  }

  // Format 1: [2024-01-15 21:25:05] <Player> message (with date)
  const fullMatch = line.match(/^\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\]\s*<([^>]+)>\s*(.*)$/);
  if (fullMatch) {
    const timeSeconds = parseTimeToSeconds(fullMatch[2]);
    return {
      message: {
        timestamp: fullMatch[2],
        player: fullMatch[3],
        message: fullMatch[4],
        lineNumber,
        timeSeconds,
        dayIndex: currentDayIndex,
        absoluteTime: currentDayIndex * 86400 + timeSeconds,
      },
      dateChange: fullMatch[1],
    };
  }

  // Format 2: [21:25:05] <Player> message (time only)
  const timeMatch = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*<([^>]+)>\s*(.*)$/);
  if (timeMatch) {
    const timeSeconds = parseTimeToSeconds(timeMatch[1]);
    return {
      message: {
        timestamp: timeMatch[1],
        player: timeMatch[2],
        message: timeMatch[3],
        lineNumber,
        timeSeconds,
        dayIndex: currentDayIndex,
        absoluteTime: currentDayIndex * 86400 + timeSeconds,
      },
      dateChange: null,
    };
  }

  return { message: null, dateChange: null };
}

// ============================================================================
// ADVANCED ANALYSIS FUNCTIONS
// ============================================================================

// Character n-gram extraction (forensic linguistics technique)
function extractCharNgrams(text: string, n: number = 3): Map<string, number> {
  const ngrams = new Map<string, number>();
  const cleaned = text.toLowerCase().replace(/\s+/g, " ");

  for (let i = 0; i <= cleaned.length - n; i++) {
    const gram = cleaned.substring(i, i + n);
    ngrams.set(gram, (ngrams.get(gram) || 0) + 1);
  }

  return ngrams;
}

// Yule's K - measures vocabulary consistency (stylometry)
function calculateYulesK(words: string[]): number {
  if (words.length === 0) return 0;

  const freqMap = new Map<string, number>();
  for (const word of words) {
    const w = word.toLowerCase();
    freqMap.set(w, (freqMap.get(w) || 0) + 1);
  }

  // Count frequency of frequencies
  const freqOfFreq = new Map<number, number>();
  for (const count of freqMap.values()) {
    freqOfFreq.set(count, (freqOfFreq.get(count) || 0) + 1);
  }

  // Calculate M1 and M2
  const N = words.length;
  let M1 = 0;
  let M2 = 0;

  for (const [freq, count] of freqOfFreq) {
    M1 += count;
    M2 += count * freq * freq;
  }

  if (M1 === 0) return 0;

  // Yule's K = 10^4 * (M2 - M1) / (M1 * M1)
  const K = 10000 * (M2 - M1) / (M1 * M1);
  return Math.round(K * 100) / 100;
}

// Detect common typo patterns
function detectTypoPatterns(messages: string[]): string[] {
  const typoPatterns: string[] = [];
  const allText = messages.join(" ").toLowerCase();

  // Common typo indicators
  const typoChecks = [
    { pattern: /\bteh\b/g, label: "teh→the" },
    { pattern: /\bthier\b/g, label: "thier→their" },
    { pattern: /\byuo\b/g, label: "yuo→you" },
    { pattern: /\bwaht\b/g, label: "waht→what" },
    { pattern: /\btaht\b/g, label: "taht→that" },
    { pattern: /\bhte\b/g, label: "hte→the" },
    { pattern: /\bwith\b/g, label: "wiht→with" },
    { pattern: /\balot\b/g, label: "alot" },
    { pattern: /\bdefinately\b/g, label: "definately" },
    { pattern: /\brecieve\b/g, label: "recieve" },
    { pattern: /\boccured\b/g, label: "occured" },
    { pattern: /\buntill\b/g, label: "untill" },
    { pattern: /\bwich\b/g, label: "wich→which" },
    { pattern: /\bbeacuse\b/g, label: "beacuse" },
    { pattern: /\bfreind\b/g, label: "freind" },
    { pattern: /\bgoverment\b/g, label: "goverment" },
    { pattern: /\bgrammer\b/g, label: "grammer" },
    // Double letters
    { pattern: /([a-z])\1{2,}/g, label: "triple-letters" },
  ];

  for (const check of typoChecks) {
    if (check.pattern.test(allText)) {
      typoPatterns.push(check.label);
    }
  }

  return typoPatterns;
}

// Detect letter substitution patterns (txtspk)
function detectLetterSubstitutions(messages: string[]): Map<string, number> {
  const subs = new Map<string, number>();
  const allText = messages.join(" ").toLowerCase();

  const patterns = [
    { pattern: /\bu\b/g, label: "u→you" },
    { pattern: /\br\b/g, label: "r→are" },
    { pattern: /\bur\b/g, label: "ur→your" },
    { pattern: /\by\b/g, label: "y→why" },
    { pattern: /\bk\b/g, label: "k→ok" },
    { pattern: /\bb4\b/g, label: "b4→before" },
    { pattern: /\b2\b(?!\d)/g, label: "2→to/too" },
    { pattern: /\b4\b(?!\d)/g, label: "4→for" },
    { pattern: /\bcuz\b/g, label: "cuz→because" },
    { pattern: /\bplz\b/g, label: "plz→please" },
    { pattern: /\bthx\b/g, label: "thx→thanks" },
    { pattern: /\bppl\b/g, label: "ppl→people" },
    { pattern: /\brn\b/g, label: "rn→right now" },
    { pattern: /\bidk\b/g, label: "idk" },
    { pattern: /\bimo\b/g, label: "imo" },
    { pattern: /\btbh\b/g, label: "tbh" },
    { pattern: /\bngl\b/g, label: "ngl" },
  ];

  for (const p of patterns) {
    const matches = allText.match(p.pattern);
    if (matches && matches.length > 0) {
      subs.set(p.label, matches.length);
    }
  }

  return subs;
}

// Analyze punctuation style (forensic fingerprint)
function analyzePunctuationStyle(messages: string[]): {
  spaceBefore: boolean;
  doublePunctuation: boolean;
  ellipsisStyle: string;
  commaSpacing: boolean;
} {
  const allText = messages.join(" ");

  return {
    spaceBefore: / [?!]/.test(allText),
    doublePunctuation: /[?!]{2,}/.test(allText),
    ellipsisStyle: /\.{3,}/.test(allText) ? "dots" : /…/.test(allText) ? "unicode" : "none",
    commaSpacing: /\s,/.test(allText), // Space before comma (unusual)
  };
}

// Extract topic fingerprint
function extractTopicFingerprint(messages: string[]): Map<string, number> {
  const topics = new Map<string, number>();
  const allText = messages.join(" ").toLowerCase();

  // Wurm-specific topic words
  const topicWords = [
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

  for (const word of topicWords) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = allText.match(regex);
    if (matches) {
      topics.set(word, matches.length);
    }
  }

  return topics;
}

// Calculate word length distribution
function calculateWordLengthDistribution(words: string[]): number[] {
  const dist = new Array(16).fill(0); // 0-14, 15+

  for (const word of words) {
    const len = Math.min(word.length, 15);
    dist[len]++;
  }

  // Normalize
  const total = words.length || 1;
  return dist.map(c => Math.round((c / total) * 1000) / 1000);
}

// Find who a player responds to
function findResponsePartners(
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

// Find mentioned players
function findMentionedPlayers(messages: string[], allPlayers: string[]): Set<string> {
  const mentioned = new Set<string>();
  const allText = messages.join(" ").toLowerCase();

  for (const player of allPlayers) {
    if (allText.includes(player.toLowerCase())) {
      mentioned.add(player);
    }
  }

  return mentioned;
}

// ============================================================================
// FASE 2: MICRO-PATTERNS DETECTION
// ============================================================================

function detectMicroPatterns(messages: string[]): MicroPatterns {
  let lowercaseICount = 0;
  let noCapitalStartCount = 0;
  let allLowercaseCount = 0;
  let excessiveCapsCount = 0;
  let numberSubCount = 0;
  let doubleSpaceCount = 0;
  let noSpaceAfterPunctCount = 0;

  for (const msg of messages) {
    // Lowercase "i" instead of "I"
    if (/\bi\b/.test(msg) && !/\bI\b/.test(msg)) {
      lowercaseICount++;
    }

    // No capital at start
    if (msg.length > 0 && msg[0] === msg[0].toLowerCase() && /^[a-z]/.test(msg)) {
      noCapitalStartCount++;
    }

    // All lowercase message
    if (msg === msg.toLowerCase() && /[a-z]/.test(msg)) {
      allLowercaseCount++;
    }

    // Excessive caps (>50% uppercase letters)
    const letters = msg.replace(/[^a-zA-Z]/g, "");
    const upperCount = (msg.match(/[A-Z]/g) || []).length;
    if (letters.length > 5 && upperCount / letters.length > 0.5) {
      excessiveCapsCount++;
    }

    // Number substitutions (2 for to, 4 for for)
    if (/\b2\b|\b4\b|\b2day\b|\b4ever\b|\bb4\b|\bl8r\b|\bgr8\b/.test(msg.toLowerCase())) {
      numberSubCount++;
    }

    // Double spaces
    if (/  /.test(msg)) {
      doubleSpaceCount++;
    }

    // No space after punctuation
    if (/[.!?,][a-zA-Z]/.test(msg)) {
      noSpaceAfterPunctCount++;
    }
  }

  const threshold = Math.max(3, messages.length * 0.1);

  return {
    lowercaseI: lowercaseICount >= threshold,
    noCapitalStart: noCapitalStartCount >= messages.length * 0.5,
    allLowercase: allLowercaseCount >= messages.length * 0.7,
    excessiveCaps: excessiveCapsCount >= threshold,
    numberSubstitution: numberSubCount >= threshold,
    doubleSpaces: doubleSpaceCount >= threshold,
    noSpaceAfterPunct: noSpaceAfterPunctCount >= threshold,
  };
}

// ============================================================================
// FASE 2: EMOTICON/EMOJI FINGERPRINT
// ============================================================================

function detectEmoticonStyle(messages: string[]): EmoticonStyle {
  const allText = messages.join(" ");

  // Check for nose in emoticons
  const noseEmotes = (allText.match(/:-[)(/\\|DPp]/g) || []).length;
  const noNoseEmotes = (allText.match(/(?<!:):[)(/\\|DPp]/g) || []).length;

  // Check for unicode emoji
  const emojiCount = (allText.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;

  // Common emotes tracking
  const emotePatterns = [
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

  const foundEmotes: string[] = [];
  let totalEmoteCount = 0;

  for (const ep of emotePatterns) {
    const matches = allText.match(ep.pattern);
    if (matches && matches.length > 0) {
      foundEmotes.push(ep.name);
      totalEmoteCount += matches.length;
    }
  }

  return {
    usesNose: noseEmotes > noNoseEmotes && noseEmotes >= 2,
    usesEmoji: emojiCount >= 3,
    commonEmotes: foundEmotes.slice(0, 5),
    emoteFrequency: messages.length > 0 ? Math.round((totalEmoteCount / messages.length) * 100) : 0,
  };
}

// ============================================================================
// FASE 2: RARE WORD FINGERPRINT
// ============================================================================

function buildRareWordIndex(allStats: AdvancedPlayerStats[]): Map<string, Set<string>> {
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

function detectSharedRareWords(
  p1: AdvancedPlayerStats,
  p2: AdvancedPlayerStats,
  rareIndex: Map<string, Set<string>>,
  totalPlayers: number
): string[] {
  const p1Text = p1.allMessages.join(" ").toLowerCase();
  const p2Text = p2.allMessages.join(" ").toLowerCase();

  const p1Words = new Set(
    p1Text.split(/\s+/)
      .map(w => w.replace(/[^a-z]/g, ""))
      .filter(w => w.length > 3)
  );

  const p2Words = new Set(
    p2Text.split(/\s+/)
      .map(w => w.replace(/[^a-z]/g, ""))
      .filter(w => w.length > 3)
  );

  const sharedRare: string[] = [];
  const rareThreshold = Math.max(2, Math.floor(totalPlayers * 0.1)); // <10% of players

  for (const word of p1Words) {
    if (p2Words.has(word)) {
      const usageCount = rareIndex.get(word)?.size || 0;
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
// FASE 1: HANDOFF/SEQUENCE ANALYSIS
// ============================================================================

function detectHandoffPattern(
  p1: AdvancedPlayerStats,
  p2: AdvancedPlayerStats,
  messages: ChatMessage[]
): { score: number; handoffCount: number; totalTransitions: number } {
  // Need enough messages for meaningful analysis
  if (p1.messageCount < 10 || p2.messageCount < 10) {
    return { score: 0, handoffCount: 0, totalTransitions: 0 };
  }

  const SESSION_GAP = 600; // 10 minutes = considered "stopped talking"
  const HANDOFF_WINDOW = 300; // 5 minutes = handoff window

  let handoffCount = 0;
  let totalTransitions = 0;

  // Get all messages from both players sorted by absolute time
  const p1Messages = messages.filter(m => m.player === p1.name);
  const p2Messages = messages.filter(m => m.player === p2.name);

  // Find sessions for each player (gaps > 10 min = new session)
  function findSessionEnds(playerMsgs: ChatMessage[]): number[] {
    const ends: number[] = [];
    for (let i = 0; i < playerMsgs.length - 1; i++) {
      const gap = playerMsgs[i + 1].absoluteTime - playerMsgs[i].absoluteTime;
      if (gap > SESSION_GAP) {
        ends.push(playerMsgs[i].absoluteTime);
      }
    }
    // Last message is also a session end
    if (playerMsgs.length > 0) {
      ends.push(playerMsgs[playerMsgs.length - 1].absoluteTime);
    }
    return ends;
  }

  function findSessionStarts(playerMsgs: ChatMessage[]): number[] {
    const starts: number[] = [];
    if (playerMsgs.length > 0) {
      starts.push(playerMsgs[0].absoluteTime);
    }
    for (let i = 1; i < playerMsgs.length; i++) {
      const gap = playerMsgs[i].absoluteTime - playerMsgs[i - 1].absoluteTime;
      if (gap > SESSION_GAP) {
        starts.push(playerMsgs[i].absoluteTime);
      }
    }
    return starts;
  }

  const p1Ends = findSessionEnds(p1Messages);
  const p2Starts = findSessionStarts(p2Messages);
  const p2Ends = findSessionEnds(p2Messages);
  const p1Starts = findSessionStarts(p1Messages);

  // Check P1 ends -> P2 starts handoffs
  for (const end of p1Ends) {
    for (const start of p2Starts) {
      const diff = start - end;
      if (diff > 0 && diff <= HANDOFF_WINDOW) {
        handoffCount++;
        break;
      }
    }
    totalTransitions++;
  }

  // Check P2 ends -> P1 starts handoffs
  for (const end of p2Ends) {
    for (const start of p1Starts) {
      const diff = start - end;
      if (diff > 0 && diff <= HANDOFF_WINDOW) {
        handoffCount++;
        break;
      }
    }
    totalTransitions++;
  }

  // Calculate score based on handoff percentage
  if (totalTransitions < 4) {
    return { score: 0, handoffCount, totalTransitions };
  }

  const handoffPercentage = handoffCount / totalTransitions;
  let score = 0;

  if (handoffPercentage >= 0.5) {
    score = 40; // Very strong indicator
  } else if (handoffPercentage >= 0.3) {
    score = 35;
  } else if (handoffPercentage >= 0.2) {
    score = 20;
  } else if (handoffPercentage >= 0.1) {
    score = 10;
  }

  return { score, handoffCount, totalTransitions };
}

// ============================================================================
// FASE 3: WURM-SPECIFIC CONTEXT
// ============================================================================

const WURM_TERMS = [
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
const WURM_COMMON_RESPONSES = new Set([
  "ok", "ty", "thx", "thanks", "np", "yw", "yes", "no", "yeah", "yep",
  "nope", "sure", "done", "nice", "cool", "lol", "haha", "xd",
  "gl", "gj", "gz", "gratz", "wb", "brb", "afk", "back",
]);

function extractWurmTopics(messages: string[]): Map<string, number> {
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

function detectWurmTopicOverlap(p1: AdvancedPlayerStats, p2: AdvancedPlayerStats): { score: number; sharedTopics: string[] } {
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

// ============================================================================
// FASE 5: HUMAN-READABLE EXPLANATION GENERATOR
// ============================================================================

function generateHumanExplanation(
  p1: AdvancedPlayerStats,
  p2: AdvancedPlayerStats,
  reasons: AltReason[],
  neverOnlineTogether: boolean,
  sharedRareWords: string[],
  handoffData: { handoffCount: number; totalTransitions: number },
  totalDays: number
): string {
  const parts: string[] = [];

  parts.push(`${p1.name} en ${p2.name} zijn waarschijnlijk dezelfde persoon omdat:`);

  // Temporal evidence
  if (neverOnlineTogether) {
    if (totalDays > 1) {
      parts.push(`- Ze zijn in ${totalDays} dagen chat NOOIT tegelijk online geweest`);
    } else {
      parts.push("- Ze zijn NOOIT tegelijk online geweest");
    }
  }

  // Handoff pattern
  if (handoffData.handoffCount >= 3) {
    parts.push(`- Er is een duidelijk "handoff" patroon: als ${p1.name} stopt, begint ${p2.name} vaak binnen 5 minuten (${handoffData.handoffCount}x gedetecteerd)`);
  }

  // Rare words
  if (sharedRareWords.length >= 2) {
    const wordExamples = sharedRareWords.slice(0, 3).map(w => `'${w}'`).join(", ");
    const rarePercentage = Math.round((sharedRareWords.length / 50) * 100);
    parts.push(`- Ze gebruiken beide zeldzame woorden: ${wordExamples} (slechts ~${Math.max(5, rarePercentage)}% van spelers gebruikt deze)`);
  }

  // Typos
  const sharedTypos = p1.typoPatterns.filter(t => p2.typoPatterns.includes(t));
  if (sharedTypos.length >= 1) {
    parts.push(`- Ze hebben identieke typfouten: ${sharedTypos.slice(0, 3).map(t => `'${t}'`).join(", ")}`);
  }

  // Common starters
  const sharedStarters = p1.commonStarters.filter(s => p2.commonStarters.includes(s));
  if (sharedStarters.length >= 2) {
    const percentage = Math.round((sharedStarters.length / Math.max(p1.commonStarters.length, 1)) * 100);
    parts.push(`- Ze beginnen ${percentage}% van hun zinnen met dezelfde woorden: ${sharedStarters.slice(0, 3).map(s => `'${s}'`).join(", ")}`);
  }

  // Network - no interaction
  const p1MentionsP2 = p1.mentionedPlayers.has(p2.name);
  const p2MentionsP1 = p2.mentionedPlayers.has(p1.name);
  const p1RespondsToP2 = p1.responsePartners.has(p2.name);
  const p2RespondsToP1 = p2.responsePartners.has(p1.name);

  if (!p1MentionsP2 && !p2MentionsP1 && !p1RespondsToP2 && !p2RespondsToP1) {
    parts.push(`- Ze praten nooit MET elkaar ondanks ${p1.messageCount}+ en ${p2.messageCount}+ berichten elk`);
  }

  // Micro patterns match
  const microMatches: string[] = [];
  if (p1.microPatterns.lowercaseI && p2.microPatterns.lowercaseI) microMatches.push("kleine 'i' i.p.v. 'I'");
  if (p1.microPatterns.allLowercase && p2.microPatterns.allLowercase) microMatches.push("alles lowercase");
  if (p1.microPatterns.excessiveCaps && p2.microPatterns.excessiveCaps) microMatches.push("veel CAPS");
  if (p1.microPatterns.noSpaceAfterPunct && p2.microPatterns.noSpaceAfterPunct) microMatches.push("geen spatie na leestekens");

  if (microMatches.length >= 2) {
    parts.push(`- Identieke schrijfgewoontes: ${microMatches.join(", ")}`);
  }

  // Emoticon style
  if (p1.emoticonStyle.commonEmotes.length > 0 && p2.emoticonStyle.commonEmotes.length > 0) {
    const sharedEmotes = p1.emoticonStyle.commonEmotes.filter(e => p2.emoticonStyle.commonEmotes.includes(e));
    if (sharedEmotes.length >= 2) {
      parts.push(`- Zelfde emoticons: ${sharedEmotes.slice(0, 4).join(", ")}`);
    }
  }

  if (parts.length <= 1) {
    parts.push("- Diverse patronen in schrijfstijl en gedrag komen overeen");
  }

  return parts.join("\n");
}

// STOP WORDS for analysis
const STOP_WORDS = new Set([
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

function extractCommonWords(messages: string[]): string[] {
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

function extractCommonPhrases(messages: string[]): string[] {
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

// ============================================================================
// MAIN ANALYSIS
// ============================================================================

function analyzePlayerAdvanced(
  name: string,
  messages: ChatMessage[],
  allPlayers: string[]
): AdvancedPlayerStats {
  const playerMessages = messages.filter(m => m.player === name);
  const texts = playerMessages.map(m => m.message);
  const allText = texts.join(" ");
  const words = allText.split(/\s+/).filter(w => w.length > 0);
  const cleanWords = words.map(w => w.toLowerCase().replace(/[^a-z]/g, "")).filter(w => w);

  // Active minutes (for temporal analysis) - both global and per-day
  const activeMinutes = new Set<number>();
  const activeDayMinutes = new Map<number, Set<number>>();
  const messageTimes: number[] = [];
  const absoluteTimes: number[] = [];

  for (const msg of playerMessages) {
    const mins = Math.floor(msg.timeSeconds / 60);
    activeMinutes.add(mins);
    messageTimes.push(msg.timeSeconds);
    absoluteTimes.push(msg.absoluteTime);

    // Track per-day activity
    if (!activeDayMinutes.has(msg.dayIndex)) {
      activeDayMinutes.set(msg.dayIndex, new Set());
    }
    activeDayMinutes.get(msg.dayIndex)!.add(mins);
  }

  // Session gaps
  const sessionGaps: number[] = [];
  for (let i = 1; i < messageTimes.length; i++) {
    const gap = messageTimes[i] - messageTimes[i - 1];
    if (gap > 0) sessionGaps.push(gap);
  }

  // Average response time
  const avgResponseTime = sessionGaps.length > 0
    ? sessionGaps.reduce((a, b) => a + b, 0) / sessionGaps.length
    : 0;

  // Vocabulary richness
  const uniqueWords = new Set(cleanWords);
  const vocabularyRichness = cleanWords.length > 0
    ? uniqueWords.size / cleanWords.length
    : 0;

  // Hapax ratio (words used only once)
  const wordFreq = new Map<string, number>();
  for (const w of cleanWords) {
    wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
  }
  const hapaxCount = Array.from(wordFreq.values()).filter(c => c === 1).length;
  const hapaxRatio = uniqueWords.size > 0 ? hapaxCount / uniqueWords.size : 0;

  // Common starters
  const starters: Record<string, number> = {};
  for (const text of texts) {
    const firstWord = text.split(/\s+/)[0]?.toLowerCase();
    if (firstWord && firstWord.length > 1) {
      starters[firstWord] = (starters[firstWord] || 0) + 1;
    }
  }
  const commonStarters = Object.entries(starters)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  return {
    name,
    messageCount: playerMessages.length,
    wordCount: words.length,
    avgWordsPerMessage: playerMessages.length > 0 ? words.length / playerMessages.length : 0,

    activeMinutes,
    activeDayMinutes,
    sessionGaps,
    avgResponseTime,

    charNgrams: extractCharNgrams(allText),
    typoPatterns: detectTypoPatterns(texts),
    punctuationStyle: analyzePunctuationStyle(texts),
    letterSubstitutions: detectLetterSubstitutions(texts),
    microPatterns: detectMicroPatterns(texts),
    emoticonStyle: detectEmoticonStyle(texts),

    vocabularyRichness: Math.round(vocabularyRichness * 1000) / 1000,
    hapaxRatio: Math.round(hapaxRatio * 1000) / 1000,
    yulesK: calculateYulesK(cleanWords),
    avgWordLength: cleanWords.length > 0
      ? Math.round(cleanWords.reduce((a, b) => a + b.length, 0) / cleanWords.length * 10) / 10
      : 0,
    wordLengthDistribution: calculateWordLengthDistribution(cleanWords),
    sentencePatterns: [], // Could expand later

    commonWords: extractCommonWords(texts),
    commonPhrases: extractCommonPhrases(texts),
    commonStarters,
    responsePartners: findResponsePartners(name, messages),
    mentionedPlayers: findMentionedPlayers(texts, allPlayers),
    topicFingerprint: extractTopicFingerprint(texts),
    wurmTopics: extractWurmTopics(texts),

    allMessages: texts,
    messageTimes,
    absoluteTimes,
  };
}

// ============================================================================
// ALT DETECTION ENGINE
// ============================================================================

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const allKeys = new Set([...a.keys(), ...b.keys()]);

  for (const key of allKeys) {
    const valA = a.get(key) || 0;
    const valB = b.get(key) || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function distributionSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let sumDiff = 0;
  for (let i = 0; i < a.length; i++) {
    sumDiff += Math.abs(a[i] - b[i]);
  }

  return 1 - (sumDiff / 2); // Normalized
}

function detectAltsAdvanced(
  stats: AdvancedPlayerStats[],
  messages: ChatMessage[]
): { suspicions: AltSuspicion[]; matrix: SimilarityMatrix } {
  const suspicions: AltSuspicion[] = [];
  const players = stats.map(s => s.name);
  const scores: number[][] = players.map(() => players.map(() => 0));

  // Build rare word index for all players (Fase 2)
  const rareWordIndex = buildRareWordIndex(stats);

  // Calculate total days from messages
  const totalDays = messages.length > 0
    ? Math.max(...messages.map(m => m.dayIndex)) + 1
    : 1;

  for (let i = 0; i < stats.length; i++) {
    for (let j = i + 1; j < stats.length; j++) {
      const p1 = stats[i];
      const p2 = stats[j];

      // STRICTER: Require at least 15 messages each for reliable analysis
      if (p1.messageCount < 15 || p2.messageCount < 15) continue;

      const reasons: AltReason[] = [];
      const scoreBreakdown: ScoreBreakdown = {
        temporal: 0,
        linguistic: 0,
        behavioral: 0,
        network: 0,
        rareWords: 0,
        handoff: 0,
        bonus: 0,
      };

      // ========== TEMPORAL ANALYSIS ==========

      // Check if never online together (CRITICAL indicator)
      // STRICTER: Both need at least 30 minutes of activity for this to be meaningful
      const overlap = new Set([...p1.activeMinutes].filter(m => p2.activeMinutes.has(m)));
      const minActivity = Math.min(p1.activeMinutes.size, p2.activeMinutes.size);
      const neverOnlineTogether = overlap.size === 0 &&
        p1.activeMinutes.size >= 30 &&
        p2.activeMinutes.size >= 30;

      if (neverOnlineTogether) {
        scoreBreakdown.temporal += 40;
        reasons.push({
          type: "temporal",
          description: "Nooit tegelijk online",
          weight: 40,
          evidence: `${p1.name}: ${p1.activeMinutes.size} min actief, ${p2.name}: ${p2.activeMinutes.size} min actief, 0 overlap`,
        });
      } else if (overlap.size > 0 && minActivity >= 20 && overlap.size < minActivity * 0.05) {
        scoreBreakdown.temporal += 20;
        reasons.push({
          type: "temporal",
          description: "Zeer weinig tijd overlap",
          weight: 20,
          evidence: `Slechts ${overlap.size} van ${minActivity} minuten overlap (${Math.round(overlap.size/minActivity*100)}%)`,
        });
      }

      // ========== FASE 1: HANDOFF PATTERN DETECTION ==========

      const handoffData = detectHandoffPattern(p1, p2, messages);
      if (handoffData.score > 0) {
        scoreBreakdown.handoff = handoffData.score;
        reasons.push({
          type: "temporal",
          description: "Handoff patroon gedetecteerd",
          weight: handoffData.score,
          evidence: `${handoffData.handoffCount} van ${handoffData.totalTransitions} sessie-overgangen zijn handoffs (${Math.round(handoffData.handoffCount/handoffData.totalTransitions*100)}%)`,
        });
      }

      // ========== FASE 2: RARE WORD FINGERPRINT ==========

      const sharedRareWords = detectSharedRareWords(p1, p2, rareWordIndex, stats.length);
      if (sharedRareWords.length >= 3) {
        scoreBreakdown.rareWords = 40;
        reasons.push({
          type: "linguistic",
          description: "Veel gedeelde zeldzame woorden",
          weight: 40,
          evidence: `${sharedRareWords.length} zeldzame woorden: ${sharedRareWords.slice(0, 5).join(", ")}`,
        });
      } else if (sharedRareWords.length === 2) {
        scoreBreakdown.rareWords = 25;
        reasons.push({
          type: "linguistic",
          description: "Gedeelde zeldzame woorden",
          weight: 25,
          evidence: `"${sharedRareWords[0]}", "${sharedRareWords[1]}"`,
        });
      } else if (sharedRareWords.length === 1) {
        scoreBreakdown.rareWords = 10;
        reasons.push({
          type: "linguistic",
          description: "Gedeeld zeldzaam woord",
          weight: 10,
          evidence: `"${sharedRareWords[0]}"`,
        });
      }

      // ========== LINGUISTIC FINGERPRINT ==========

      // Character n-gram similarity (powerful forensic technique)
      const ngramSim = cosineSimilarity(p1.charNgrams, p2.charNgrams);
      if (ngramSim > 0.92) {
        scoreBreakdown.linguistic += 30;
        reasons.push({
          type: "linguistic",
          description: "Sterke karakter-patroon match (forensisch)",
          weight: 30,
          evidence: `${Math.round(ngramSim * 100)}% n-gram overeenkomst`,
        });
      } else if (ngramSim > 0.85) {
        scoreBreakdown.linguistic += 15;
        reasons.push({
          type: "linguistic",
          description: "Vergelijkbare karakterpatronen",
          weight: 15,
          evidence: `${Math.round(ngramSim * 100)}% n-gram overeenkomst`,
        });
      }

      // Same typo patterns (very distinctive)
      const sharedTypos = p1.typoPatterns.filter(t => p2.typoPatterns.includes(t));
      if (sharedTypos.length >= 2) {
        scoreBreakdown.linguistic += 25;
        reasons.push({
          type: "linguistic",
          description: "Dezelfde typefouten",
          weight: 25,
          evidence: sharedTypos.join(", "),
        });
      } else if (sharedTypos.length === 1) {
        scoreBreakdown.linguistic += 12;
        reasons.push({
          type: "linguistic",
          description: "Gedeelde typefout",
          weight: 12,
          evidence: sharedTypos[0],
        });
      }

      // Letter substitution patterns
      const sharedSubs = [...p1.letterSubstitutions.keys()].filter(k => p2.letterSubstitutions.has(k));
      if (sharedSubs.length >= 3) {
        scoreBreakdown.linguistic += 20;
        reasons.push({
          type: "linguistic",
          description: "Zelfde afkortingsstijl",
          weight: 20,
          evidence: sharedSubs.slice(0, 4).join(", "),
        });
      }

      // ========== FASE 2: MICRO-PATTERNS MATCHING ==========

      const microMatches: string[] = [];
      if (p1.microPatterns.lowercaseI && p2.microPatterns.lowercaseI) microMatches.push("lowercase i");
      if (p1.microPatterns.allLowercase && p2.microPatterns.allLowercase) microMatches.push("all lowercase");
      if (p1.microPatterns.excessiveCaps && p2.microPatterns.excessiveCaps) microMatches.push("EXCESSIVE CAPS");
      if (p1.microPatterns.noCapitalStart && p2.microPatterns.noCapitalStart) microMatches.push("no capital start");
      if (p1.microPatterns.numberSubstitution && p2.microPatterns.numberSubstitution) microMatches.push("number subs");
      if (p1.microPatterns.doubleSpaces && p2.microPatterns.doubleSpaces) microMatches.push("double spaces");
      if (p1.microPatterns.noSpaceAfterPunct && p2.microPatterns.noSpaceAfterPunct) microMatches.push("no space after punct");

      if (microMatches.length >= 3) {
        scoreBreakdown.linguistic += 25;
        reasons.push({
          type: "linguistic",
          description: "Sterke micro-patroon match",
          weight: 25,
          evidence: microMatches.join(", "),
        });
      } else if (microMatches.length >= 2) {
        scoreBreakdown.linguistic += 15;
        reasons.push({
          type: "linguistic",
          description: "Gedeelde micro-patronen",
          weight: 15,
          evidence: microMatches.join(", "),
        });
      }

      // ========== FASE 2: EMOTICON STYLE MATCHING ==========

      const sharedEmotes = p1.emoticonStyle.commonEmotes.filter(e =>
        p2.emoticonStyle.commonEmotes.includes(e)
      );
      if (sharedEmotes.length >= 3) {
        scoreBreakdown.behavioral += 15;
        reasons.push({
          type: "behavioral",
          description: "Zelfde emoticons/emotes",
          weight: 15,
          evidence: sharedEmotes.slice(0, 4).join(", "),
        });
      }
      // Nose style match (rare and distinctive)
      if (p1.emoticonStyle.usesNose && p2.emoticonStyle.usesNose) {
        scoreBreakdown.behavioral += 10;
        reasons.push({
          type: "behavioral",
          description: "Beide gebruiken emoticons met neus (:-) stijl)",
          weight: 10,
        });
      }

      // ========== BEHAVIORAL ANALYSIS ==========

      // Phrase overlap (very distinctive)
      const phraseOverlap = p1.commonPhrases.filter(p =>
        p2.commonPhrases.includes(p) && p.split(' ').length >= 3
      );
      if (phraseOverlap.length >= 2) {
        scoreBreakdown.behavioral += 25;
        reasons.push({
          type: "behavioral",
          description: "Dezelfde unieke uitdrukkingen",
          weight: 25,
          evidence: phraseOverlap.slice(0, 2).map(p => `"${p}"`).join(", "),
        });
      } else if (phraseOverlap.length === 1) {
        scoreBreakdown.behavioral += 12;
        reasons.push({
          type: "behavioral",
          description: "Gedeelde uitdrukking",
          weight: 12,
          evidence: `"${phraseOverlap[0]}"`,
        });
      }

      // Common starters match
      const sharedStarters = p1.commonStarters.filter(s => p2.commonStarters.includes(s));
      if (sharedStarters.length >= 3) {
        scoreBreakdown.behavioral += 15;
        reasons.push({
          type: "behavioral",
          description: "Zelfde start-woorden",
          weight: 15,
          evidence: sharedStarters.slice(0, 4).join(", "),
        });
      }

      // ========== NETWORK ANALYSIS ==========
      // Wurm context: "no interaction" is less suspicious, so lower weight

      const p1MentionsP2 = p1.mentionedPlayers.has(p2.name);
      const p2MentionsP1 = p2.mentionedPlayers.has(p1.name);
      const p1RespondsToP2 = p1.responsePartners.has(p2.name);
      const p2RespondsToP1 = p2.responsePartners.has(p1.name);

      if (!p1MentionsP2 && !p2MentionsP1 && !p1RespondsToP2 && !p2RespondsToP1 &&
          p1.messageCount >= 25 && p2.messageCount >= 25) {
        // WURM CONTEXT: Reduced weight from 15 to 10
        scoreBreakdown.network = 10;
        reasons.push({
          type: "network",
          description: "Nooit interactie met elkaar",
          weight: 10,
          evidence: "Geen mentions of reacties onderling ondanks veel berichten",
        });
      }

      // ========== FASE 3: WURM-SPECIFIC CONTEXT ==========

      const wurmOverlap = detectWurmTopicOverlap(p1, p2);
      if (wurmOverlap.score > 0) {
        scoreBreakdown.behavioral += wurmOverlap.score;
        reasons.push({
          type: "behavioral",
          description: "Zelfde Wurm-topics besproken",
          weight: wurmOverlap.score,
          evidence: wurmOverlap.sharedTopics.slice(0, 5).join(", "),
        });
      }

      // ========== CALCULATE TOTAL SCORE ==========

      let totalScore = scoreBreakdown.temporal +
                       scoreBreakdown.linguistic +
                       scoreBreakdown.behavioral +
                       scoreBreakdown.network +
                       scoreBreakdown.rareWords +
                       scoreBreakdown.handoff;

      // ========== FASE 6: CATEGORY BONUSES ==========

      const hasTemporalEvidence = scoreBreakdown.temporal >= 20 || scoreBreakdown.handoff >= 20;
      const hasNetworkEvidence = scoreBreakdown.network >= 10;
      const hasLinguisticEvidence = scoreBreakdown.linguistic >= 25 || scoreBreakdown.rareWords >= 25;
      const hasBehavioralEvidence = scoreBreakdown.behavioral >= 20;

      // Temporal + Network = very strong (nooit samen + nooit interactie)
      if (hasTemporalEvidence && hasNetworkEvidence) {
        const bonus = Math.round(totalScore * 0.3);
        scoreBreakdown.bonus += bonus;
        totalScore += bonus;
        reasons.push({
          type: "bonus",
          description: "Temporal+Network combinatie bonus",
          weight: bonus,
          evidence: "Nooit samen online EN nooit interactie = sterke indicator",
        });
      }

      // Linguistic + Behavioral = strong (same style + same expressions)
      if (hasLinguisticEvidence && hasBehavioralEvidence) {
        const bonus = Math.round(totalScore * 0.2);
        scoreBreakdown.bonus += bonus;
        totalScore += bonus;
        reasons.push({
          type: "bonus",
          description: "Linguistic+Behavioral combinatie bonus",
          weight: bonus,
          evidence: "Zelfde schrijfstijl EN zelfde uitdrukkingen",
        });
      }

      // Store in matrix
      scores[i][j] = totalScore;
      scores[j][i] = totalScore;

      // STRICTER: Only add if significant evidence
      const strongReasons = reasons.filter(r => r.weight >= 15 && r.type !== "bonus");
      if (totalScore >= 50 && strongReasons.length >= 2) {
        const confidence = Math.min(Math.round(totalScore * 0.65), 99);

        let category: AltSuspicion["category"];
        if (neverOnlineTogether && strongReasons.length >= 2 && confidence >= 70) category = "critical";
        else if (confidence >= 70) category = "high";
        else if (confidence >= 50) category = "medium";
        else category = "low";

        // Generate human explanation (Fase 5)
        const humanExplanation = generateHumanExplanation(
          p1, p2, reasons, neverOnlineTogether, sharedRareWords,
          handoffData, totalDays
        );

        suspicions.push({
          player1: p1.name,
          player2: p2.name,
          confidence,
          category,
          reasons: reasons.sort((a, b) => b.weight - a.weight),
          neverOnlineTogether,
          similarityScore: totalScore,
          scoreBreakdown,
          humanExplanation,
          sharedRareWords,
          handoffScore: handoffData.score,
        });
      }
    }
  }

  return {
    suspicions: suspicions.sort((a, b) => b.confidence - a.confidence),
    matrix: { players, scores },
  };
}

// ============================================================================
// REACT COMPONENT
// ============================================================================

export default function ChatAnalyzerPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [rawText, setRawText] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "players" | "alts" | "matrix" | "forensics">("chat");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [compareMode, setCompareMode] = useState<[string, string] | null>(null);

  const players = useMemo(() => {
    const playerSet = new Set(messages.map(m => m.player));
    return Array.from(playerSet).sort();
  }, [messages]);

  const playerStats = useMemo(() => {
    return players.map(p => analyzePlayerAdvanced(p, messages, players));
  }, [players, messages]);

  const { altSuspicions, similarityMatrix } = useMemo(() => {
    if (playerStats.length < 2) {
      return { altSuspicions: [], similarityMatrix: { players: [], scores: [] } };
    }
    const result = detectAltsAdvanced(playerStats, messages);
    return { altSuspicions: result.suspicions, similarityMatrix: result.matrix };
  }, [playerStats, messages]);

  const filteredMessages = useMemo(() => {
    let filtered = messages;
    if (selectedPlayer) {
      filtered = filtered.filter(m => m.player === selectedPlayer);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.message.toLowerCase().includes(term) ||
        m.player.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [messages, selectedPlayer, searchTerm]);

  // Parse chat with multi-day support
  const parseChat = useCallback((text: string, dayOffset: number = 0) => {
    const lines = text.split("\n");
    const parsed: ChatMessage[] = [];
    let currentDayIndex = dayOffset;
    let lastTimeSeconds = -1;
    let lastDate: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const result = parseChatLine(line, i + 1, currentDayIndex);

      // Handle date changes (explicit or from full timestamp)
      if (result.dateChange && result.dateChange !== lastDate) {
        if (lastDate !== null) {
          currentDayIndex++;
        }
        lastDate = result.dateChange;
      }

      if (result.message) {
        // Auto-detect day change: if time goes backwards significantly (>6 hours gap backwards)
        // This handles cases where timestamps wrap from 23:59 to 00:00
        if (lastTimeSeconds !== -1 && result.message.timeSeconds < lastTimeSeconds - 21600) {
          currentDayIndex++;
          result.message.dayIndex = currentDayIndex;
          result.message.absoluteTime = currentDayIndex * 86400 + result.message.timeSeconds;
        }

        lastTimeSeconds = result.message.timeSeconds;
        parsed.push(result.message);
      }
    }

    return parsed;
  }, []);

  // Parse multiple files together
  const parseMultipleChats = useCallback((texts: string[]) => {
    let allMessages: ChatMessage[] = [];
    let dayOffset = 0;

    for (const text of texts) {
      const parsed = parseChat(text, dayOffset);
      if (parsed.length > 0) {
        allMessages = [...allMessages, ...parsed];
        // Increment day offset for next file
        dayOffset = Math.max(...parsed.map(m => m.dayIndex)) + 1;
      }
    }

    setMessages(allMessages);
    setSelectedPlayer(null);
    setCompareMode(null);
  }, [parseChat]);

  // Single file parse wrapper
  const parseSingleChat = useCallback((text: string) => {
    const parsed = parseChat(text, 0);
    setMessages(parsed);
    setSelectedPlayer(null);
    setCompareMode(null);
  }, [parseChat]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      // Single file upload
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setRawText(text);
        parseSingleChat(text);
      };
      reader.readAsText(files[0]);
    } else {
      // Multi-file upload (each file = different day)
      const readPromises: Promise<string>[] = [];

      for (let i = 0; i < files.length; i++) {
        readPromises.push(
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve(event.target?.result as string);
            };
            reader.readAsText(files[i]);
          })
        );
      }

      Promise.all(readPromises).then((texts) => {
        setRawText(texts.join("\n\n--- NEW FILE ---\n\n"));
        parseMultipleChats(texts);
      });
    }
  }, [parseSingleChat, parseMultipleChats]);

  const handlePaste = useCallback(() => {
    if (rawText) {
      parseSingleChat(rawText);
    }
  }, [rawText, parseSingleChat]);

  const getCompareStats = useMemo(() => {
    if (!compareMode) return null;
    const s1 = playerStats.find(s => s.name === compareMode[0]);
    const s2 = playerStats.find(s => s.name === compareMode[1]);
    return s1 && s2 ? [s1, s2] : null;
  }, [compareMode, playerStats]);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Chat Forensics Analyzer
          </h1>
          <p className="text-text-secondary">
            Geavanceerde analyse met stylometrie, temporele patronen & forensische linguistiek
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Chat Log Importeren</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Upload .txt bestand(en) <span className="text-text-muted">(selecteer meerdere voor multi-dag)</span>
              </label>
              <input
                type="file"
                accept=".txt,.log"
                multiple
                onChange={handleFileUpload}
                className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-accent file:text-white file:cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">Of plak chat hier</label>
              <div className="flex gap-2">
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="[21:25:05] <Shenjiwurm> its alot of fun..."
                  className="flex-1 px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border resize-none h-10"
                />
                <button
                  onClick={handlePaste}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
                >
                  Analyze
                </button>
              </div>
            </div>
          </div>

          {messages.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span className="px-3 py-1 bg-bg-tertiary rounded-full text-text-secondary">
                {messages.length} berichten
              </span>
              <span className="px-3 py-1 bg-bg-tertiary rounded-full text-text-secondary">
                {players.length} spelers
              </span>
              <span className="px-3 py-1 bg-info/20 text-info rounded-full">
                {Math.max(...messages.map(m => m.dayIndex)) + 1} dag(en)
              </span>
              {altSuspicions.filter(s => s.category === "critical").length > 0 && (
                <span className="px-3 py-1 bg-error/20 text-error rounded-full font-semibold">
                  {altSuspicions.filter(s => s.category === "critical").length} kritieke matches
                </span>
              )}
              {altSuspicions.filter(s => s.category === "high").length > 0 && (
                <span className="px-3 py-1 bg-warning/20 text-warning rounded-full">
                  {altSuspicions.filter(s => s.category === "high").length} hoge matches
                </span>
              )}
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <>
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {(["chat", "players", "alts", "matrix", "forensics"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab
                      ? "bg-accent text-white"
                      : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
                  }`}
                >
                  {tab === "chat" && "Chat"}
                  {tab === "players" && `Spelers (${players.length})`}
                  {tab === "alts" && `Alt Detectie ${altSuspicions.length > 0 ? `(${altSuspicions.length})` : ""}`}
                  {tab === "matrix" && "Similarity Matrix"}
                  {tab === "forensics" && "Forensics Lab"}
                </button>
              ))}
            </div>

            {/* Chat Tab */}
            {activeTab === "chat" && (
              <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Zoek in berichten..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                    />
                  </div>
                  <select
                    value={selectedPlayer || ""}
                    onChange={(e) => setSelectedPlayer(e.target.value || null)}
                    className="px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                  >
                    <option value="">Alle spelers</option>
                    {players.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {(selectedPlayer || searchTerm) && (
                    <button
                      onClick={() => { setSelectedPlayer(null); setSearchTerm(""); }}
                      className="px-4 py-2 bg-error/20 text-error rounded-lg hover:bg-error/30"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="p-4 border-b border-border">
                  <div className="flex flex-wrap gap-2">
                    {players.map(player => (
                      <button
                        key={player}
                        onClick={() => setSelectedPlayer(selectedPlayer === player ? null : player)}
                        className={`px-3 py-1 rounded-full text-sm transition-all ${
                          selectedPlayer === player ? "ring-2 ring-white" : ""
                        }`}
                        style={{
                          backgroundColor: `${getPlayerColor(player)}20`,
                          color: getPlayerColor(player),
                          borderColor: getPlayerColor(player),
                          borderWidth: 1,
                        }}
                      >
                        {player}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-[500px] overflow-y-auto p-4 font-mono text-sm space-y-1">
                  {filteredMessages.map((msg, idx) => (
                    <div key={idx} className="flex gap-2 hover:bg-bg-tertiary/50 px-2 py-1 rounded">
                      <span className="text-text-muted shrink-0">[{msg.timestamp}]</span>
                      <span
                        className="font-semibold shrink-0 cursor-pointer hover:underline"
                        style={{ color: getPlayerColor(msg.player) }}
                        onClick={() => setSelectedPlayer(selectedPlayer === msg.player ? null : msg.player)}
                      >
                        &lt;{msg.player}&gt;
                      </span>
                      <span className="text-text-primary break-words">{msg.message}</span>
                    </div>
                  ))}
                  {filteredMessages.length === 0 && (
                    <div className="text-center text-text-muted py-8">
                      Geen berichten gevonden
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Players Tab */}
            {activeTab === "players" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {playerStats
                  .sort((a, b) => b.messageCount - a.messageCount)
                  .map(stats => (
                  <div
                    key={stats.name}
                    className="bg-bg-secondary rounded-xl border border-border p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3
                        className="text-lg font-semibold"
                        style={{ color: getPlayerColor(stats.name) }}
                      >
                        {stats.name}
                      </h3>
                      <span className="text-text-muted text-sm">
                        {stats.messageCount} berichten
                      </span>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="bg-bg-tertiary rounded-lg p-2 text-center">
                          <div className="text-text-muted text-xs">Woorden</div>
                          <div className="text-text-primary font-semibold">{stats.wordCount}</div>
                        </div>
                        <div className="bg-bg-tertiary rounded-lg p-2 text-center">
                          <div className="text-text-muted text-xs">Gem/msg</div>
                          <div className="text-text-primary font-semibold">
                            {stats.avgWordsPerMessage.toFixed(1)}
                          </div>
                        </div>
                        <div className="bg-bg-tertiary rounded-lg p-2 text-center">
                          <div className="text-text-muted text-xs">Vocab</div>
                          <div className="text-text-primary font-semibold">
                            {(stats.vocabularyRichness * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="bg-bg-tertiary rounded-lg p-2 text-center">
                          <div className="text-text-muted text-xs">Yule K</div>
                          <div className="text-text-primary font-semibold">{stats.yulesK}</div>
                        </div>
                      </div>

                      {stats.typoPatterns.length > 0 && (
                        <div>
                          <div className="text-text-muted mb-1 text-xs">Typefouten</div>
                          <div className="flex flex-wrap gap-1">
                            {stats.typoPatterns.map(typo => (
                              <span key={typo} className="px-2 py-0.5 bg-error/20 text-error rounded text-xs">
                                {typo}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {stats.letterSubstitutions.size > 0 && (
                        <div>
                          <div className="text-text-muted mb-1 text-xs">Afkortingen</div>
                          <div className="flex flex-wrap gap-1">
                            {[...stats.letterSubstitutions.keys()].slice(0, 5).map(sub => (
                              <span key={sub} className="px-2 py-0.5 bg-warning/20 text-warning rounded text-xs">
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {stats.commonPhrases.length > 0 && (
                        <div>
                          <div className="text-text-muted mb-1 text-xs">Uitdrukkingen</div>
                          <div className="flex flex-wrap gap-1">
                            {stats.commonPhrases.slice(0, 3).map(phrase => (
                              <span key={phrase} className="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs">
                                &quot;{phrase}&quot;
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Micro-patterns */}
                      {(stats.microPatterns.lowercaseI || stats.microPatterns.allLowercase ||
                        stats.microPatterns.excessiveCaps || stats.microPatterns.numberSubstitution ||
                        stats.microPatterns.noSpaceAfterPunct) && (
                        <div>
                          <div className="text-text-muted mb-1 text-xs">Micro-patronen</div>
                          <div className="flex flex-wrap gap-1">
                            {stats.microPatterns.lowercaseI && (
                              <span className="px-2 py-0.5 bg-success/20 text-success rounded text-xs">lowercase i</span>
                            )}
                            {stats.microPatterns.allLowercase && (
                              <span className="px-2 py-0.5 bg-success/20 text-success rounded text-xs">all lowercase</span>
                            )}
                            {stats.microPatterns.excessiveCaps && (
                              <span className="px-2 py-0.5 bg-success/20 text-success rounded text-xs">CAPS</span>
                            )}
                            {stats.microPatterns.numberSubstitution && (
                              <span className="px-2 py-0.5 bg-success/20 text-success rounded text-xs">2/4/l8r</span>
                            )}
                            {stats.microPatterns.noSpaceAfterPunct && (
                              <span className="px-2 py-0.5 bg-success/20 text-success rounded text-xs">no space.after</span>
                            )}
                            {stats.microPatterns.doubleSpaces && (
                              <span className="px-2 py-0.5 bg-success/20 text-success rounded text-xs">double  spaces</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Emoticons */}
                      {stats.emoticonStyle.commonEmotes.length > 0 && (
                        <div>
                          <div className="text-text-muted mb-1 text-xs">
                            Emotes ({stats.emoticonStyle.emoteFrequency}% van berichten)
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {stats.emoticonStyle.commonEmotes.slice(0, 5).map(emote => (
                              <span key={emote} className="px-2 py-0.5 bg-info/20 text-info rounded text-xs">
                                {emote}
                              </span>
                            ))}
                            {stats.emoticonStyle.usesNose && (
                              <span className="px-2 py-0.5 bg-warning/20 text-warning rounded text-xs">:-) stijl</span>
                            )}
                            {stats.emoticonStyle.usesEmoji && (
                              <span className="px-2 py-0.5 bg-warning/20 text-warning rounded text-xs">emoji user</span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                        {stats.punctuationStyle.spaceBefore && (
                          <span className="px-2 py-0.5 bg-info/20 text-info rounded text-xs">spatie voor ?!</span>
                        )}
                        {stats.punctuationStyle.doublePunctuation && (
                          <span className="px-2 py-0.5 bg-info/20 text-info rounded text-xs">!!/??</span>
                        )}
                        {stats.punctuationStyle.ellipsisStyle !== "none" && (
                          <span className="px-2 py-0.5 bg-info/20 text-info rounded text-xs">...</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Alts Tab */}
            {activeTab === "alts" && (
              <div className="space-y-4">
                {altSuspicions.length === 0 ? (
                  <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
                    <div className="text-4xl mb-4">&#128373;</div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      Geen verdachte alt-accounts gevonden
                    </h3>
                    <p className="text-text-secondary">
                      De forensische analyse heeft geen matches gevonden.
                      <br />
                      Meer chatberichten verbeteren de detectie.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
                      <p className="text-accent text-sm">
                        <strong>Forensische Analyse v2.0:</strong> Nu met handoff-detectie, zeldzame woorden fingerprint,
                        micro-patronen, emoticon analyse, en Wurm-specifieke context.
                      </p>
                    </div>

                    {altSuspicions.map((suspicion, idx) => (
                      <div
                        key={idx}
                        className={`bg-bg-secondary rounded-xl border p-4 ${
                          suspicion.category === "critical"
                            ? "border-error"
                            : suspicion.category === "high"
                            ? "border-warning"
                            : "border-border"
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span
                              className="font-semibold text-lg"
                              style={{ color: getPlayerColor(suspicion.player1) }}
                            >
                              {suspicion.player1}
                            </span>
                            <span className="text-text-muted">&#8596;</span>
                            <span
                              className="font-semibold text-lg"
                              style={{ color: getPlayerColor(suspicion.player2) }}
                            >
                              {suspicion.player2}
                            </span>
                            {suspicion.neverOnlineTogether && (
                              <span className="px-2 py-1 bg-error text-white text-xs rounded font-bold">
                                NOOIT SAMEN ONLINE
                              </span>
                            )}
                            {suspicion.handoffScore >= 20 && (
                              <span className="px-2 py-1 bg-warning text-black text-xs rounded font-bold">
                                HANDOFF PATROON
                              </span>
                            )}
                          </div>
                          <div className={`px-4 py-2 rounded-full text-lg font-bold ${
                            suspicion.category === "critical"
                              ? "bg-error text-white"
                              : suspicion.category === "high"
                              ? "bg-warning/20 text-warning"
                              : suspicion.category === "medium"
                              ? "bg-info/20 text-info"
                              : "bg-bg-tertiary text-text-secondary"
                          }`}>
                            {suspicion.confidence}% match
                          </div>
                        </div>

                        {/* Human Readable Explanation */}
                        <div className="bg-bg-tertiary rounded-lg p-4 mb-4">
                          <h4 className="text-sm font-semibold text-text-secondary mb-2">Analyse Samenvatting:</h4>
                          <div className="text-text-primary text-sm whitespace-pre-line">
                            {suspicion.humanExplanation}
                          </div>
                        </div>

                        {/* Score Breakdown Bars */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                          {/* Temporal */}
                          <div className="bg-bg-tertiary rounded-lg p-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-error font-semibold">Temporal</span>
                              <span className="text-text-muted">{suspicion.scoreBreakdown.temporal + suspicion.scoreBreakdown.handoff}/80</span>
                            </div>
                            <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-error rounded-full transition-all"
                                style={{ width: `${Math.min(((suspicion.scoreBreakdown.temporal + suspicion.scoreBreakdown.handoff) / 80) * 100, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Linguistic */}
                          <div className="bg-bg-tertiary rounded-lg p-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-warning font-semibold">Linguistic</span>
                              <span className="text-text-muted">{suspicion.scoreBreakdown.linguistic + suspicion.scoreBreakdown.rareWords}/80</span>
                            </div>
                            <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-warning rounded-full transition-all"
                                style={{ width: `${Math.min(((suspicion.scoreBreakdown.linguistic + suspicion.scoreBreakdown.rareWords) / 80) * 100, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Behavioral */}
                          <div className="bg-bg-tertiary rounded-lg p-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-accent font-semibold">Behavioral</span>
                              <span className="text-text-muted">{suspicion.scoreBreakdown.behavioral}/50</span>
                            </div>
                            <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-accent rounded-full transition-all"
                                style={{ width: `${Math.min((suspicion.scoreBreakdown.behavioral / 50) * 100, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Network */}
                          <div className="bg-bg-tertiary rounded-lg p-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-success font-semibold">Network</span>
                              <span className="text-text-muted">{suspicion.scoreBreakdown.network}/20</span>
                            </div>
                            <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-success rounded-full transition-all"
                                style={{ width: `${Math.min((suspicion.scoreBreakdown.network / 20) * 100, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Bonus */}
                          {suspicion.scoreBreakdown.bonus > 0 && (
                            <div className="bg-bg-tertiary rounded-lg p-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-info font-semibold">Combo Bonus</span>
                                <span className="text-text-muted">+{suspicion.scoreBreakdown.bonus}</span>
                              </div>
                              <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-info rounded-full transition-all"
                                  style={{ width: `${Math.min((suspicion.scoreBreakdown.bonus / 50) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Rare Words */}
                          {suspicion.sharedRareWords.length > 0 && (
                            <div className="bg-bg-tertiary rounded-lg p-3 col-span-2 lg:col-span-1">
                              <div className="text-xs text-text-muted mb-1">Zeldzame woorden</div>
                              <div className="flex flex-wrap gap-1">
                                {suspicion.sharedRareWords.slice(0, 5).map((word, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-warning/20 text-warning rounded text-xs">
                                    {word}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Detailed Reasons (collapsible) */}
                        <details className="group">
                          <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary mb-2">
                            Bekijk alle {suspicion.reasons.length} redenen...
                          </summary>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                            {suspicion.reasons.map((reason, i) => (
                              <div
                                key={i}
                                className={`flex items-start gap-2 text-sm p-2 rounded ${
                                  reason.type === "temporal" ? "bg-error/10" :
                                  reason.type === "linguistic" ? "bg-warning/10" :
                                  reason.type === "behavioral" ? "bg-accent/10" :
                                  reason.type === "network" ? "bg-success/10" :
                                  reason.type === "bonus" ? "bg-info/10" :
                                  "bg-bg-tertiary"
                                }`}
                              >
                                <span className={`text-xs font-bold uppercase shrink-0 ${
                                  reason.type === "temporal" ? "text-error" :
                                  reason.type === "linguistic" ? "text-warning" :
                                  reason.type === "behavioral" ? "text-accent" :
                                  reason.type === "network" ? "text-success" :
                                  reason.type === "bonus" ? "text-info" :
                                  "text-text-muted"
                                }`}>
                                  {reason.type}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-text-primary">{reason.description}</div>
                                  {reason.evidence && (
                                    <div className="text-text-muted text-xs mt-1 truncate">{reason.evidence}</div>
                                  )}
                                </div>
                                <span className="text-text-muted text-xs shrink-0">+{reason.weight}</span>
                              </div>
                            ))}
                          </div>
                        </details>

                        {/* Action Buttons */}
                        <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
                          <button
                            onClick={() => { setSelectedPlayer(suspicion.player1); setActiveTab("chat"); }}
                            className="px-3 py-1 bg-bg-tertiary rounded-lg text-text-secondary text-sm hover:bg-bg-tertiary/80"
                          >
                            Bekijk {suspicion.player1}
                          </button>
                          <button
                            onClick={() => { setSelectedPlayer(suspicion.player2); setActiveTab("chat"); }}
                            className="px-3 py-1 bg-bg-tertiary rounded-lg text-text-secondary text-sm hover:bg-bg-tertiary/80"
                          >
                            Bekijk {suspicion.player2}
                          </button>
                          <button
                            onClick={() => { setCompareMode([suspicion.player1, suspicion.player2]); setActiveTab("forensics"); }}
                            className="px-3 py-1 bg-accent/20 text-accent rounded-lg text-sm hover:bg-accent/30"
                          >
                            Vergelijk in Lab
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Similarity Matrix Tab */}
            {activeTab === "matrix" && similarityMatrix.players.length > 0 && (
              <div className="bg-bg-secondary rounded-xl border border-border p-4 overflow-x-auto">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  Speler Similarity Matrix
                </h3>
                <p className="text-text-secondary text-sm mb-4">
                  Heatmap van overeenkomsten tussen spelers. Hogere scores = meer verdacht.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr>
                        <th className="p-2"></th>
                        {similarityMatrix.players.map(p => (
                          <th
                            key={p}
                            className="p-2 font-semibold"
                            style={{ color: getPlayerColor(p) }}
                          >
                            {p.length > 8 ? p.substring(0, 8) + "..." : p}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {similarityMatrix.players.map((p1, i) => (
                        <tr key={p1}>
                          <td
                            className="p-2 font-semibold"
                            style={{ color: getPlayerColor(p1) }}
                          >
                            {p1.length > 8 ? p1.substring(0, 8) + "..." : p1}
                          </td>
                          {similarityMatrix.scores[i].map((score, j) => {
                            const intensity = Math.min(score / 80, 1);
                            const bg = i === j
                              ? "transparent"
                              : score >= 60
                              ? `rgba(239, 68, 68, ${intensity})`
                              : score >= 30
                              ? `rgba(245, 158, 11, ${intensity})`
                              : score > 0
                              ? `rgba(59, 130, 246, ${intensity * 0.5})`
                              : "transparent";
                            return (
                              <td
                                key={j}
                                className="p-2 text-center cursor-pointer hover:ring-2 hover:ring-white"
                                style={{ backgroundColor: bg }}
                                onClick={() => {
                                  if (i !== j && score > 0) {
                                    setCompareMode([p1, similarityMatrix.players[j]]);
                                    setActiveTab("forensics");
                                  }
                                }}
                              >
                                {i === j ? "-" : score > 0 ? score : ""}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-4 mt-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: "rgba(239, 68, 68, 0.8)" }}></div>
                    <span className="text-text-muted">Kritiek (60+)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: "rgba(245, 158, 11, 0.5)" }}></div>
                    <span className="text-text-muted">Verdacht (30-59)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: "rgba(59, 130, 246, 0.3)" }}></div>
                    <span className="text-text-muted">Laag (&lt;30)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Forensics Lab Tab */}
            {activeTab === "forensics" && (
              <div className="space-y-4">
                <div className="bg-bg-secondary rounded-xl border border-border p-4">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">
                    Forensics Lab - Directe Vergelijking
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <select
                      value={compareMode?.[0] || ""}
                      onChange={(e) => setCompareMode([e.target.value, compareMode?.[1] || ""])}
                      className="px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                    >
                      <option value="">Selecteer speler 1</option>
                      {players.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <select
                      value={compareMode?.[1] || ""}
                      onChange={(e) => setCompareMode([compareMode?.[0] || "", e.target.value])}
                      className="px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                    >
                      <option value="">Selecteer speler 2</option>
                      {players.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {getCompareStats && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {getCompareStats.map((stats, idx) => (
                      <div
                        key={stats.name}
                        className="bg-bg-secondary rounded-xl border border-border p-4"
                      >
                        <h4
                          className="text-lg font-semibold mb-4"
                          style={{ color: getPlayerColor(stats.name) }}
                        >
                          {stats.name}
                        </h4>

                        <div className="space-y-4 text-sm">
                          {/* Stylometry */}
                          <div>
                            <div className="text-text-muted mb-2 font-semibold">Stylometrie</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-bg-tertiary p-2 rounded">
                                <span className="text-text-muted">Yule&apos;s K:</span>{" "}
                                <span className="text-text-primary font-mono">{stats.yulesK}</span>
                              </div>
                              <div className="bg-bg-tertiary p-2 rounded">
                                <span className="text-text-muted">Vocab:</span>{" "}
                                <span className="text-text-primary font-mono">
                                  {(stats.vocabularyRichness * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="bg-bg-tertiary p-2 rounded">
                                <span className="text-text-muted">Hapax:</span>{" "}
                                <span className="text-text-primary font-mono">
                                  {(stats.hapaxRatio * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="bg-bg-tertiary p-2 rounded">
                                <span className="text-text-muted">Wrd len:</span>{" "}
                                <span className="text-text-primary font-mono">{stats.avgWordLength}</span>
                              </div>
                            </div>
                          </div>

                          {/* Typos */}
                          <div>
                            <div className="text-text-muted mb-2 font-semibold">Typefouten</div>
                            <div className="flex flex-wrap gap-1">
                              {stats.typoPatterns.length > 0 ? (
                                stats.typoPatterns.map(t => (
                                  <span
                                    key={t}
                                    className={`px-2 py-1 rounded text-xs ${
                                      getCompareStats[1 - idx].typoPatterns.includes(t)
                                        ? "bg-error text-white font-bold"
                                        : "bg-bg-tertiary text-text-secondary"
                                    }`}
                                  >
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="text-text-muted">Geen gedetecteerd</span>
                              )}
                            </div>
                          </div>

                          {/* Substitutions */}
                          <div>
                            <div className="text-text-muted mb-2 font-semibold">Letter-substituties</div>
                            <div className="flex flex-wrap gap-1">
                              {stats.letterSubstitutions.size > 0 ? (
                                [...stats.letterSubstitutions.keys()].map(s => (
                                  <span
                                    key={s}
                                    className={`px-2 py-1 rounded text-xs ${
                                      getCompareStats[1 - idx].letterSubstitutions.has(s)
                                        ? "bg-warning text-black font-bold"
                                        : "bg-bg-tertiary text-text-secondary"
                                    }`}
                                  >
                                    {s}
                                  </span>
                                ))
                              ) : (
                                <span className="text-text-muted">Geen</span>
                              )}
                            </div>
                          </div>

                          {/* Common phrases */}
                          <div>
                            <div className="text-text-muted mb-2 font-semibold">Uitdrukkingen</div>
                            <div className="flex flex-wrap gap-1">
                              {stats.commonPhrases.slice(0, 5).map(p => (
                                <span
                                  key={p}
                                  className={`px-2 py-1 rounded text-xs ${
                                    getCompareStats[1 - idx].commonPhrases.includes(p)
                                      ? "bg-accent text-white font-bold"
                                      : "bg-bg-tertiary text-text-secondary"
                                  }`}
                                >
                                  &quot;{p}&quot;
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Punctuation */}
                          <div>
                            <div className="text-text-muted mb-2 font-semibold">Leestekens</div>
                            <div className="flex flex-wrap gap-1">
                              {stats.punctuationStyle.spaceBefore && (
                                <span className={`px-2 py-1 rounded text-xs ${
                                  getCompareStats[1 - idx].punctuationStyle.spaceBefore
                                    ? "bg-success text-white"
                                    : "bg-bg-tertiary text-text-secondary"
                                }`}>
                                  spatie voor ?!
                                </span>
                              )}
                              {stats.punctuationStyle.doublePunctuation && (
                                <span className={`px-2 py-1 rounded text-xs ${
                                  getCompareStats[1 - idx].punctuationStyle.doublePunctuation
                                    ? "bg-success text-white"
                                    : "bg-bg-tertiary text-text-secondary"
                                }`}>
                                  !! / ??
                                </span>
                              )}
                              {stats.punctuationStyle.ellipsisStyle !== "none" && (
                                <span className={`px-2 py-1 rounded text-xs ${
                                  getCompareStats[1 - idx].punctuationStyle.ellipsisStyle === stats.punctuationStyle.ellipsisStyle
                                    ? "bg-success text-white"
                                    : "bg-bg-tertiary text-text-secondary"
                                }`}>
                                  {stats.punctuationStyle.ellipsisStyle}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Word length distribution visualization */}
                          <div>
                            <div className="text-text-muted mb-2 font-semibold">Woordlengte distributie</div>
                            <div className="flex items-end gap-px h-16">
                              {stats.wordLengthDistribution.slice(1, 12).map((val, i) => (
                                <div
                                  key={i}
                                  className="flex-1 bg-accent/60 rounded-t"
                                  style={{ height: `${val * 100}%` }}
                                  title={`${i + 1} letters: ${(val * 100).toFixed(1)}%`}
                                ></div>
                              ))}
                            </div>
                            <div className="flex gap-px text-[8px] text-text-muted mt-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(n => (
                                <div key={n} className="flex-1 text-center">{n}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!getCompareStats && (
                  <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
                    <div className="text-4xl mb-4">&#128300;</div>
                    <p className="text-text-secondary">
                      Selecteer twee spelers om te vergelijken
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {messages.length === 0 && (
          <div className="bg-bg-secondary rounded-xl border border-border p-12 text-center">
            <div className="text-6xl mb-4">&#128172;</div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Upload een chat log om te beginnen
            </h2>
            <p className="text-text-secondary mb-4">
              Ondersteund formaat: [HH:MM:SS] &lt;SpelerNaam&gt; bericht
            </p>
            <div className="bg-bg-tertiary rounded-lg p-4 text-left font-mono text-sm max-w-md mx-auto">
              <div className="text-text-muted">[21:25:05] &lt;Shenjiwurm&gt; its alot of fun</div>
              <div className="text-text-muted">[21:25:12] &lt;Shenjiwurm&gt; they guys that are greifing me</div>
              <div className="text-text-muted">[21:25:18] &lt;Meemers&gt; ohh</div>
            </div>

            <div className="mt-8 text-left max-w-xl mx-auto">
              <h3 className="text-lg font-semibold text-text-primary mb-3">Forensische Technieken:</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-bg-tertiary rounded-lg p-3">
                  <div className="font-semibold text-error">Temporele Analyse</div>
                  <div className="text-text-muted">Detecteert accounts die nooit tegelijk online zijn</div>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-3">
                  <div className="font-semibold text-warning">N-gram Fingerprinting</div>
                  <div className="text-text-muted">Karakter-patronen identificeren schrijfstijl</div>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-3">
                  <div className="font-semibold text-info">Yule&apos;s K Stylometrie</div>
                  <div className="text-text-muted">Statistische auteurs-vingerafdruk</div>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-3">
                  <div className="font-semibold text-success">Netwerk Analyse</div>
                  <div className="text-text-muted">Interactie-patronen en gesprekspartners</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
