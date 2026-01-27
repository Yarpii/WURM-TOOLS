// ============================================================================
// CHAT ANALYZER - ALT DETECTION ENGINE
// ============================================================================

import type { ChatMessage, AdvancedPlayerStats, AltSuspicion, SimilarityMatrix, ScoreBreakdown, HandoffResult } from "./types";
import { STOP_WORDS } from "./constants";
import { cosineSimilarity } from "./utils";
import { buildRareWordIndex, detectSharedRareWords } from "./behavioral";
import { generateHumanExplanation } from "./playerAnalysis";

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
 * Main alt detection engine
 */
export function detectAltsAdvanced(
  stats: AdvancedPlayerStats[],
  messages: ChatMessage[]
): { suspicions: AltSuspicion[]; matrix: SimilarityMatrix } {
  const suspicions: AltSuspicion[] = [];
  const players = stats.map(s => s.name);
  const scores: number[][] = players.map(() => players.map(() => 0));

  // Build rare word index for all players
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
          description: "Never online at the same time",
          weight: 40,
          evidence: `${p1.name}: ${p1.activeMinutes.size} min active, ${p2.name}: ${p2.activeMinutes.size} min active, 0 overlap`,
        });
      } else if (overlap.size > 0 && minActivity >= 20 && overlap.size < minActivity * 0.05) {
        scoreBreakdown.temporal += 20;
        reasons.push({
          type: "temporal",
          description: "Very little time overlap",
          weight: 20,
          evidence: `Only ${overlap.size} of ${minActivity} minutes overlap (${Math.round(overlap.size/minActivity*100)}%)`,
        });
      }

      // ========== HANDOFF PATTERN DETECTION ==========

      const handoffData = detectHandoffPattern(p1, p2, messages);
      if (handoffData.score > 0) {
        scoreBreakdown.handoff = handoffData.score;
        reasons.push({
          type: "temporal",
          description: "Handoff pattern detected",
          weight: handoffData.score,
          evidence: `${handoffData.handoffCount} of ${handoffData.totalTransitions} session transitions are handoffs (${Math.round(handoffData.handoffCount/handoffData.totalTransitions*100)}%)`,
        });
      }

      // ========== RARE WORD FINGERPRINT (stricter) ==========

      const sharedRareWords = detectSharedRareWords(p1, p2, rareWordIndex, stats.length);
      // STRICTER: Require 5+ truly rare words for significant score
      if (sharedRareWords.length >= 5) {
        scoreBreakdown.rareWords = 25;
        reasons.push({
          type: "linguistic",
          description: "Multiple shared rare words",
          weight: 25,
          evidence: `${sharedRareWords.length} rare words: ${sharedRareWords.slice(0, 5).join(", ")}`,
        });
      } else if (sharedRareWords.length >= 3) {
        scoreBreakdown.rareWords = 15;
        reasons.push({
          type: "linguistic",
          description: "Some shared rare words",
          weight: 15,
          evidence: `${sharedRareWords.length} rare words: ${sharedRareWords.join(", ")}`,
        });
      }
      // 1-2 rare words is not significant enough to score

      // ========== LINGUISTIC FINGERPRINT ==========

      // Character n-gram similarity - STRICTER thresholds
      // Note: Same-language speakers naturally have 70-85% n-gram similarity
      // Only 95%+ is truly suspicious for different people
      const ngramSim = cosineSimilarity(p1.charNgrams, p2.charNgrams);
      if (ngramSim > 0.96) {
        scoreBreakdown.linguistic += 20;
        reasons.push({
          type: "linguistic",
          description: "Very high character pattern match",
          weight: 20,
          evidence: `${Math.round(ngramSim * 100)}% n-gram similarity`,
        });
      } else if (ngramSim > 0.93) {
        scoreBreakdown.linguistic += 10;
        reasons.push({
          type: "linguistic",
          description: "High character pattern similarity",
          weight: 10,
          evidence: `${Math.round(ngramSim * 100)}% n-gram similarity`,
        });
      }
      // Below 93% is normal for same-language speakers - no points

      // Same typo patterns (distinctive but require multiple)
      const sharedTypos = p1.typoPatterns.filter(t => p2.typoPatterns.includes(t));
      if (sharedTypos.length >= 3) {
        scoreBreakdown.linguistic += 20;
        reasons.push({
          type: "linguistic",
          description: "Same typo patterns",
          weight: 20,
          evidence: sharedTypos.join(", "),
        });
      } else if (sharedTypos.length === 2) {
        scoreBreakdown.linguistic += 10;
        reasons.push({
          type: "linguistic",
          description: "Shared typo patterns",
          weight: 10,
          evidence: sharedTypos.join(", "),
        });
      }
      // 1 shared typo is not significant

      // Letter substitution patterns - common in gaming, lower weight
      const sharedSubs = [...p1.letterSubstitutions.keys()].filter(k => p2.letterSubstitutions.has(k));
      if (sharedSubs.length >= 5) {
        scoreBreakdown.linguistic += 15;
        reasons.push({
          type: "linguistic",
          description: "Same abbreviation style",
          weight: 15,
          evidence: sharedSubs.slice(0, 5).join(", "),
        });
      } else if (sharedSubs.length >= 3) {
        scoreBreakdown.linguistic += 8;
        reasons.push({
          type: "linguistic",
          description: "Similar abbreviation style",
          weight: 8,
          evidence: sharedSubs.slice(0, 4).join(", "),
        });
      }

      // ========== MICRO-PATTERNS MATCHING (stricter) ==========
      // Note: Many of these are common internet typing habits, not unique fingerprints
      // Only the rare/distinctive ones should score, and require multiple matches

      const microMatches: string[] = [];
      // These are RARE and distinctive:
      if (p1.microPatterns.doubleSpaces && p2.microPatterns.doubleSpaces) microMatches.push("double spaces");
      if (p1.microPatterns.noSpaceAfterPunct && p2.microPatterns.noSpaceAfterPunct) microMatches.push("no space after punct");
      if (p1.microPatterns.excessiveCaps && p2.microPatterns.excessiveCaps) microMatches.push("EXCESSIVE CAPS");
      // These are COMMON - only count if combined with rare ones:
      const commonMicroMatches: string[] = [];
      if (p1.microPatterns.lowercaseI && p2.microPatterns.lowercaseI) commonMicroMatches.push("lowercase i");
      if (p1.microPatterns.allLowercase && p2.microPatterns.allLowercase) commonMicroMatches.push("all lowercase");
      if (p1.microPatterns.noCapitalStart && p2.microPatterns.noCapitalStart) commonMicroMatches.push("no capital start");
      if (p1.microPatterns.numberSubstitution && p2.microPatterns.numberSubstitution) commonMicroMatches.push("number subs");

      // Only score if we have rare micro-patterns, or many common ones
      if (microMatches.length >= 2) {
        scoreBreakdown.linguistic += 15;
        reasons.push({
          type: "linguistic",
          description: "Distinctive micro-pattern match",
          weight: 15,
          evidence: microMatches.join(", "),
        });
      } else if (microMatches.length >= 1 && commonMicroMatches.length >= 2) {
        scoreBreakdown.linguistic += 10;
        reasons.push({
          type: "linguistic",
          description: "Shared typing quirks",
          weight: 10,
          evidence: [...microMatches, ...commonMicroMatches].join(", "),
        });
      }
      // Common patterns alone (all lowercase, no caps) are not significant

      // ========== EMOTICON STYLE MATCHING (reduced weight) ==========
      // Common emotes like "lol", ":)" are used by everyone - low value

      const sharedEmotes = p1.emoticonStyle.commonEmotes.filter(e =>
        p2.emoticonStyle.commonEmotes.includes(e)
      );
      // Only score if they share 4+ emotes (most people share 2-3)
      if (sharedEmotes.length >= 4) {
        scoreBreakdown.behavioral += 8;
        reasons.push({
          type: "behavioral",
          description: "Same emoticon preferences",
          weight: 8,
          evidence: sharedEmotes.slice(0, 4).join(", "),
        });
      }
      // Nose style match (actually rare and distinctive)
      if (p1.emoticonStyle.usesNose && p2.emoticonStyle.usesNose) {
        scoreBreakdown.behavioral += 8;
        reasons.push({
          type: "behavioral",
          description: "Both use nose emoticons (:-) style)",
          weight: 8,
        });
      }

      // ========== BEHAVIORAL ANALYSIS ==========

      // Phrase overlap - must be 3+ word phrases and multiple matches
      const phraseOverlap = p1.commonPhrases.filter(p =>
        p2.commonPhrases.includes(p) && p.split(' ').length >= 3
      );
      if (phraseOverlap.length >= 3) {
        scoreBreakdown.behavioral += 20;
        reasons.push({
          type: "behavioral",
          description: "Same unique phrases",
          weight: 20,
          evidence: phraseOverlap.slice(0, 3).map(p => `"${p}"`).join(", "),
        });
      } else if (phraseOverlap.length === 2) {
        scoreBreakdown.behavioral += 10;
        reasons.push({
          type: "behavioral",
          description: "Shared phrases",
          weight: 10,
          evidence: phraseOverlap.map(p => `"${p}"`).join(", "),
        });
      }
      // 1 shared phrase is not significant

      // Common starters - many people start with "i", "yeah", "but" etc
      // Only significant if 5+ unique starters match
      const sharedStarters = p1.commonStarters.filter(s =>
        p2.commonStarters.includes(s) && !STOP_WORDS.has(s.toLowerCase())
      );
      if (sharedStarters.length >= 5) {
        scoreBreakdown.behavioral += 10;
        reasons.push({
          type: "behavioral",
          description: "Same sentence starters",
          weight: 10,
          evidence: sharedStarters.slice(0, 5).join(", "),
        });
      }

      // ========== NETWORK ANALYSIS ==========
      // In Wurm, "no interaction" is actually common - people chat in general without
      // talking to specific people. Very low weight, only as supporting evidence.

      const p1MentionsP2 = p1.mentionedPlayers.has(p2.name);
      const p2MentionsP1 = p2.mentionedPlayers.has(p1.name);
      const p1RespondsToP2 = p1.responsePartners.has(p2.name);
      const p2RespondsToP1 = p2.responsePartners.has(p1.name);

      if (!p1MentionsP2 && !p2MentionsP1 && !p1RespondsToP2 && !p2RespondsToP1 &&
          p1.messageCount >= 50 && p2.messageCount >= 50) {
        // Very low weight - this is common in game chats
        scoreBreakdown.network = 5;
        reasons.push({
          type: "network",
          description: "Never interacted with each other",
          weight: 5,
          evidence: "No mentions or replies despite many messages",
        });
      }

      // ========== CALCULATE TOTAL SCORE ==========

      let totalScore = scoreBreakdown.temporal +
                       scoreBreakdown.linguistic +
                       scoreBreakdown.behavioral +
                       scoreBreakdown.network +
                       scoreBreakdown.rareWords +
                       scoreBreakdown.handoff;

      // ========== CATEGORY BONUSES (reduced) ==========
      // Bonuses should be small - the base evidence should be strong enough

      const hasStrongTemporalEvidence = scoreBreakdown.temporal >= 40 || scoreBreakdown.handoff >= 35;
      const hasLinguisticEvidence = scoreBreakdown.linguistic >= 30;
      const hasBehavioralEvidence = scoreBreakdown.behavioral >= 25;

      // Only give bonus for truly strong combined evidence
      // Temporal (never online together) + Strong linguistic = suspicious
      if (hasStrongTemporalEvidence && hasLinguisticEvidence) {
        const bonus = Math.round(totalScore * 0.15);
        scoreBreakdown.bonus += bonus;
        totalScore += bonus;
        reasons.push({
          type: "bonus",
          description: "Temporal + Linguistic combination",
          weight: bonus,
          evidence: "Never online together AND same writing style",
        });
      }

      // Strong linguistic + behavioral = suspicious (but smaller bonus)
      if (hasLinguisticEvidence && hasBehavioralEvidence && !hasStrongTemporalEvidence) {
        const bonus = Math.round(totalScore * 0.10);
        scoreBreakdown.bonus += bonus;
        totalScore += bonus;
        reasons.push({
          type: "bonus",
          description: "Linguistic + Behavioral combination",
          weight: bonus,
          evidence: "Same writing style AND same expressions",
        });
      }

      // Store in matrix
      scores[i][j] = totalScore;
      scores[j][i] = totalScore;

      // MUCH STRICTER: Require significant evidence from multiple categories
      const strongReasons = reasons.filter(r => r.weight >= 15 && r.type !== "bonus");
      const veryStrongReasons = reasons.filter(r => r.weight >= 20 && r.type !== "bonus");

      // Need at least 60 points AND 2 strong reasons to even report
      if (totalScore >= 60 && strongReasons.length >= 2) {
        // CONSERVATIVE confidence formula:
        // - Score of 60 = ~35% confidence (low)
        // - Score of 100 = ~55% confidence (medium)
        // - Score of 150 = ~75% confidence (high)
        // - Need 180+ for critical (85%+)
        // This makes high confidence much harder to achieve
        const confidence = Math.min(Math.round(totalScore * 0.45 + 8), 95);

        let category: AltSuspicion["category"];
        // Critical: Must have temporal evidence + very strong supporting evidence
        if (neverOnlineTogether && veryStrongReasons.length >= 3 && confidence >= 80) category = "critical";
        else if (confidence >= 70 && veryStrongReasons.length >= 2) category = "high";
        else if (confidence >= 50) category = "medium";
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
  };
}
