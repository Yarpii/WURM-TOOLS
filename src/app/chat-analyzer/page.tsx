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
}

interface AdvancedPlayerStats {
  name: string;
  messageCount: number;
  wordCount: number;
  avgWordsPerMessage: number;

  // Temporal patterns
  activeMinutes: Set<number>; // Minutes in the day they were active
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

  // Raw data for comparison
  allMessages: string[];
  messageTimes: number[];
}

interface AltSuspicion {
  player1: string;
  player2: string;
  confidence: number;
  category: "critical" | "high" | "medium" | "low";
  reasons: AltReason[];
  neverOnlineTogether: boolean;
  similarityScore: number;
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

function parseChatLine(line: string, lineNumber: number): ChatMessage | null {
  const match = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*<([^>]+)>\s*(.*)$/);
  if (!match) return null;

  return {
    timestamp: match[1],
    player: match[2],
    message: match[3],
    lineNumber,
    timeSeconds: parseTimeToSeconds(match[1]),
  };
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

  // Active minutes (for temporal analysis)
  const activeMinutes = new Set<number>();
  const messageTimes: number[] = [];
  for (const msg of playerMessages) {
    const mins = Math.floor(msg.timeSeconds / 60);
    activeMinutes.add(mins);
    messageTimes.push(msg.timeSeconds);
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
    sessionGaps,
    avgResponseTime,

    charNgrams: extractCharNgrams(allText),
    typoPatterns: detectTypoPatterns(texts),
    punctuationStyle: analyzePunctuationStyle(texts),
    letterSubstitutions: detectLetterSubstitutions(texts),

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

    allMessages: texts,
    messageTimes,
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

  for (let i = 0; i < stats.length; i++) {
    for (let j = i + 1; j < stats.length; j++) {
      const p1 = stats[i];
      const p2 = stats[j];

      // STRICTER: Require at least 15 messages each for reliable analysis
      if (p1.messageCount < 15 || p2.messageCount < 15) continue;

      const reasons: AltReason[] = [];
      let totalScore = 0;

      // ========== TEMPORAL ANALYSIS ==========

      // Check if never online together (CRITICAL indicator)
      // STRICTER: Both need at least 30 minutes of activity for this to be meaningful
      const overlap = new Set([...p1.activeMinutes].filter(m => p2.activeMinutes.has(m)));
      const minActivity = Math.min(p1.activeMinutes.size, p2.activeMinutes.size);
      const neverOnlineTogether = overlap.size === 0 &&
        p1.activeMinutes.size >= 30 &&
        p2.activeMinutes.size >= 30;

      if (neverOnlineTogether) {
        totalScore += 40;
        reasons.push({
          type: "temporal",
          description: "Nooit tegelijk online",
          weight: 40,
          evidence: `${p1.name}: ${p1.activeMinutes.size} min actief, ${p2.name}: ${p2.activeMinutes.size} min actief, 0 overlap`,
        });
      } else if (overlap.size > 0 && minActivity >= 20 && overlap.size < minActivity * 0.05) {
        // STRICTER: Less than 5% overlap with significant activity
        totalScore += 20;
        reasons.push({
          type: "temporal",
          description: "Zeer weinig tijd overlap",
          weight: 20,
          evidence: `Slechts ${overlap.size} van ${minActivity} minuten overlap (${Math.round(overlap.size/minActivity*100)}%)`,
        });
      }

      // ========== LINGUISTIC FINGERPRINT ==========

      // Character n-gram similarity (powerful forensic technique)
      // STRICTER: Require very high similarity (0.92+) for this to be meaningful
      const ngramSim = cosineSimilarity(p1.charNgrams, p2.charNgrams);
      if (ngramSim > 0.92) {
        totalScore += 30;
        reasons.push({
          type: "linguistic",
          description: "Sterke karakter-patroon match (forensisch)",
          weight: 30,
          evidence: `${Math.round(ngramSim * 100)}% n-gram overeenkomst`,
        });
      } else if (ngramSim > 0.85) {
        totalScore += 15;
        reasons.push({
          type: "linguistic",
          description: "Vergelijkbare karakterpatronen",
          weight: 15,
          evidence: `${Math.round(ngramSim * 100)}% n-gram overeenkomst`,
        });
      }

      // Same typo patterns (very distinctive) - KEEP, this is strong evidence
      const sharedTypos = p1.typoPatterns.filter(t => p2.typoPatterns.includes(t));
      if (sharedTypos.length >= 2) {
        totalScore += 25;
        reasons.push({
          type: "linguistic",
          description: "Dezelfde typefouten",
          weight: 25,
          evidence: sharedTypos.join(", "),
        });
      }

      // Letter substitution patterns - STRICTER: need multiple matches
      const sharedSubs = [...p1.letterSubstitutions.keys()].filter(k => p2.letterSubstitutions.has(k));
      if (sharedSubs.length >= 3) {
        totalScore += 20;
        reasons.push({
          type: "linguistic",
          description: "Zelfde afkortingsstijl",
          weight: 20,
          evidence: sharedSubs.slice(0, 4).join(", "),
        });
      }

      // ========== STATISTICAL STYLOMETRY ==========
      // REMOVED: Yule's K, vocabulary richness, word length distribution
      // These are too prone to false positives with chat data

      // ========== BEHAVIORAL ANALYSIS ==========

      // Phrase overlap (very distinctive) - STRICTER: need unique phrases
      const phraseOverlap = p1.commonPhrases.filter(p =>
        p2.commonPhrases.includes(p) && p.split(' ').length >= 3
      );
      if (phraseOverlap.length >= 2) {
        totalScore += 25;
        reasons.push({
          type: "behavioral",
          description: "Dezelfde unieke uitdrukkingen",
          weight: 25,
          evidence: phraseOverlap.slice(0, 2).map(p => `"${p}"`).join(", "),
        });
      } else if (phraseOverlap.length === 1) {
        totalScore += 12;
        reasons.push({
          type: "behavioral",
          description: "Gedeelde uitdrukking",
          weight: 12,
          evidence: `"${phraseOverlap[0]}"`,
        });
      }

      // ========== NETWORK ANALYSIS ==========

      // Check if they NEVER interact with each other
      // STRICTER: Need more messages and check more thoroughly
      const p1MentionsP2 = p1.mentionedPlayers.has(p2.name);
      const p2MentionsP1 = p2.mentionedPlayers.has(p1.name);
      const p1RespondsToP2 = p1.responsePartners.has(p2.name);
      const p2RespondsToP1 = p2.responsePartners.has(p1.name);

      if (!p1MentionsP2 && !p2MentionsP1 && !p1RespondsToP2 && !p2RespondsToP1 &&
          p1.messageCount >= 25 && p2.messageCount >= 25) {
        totalScore += 15;
        reasons.push({
          type: "network",
          description: "Nooit interactie met elkaar",
          weight: 15,
          evidence: "Geen mentions of reacties onderling ondanks veel berichten",
        });
      }

      // Store in matrix
      scores[i][j] = totalScore;
      scores[j][i] = totalScore;

      // STRICTER: Only add if significant evidence
      // Need score >= 50 AND at least 2 strong reasons
      const strongReasons = reasons.filter(r => r.weight >= 15);
      if (totalScore >= 50 && strongReasons.length >= 2) {
        const confidence = Math.min(Math.round(totalScore * 0.7), 99);

        let category: AltSuspicion["category"];
        // STRICTER: Critical only if temporal + other strong evidence
        if (neverOnlineTogether && strongReasons.length >= 2) category = "critical";
        else if (confidence >= 70) category = "high";
        else if (confidence >= 50) category = "medium";
        else category = "low";

        suspicions.push({
          player1: p1.name,
          player2: p2.name,
          confidence,
          category,
          reasons: reasons.sort((a, b) => b.weight - a.weight),
          neverOnlineTogether,
          similarityScore: totalScore,
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

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
      parseChat(text);
    };
    reader.readAsText(file);
  }, []);

  const parseChat = useCallback((text: string) => {
    const lines = text.split("\n");
    const parsed: ChatMessage[] = [];

    for (let i = 0; i < lines.length; i++) {
      const msg = parseChatLine(lines[i].trim(), i + 1);
      if (msg) {
        parsed.push(msg);
      }
    }

    setMessages(parsed);
    setSelectedPlayer(null);
    setCompareMode(null);
  }, []);

  const handlePaste = useCallback(() => {
    if (rawText) {
      parseChat(rawText);
    }
  }, [rawText, parseChat]);

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
              <label className="block text-sm text-text-secondary mb-2">Upload .txt bestand</label>
              <input
                type="file"
                accept=".txt,.log"
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
                        <strong>Forensische Analyse:</strong> Deze tool gebruikt karakter n-gram analyse,
                        Yule&apos;s K stylometrie, temporele patronen, en netwerk analyse om alt-accounts te detecteren.
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
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span
                              className="font-semibold"
                              style={{ color: getPlayerColor(suspicion.player1) }}
                            >
                              {suspicion.player1}
                            </span>
                            <span className="text-text-muted">&#8596;</span>
                            <span
                              className="font-semibold"
                              style={{ color: getPlayerColor(suspicion.player2) }}
                            >
                              {suspicion.player2}
                            </span>
                            {suspicion.neverOnlineTogether && (
                              <span className="px-2 py-1 bg-error text-white text-xs rounded font-bold">
                                NOOIT SAMEN ONLINE
                              </span>
                            )}
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {suspicion.reasons.map((reason, i) => (
                            <div
                              key={i}
                              className={`flex items-start gap-2 text-sm p-2 rounded ${
                                reason.type === "temporal" ? "bg-error/10" :
                                reason.type === "linguistic" ? "bg-warning/10" :
                                reason.type === "stylometry" ? "bg-info/10" :
                                reason.type === "network" ? "bg-success/10" :
                                "bg-bg-tertiary"
                              }`}
                            >
                              <span className={`text-xs font-bold uppercase shrink-0 ${
                                reason.type === "temporal" ? "text-error" :
                                reason.type === "linguistic" ? "text-warning" :
                                reason.type === "stylometry" ? "text-info" :
                                reason.type === "network" ? "text-success" :
                                "text-text-muted"
                              }`}>
                                {reason.type}
                              </span>
                              <div>
                                <div className="text-text-primary">{reason.description}</div>
                                {reason.evidence && (
                                  <div className="text-text-muted text-xs mt-1">{reason.evidence}</div>
                                )}
                              </div>
                              <span className="text-text-muted text-xs ml-auto">+{reason.weight}</span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-border flex gap-2">
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
