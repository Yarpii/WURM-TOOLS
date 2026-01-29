// ============================================================================
// CHAT ANALYZER - LINGUISTIC FINGERPRINTING
// ============================================================================

import type { MicroPatterns, EmoticonStyle, PunctuationStyle, FunctionWordProfile, ActivityPattern } from "./types";
import { TYPO_CHECKS, LETTER_SUBSTITUTION_PATTERNS, EMOTE_PATTERNS } from "./constants";

// ============================================================================
// FUNCTION WORD LISTS - Most reliable stylometry feature!
// ============================================================================

const ARTICLES = new Set(["the", "a", "an"]);
const PRONOUNS = new Set([
  "i", "me", "my", "myself", "mine",
  "you", "your", "yourself", "yours",
  "he", "him", "his", "himself",
  "she", "her", "hers", "herself",
  "it", "its", "itself",
  "we", "us", "our", "ourselves", "ours",
  "they", "them", "their", "themselves", "theirs",
  "who", "whom", "whose", "which", "that",
]);
const PREPOSITIONS = new Set([
  "in", "on", "at", "to", "for", "with", "by", "from", "about",
  "into", "through", "during", "before", "after", "above", "below",
  "between", "under", "over", "out", "up", "down", "off", "against",
]);
const CONJUNCTIONS = new Set([
  "and", "but", "or", "nor", "so", "yet", "for",
  "because", "although", "though", "while", "if", "when", "unless",
  "since", "until", "whereas", "whether",
]);
const AUXILIARIES = new Set([
  "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "having",
  "do", "does", "did", "doing",
  "will", "would", "shall", "should",
  "can", "could", "may", "might", "must",
]);
const QUANTIFIERS = new Set([
  "all", "some", "any", "many", "much", "few", "more", "most",
  "every", "each", "both", "several", "enough", "none", "no",
]);

// Greetings and farewells for behavioral fingerprinting
const GREETINGS = ["hi", "hey", "hello", "yo", "sup", "hiya", "heya", "hola", "greetings", "morning", "evening", "afternoon"];
const FAREWELLS = ["bye", "cya", "later", "bb", "goodbye", "night", "gnight", "gn", "ttyl", "bbl", "brb", "afk", "laterz", "peace", "ciao"];

/**
 * Character n-gram extraction (forensic linguistics technique)
 */
export function extractCharNgrams(text: string, n: number = 3): Map<string, number> {
  const ngrams = new Map<string, number>();
  const cleaned = text.toLowerCase().replace(/\s+/g, " ");

  for (let i = 0; i <= cleaned.length - n; i++) {
    const gram = cleaned.substring(i, i + n);
    ngrams.set(gram, (ngrams.get(gram) || 0) + 1);
  }

  return ngrams;
}

/**
 * Yule's K - measures vocabulary consistency (stylometry)
 */
