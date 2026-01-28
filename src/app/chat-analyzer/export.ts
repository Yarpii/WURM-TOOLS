// ============================================================================
// CHAT ANALYZER - EXPORT FUNCTIONS
// ============================================================================

import type { ChatMessage, AdvancedPlayerStats, AltSuspicion, SocialInsight, SlipPattern, SimilarityMatrix } from "./types";

// ============================================================================
// HELPERS
// ============================================================================

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function timestamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}-${String(d.getMinutes()).padStart(2, "0")}`;
}

// ============================================================================
// 1. EXPORT PLAYER CHAT (TXT)
// ============================================================================

export function exportPlayerChat(messages: ChatMessage[], playerName: string) {
  const playerMessages = messages.filter(m => m.player === playerName);
  if (playerMessages.length === 0) return;

  const lines = playerMessages.map(m => `[${m.timestamp}] <${m.player}> ${m.message}`);
  const header = `// Chat log for: ${playerName}\n// Messages: ${playerMessages.length}\n// Exported: ${new Date().toISOString()}\n\n`;
  downloadFile(header + lines.join("\n"), `chat_${playerName}_${timestamp()}.txt`, "text/plain");
}

// ============================================================================
// 2. EXPORT FULL REPORT (JSON)
// ============================================================================

interface FullReportData {
  messages: ChatMessage[];
  playerStats: AdvancedPlayerStats[];
  altSuspicions: AltSuspicion[];
  socialInsights: SocialInsight[];
  slipPatterns: SlipPattern[];
  similarityMatrix: SimilarityMatrix;
  algorithmMode: string;
}

function serializePlayerStats(stats: AdvancedPlayerStats) {
  return {
    name: stats.name,
    messageCount: stats.messageCount,
    wordCount: stats.wordCount,
    avgWordsPerMessage: stats.avgWordsPerMessage,
    activeMinutes: [...stats.activeMinutes],
    sessionGaps: stats.sessionGaps,
    avgResponseTime: stats.avgResponseTime,
    activityPattern: stats.activityPattern,
    charNgrams: Object.fromEntries(stats.charNgrams),
    wordBigrams: Object.fromEntries(stats.wordBigrams),
    typoPatterns: stats.typoPatterns,
    punctuationStyle: stats.punctuationStyle,
    punctuationFrequency: Object.fromEntries(stats.punctuationFrequency),
    letterSubstitutions: Object.fromEntries(stats.letterSubstitutions),
    microPatterns: stats.microPatterns,
    emoticonStyle: stats.emoticonStyle,
    functionWords: stats.functionWords,
    vocabularyRichness: stats.vocabularyRichness,
    hapaxRatio: stats.hapaxRatio,
    yulesK: stats.yulesK,
    simpsonsD: stats.simpsonsD,
    brunetsW: stats.brunetsW,
    avgWordLength: stats.avgWordLength,
    wordLengthDistribution: stats.wordLengthDistribution,
    messageLengthDistribution: stats.messageLengthDistribution,
    sentencePatterns: stats.sentencePatterns,
    commonWords: stats.commonWords,
    commonPhrases: stats.commonPhrases,
    commonStarters: stats.commonStarters,
    commonEnders: stats.commonEnders,
    greetingStyle: stats.greetingStyle,
    farewellStyle: stats.farewellStyle,
    responsePartners: Object.fromEntries(stats.responsePartners),
    mentionedPlayers: [...stats.mentionedPlayers],
    topicFingerprint: Object.fromEntries(stats.topicFingerprint),
    wurmTopics: Object.fromEntries(stats.wurmTopics),
    allMessages: stats.allMessages,
    messageTimes: stats.messageTimes,
    absoluteTimes: stats.absoluteTimes,
  };
}

