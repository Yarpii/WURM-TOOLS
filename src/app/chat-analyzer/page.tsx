"use client";

import { useState, useCallback, useMemo } from "react";

// Types
interface ChatMessage {
  timestamp: string;
  player: string;
  message: string;
  lineNumber: number;
}

interface PlayerStats {
  name: string;
  messageCount: number;
  wordCount: number;
  avgWordsPerMessage: number;
  commonWords: string[];
  commonPhrases: string[];
  activeHours: number[];
  typingPatterns: {
    usesCapitals: boolean;
    usesPunctuation: boolean;
    avgMessageLength: number;
    usesEmotes: boolean;
    commonStarters: string[];
  };
}

interface AltSuspicion {
  player1: string;
  player2: string;
  confidence: number;
  reasons: string[];
}

// Generate consistent color from player name
function getPlayerColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 65%)`;
}

// Parse chat log line
function parseChatLine(line: string, lineNumber: number): ChatMessage | null {
  // Format: [HH:MM:SS] <PlayerName> message
  const match = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*<([^>]+)>\s*(.*)$/);
  if (!match) return null;

  return {
    timestamp: match[1],
    player: match[2],
    message: match[3],
    lineNumber,
  };
}

// Extract common words (excluding stop words)
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
  "because", "until", "while", "of", "about", "against", "between",
  "i", "me", "my", "myself", "we", "our", "you", "your", "he", "him",
  "she", "her", "it", "its", "they", "them", "their", "what", "which",
  "who", "whom", "this", "that", "these", "those", "am", "im", "ive",
  "dont", "doesnt", "didnt", "wont", "wouldnt", "cant", "couldnt",
  "yeah", "yes", "no", "ok", "okay", "oh", "ah", "lol", "haha", "hehe",
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
    .slice(0, 10)
    .map(([word]) => word);
}

function extractCommonPhrases(messages: string[]): string[] {
  const phraseCounts: Record<string, number> = {};

  for (const msg of messages) {
    const words = msg.toLowerCase().split(/\s+/);
    // Extract 2-3 word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const phrase2 = `${words[i]} ${words[i + 1]}`;
      if (phrase2.length > 5) {
        phraseCounts[phrase2] = (phraseCounts[phrase2] || 0) + 1;
      }
      if (i < words.length - 2) {
        const phrase3 = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        if (phrase3.length > 8) {
          phraseCounts[phrase3] = (phraseCounts[phrase3] || 0) + 1;
        }
      }
    }
  }

  return Object.entries(phraseCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase]) => phrase);
}

function analyzePlayer(name: string, messages: ChatMessage[]): PlayerStats {
  const playerMessages = messages.filter(m => m.player === name);
  const texts = playerMessages.map(m => m.message);
  const allText = texts.join(" ");
  const words = allText.split(/\s+/).filter(w => w.length > 0);

  // Active hours
  const hourCounts: Record<number, number> = {};
  for (const msg of playerMessages) {
    const hour = parseInt(msg.timestamp.split(":")[0]);
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  }
  const activeHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));

  // Typing patterns
  const hasCapitals = texts.some(t => /[A-Z]/.test(t.slice(1))); // Capitals mid-message
  const hasPunctuation = texts.filter(t => /[.!?]$/.test(t)).length / texts.length > 0.3;
  const usesEmotes = texts.some(t => /[:;]-?[)D(P]|hehe|haha|lol/i.test(t));

  // Common message starters
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
    commonWords: extractCommonWords(texts),
    commonPhrases: extractCommonPhrases(texts),
    activeHours,
    typingPatterns: {
      usesCapitals: hasCapitals,
      usesPunctuation: hasPunctuation,
      avgMessageLength: playerMessages.length > 0 ? allText.length / playerMessages.length : 0,
      usesEmotes,
      commonStarters,
    },
  };
}

function detectAlts(stats: PlayerStats[]): AltSuspicion[] {
  const suspicions: AltSuspicion[] = [];

  for (let i = 0; i < stats.length; i++) {
    for (let j = i + 1; j < stats.length; j++) {
      const p1 = stats[i];
      const p2 = stats[j];
      const reasons: string[] = [];
      let confidence = 0;

      // Check common words overlap
      const commonWordsOverlap = p1.commonWords.filter(w => p2.commonWords.includes(w));
      if (commonWordsOverlap.length >= 3) {
        confidence += 15 + (commonWordsOverlap.length - 3) * 5;
        reasons.push(`Zelfde woorden: ${commonWordsOverlap.slice(0, 4).join(", ")}`);
      }

      // Check phrase similarity
      const phraseOverlap = p1.commonPhrases.filter(p => p2.commonPhrases.includes(p));
      if (phraseOverlap.length >= 1) {
        confidence += 25;
        reasons.push(`Zelfde uitdrukkingen: "${phraseOverlap[0]}"`);
      }

      // Check typing patterns
      if (p1.typingPatterns.usesCapitals === p2.typingPatterns.usesCapitals &&
          p1.typingPatterns.usesPunctuation === p2.typingPatterns.usesPunctuation &&
          p1.typingPatterns.usesEmotes === p2.typingPatterns.usesEmotes) {
        confidence += 10;
        reasons.push("Vergelijkbare schrijfstijl");
      }

      // Check message length similarity
      const lengthDiff = Math.abs(p1.typingPatterns.avgMessageLength - p2.typingPatterns.avgMessageLength);
      if (lengthDiff < 10) {
        confidence += 10;
        reasons.push("Vergelijkbare berichtlengte");
      }

      // Check active hours overlap
      const hourOverlap = p1.activeHours.filter(h => p2.activeHours.includes(h));
      if (hourOverlap.length >= 2) {
        confidence += 5;
        reasons.push(`Actief op dezelfde uren: ${hourOverlap.join("h, ")}h`);
      }

      // Check starter words
      const starterOverlap = p1.typingPatterns.commonStarters.filter(
        s => p2.typingPatterns.commonStarters.includes(s)
      );
      if (starterOverlap.length >= 2) {
        confidence += 15;
        reasons.push(`Zelfde begin-woorden: ${starterOverlap.join(", ")}`);
      }

      // Check words per message similarity
      const wpmDiff = Math.abs(p1.avgWordsPerMessage - p2.avgWordsPerMessage);
      if (wpmDiff < 2) {
        confidence += 10;
        reasons.push("Vergelijkbaar aantal woorden per bericht");
      }

      if (confidence >= 30 && reasons.length >= 2) {
        suspicions.push({
          player1: p1.name,
          player2: p2.name,
          confidence: Math.min(confidence, 100),
          reasons,
        });
      }
    }
  }

  return suspicions.sort((a, b) => b.confidence - a.confidence);
}

export default function ChatAnalyzerPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [rawText, setRawText] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "players" | "alts">("chat");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Get unique players
  const players = useMemo(() => {
    const playerSet = new Set(messages.map(m => m.player));
    return Array.from(playerSet).sort();
  }, [messages]);

  // Player stats
  const playerStats = useMemo(() => {
    return players.map(p => analyzePlayer(p, messages));
  }, [players, messages]);

  // Alt detection
  const altSuspicions = useMemo(() => {
    if (playerStats.length < 2) return [];
    return detectAlts(playerStats);
  }, [playerStats]);

  // Filtered messages
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
  }, []);

  const handlePaste = useCallback(() => {
    if (rawText) {
      parseChat(rawText);
    }
  }, [rawText, parseChat]);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Chat Analyzer</h1>
          <p className="text-text-secondary">
            Analyseer Wurm Online chat logs - speler kleuren, statistieken & alt-detectie
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
                  Parse
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
              {altSuspicions.length > 0 && (
                <span className="px-3 py-1 bg-warning/20 text-warning rounded-full">
                  {altSuspicions.length} mogelijke alts gevonden
                </span>
              )}
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {(["chat", "players", "alts"] as const).map((tab) => (
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
                </button>
              ))}
            </div>

            {/* Chat Tab */}
            {activeTab === "chat" && (
              <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
                {/* Filters */}
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

                {/* Player Legend */}
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

                {/* Messages */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-bg-tertiary rounded-lg p-2">
                          <div className="text-text-muted">Woorden</div>
                          <div className="text-text-primary font-semibold">{stats.wordCount}</div>
                        </div>
                        <div className="bg-bg-tertiary rounded-lg p-2">
                          <div className="text-text-muted">Gem. per bericht</div>
                          <div className="text-text-primary font-semibold">
                            {stats.avgWordsPerMessage.toFixed(1)}
                          </div>
                        </div>
                      </div>

                      {stats.commonWords.length > 0 && (
                        <div>
                          <div className="text-text-muted mb-1">Veelgebruikte woorden</div>
                          <div className="flex flex-wrap gap-1">
                            {stats.commonWords.slice(0, 6).map(word => (
                              <span key={word} className="px-2 py-0.5 bg-bg-tertiary rounded text-text-secondary">
                                {word}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {stats.commonPhrases.length > 0 && (
                        <div>
                          <div className="text-text-muted mb-1">Uitdrukkingen</div>
                          <div className="flex flex-wrap gap-1">
                            {stats.commonPhrases.slice(0, 3).map(phrase => (
                              <span key={phrase} className="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs">
                                "{phrase}"
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                        {stats.typingPatterns.usesCapitals && (
                          <span className="px-2 py-0.5 bg-info/20 text-info rounded text-xs">CAPITALS</span>
                        )}
                        {stats.typingPatterns.usesPunctuation && (
                          <span className="px-2 py-0.5 bg-success/20 text-success rounded text-xs">Punctuatie.</span>
                        )}
                        {stats.typingPatterns.usesEmotes && (
                          <span className="px-2 py-0.5 bg-warning/20 text-warning rounded text-xs">Emotes :)</span>
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
                      De analyse heeft geen spelers gevonden met vergelijkbare schrijfstijlen.
                      <br />
                      Meer chatberichten kunnen de detectie verbeteren.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
                      <p className="text-warning text-sm">
                        <strong>Let op:</strong> Dit is een schatting gebaseerd op schrijfstijl en patronen.
                        Het is geen bewijs - spelers kunnen vergelijkbare stijlen hebben zonder alts te zijn.
                      </p>
                    </div>

                    {altSuspicions.map((suspicion, idx) => (
                      <div
                        key={idx}
                        className="bg-bg-secondary rounded-xl border border-border p-4"
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
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            suspicion.confidence >= 70
                              ? "bg-error/20 text-error"
                              : suspicion.confidence >= 50
                              ? "bg-warning/20 text-warning"
                              : "bg-info/20 text-info"
                          }`}>
                            {suspicion.confidence}% match
                          </div>
                        </div>

                        <div className="space-y-2">
                          {suspicion.reasons.map((reason, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="text-success">&#10003;</span>
                              <span className="text-text-secondary">{reason}</span>
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
                        </div>
                      </div>
                    ))}
                  </>
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
          </div>
        )}
      </div>
    </div>
  );
}
