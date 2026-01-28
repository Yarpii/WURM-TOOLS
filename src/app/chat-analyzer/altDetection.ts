// ============================================================================
// CHAT ANALYZER - ALT DETECTION ENGINE (v4.1 - Social Analysis)
// ============================================================================

import type { ChatMessage, AdvancedPlayerStats, AltSuspicion, SimilarityMatrix, ScoreBreakdown, HandoffResult } from "./types";
import { STOP_WORDS, ALGORITHM_CONFIGS, type AlgorithmMode, type AlgorithmConfig } from "./constants";
import { cosineSimilarity, distributionSimilarity } from "./utils";
import { buildRareWordIndex, detectSharedRareWords, detectSelfTalk, detectSlips, generateSocialInsights } from "./behavioral";
import { generateHumanExplanation } from "./playerAnalysis";
import { compareFunctionWordProfiles, compareActivityPatterns, compareWordBigrams } from "./linguistic";
import type { SocialInsight, SlipPattern } from "./types";

/**
 * Detect handoff pattern between two players
 * (When one player stops, the other starts within a short window)
 */
export function detectHandoffPattern(
  p1: AdvancedPlayerStats,
  p2: AdvancedPlayerStats,
  messages: ChatMessage[]
): HandoffResult {
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

/**
 * Main alt detection engine (v4.1 - Social Analysis)
 * Uses advanced stylometry, function words, social analysis, and self-talk detection
 * @param stats - Player statistics array
 * @param messages - All chat messages
 * @param mode - Algorithm mode to use (default: "balanced")
 */
export function detectAltsAdvanced(
  stats: AdvancedPlayerStats[],
  messages: ChatMessage[],
  mode: AlgorithmMode = "balanced"
): {
  suspicions: AltSuspicion[];
  matrix: SimilarityMatrix;
  config: AlgorithmConfig;
  socialInsights: SocialInsight[];
  slipPatterns: SlipPattern[];
} {
  const config = ALGORITHM_CONFIGS[mode];
  const suspicions: AltSuspicion[] = [];
  const players = stats.map(s => s.name);
  const scores: number[][] = players.map(() => players.map(() => 0));

  // Build rare word index for all players
  const rareWordIndex = buildRareWordIndex(stats);

  // NEW v4.1: Detect self-talk patterns (accounts talking to each other with same style)
  const selfTalkIndicators = detectSelfTalk(stats, messages);
  const selfTalkMap = new Map<string, number>();
  for (const indicator of selfTalkIndicators) {
    const key = [indicator.player1, indicator.player2].sort().join("|");
    selfTalkMap.set(key, indicator.suspicionScore);
  }

  // NEW v4.1: Detect slips and social insights
  const slipPatterns = detectSlips(stats, messages);
  const socialInsights = generateSocialInsights(stats, messages);

  // Calculate total days from messages
  const totalDays = messages.length > 0
    ? Math.max(...messages.map(m => m.dayIndex)) + 1
    : 1;

  for (let i = 0; i < stats.length; i++) {
    for (let j = i + 1; j < stats.length; j++) {
      const p1 = stats[i];
      const p2 = stats[j];

      // Require minimum messages for reliable analysis (configurable)
      if (p1.messageCount < config.minMessages || p2.messageCount < config.minMessages) continue;

      const reasons: { type: string; description: string; weight: number; evidence?: string }[] = [];
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

      const overlap = new Set([...p1.activeMinutes].filter(m => p2.activeMinutes.has(m)));
      const minActivity = Math.min(p1.activeMinutes.size, p2.activeMinutes.size);
      const neverOnlineTogether = overlap.size === 0 &&
        p1.activeMinutes.size >= 30 &&
        p2.activeMinutes.size >= 30;

      if (neverOnlineTogether) {
        const baseScore = 45;
        const weightedScore = Math.round(baseScore * config.temporalWeight);
        scoreBreakdown.temporal += weightedScore;
        reasons.push({
          type: "temporal",
          description: "Never online at the same time",
          weight: weightedScore,
          evidence: `${p1.name}: ${p1.activeMinutes.size} min active, ${p2.name}: ${p2.activeMinutes.size} min active, 0 overlap`,
        });
      } else if (overlap.size > 0 && minActivity >= 30 && overlap.size < minActivity * 0.03) {
        const baseScore = 25;
        const weightedScore = Math.round(baseScore * config.temporalWeight);
        scoreBreakdown.temporal += weightedScore;
        reasons.push({
          type: "temporal",
          description: "Minimal time overlap",
          weight: weightedScore,
          evidence: `Only ${overlap.size} of ${minActivity} minutes overlap (${Math.round(overlap.size/minActivity*100)}%)`,
        });
      }

      // ========== ACTIVITY PATTERN ANALYSIS (NEW) ==========
      // Check if they have complementary schedules

      const activitySimilarity = compareActivityPatterns(p1.activityPattern, p2.activityPattern);
      // If activity patterns are DIFFERENT but both have 0 overlap, that's suspicious
      if (neverOnlineTogether && activitySimilarity < 0.4) {
        const baseScore = 15;
        const weightedScore = Math.round(baseScore * config.temporalWeight);
        scoreBreakdown.temporal += weightedScore;
        reasons.push({
          type: "temporal",
          description: "Complementary schedules",
          weight: weightedScore,
          evidence: `Different time-of-day patterns (${Math.round(activitySimilarity * 100)}% similar)`,
        });
      }

      // ========== HANDOFF PATTERN DETECTION ==========

      const handoffData = detectHandoffPattern(p1, p2, messages);
      if (handoffData.score > 0) {
        const weightedScore = Math.round(handoffData.score * config.handoffWeight);
        scoreBreakdown.handoff = weightedScore;
        reasons.push({
          type: "temporal",
          description: "Handoff pattern detected",
          weight: weightedScore,
          evidence: `${handoffData.handoffCount} of ${handoffData.totalTransitions} session transitions are handoffs (${Math.round(handoffData.handoffCount/handoffData.totalTransitions*100)}%)`,
        });
      }

      // ========== FUNCTION WORD ANALYSIS (NEW - MOST RELIABLE!) ==========
      // Function words are unconsciously used and very hard to fake

      const functionWordSim = compareFunctionWordProfiles(p1.functionWords, p2.functionWords);
      if (functionWordSim > config.functionWordThresholdHigh) {
        const baseScore = 35;
        const weightedScore = Math.round(baseScore * config.functionWordWeight * config.linguisticWeight);
        scoreBreakdown.linguistic += weightedScore;
        reasons.push({
          type: "linguistic",
          description: "Nearly identical function word usage",
          weight: weightedScore,
          evidence: `${Math.round(functionWordSim * 100)}% function word similarity (articles, pronouns, prepositions)`,
        });
      } else if (functionWordSim > config.functionWordThresholdMed) {
        const baseScore = 25;
        const weightedScore = Math.round(baseScore * config.functionWordWeight * config.linguisticWeight);
        scoreBreakdown.linguistic += weightedScore;
        reasons.push({
          type: "linguistic",
          description: "Very similar function word usage",
          weight: weightedScore,
          evidence: `${Math.round(functionWordSim * 100)}% function word similarity`,
        });
      } else if (functionWordSim > config.functionWordThresholdMed - 0.07) {
        const baseScore = 15;
        const weightedScore = Math.round(baseScore * config.functionWordWeight * config.linguisticWeight);
        scoreBreakdown.linguistic += weightedScore;
        reasons.push({
          type: "linguistic",
          description: "Similar function word patterns",
          weight: weightedScore,
          evidence: `${Math.round(functionWordSim * 100)}% function word similarity`,
        });
      }

      // ========== VOCABULARY COMPLEXITY MATCHING (NEW) ==========
      // Compare Simpson's D and Brunet's W

      const simpsonsDiff = Math.abs(p1.simpsonsD - p2.simpsonsD);
      const brunetsWDiff = Math.abs(p1.brunetsW - p2.brunetsW);
      const yulesKDiff = Math.abs(p1.yulesK - p2.yulesK);

      // All three metrics should be similar for same author
      if (simpsonsDiff < 0.01 && brunetsWDiff < 1 && yulesKDiff < 20) {
        const baseScore = 20;
        const weightedScore = Math.round(baseScore * config.linguisticWeight);
        scoreBreakdown.linguistic += weightedScore;
        reasons.push({
          type: "linguistic",
          description: "Matching vocabulary complexity",
          weight: weightedScore,
          evidence: `Simpson's D: ${simpsonsDiff.toFixed(3)} diff, Brunet's W: ${brunetsWDiff.toFixed(1)} diff, Yule's K: ${yulesKDiff.toFixed(0)} diff`,
        });
      } else if (simpsonsDiff < 0.02 && brunetsWDiff < 2 && yulesKDiff < 40) {
        const baseScore = 10;
        const weightedScore = Math.round(baseScore * config.linguisticWeight);
        scoreBreakdown.linguistic += weightedScore;
        reasons.push({
          type: "linguistic",
          description: "Similar vocabulary complexity",
          weight: weightedScore,
          evidence: `Simpson's D: ${simpsonsDiff.toFixed(3)} diff, Yule's K: ${yulesKDiff.toFixed(0)} diff`,
        });
      }

      // ========== WORD BIGRAM ANALYSIS (NEW) ==========

      const bigramSimilarity = compareWordBigrams(p1.wordBigrams, p2.wordBigrams);
      if (bigramSimilarity > 0.25) {
        const baseScore = 20;
        const weightedScore = Math.round(baseScore * config.linguisticWeight);
        scoreBreakdown.linguistic += weightedScore;
        reasons.push({
          type: "linguistic",
          description: "Shared word pair patterns",
          weight: weightedScore,
          evidence: `${Math.round(bigramSimilarity * 100)}% bigram overlap`,
        });
      } else if (bigramSimilarity > 0.15) {
        const baseScore = 10;
        const weightedScore = Math.round(baseScore * config.linguisticWeight);
        scoreBreakdown.linguistic += weightedScore;
        reasons.push({
          type: "linguistic",
          description: "Similar word pair usage",
          weight: weightedScore,
          evidence: `${Math.round(bigramSimilarity * 100)}% bigram overlap`,
        });
      }

      // ========== MESSAGE LENGTH DISTRIBUTION (NEW) ==========

      const msgLenSim = distributionSimilarity(p1.messageLengthDistribution, p2.messageLengthDistribution);
      if (msgLenSim > 0.92) {
        const baseScore = 15;
        const weightedScore = Math.round(baseScore * config.behavioralWeight);
        scoreBreakdown.behavioral += weightedScore;
        reasons.push({
          type: "behavioral",
          description: "Same message length patterns",
          weight: weightedScore,
          evidence: `${Math.round(msgLenSim * 100)}% message length distribution match`,
        });
      }

      // ========== RARE WORD FINGERPRINT ==========

      const sharedRareWords = detectSharedRareWords(p1, p2, rareWordIndex, stats.length);
      if (sharedRareWords.length >= 5) {
        const baseScore = 30;
        const weightedScore = Math.round(baseScore * config.rareWordWeight);
        scoreBreakdown.rareWords = weightedScore;
        reasons.push({
          type: "linguistic",
          description: "Multiple shared rare words",
          weight: weightedScore,
          evidence: `${sharedRareWords.length} rare words: ${sharedRareWords.slice(0, 5).join(", ")}`,
        });
      } else if (sharedRareWords.length >= 3) {
        const baseScore = 18;
        const weightedScore = Math.round(baseScore * config.rareWordWeight);
        scoreBreakdown.rareWords = weightedScore;
        reasons.push({
          type: "linguistic",
          description: "Some shared rare words",
          weight: weightedScore,
          evidence: `${sharedRareWords.length} rare words: ${sharedRareWords.join(", ")}`,
        });
      }

      // ========== CHARACTER N-GRAM SIMILARITY ==========

      const ngramSim = cosineSimilarity(p1.charNgrams, p2.charNgrams);
      if (ngramSim > config.ngramThresholdHigh) {
        const baseScore = 20;
        const weightedScore = Math.round(baseScore * config.ngramWeight * config.linguisticWeight);
        scoreBreakdown.linguistic += weightedScore;
        reasons.push({
          type: "linguistic",
          description: "Nearly identical character patterns",
          weight: weightedScore,
          evidence: `${Math.round(ngramSim * 100)}% n-gram similarity`,
        });
      } else if (ngramSim > config.ngramThresholdMed) {
        const baseScore = 12;
        const weightedScore = Math.round(baseScore * config.ngramWeight * config.linguisticWeight);
        scoreBreakdown.linguistic += weightedScore;
        reasons.push({
          type: "linguistic",
          description: "Very high character pattern match",
          weight: weightedScore,
          evidence: `${Math.round(ngramSim * 100)}% n-gram similarity`,
        });
      }

      // ========== TYPO PATTERNS ==========

      const sharedTypos = p1.typoPatterns.filter(t => p2.typoPatterns.includes(t));
      if (sharedTypos.length >= 3) {
        const baseScore = 25;
        const weightedScore = Math.round(baseScore * config.typoWeight * config.linguisticWeight);
        scoreBreakdown.linguistic += weightedScore;
        reasons.push({
          type: "linguistic",
          description: "Same distinctive typos",
          weight: weightedScore,
          evidence: sharedTypos.join(", "),
        });
      } else if (sharedTypos.length === 2) {
        const baseScore = 12;
        const weightedScore = Math.round(baseScore * config.typoWeight * config.linguisticWeight);
        scoreBreakdown.linguistic += weightedScore;
        reasons.push({
          type: "linguistic",
          description: "Shared typo patterns",
          weight: weightedScore,
          evidence: sharedTypos.join(", "),
        });
      }

      // ========== GREETING/FAREWELL STYLE (NEW) ==========

      const sharedGreetings = p1.greetingStyle.filter(g => p2.greetingStyle.includes(g));
      const sharedFarewells = p1.farewellStyle.filter(f => p2.farewellStyle.includes(f));

      if (sharedGreetings.length >= 2 && sharedFarewells.length >= 2) {
        const baseScore = 15;
        const weightedScore = Math.round(baseScore * config.behavioralWeight);
        scoreBreakdown.behavioral += weightedScore;
        reasons.push({
          type: "behavioral",
          description: "Same greeting and farewell style",
          weight: weightedScore,
          evidence: `Greets: ${sharedGreetings.join(", ")} | Farewells: ${sharedFarewells.join(", ")}`,
        });
      } else if (sharedGreetings.length + sharedFarewells.length >= 3) {
        const baseScore = 8;
        const weightedScore = Math.round(baseScore * config.behavioralWeight);
        scoreBreakdown.behavioral += weightedScore;
        reasons.push({
          type: "behavioral",
          description: "Similar greeting/farewell patterns",
          weight: weightedScore,
          evidence: `${sharedGreetings.length} greetings, ${sharedFarewells.length} farewells match`,
        });
      }

      // ========== MICRO-PATTERNS ==========

      const microMatches: string[] = [];
      if (p1.microPatterns.doubleSpaces && p2.microPatterns.doubleSpaces) microMatches.push("double spaces");
      if (p1.microPatterns.noSpaceAfterPunct && p2.microPatterns.noSpaceAfterPunct) microMatches.push("no space after punct");
      if (p1.microPatterns.excessiveCaps && p2.microPatterns.excessiveCaps) microMatches.push("EXCESSIVE CAPS");

      const commonMicroMatches: string[] = [];
      if (p1.microPatterns.lowercaseI && p2.microPatterns.lowercaseI) commonMicroMatches.push("lowercase i");
      if (p1.microPatterns.allLowercase && p2.microPatterns.allLowercase) commonMicroMatches.push("all lowercase");
      if (p1.microPatterns.noCapitalStart && p2.microPatterns.noCapitalStart) commonMicroMatches.push("no capital start");
      if (p1.microPatterns.numberSubstitution && p2.microPatterns.numberSubstitution) commonMicroMatches.push("number subs");

      if (microMatches.length >= 2) {
        const baseScore = 18;
        const weightedScore = Math.round(baseScore * config.linguisticWeight);
        scoreBreakdown.linguistic += weightedScore;
        reasons.push({
          type: "linguistic",
          description: "Distinctive micro-pattern match",
          weight: weightedScore,
          evidence: microMatches.join(", "),
        });
      } else if (microMatches.length >= 1 && commonMicroMatches.length >= 2) {
        const baseScore = 10;
        const weightedScore = Math.round(baseScore * config.linguisticWeight);
        scoreBreakdown.linguistic += weightedScore;
        reasons.push({
          type: "linguistic",
          description: "Shared typing quirks",
          weight: weightedScore,
          evidence: [...microMatches, ...commonMicroMatches].join(", "),
        });
      }

      // ========== PHRASE OVERLAP ==========

      const phraseOverlap = p1.commonPhrases.filter(p =>
        p2.commonPhrases.includes(p) && p.split(' ').length >= 3
      );
      if (phraseOverlap.length >= 3) {
        const baseScore = 25;
        const weightedScore = Math.round(baseScore * config.behavioralWeight);
        scoreBreakdown.behavioral += weightedScore;
        reasons.push({
          type: "behavioral",
          description: "Same unique phrases",
          weight: weightedScore,
          evidence: phraseOverlap.slice(0, 3).map(p => `"${p}"`).join(", "),
        });
      } else if (phraseOverlap.length === 2) {
        const baseScore = 12;
        const weightedScore = Math.round(baseScore * config.behavioralWeight);
        scoreBreakdown.behavioral += weightedScore;
        reasons.push({
          type: "behavioral",
          description: "Shared phrases",
          weight: weightedScore,
          evidence: phraseOverlap.map(p => `"${p}"`).join(", "),
        });
      }

      // ========== COMMON STARTERS AND ENDERS (ENHANCED) ==========

      const sharedStarters = p1.commonStarters.filter(s =>
        p2.commonStarters.includes(s) && !STOP_WORDS.has(s.toLowerCase())
      );
      const sharedEnders = p1.commonEnders.filter(e =>
        p2.commonEnders.includes(e) && !STOP_WORDS.has(e.toLowerCase())
      );

      if (sharedStarters.length >= 4 && sharedEnders.length >= 3) {
        const baseScore = 18;
        const weightedScore = Math.round(baseScore * config.behavioralWeight);
        scoreBreakdown.behavioral += weightedScore;
        reasons.push({
          type: "behavioral",
          description: "Same sentence starters and enders",
          weight: weightedScore,
          evidence: `Starters: ${sharedStarters.slice(0, 3).join(", ")} | Enders: ${sharedEnders.slice(0, 3).join(", ")}`,
        });
      } else if (sharedStarters.length >= 4) {
        const baseScore = 10;
        const weightedScore = Math.round(baseScore * config.behavioralWeight);
        scoreBreakdown.behavioral += weightedScore;
        reasons.push({
          type: "behavioral",
          description: "Same sentence starters",
          weight: weightedScore,
          evidence: sharedStarters.slice(0, 5).join(", "),
        });
      }

      // ========== NETWORK ANALYSIS ==========

      const p1MentionsP2 = p1.mentionedPlayers.has(p2.name);
      const p2MentionsP1 = p2.mentionedPlayers.has(p1.name);
      const p1RespondsToP2 = p1.responsePartners.has(p2.name);
      const p2RespondsToP1 = p2.responsePartners.has(p1.name);

      // Check for self-talk pattern (VERY SUSPICIOUS - v4.1)
      const selfTalkKey = [p1.name, p2.name].sort().join("|");
      const selfTalkScore = selfTalkMap.get(selfTalkKey) || 0;

      if (selfTalkScore >= 50) {
        // They TALK to each other but have SAME writing style = very suspicious
        const baseScore = Math.min(selfTalkScore, 45);
        const weightedScore = Math.round(baseScore * config.networkWeight * 1.5);
        scoreBreakdown.network += weightedScore;
        reasons.push({
          type: "network",
          description: "SELF-TALK DETECTED: Talk to each other but write identically",
          weight: weightedScore,
          evidence: `Suspicion score: ${selfTalkScore} (same style while conversing)`,
        });
      } else if (!p1MentionsP2 && !p2MentionsP1 && !p1RespondsToP2 && !p2RespondsToP1 &&
          p1.messageCount >= 50 && p2.messageCount >= 50) {
        // Original logic: never interact
        const baseScore = 8;
        const weightedScore = Math.round(baseScore * config.networkWeight);
        scoreBreakdown.network = weightedScore;
        reasons.push({
          type: "network",
          description: "Never interacted with each other",
          weight: weightedScore,
          evidence: "No mentions or replies despite many messages",
        });
      }

      // NEW v4.1: Check for conflict pattern (online together but ignoring each other)
      // This is ANTI-alt evidence - they're different people who don't like each other
      const overlappingMinutes = new Set([...p1.activeMinutes].filter(m => p2.activeMinutes.has(m))).size;
      if (overlappingMinutes >= 30 &&
          !p1MentionsP2 && !p2MentionsP1 && !p1RespondsToP2 && !p2RespondsToP1 &&
          p1.messageCount >= 30 && p2.messageCount >= 30) {
        // They're online together but never interact = possible conflict (NOT alts)
        // This should REDUCE alt suspicion
        const penalty = -15;
        scoreBreakdown.network += penalty;
        reasons.push({
          type: "network",
          description: "Conflict pattern: online together but never interact",
          weight: penalty,
          evidence: `${overlappingMinutes} min overlap with zero interaction (likely different people)`,
        });
      }

      // ========== CALCULATE TOTAL SCORE ==========

      let totalScore = scoreBreakdown.temporal +
                       scoreBreakdown.linguistic +
                       scoreBreakdown.behavioral +
                       scoreBreakdown.network +
                       scoreBreakdown.rareWords +
                       scoreBreakdown.handoff;

      // ========== CATEGORY BONUSES ==========

      const hasStrongTemporalEvidence = scoreBreakdown.temporal >= 45 || scoreBreakdown.handoff >= 35;
      const hasStrongLinguisticEvidence = scoreBreakdown.linguistic >= 50;
      const hasBehavioralEvidence = scoreBreakdown.behavioral >= 30;

      // Temporal + Linguistic is the strongest combination
      if (hasStrongTemporalEvidence && hasStrongLinguisticEvidence) {
        const bonus = Math.round(totalScore * 0.20);
        scoreBreakdown.bonus += bonus;
        totalScore += bonus;
        reasons.push({
          type: "bonus",
          description: "Strong Temporal + Linguistic evidence",
          weight: bonus,
          evidence: "Never online together AND matching writing fingerprint",
        });
      }

      // All three categories = very suspicious
      if (hasStrongTemporalEvidence && hasStrongLinguisticEvidence && hasBehavioralEvidence) {
        const bonus = Math.round(totalScore * 0.15);
        scoreBreakdown.bonus += bonus;
        totalScore += bonus;
        reasons.push({
          type: "bonus",
          description: "Triple category match",
          weight: bonus,
          evidence: "Temporal + Linguistic + Behavioral all indicate same person",
        });
      }

      // Store in matrix
      scores[i][j] = totalScore;
      scores[j][i] = totalScore;

      // ========== DETERMINE IF SUSPICIOUS ENOUGH TO REPORT ==========

      const strongReasons = reasons.filter(r => r.weight >= 15 && r.type !== "bonus");
      const veryStrongReasons = reasons.filter(r => r.weight >= 25 && r.type !== "bonus");

      // Use config thresholds for reporting
      if (totalScore >= config.minScoreToReport && strongReasons.length >= config.minStrongReasons) {
        // Configurable confidence formula
        const confidence = Math.min(
          Math.round(totalScore * config.confidenceMultiplier + config.confidenceBase),
          95
        );

        let category: AltSuspicion["category"];
        if (neverOnlineTogether && veryStrongReasons.length >= 3 && confidence >= 82) category = "critical";
        else if (confidence >= 72 && veryStrongReasons.length >= 2) category = "high";
        else if (confidence >= 55) category = "medium";
        else category = "low";

        // Generate human explanation
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
    config, // Return the config used for UI display
    socialInsights, // NEW v4.1: Social relationship insights
    slipPatterns, // NEW v4.1: Typing inconsistency patterns
  };
}