export function calculateYulesK(words: string[]): number {
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

/**
 * Detect common typo patterns
 */
export function detectTypoPatterns(messages: string[]): string[] {
  const typoPatterns: string[] = [];
  const allText = messages.join(" ").toLowerCase();

  for (const check of TYPO_CHECKS) {
    if (check.pattern.test(allText)) {
      typoPatterns.push(check.label);
    }
  }

  return typoPatterns;
}

/**
 * Detect letter substitution patterns (txtspk)
 */
export function detectLetterSubstitutions(messages: string[]): Map<string, number> {
  const subs = new Map<string, number>();
  const allText = messages.join(" ").toLowerCase();

  for (const p of LETTER_SUBSTITUTION_PATTERNS) {
    const matches = allText.match(p.pattern);
    if (matches && matches.length > 0) {
      subs.set(p.label, matches.length);
    }
  }

  return subs;
}

/**
 * Analyze punctuation style (forensic fingerprint)
 */
export function analyzePunctuationStyle(messages: string[]): PunctuationStyle {
  const allText = messages.join(" ");

  return {
    spaceBefore: / [?!]/.test(allText),
    doublePunctuation: /[?!]{2,}/.test(allText),
    ellipsisStyle: /\.{3,}/.test(allText) ? "dots" : /…/.test(allText) ? "unicode" : "none",
    commaSpacing: /\s,/.test(allText), // Space before comma (unusual)
  };
}

/**
 * Calculate word length distribution
 */
export function calculateWordLengthDistribution(words: string[]): number[] {
  const dist = new Array(16).fill(0); // 0-14, 15+

  for (const word of words) {
    const len = Math.min(word.length, 15);
    dist[len]++;
  }

  // Normalize
  const total = words.length || 1;
  return dist.map(c => Math.round((c / total) * 1000) / 1000);
}

/**
 * Detect micro-patterns for forensic fingerprinting
 */
export function detectMicroPatterns(messages: string[]): MicroPatterns {
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

/**
 * Detect emoticon/emoji style fingerprint
 */
export function detectEmoticonStyle(messages: string[]): EmoticonStyle {
  const allText = messages.join(" ");

  // Check for nose in emoticons
  const noseEmotes = (allText.match(/:-[)(/\\|DPp]/g) || []).length;
  const noNoseEmotes = (allText.match(/(?<!:):[)(/\\|DPp]/g) || []).length;

  // Check for unicode emoji
  const emojiCount = (allText.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;

  // Common emotes tracking
  const foundEmotes: string[] = [];
  let totalEmoteCount = 0;

  for (const ep of EMOTE_PATTERNS) {
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
// NEW ADVANCED ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Extract word bigrams (pairs of consecutive words)
 * More specific than character n-grams for identifying writing patterns
 */
export function extractWordBigrams(messages: string[]): Map<string, number> {
  const bigrams = new Map<string, number>();

  for (const msg of messages) {
    const words = msg.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }
  }

  return bigrams;
}

/**
 * Analyze function word usage - THE MOST RELIABLE stylometry feature
 * Function words are unconsciously used and very hard to fake
 */
export function analyzeFunctionWords(messages: string[]): FunctionWordProfile {
  const allText = messages.join(" ").toLowerCase();
  const words = allText.split(/\s+/).filter(w => w.length > 0);
  const totalWords = words.length || 1;

  let articleCount = 0;
  let pronounCount = 0;
  let prepositionCount = 0;
  let conjunctionCount = 0;
  let auxiliaryCount = 0;
  let quantifierCount = 0;
  let iCount = 0;
  let weCount = 0;
  let butCount = 0;
  let andCount = 0;

  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, "");
    if (ARTICLES.has(clean)) articleCount++;
    if (PRONOUNS.has(clean)) pronounCount++;
    if (PREPOSITIONS.has(clean)) prepositionCount++;
    if (CONJUNCTIONS.has(clean)) conjunctionCount++;
    if (AUXILIARIES.has(clean)) auxiliaryCount++;
    if (QUANTIFIERS.has(clean)) quantifierCount++;

    if (clean === "i") iCount++;
    if (clean === "we" || clean === "us" || clean === "our") weCount++;
    if (clean === "but") butCount++;
    if (clean === "and") andCount++;
  }

  // Count question marks
  const questionCount = (allText.match(/\?/g) || []).length;

  return {
    articles: Math.round((articleCount / totalWords) * 1000) / 1000,
    pronouns: Math.round((pronounCount / totalWords) * 1000) / 1000,
    prepositions: Math.round((prepositionCount / totalWords) * 1000) / 1000,
    conjunctions: Math.round((conjunctionCount / totalWords) * 1000) / 1000,
    auxiliaries: Math.round((auxiliaryCount / totalWords) * 1000) / 1000,
    quantifiers: Math.round((quantifierCount / totalWords) * 1000) / 1000,
    iVsWe: weCount > 0 ? Math.round((iCount / weCount) * 100) / 100 : (iCount > 0 ? 10 : 0),
    butVsAnd: andCount > 0 ? Math.round((butCount / andCount) * 100) / 100 : 0,
    questionMarks: Math.round((questionCount / messages.length) * 100) / 100,
  };
}

/**
 * Calculate Simpson's Diversity Index
 * Measures vocabulary diversity - lower = more diverse
 */
export function calculateSimpsonsD(words: string[]): number {
  if (words.length < 2) return 0;

  const freqMap = new Map<string, number>();
  for (const word of words) {
    const w = word.toLowerCase();
    freqMap.set(w, (freqMap.get(w) || 0) + 1);
  }

  const N = words.length;
  let sum = 0;
  for (const count of freqMap.values()) {
    sum += count * (count - 1);
  }

  // D = sum(n(n-1)) / N(N-1)
  const D = sum / (N * (N - 1));
  return Math.round(D * 10000) / 10000;
}

/**
 * Calculate Brunet's W statistic
 * More stable measure of vocabulary richness
 * W = N^(V^(-0.172)) where N = total words, V = unique words
 */
export function calculateBrunetsW(words: string[]): number {
  if (words.length === 0) return 0;

  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const N = words.length;
  const V = uniqueWords.size;

  if (V === 0) return 0;

  // W = N^(V^(-0.172))
  const W = Math.pow(N, Math.pow(V, -0.172));
  return Math.round(W * 100) / 100;
}

/**
 * Analyze punctuation frequency (more detailed than style)
 */
export function analyzePunctuationFrequency(messages: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  const allText = messages.join(" ");
  const totalChars = allText.length || 1;

  const punctuation = [".", ",", "!", "?", ":", ";", "-", "'", '"', "(", ")", "...", "..."];

  for (const p of punctuation) {
    const regex = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const count = (allText.match(regex) || []).length;
    if (count > 0) {
      // Normalize per 1000 characters
      freq.set(p, Math.round((count / totalChars) * 1000 * 100) / 100);
    }
  }

  return freq;
}

/**
 * Calculate message length distribution
 */
export function calculateMessageLengthDistribution(messages: string[]): number[] {
  // Buckets: 0-10, 11-20, 21-30, 31-50, 51-75, 76-100, 101-150, 151+
  const buckets = [10, 20, 30, 50, 75, 100, 150, Infinity];
  const dist = new Array(buckets.length).fill(0);

  for (const msg of messages) {
    const len = msg.length;
    for (let i = 0; i < buckets.length; i++) {
      if (len <= buckets[i]) {
        dist[i]++;
        break;
      }
    }
  }

  // Normalize
  const total = messages.length || 1;
  return dist.map(c => Math.round((c / total) * 1000) / 1000);
}

/**
 * Analyze activity pattern (time of day preference)
 */
export function analyzeActivityPattern(
  messageTimes: number[],
  sessionGaps: number[]
): ActivityPattern {
  let morning = 0;   // 6am-12pm (6*3600 to 12*3600)
  let afternoon = 0; // 12pm-6pm (12*3600 to 18*3600)
  let evening = 0;   // 6pm-12am (18*3600 to 24*3600)
  let night = 0;     // 12am-6am (0 to 6*3600)

  for (const time of messageTimes) {
    const seconds = time % 86400; // Normalize to day
    if (seconds >= 6 * 3600 && seconds < 12 * 3600) morning++;
    else if (seconds >= 12 * 3600 && seconds < 18 * 3600) afternoon++;
    else if (seconds >= 18 * 3600) evening++;
    else night++;
  }

  const total = messageTimes.length || 1;

  // Calculate burstiness (coefficient of variation of gaps)
  let burstiness = 0;
  if (sessionGaps.length > 1) {
    const mean = sessionGaps.reduce((a, b) => a + b, 0) / sessionGaps.length;
    const variance = sessionGaps.reduce((sum, gap) => sum + Math.pow(gap - mean, 2), 0) / sessionGaps.length;
    const stdDev = Math.sqrt(variance);
    burstiness = mean > 0 ? Math.min(stdDev / mean, 3) / 3 : 0; // Normalize to 0-1
  }

  // Calculate average session length
  const SESSION_GAP_THRESHOLD = 600; // 10 minutes
  let sessionCount = 1;
  let totalSessionTime = 0;
  let sessionStart = messageTimes[0] || 0;

  for (let i = 1; i < messageTimes.length; i++) {
    const gap = messageTimes[i] - messageTimes[i - 1];
    if (gap > SESSION_GAP_THRESHOLD) {
      totalSessionTime += messageTimes[i - 1] - sessionStart;
      sessionStart = messageTimes[i];
      sessionCount++;
    }
  }
  if (messageTimes.length > 0) {
    totalSessionTime += messageTimes[messageTimes.length - 1] - sessionStart;
  }

  return {
    morningActive: Math.round((morning / total) * 1000) / 1000,
    afternoonActive: Math.round((afternoon / total) * 1000) / 1000,
    eveningActive: Math.round((evening / total) * 1000) / 1000,
    nightActive: Math.round((night / total) * 1000) / 1000,
    burstiness: Math.round(burstiness * 1000) / 1000,
    avgSessionLength: sessionCount > 0 ? Math.round(totalSessionTime / sessionCount / 60) : 0, // in minutes
  };
}

/**
 * Detect greeting style
 */
export function detectGreetingStyle(messages: string[]): string[] {
  const found: string[] = [];

  for (const greeting of GREETINGS) {
    const pattern = new RegExp(`^${greeting}\\b|\\b${greeting}$|^${greeting}$`, "i");
    const count = messages.filter(m => pattern.test(m.trim())).length;
    if (count >= 2) {
      found.push(greeting);
    }
  }

  return found.slice(0, 5);
}

/**
 * Detect farewell style
 */
export function detectFarewellStyle(messages: string[]): string[] {
  const found: string[] = [];

  for (const farewell of FAREWELLS) {
    const pattern = new RegExp(`^${farewell}\\b|\\b${farewell}$|^${farewell}$`, "i");
    const count = messages.filter(m => pattern.test(m.trim())).length;
    if (count >= 2) {
      found.push(farewell);
    }
  }

  return found.slice(0, 5);
}

/**
 * Extract common ending words/phrases
 */
export function extractCommonEnders(messages: string[]): string[] {
  const enders: Record<string, number> = {};

  for (const msg of messages) {
    const words = msg.trim().split(/\s+/);
    if (words.length > 0) {
      const lastWord = words[words.length - 1].toLowerCase().replace(/[^a-z]/g, "");
      if (lastWord && lastWord.length > 1) {
        enders[lastWord] = (enders[lastWord] || 0) + 1;
      }
    }
  }

  return Object.entries(enders)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

/**
 * Compare function word profiles - returns similarity score 0-1
 */
export function compareFunctionWordProfiles(p1: FunctionWordProfile, p2: FunctionWordProfile): number {
  const weights = {
    articles: 1.0,
    pronouns: 1.5,
    prepositions: 1.2,
    conjunctions: 1.3,
    auxiliaries: 1.0,
    quantifiers: 0.8,
    iVsWe: 1.5,
    butVsAnd: 1.2,
    questionMarks: 1.0,
  };

  let totalDiff = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const v1 = p1[key as keyof FunctionWordProfile];
    const v2 = p2[key as keyof FunctionWordProfile];
    // Normalize difference based on expected range
    const maxVal = Math.max(v1, v2, 0.1);
    const diff = Math.abs(v1 - v2) / maxVal;
    totalDiff += diff * weight;
    totalWeight += weight;
  }

  // Convert to similarity (1 = identical, 0 = very different)
  const avgDiff = totalDiff / totalWeight;
  return Math.max(0, 1 - avgDiff);
}

/**
 * Compare activity patterns - returns similarity score 0-1
 */
export function compareActivityPatterns(p1: ActivityPattern, p2: ActivityPattern): number {
  // Compare time-of-day distributions
  const timeDiff =
    Math.abs(p1.morningActive - p2.morningActive) +
    Math.abs(p1.afternoonActive - p2.afternoonActive) +
    Math.abs(p1.eveningActive - p2.eveningActive) +
    Math.abs(p1.nightActive - p2.nightActive);

  // Max possible diff is 2.0 (if completely opposite schedules)
  const timeSimilarity = 1 - (timeDiff / 2);

  // Compare burstiness
  const burstDiff = Math.abs(p1.burstiness - p2.burstiness);
  const burstSimilarity = 1 - burstDiff;

  // Weighted average (time patterns more important)
  return timeSimilarity * 0.7 + burstSimilarity * 0.3;
}

/**
 * Compare word bigrams using Jaccard similarity
 */
export function compareWordBigrams(b1: Map<string, number>, b2: Map<string, number>): number {
  if (b1.size === 0 || b2.size === 0) return 0;

  // Only consider bigrams used 2+ times (to avoid noise)
  const set1 = new Set([...b1.entries()].filter(([, c]) => c >= 2).map(([k]) => k));
  const set2 = new Set([...b2.entries()].filter(([, c]) => c >= 2).map(([k]) => k));

  if (set1.size === 0 || set2.size === 0) return 0;

  let intersection = 0;
  for (const bigram of set1) {
    if (set2.has(bigram)) intersection++;
  }

  const union = set1.size + set2.size - intersection;
  return union > 0 ? intersection / union : 0;
}
