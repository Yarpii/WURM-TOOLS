// ============================================================================
// CHAT ANALYZER - LINGUISTIC FINGERPRINTING
// ============================================================================

import type { MicroPatterns, EmoticonStyle, PunctuationStyle } from "./types";
import { TYPO_CHECKS, LETTER_SUBSTITUTION_PATTERNS, EMOTE_PATTERNS } from "./constants";

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
