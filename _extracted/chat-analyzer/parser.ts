// ============================================================================
// CHAT ANALYZER - PARSING UTILITIES
// ============================================================================

import type { ChatMessage, ParsedLine } from "./types";

/**
 * System/bot player names to exclude from analysis
 * These are game-generated messages, not real players
 */
const SYSTEM_PLAYERS = new Set([
  "system",
  "systeem",
  "server",
  "wurm",
  "gm",
  "gamemaster",
  "admin",
  "administrator",
  "bot",
  "announcement",
  "info",
  "event",
  "news",
  "alert",
  "warning",
  "notice",
]);

/**
 * Check if a player name is a system account
 */
export function isSystemPlayer(playerName: string): boolean {
  const lower = playerName.toLowerCase().trim();

  // Exact match
  if (SYSTEM_PLAYERS.has(lower)) return true;

  // Starts with system identifiers
  if (lower.startsWith("system") || lower.startsWith("systeem")) return true;
  if (lower.startsWith("gm-") || lower.startsWith("gm_")) return true;
  if (lower.startsWith("admin")) return true;
  if (lower.startsWith("[system") || lower.startsWith("[gm")) return true;

  // Contains brackets often used for system messages
  if (lower.startsWith("[") && lower.endsWith("]")) return true;

  return false;
}

/**
 * Parse timestamp string to seconds since midnight
 */
export function parseTimeToSeconds(timestamp: string): number {
  const [h, m, s] = timestamp.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

/**
 * Parse date from various chat line formats
 */
export function parseDateFromLine(line: string): string | null {
  // Format 1: [2024-01-15 21:25:05] <Player> message
  const fullMatch = line.match(/^\[(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}:\d{2}\]/);
  if (fullMatch) return fullMatch[1];

  // Format 2: --- Day changed to 2024-01-15 ---
  const dayChangeMatch = line.match(/---\s*Day changed to (\d{4}-\d{2}-\d{2})\s*---/i);
  if (dayChangeMatch) return dayChangeMatch[1];

  return null;
}

/**
 * Parse a single chat line into a ChatMessage
 */
export function parseChatLine(line: string, lineNumber: number, currentDayIndex: number): ParsedLine {
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

/**
 * Parse chat text with multi-day support
 */
export function parseChat(text: string, dayOffset: number = 0): ChatMessage[] {
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
      // Skip system messages - they shouldn't be analyzed as player chat
      if (isSystemPlayer(result.message.player)) {
        continue;
      }

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
}

/**
 * Parse multiple chat files together
 */
export function parseMultipleChats(texts: string[]): ChatMessage[] {
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

  return allMessages;
}