export function exportFullReportJSON(data: FullReportData) {
  const report = {
    exportedAt: new Date().toISOString(),
    version: "4.1",
    algorithmMode: data.algorithmMode,
    summary: {
      totalMessages: data.messages.length,
      totalPlayers: data.playerStats.length,
      totalDays: Math.max(...data.messages.map(m => m.dayIndex)) + 1,
      criticalMatches: data.altSuspicions.filter(s => s.category === "critical").length,
      highMatches: data.altSuspicions.filter(s => s.category === "high").length,
      mediumMatches: data.altSuspicions.filter(s => s.category === "medium").length,
      lowMatches: data.altSuspicions.filter(s => s.category === "low").length,
      socialInsights: data.socialInsights.length,
      slipPatterns: data.slipPatterns.length,
    },
    playerStats: data.playerStats.map(serializePlayerStats),
    altSuspicions: data.altSuspicions,
    socialInsights: data.socialInsights,
    slipPatterns: data.slipPatterns,
    similarityMatrix: data.similarityMatrix,
    messages: data.messages,
  };

  downloadFile(JSON.stringify(report, null, 2), `chat_report_${timestamp()}.json`, "application/json");
}

// ============================================================================
// 3. EXPORT SUMMARY HTML REPORT
// ============================================================================

export function exportSummaryHTML(data: FullReportData) {
  const criticals = data.altSuspicions.filter(s => s.category === "critical");
  const highs = data.altSuspicions.filter(s => s.category === "high");
  const mediums = data.altSuspicions.filter(s => s.category === "medium");
  const lows = data.altSuspicions.filter(s => s.category === "low");
  const totalDays = data.messages.length > 0 ? Math.max(...data.messages.map(m => m.dayIndex)) + 1 : 0;

  const suspicionRows = data.altSuspicions.map(s => {
    const badgeColor = s.category === "critical" ? "#ef4444" : s.category === "high" ? "#f59e0b" : s.category === "medium" ? "#3b82f6" : "#6b7280";
    const tags: string[] = [];
    if (s.neverOnlineTogether) tags.push('<span style="background:#ef4444;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold;">NEVER ONLINE TOGETHER</span>');
    if (s.handoffScore >= 20) tags.push('<span style="background:#f59e0b;color:#000;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold;">HANDOFF PATTERN</span>');

    const reasonsList = s.reasons.map(r =>
      `<li><strong style="text-transform:uppercase;font-size:11px;color:${
        r.type === "temporal" ? "#ef4444" : r.type === "linguistic" ? "#f59e0b" : r.type === "behavioral" ? "#8b5cf6" : r.type === "network" ? "#22c55e" : "#3b82f6"
      }">${r.type}</strong> ${escapeHtml(r.description)} <span style="color:#888;">(+${r.weight})</span>${r.evidence ? `<br/><small style="color:#999;">${escapeHtml(r.evidence)}</small>` : ""}</li>`
    ).join("");

    return `
      <div style="background:#1e1e2e;border:1px solid ${badgeColor}44;border-radius:12px;padding:20px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="font-size:18px;font-weight:bold;">${escapeHtml(s.player1)}</span>
            <span style="color:#888;">&#8596;</span>
            <span style="font-size:18px;font-weight:bold;">${escapeHtml(s.player2)}</span>
            ${tags.join(" ")}
          </div>
          <span style="background:${badgeColor};color:#fff;padding:6px 14px;border-radius:999px;font-weight:bold;font-size:16px;">
            ${s.confidence}% match
          </span>
        </div>
        <div style="background:#262637;border-radius:8px;padding:12px;margin-bottom:12px;">
          <div style="font-size:13px;color:#ccc;white-space:pre-line;">${escapeHtml(s.humanExplanation)}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:12px;">
          ${scoreBar("Temporal", s.scoreBreakdown.temporal + s.scoreBreakdown.handoff, 80, "#ef4444")}
          ${scoreBar("Linguistic", s.scoreBreakdown.linguistic + s.scoreBreakdown.rareWords, 80, "#f59e0b")}
          ${scoreBar("Behavioral", s.scoreBreakdown.behavioral, 50, "#8b5cf6")}
          ${scoreBar("Network", s.scoreBreakdown.network, 20, "#22c55e")}
          ${s.scoreBreakdown.bonus > 0 ? scoreBar("Bonus", s.scoreBreakdown.bonus, 50, "#3b82f6") : ""}
        </div>
        ${s.sharedRareWords.length > 0 ? `
          <div style="margin-bottom:12px;">
            <span style="font-size:12px;color:#888;">Shared rare words: </span>
            ${s.sharedRareWords.slice(0, 8).map(w => `<span style="background:#f59e0b22;color:#f59e0b;padding:2px 8px;border-radius:4px;font-size:12px;margin-right:4px;">${escapeHtml(w)}</span>`).join("")}
          </div>
        ` : ""}
        <details>
          <summary style="cursor:pointer;color:#888;font-size:13px;">View all ${s.reasons.length} reasons...</summary>
          <ul style="margin-top:8px;padding-left:20px;font-size:13px;color:#ccc;line-height:1.8;">${reasonsList}</ul>
        </details>
      </div>`;
  }).join("");

  const socialRows = data.socialInsights.map(i => {
    const borderColor = i.insightType === "self_talk_suspected" ? "#ef4444" : i.insightType === "conflict_detected" ? "#f59e0b" : "#3b82f6";
    const label = i.insightType === "self_talk_suspected" ? "SELF-TALK DETECTED" : i.insightType === "conflict_detected" ? "POSSIBLE CONFLICT" : i.insightType.replace(/_/g, " ").toUpperCase();
    return `
      <div style="background:#1e1e2e;border:1px solid ${borderColor}44;border-radius:12px;padding:16px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <strong>${escapeHtml(i.player1)}</strong>
            <span style="color:#888;">&#8596;</span>
            <strong>${escapeHtml(i.player2)}</strong>
            <span style="background:${borderColor};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">${label}</span>
          </div>
          <span style="color:${borderColor};font-weight:bold;">${i.confidence}%</span>
        </div>
        <p style="color:#ccc;font-size:13px;margin:8px 0;">${escapeHtml(i.description)}</p>
        <ul style="font-size:12px;color:#999;padding-left:20px;">
          ${i.evidence.map(e => `<li>${escapeHtml(e)}</li>`).join("")}
        </ul>
      </div>`;
  }).join("");

  const slipRows = data.slipPatterns.map(s => {
    const borderColor = s.suspicionLevel === "high" ? "#ef4444" : s.suspicionLevel === "medium" ? "#f59e0b" : "#3b82f6";
    return `
      <div style="background:#1e1e2e;border:1px solid ${borderColor}44;border-radius:12px;padding:16px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <strong>${escapeHtml(s.playerName)}</strong>
          <span style="background:${borderColor};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">${s.slipType.replace(/_/g, " ").toUpperCase()}</span>
        </div>
        <p style="color:#ccc;font-size:13px;margin:8px 0;">${escapeHtml(s.description)}</p>
        <ul style="font-size:12px;color:#999;padding-left:20px;">
          ${s.evidence.map(e => `<li>${escapeHtml(e)}</li>`).join("")}
        </ul>
      </div>`;
  }).join("");

  const playerTable = data.playerStats
    .sort((a, b) => b.messageCount - a.messageCount)
    .map(s => `
      <tr>
        <td style="padding:8px 12px;font-weight:bold;">${escapeHtml(s.name)}</td>
        <td style="padding:8px 12px;text-align:center;">${s.messageCount}</td>
        <td style="padding:8px 12px;text-align:center;">${s.wordCount}</td>
        <td style="padding:8px 12px;text-align:center;">${s.avgWordsPerMessage.toFixed(1)}</td>
        <td style="padding:8px 12px;text-align:center;">${(s.vocabularyRichness * 100).toFixed(0)}%</td>
        <td style="padding:8px 12px;text-align:center;">${s.yulesK}</td>
        <td style="padding:8px 12px;text-align:center;">${s.avgWordLength}</td>
        <td style="padding:8px 12px;text-align:center;">${s.typoPatterns.length > 0 ? escapeHtml(s.typoPatterns.slice(0, 3).join(", ")) : "-"}</td>
        <td style="padding:8px 12px;text-align:center;">${s.commonPhrases.length > 0 ? escapeHtml(s.commonPhrases.slice(0, 2).join(", ")) : "-"}</td>
      </tr>
    `).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat Forensics Report - ${new Date().toLocaleDateString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f1a; color: #e2e2e2; padding: 24px; }
    .container { max-width: 1100px; margin: 0 auto; }
    h1 { font-size: 28px; margin-bottom: 4px; }
    h2 { font-size: 20px; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 1px solid #333; }
    .subtitle { color: #888; font-size: 14px; margin-bottom: 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .stat-card { background: #1e1e2e; border-radius: 12px; padding: 16px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { color: #888; font-size: 12px; margin-top: 4px; }
    .critical { color: #ef4444; }
    .high { color: #f59e0b; }
    .medium { color: #3b82f6; }
    .low { color: #6b7280; }
    table { width: 100%; border-collapse: collapse; background: #1e1e2e; border-radius: 12px; overflow: hidden; font-size: 13px; }
    th { background: #262637; padding: 10px 12px; text-align: left; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { border-top: 1px solid #2a2a3a; }
    tr:hover td { background: #262637; }
    details summary { cursor: pointer; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #333; color: #555; font-size: 12px; text-align: center; }
    @media print {
      body { background: #fff; color: #000; }
      .stat-card, table, div[style*="background:#1e1e2e"] { background: #f5f5f5 !important; border-color: #ddd !important; }
      .stat-value, h1, h2, strong { color: #000 !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Chat Forensics Report</h1>
    <p class="subtitle">Generated ${new Date().toLocaleString()} | Algorithm: ${escapeHtml(data.algorithmMode)}</p>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${data.messages.length}</div>
        <div class="stat-label">Messages</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.playerStats.length}</div>
        <div class="stat-label">Players</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalDays}</div>
        <div class="stat-label">Day(s)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value critical">${criticals.length}</div>
        <div class="stat-label">Critical Matches</div>
      </div>
      <div class="stat-card">
        <div class="stat-value high">${highs.length}</div>
        <div class="stat-label">High Matches</div>
      </div>
      <div class="stat-card">
        <div class="stat-value medium">${mediums.length}</div>
        <div class="stat-label">Medium Matches</div>
      </div>
      <div class="stat-card">
        <div class="stat-value low">${lows.length}</div>
        <div class="stat-label">Low Matches</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.socialInsights.length}</div>
        <div class="stat-label">Social Insights</div>
      </div>
    </div>

    ${data.altSuspicions.length > 0 ? `
    <h2>Alt Account Suspicions (${data.altSuspicions.length})</h2>
    ${suspicionRows}
    ` : "<h2>No Alt Suspicions Found</h2><p style='color:#888;'>The analysis found no suspicious matches.</p>"}

    ${data.socialInsights.length > 0 ? `
    <h2>Social Insights (${data.socialInsights.length})</h2>
    ${socialRows}
    ` : ""}

    ${data.slipPatterns.length > 0 ? `
    <h2>Typing Inconsistencies (${data.slipPatterns.length})</h2>
    ${slipRows}
    ` : ""}

    <h2>Player Statistics</h2>
    <div style="overflow-x:auto;">
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th style="text-align:center;">Messages</th>
            <th style="text-align:center;">Words</th>
            <th style="text-align:center;">Avg/msg</th>
            <th style="text-align:center;">Vocab</th>
            <th style="text-align:center;">Yule's K</th>
            <th style="text-align:center;">Avg Word Len</th>
            <th style="text-align:center;">Typos</th>
            <th style="text-align:center;">Phrases</th>
          </tr>
        </thead>
        <tbody>
          ${playerTable}
        </tbody>
      </table>
    </div>

    <div class="footer">
      Chat Forensics Analyzer v4.1 | WURM Tools | ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>`;

  downloadFile(html, `chat_report_${timestamp()}.html`, "text/html");
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function scoreBar(label: string, value: number, max: number, color: string): string {
  const pct = Math.min((value / max) * 100, 100);
  return `
    <div style="background:#262637;border-radius:8px;padding:8px 10px;">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
        <span style="color:${color};font-weight:bold;">${label}</span>
        <span style="color:#888;">${value}/${max}</span>
      </div>
      <div style="height:6px;background:#1a1a2a;border-radius:999px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:999px;"></div>
      </div>
    </div>`;
}
