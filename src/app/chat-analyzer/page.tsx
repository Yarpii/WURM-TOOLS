"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { ChatMessage, AdvancedPlayerStats, AltSuspicion, SimilarityMatrix, AlgorithmConfig, SocialInsight, SlipPattern } from "./types";
import { getPlayerColor } from "./utils";
import { parseChat, parseMultipleChats } from "./parser";
import { analyzePlayerAdvanced } from "./playerAnalysis";
import { detectAltsAdvanced } from "./altDetection";
import { ALGORITHM_CONFIGS, type AlgorithmMode } from "./constants";
import { exportPlayerChat, exportPlayerChatHTML, exportFullReportJSON, exportSummaryHTML } from "./export";

// ============================================================================
// REACT COMPONENT
// ============================================================================

export default function ChatAnalyzerPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [rawText, setRawText] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "players" | "alts" | "social" | "matrix" | "forensics">("chat");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [compareMode, setCompareMode] = useState<[string, string] | null>(null);
  const [algorithmMode, setAlgorithmMode] = useState<AlgorithmMode>("balanced");
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    if (exportOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [exportOpen]);

  const players = useMemo(() => {
    const playerSet = new Set(messages.map(m => m.player));
    return Array.from(playerSet).sort();
  }, [messages]);

  const playerStats = useMemo(() => {
    return players.map(p => analyzePlayerAdvanced(p, messages, players));
  }, [players, messages]);

  const { altSuspicions, similarityMatrix, activeConfig, socialInsights, slipPatterns } = useMemo(() => {
    if (playerStats.length < 2) {
      return {
        altSuspicions: [] as AltSuspicion[],
        similarityMatrix: { players: [], scores: [] } as SimilarityMatrix,
        activeConfig: ALGORITHM_CONFIGS[algorithmMode],
        socialInsights: [] as SocialInsight[],
        slipPatterns: [] as SlipPattern[],
      };
    }
    const result = detectAltsAdvanced(playerStats, messages, algorithmMode);
    return {
      altSuspicions: result.suspicions,
      similarityMatrix: result.matrix,
      activeConfig: result.config,
      socialInsights: result.socialInsights,
      slipPatterns: result.slipPatterns,
    };
  }, [playerStats, messages, algorithmMode]);

  const filteredMessages = useMemo(() => {
    let filtered = messages;
    if (selectedPlayers.length > 0) {
      filtered = filtered.filter(m => selectedPlayers.includes(m.player));
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.message.toLowerCase().includes(term) ||
        m.player.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [messages, selectedPlayers, searchTerm]);

  // Helper to toggle a player in/out of multi-select
  const togglePlayer = useCallback((player: string) => {
    setSelectedPlayers(prev =>
      prev.includes(player) ? prev.filter(p => p !== player) : [...prev, player]
    );
  }, []);

  // Single file parse wrapper
  const parseSingleChat = useCallback((text: string) => {
    const parsed = parseChat(text, 0);
    setMessages(parsed);
    setSelectedPlayers([]);
    setCompareMode(null);
  }, []);

  // Parse multiple files together
  const parseMultipleChatsHandler = useCallback((texts: string[]) => {
    const allMessages = parseMultipleChats(texts);
    setMessages(allMessages);
    setSelectedPlayers([]);
    setCompareMode(null);
  }, []);

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
        parseMultipleChatsHandler(texts);
      });
    }
  }, [parseSingleChat, parseMultipleChatsHandler]);

  const handlePaste = useCallback(() => {
    if (rawText) {
      parseSingleChat(rawText);
    }
  }, [rawText, parseSingleChat]);

  const getCompareStats = useMemo(() => {
    if (!compareMode) return null;
    const s1 = playerStats.find(s => s.name === compareMode[0]);
    const s2 = playerStats.find(s => s.name === compareMode[1]);
    return s1 && s2 ? [s1, s2] as [AdvancedPlayerStats, AdvancedPlayerStats] : null;
  }, [compareMode, playerStats]);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                Chat Forensics Analyzer
              </h1>
              <p className="text-text-secondary">
                Advanced analysis with stylometry, temporal patterns & forensic linguistics
              </p>
            </div>
            <a
              href="/chat-analyzer/docs"
              className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-tertiary/80 transition-colors text-sm inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              How it works
            </a>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Import Chat Log</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Upload .txt file(s) <span className="text-text-muted">(select multiple for multi-day)</span>
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
              <label className="block text-sm text-text-secondary mb-2">Or paste chat here</label>
              <div className="flex gap-2">
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="[21:25:05] <Yarpii> hey everyone whats up..."
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

          {/* Algorithm Mode Selector */}
          {messages.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-text-secondary">Algorithm:</label>
                  <select
                    value={algorithmMode}
                    onChange={(e) => setAlgorithmMode(e.target.value as AlgorithmMode)}
                    className="px-3 py-1.5 bg-bg-tertiary rounded-lg text-text-primary border border-border text-sm"
                  >
                    {(Object.keys(ALGORITHM_CONFIGS) as AlgorithmMode[]).map((mode) => (
                      <option key={mode} value={mode}>
                        {ALGORITHM_CONFIGS[mode].name}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-xs text-text-muted flex-1">
                  {activeConfig.description}
                </span>
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm items-center">
              <span className="px-3 py-1 bg-bg-tertiary rounded-full text-text-secondary">
                {messages.length} messages
              </span>
              <span className="px-3 py-1 bg-bg-tertiary rounded-full text-text-secondary">
                {players.length} players
              </span>
              <span className="px-3 py-1 bg-info/20 text-info rounded-full">
                {Math.max(...messages.map(m => m.dayIndex)) + 1} day(s)
              </span>
              {altSuspicions.filter(s => s.category === "critical").length > 0 && (
                <span className="px-3 py-1 bg-error/20 text-error rounded-full font-semibold">
                  {altSuspicions.filter(s => s.category === "critical").length} critical matches
                </span>
              )}
              {altSuspicions.filter(s => s.category === "high").length > 0 && (
                <span className="px-3 py-1 bg-warning/20 text-warning rounded-full">
                  {altSuspicions.filter(s => s.category === "high").length} high matches
                </span>
              )}

              {/* Export Dropdown */}
              <div className="ml-auto relative" ref={exportRef}>
                <button
                  onClick={() => setExportOpen(!exportOpen)}
                  className="px-4 py-1.5 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors text-sm inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                  <svg className={`w-3 h-3 transition-transform ${exportOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {exportOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-bg-secondary border border-border rounded-lg shadow-xl z-50">
                    <button
                      onClick={() => { exportFullReportJSON({ messages, playerStats, altSuspicions, socialInsights, slipPatterns, similarityMatrix, algorithmMode }); setExportOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-text-primary hover:bg-bg-tertiary rounded-t-lg transition-colors"
                    >
                      <div className="font-semibold">Full Report (JSON)</div>
                      <div className="text-text-muted text-xs">All data, stats, and findings</div>
                    </button>
                    <button
                      onClick={() => { exportSummaryHTML({ messages, playerStats, altSuspicions, socialInsights, slipPatterns, similarityMatrix, algorithmMode }); setExportOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-text-primary hover:bg-bg-tertiary transition-colors"
                    >
                      <div className="font-semibold">Summary Report (HTML)</div>
                      <div className="text-text-muted text-xs">Shareable visual report</div>
                    </button>
                    {selectedPlayers.length > 0 && (
                      <>
                        <button
                          onClick={() => { exportPlayerChatHTML(messages, selectedPlayers); setExportOpen(false); }}
                          className="w-full text-left px-4 py-3 text-sm text-text-primary hover:bg-bg-tertiary transition-colors border-t border-border"
                        >
                          <div className="font-semibold">Player Chat (HTML)</div>
                          <div className="text-text-muted text-xs">Colored chat from {selectedPlayers.length === 1 ? selectedPlayers[0] : `${selectedPlayers.length} players`}</div>
                        </button>
                        <button
                          onClick={() => { exportPlayerChat(messages, selectedPlayers); setExportOpen(false); }}
                          className="w-full text-left px-4 py-3 text-sm text-text-primary hover:bg-bg-tertiary rounded-b-lg transition-colors"
                        >
                          <div className="font-semibold">Player Chat (TXT)</div>
                          <div className="text-text-muted text-xs">Plain text from {selectedPlayers.length === 1 ? selectedPlayers[0] : `${selectedPlayers.length} players`}</div>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <>
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {(["chat", "players", "alts", "social", "matrix", "forensics"] as const).map((tab) => (
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
                  {tab === "players" && `Players (${players.length})`}
                  {tab === "alts" && `Alt Detection ${altSuspicions.length > 0 ? `(${altSuspicions.length})` : ""}`}
                  {tab === "social" && `Social ${socialInsights.length > 0 ? `(${socialInsights.length})` : ""}`}
                  {tab === "matrix" && "Similarity Matrix"}
                  {tab === "forensics" && "Forensics Lab"}
                </button>
              ))}
            </div>

            {/* Chat Tab */}
            {activeTab === "chat" && (
              <ChatTab
                messages={filteredMessages}
                allMessages={messages}
                players={players}
                selectedPlayers={selectedPlayers}
                setSelectedPlayers={setSelectedPlayers}
                togglePlayer={togglePlayer}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
              />
            )}

            {/* Players Tab */}
            {activeTab === "players" && (
              <PlayersTab playerStats={playerStats} />
            )}

            {/* Alts Tab */}
            {activeTab === "alts" && (
              <AltsTab
                altSuspicions={altSuspicions}
                setSelectedPlayers={setSelectedPlayers}
                setActiveTab={setActiveTab}
                setCompareMode={setCompareMode}
                activeConfig={activeConfig}
              />
            )}

            {/* Social Tab */}
            {activeTab === "social" && (
              <SocialTab
                socialInsights={socialInsights}
                slipPatterns={slipPatterns}
                setSelectedPlayers={setSelectedPlayers}
                setActiveTab={setActiveTab}
              />
            )}

            {/* Similarity Matrix Tab */}
            {activeTab === "matrix" && similarityMatrix.players.length > 0 && (
              <MatrixTab
                similarityMatrix={similarityMatrix}
                setCompareMode={setCompareMode}
                setActiveTab={setActiveTab}
              />
            )}

            {/* Forensics Lab Tab */}
            {activeTab === "forensics" && (
              <ForensicsTab
                players={players}
                compareMode={compareMode}
                setCompareMode={setCompareMode}
                getCompareStats={getCompareStats}
              />
            )}
          </>
        )}

        {/* Empty State */}
        {messages.length === 0 && <EmptyState />}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ChatTab({
  messages,
  allMessages,
  players,
  selectedPlayers,
  setSelectedPlayers,
  togglePlayer,
  searchTerm,
  setSearchTerm,
}: {
  messages: ChatMessage[];
  allMessages: ChatMessage[];
  players: string[];
  selectedPlayers: string[];
  setSelectedPlayers: (players: string[]) => void;
  togglePlayer: (player: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}) {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
          />
        </div>
        {selectedPlayers.length > 0 && (
          <span className="text-xs text-text-muted">
            {selectedPlayers.length} player{selectedPlayers.length > 1 ? "s" : ""} selected
          </span>
        )}
        {selectedPlayers.length > 0 && (
          <button
            onClick={() => exportPlayerChatHTML(allMessages, selectedPlayers)}
            className="px-4 py-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 inline-flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export HTML
          </button>
        )}
        {(selectedPlayers.length > 0 || searchTerm) && (
          <button
            onClick={() => { setSelectedPlayers([]); setSearchTerm(""); }}
            className="px-4 py-2 bg-error/20 text-error rounded-lg hover:bg-error/30 text-sm"
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
              onClick={() => togglePlayer(player)}
              className={`px-3 py-1 rounded-full text-sm transition-all ${
                selectedPlayers.includes(player) ? "ring-2 ring-white" : ""
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
        {messages.map((msg, idx) => (
          <div key={idx} className="flex gap-2 hover:bg-bg-tertiary/50 px-2 py-1 rounded">
            <span className="text-text-muted shrink-0">[{msg.timestamp}]</span>
            <span
              className="font-semibold shrink-0 cursor-pointer hover:underline"
              style={{ color: getPlayerColor(msg.player) }}
              onClick={() => togglePlayer(msg.player)}
            >
              &lt;{msg.player}&gt;
            </span>
            <span className="text-text-primary break-words">{msg.message}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center text-text-muted py-8">
            No messages found
          </div>
        )}
      </div>
    </div>
  );
}

function PlayersTab({ playerStats }: { playerStats: AdvancedPlayerStats[] }) {
  return (
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
              {stats.messageCount} messages
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-bg-tertiary rounded-lg p-2 text-center">
                <div className="text-text-muted text-xs">Words</div>
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
                <div className="text-text-muted mb-1 text-xs">Typos</div>
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
                <div className="text-text-muted mb-1 text-xs">Abbreviations</div>
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
                <div className="text-text-muted mb-1 text-xs">Phrases</div>
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
                <div className="text-text-muted mb-1 text-xs">Micro-patterns</div>
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
                  Emotes ({stats.emoticonStyle.emoteFrequency}% of messages)
                </div>
                <div className="flex flex-wrap gap-1">
                  {stats.emoticonStyle.commonEmotes.slice(0, 5).map(emote => (
                    <span key={emote} className="px-2 py-0.5 bg-info/20 text-info rounded text-xs">
                      {emote}
                    </span>
                  ))}
                  {stats.emoticonStyle.usesNose && (
                    <span className="px-2 py-0.5 bg-warning/20 text-warning rounded text-xs">:-) style</span>
                  )}
                  {stats.emoticonStyle.usesEmoji && (
                    <span className="px-2 py-0.5 bg-warning/20 text-warning rounded text-xs">emoji user</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {stats.punctuationStyle.spaceBefore && (
                <span className="px-2 py-0.5 bg-info/20 text-info rounded text-xs">space before ?!</span>
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
  );
}

function AltsTab({
  altSuspicions,
  setSelectedPlayers,
  setActiveTab,
  setCompareMode,
  activeConfig,
}: {
  altSuspicions: AltSuspicion[];
  setSelectedPlayers: (players: string[]) => void;
  setActiveTab: (tab: "chat" | "players" | "alts" | "social" | "matrix" | "forensics") => void;
  setCompareMode: (mode: [string, string] | null) => void;
  activeConfig: AlgorithmConfig;
}) {
  if (altSuspicions.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
        <div className="text-4xl mb-4">&#128373;</div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          No suspicious alt accounts found
        </h3>
        <p className="text-text-secondary">
          The forensic analysis found no matches using <strong>{activeConfig.name}</strong>.
          <br />
          Try the &quot;Sensitive&quot; algorithm for more results, or add more chat messages.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-accent text-sm">
            <strong>{activeConfig.name}:</strong> {activeConfig.description}
          </p>
          <div className="flex gap-3 text-xs text-text-muted">
            <span>Min score: {activeConfig.minScoreToReport}</span>
            <span>Min reasons: {activeConfig.minStrongReasons}</span>
            <span>Min messages: {activeConfig.minMessages}</span>
          </div>
        </div>
      </div>

      {altSuspicions.map((suspicion, idx) => (
        <AltSuspicionCard
          key={idx}
          suspicion={suspicion}
          setSelectedPlayers={setSelectedPlayers}
          setActiveTab={setActiveTab}
          setCompareMode={setCompareMode}
        />
      ))}
    </div>
  );
}

function AltSuspicionCard({
  suspicion,
  setSelectedPlayers,
  setActiveTab,
  setCompareMode,
}: {
  suspicion: AltSuspicion;
  setSelectedPlayers: (players: string[]) => void;
  setActiveTab: (tab: "chat" | "players" | "alts" | "social" | "matrix" | "forensics") => void;
  setCompareMode: (mode: [string, string] | null) => void;
}) {
  return (
    <div
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
              NEVER ONLINE TOGETHER
            </span>
          )}
          {suspicion.handoffScore >= 20 && (
            <span className="px-2 py-1 bg-warning text-black text-xs rounded font-bold">
              HANDOFF PATTERN
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
        <h4 className="text-sm font-semibold text-text-secondary mb-2">Analysis Summary:</h4>
        <div className="text-text-primary text-sm whitespace-pre-line">
          {suspicion.humanExplanation}
        </div>
      </div>

      {/* Score Breakdown Bars */}
      <ScoreBreakdownBars suspicion={suspicion} />

      {/* Detailed Reasons (collapsible) */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary mb-2">
          View all {suspicion.reasons.length} reasons...
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
          onClick={() => { setSelectedPlayers([suspicion.player1]); setActiveTab("chat"); }}
          className="px-3 py-1 bg-bg-tertiary rounded-lg text-text-secondary text-sm hover:bg-bg-tertiary/80"
        >
          View {suspicion.player1}
        </button>
        <button
          onClick={() => { setSelectedPlayers([suspicion.player2]); setActiveTab("chat"); }}
          className="px-3 py-1 bg-bg-tertiary rounded-lg text-text-secondary text-sm hover:bg-bg-tertiary/80"
        >
          View {suspicion.player2}
        </button>
        <button
          onClick={() => { setSelectedPlayers([suspicion.player1, suspicion.player2]); setActiveTab("chat"); }}
          className="px-3 py-1 bg-info/20 text-info rounded-lg text-sm hover:bg-info/30"
        >
          View Both
        </button>
        <button
          onClick={() => { setCompareMode([suspicion.player1, suspicion.player2]); setActiveTab("forensics"); }}
          className="px-3 py-1 bg-accent/20 text-accent rounded-lg text-sm hover:bg-accent/30"
        >
          Compare in Lab
        </button>
      </div>
    </div>
  );
}

function ScoreBreakdownBars({ suspicion }: { suspicion: AltSuspicion }) {
  return (
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
          <div className="text-xs text-text-muted mb-1">Rare words</div>
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
  );
}

function MatrixTab({
  similarityMatrix,
  setCompareMode,
  setActiveTab,
}: {
  similarityMatrix: SimilarityMatrix;
  setCompareMode: (mode: [string, string] | null) => void;
  setActiveTab: (tab: "chat" | "players" | "alts" | "social" | "matrix" | "forensics") => void;
}) {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-4 overflow-x-auto">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Player Similarity Matrix
      </h3>
      <p className="text-text-secondary text-sm mb-4">
        Heatmap of similarities between players. Higher scores = more suspicious.
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
          <span className="text-text-muted">Critical (60+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "rgba(245, 158, 11, 0.5)" }}></div>
          <span className="text-text-muted">Suspicious (30-59)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "rgba(59, 130, 246, 0.3)" }}></div>
          <span className="text-text-muted">Low (&lt;30)</span>
        </div>
      </div>
    </div>
  );
}

function SocialTab({
  socialInsights,
  slipPatterns,
  setSelectedPlayers,
  setActiveTab,
}: {
  socialInsights: SocialInsight[];
  slipPatterns: SlipPattern[];
  setSelectedPlayers: (players: string[]) => void;
  setActiveTab: (tab: "chat" | "players" | "alts" | "social" | "matrix" | "forensics") => void;
}) {
  if (socialInsights.length === 0 && slipPatterns.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
        <div className="text-4xl mb-4">&#128101;</div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          No social patterns detected
        </h3>
        <p className="text-text-secondary">
          No conflicts, self-talk, or typing inconsistencies found.
          <br />
          This analysis works best with more chat data and multiple active players.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Social Insights Section */}
      {socialInsights.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">
            Social Relationships ({socialInsights.length})
          </h3>

          {socialInsights.map((insight, idx) => (
            <div
              key={idx}
              className={`bg-bg-secondary rounded-xl border p-4 ${
                insight.insightType === "self_talk_suspected"
                  ? "border-error"
                  : insight.insightType === "conflict_detected"
                  ? "border-warning"
                  : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="font-semibold"
                    style={{ color: getPlayerColor(insight.player1) }}
                  >
                    {insight.player1}
                  </span>
                  <span className="text-text-muted">
                    {insight.insightType === "conflict_detected" ? "&#128683;" : "&#8596;"}
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: getPlayerColor(insight.player2) }}
                  >
                    {insight.player2}
                  </span>

                  {insight.insightType === "self_talk_suspected" && (
                    <span className="px-2 py-1 bg-error text-white text-xs rounded font-bold">
                      SELF-TALK DETECTED
                    </span>
                  )}
                  {insight.insightType === "conflict_detected" && (
                    <span className="px-2 py-1 bg-warning text-black text-xs rounded font-bold">
                      POSSIBLE CONFLICT
                    </span>
                  )}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  insight.confidence >= 70
                    ? "bg-error/20 text-error"
                    : insight.confidence >= 50
                    ? "bg-warning/20 text-warning"
                    : "bg-info/20 text-info"
                }`}>
                  {insight.confidence}% confidence
                </div>
              </div>

              <p className="text-text-primary mb-3">{insight.description}</p>

              <div className="bg-bg-tertiary rounded-lg p-3">
                <div className="text-xs text-text-muted mb-1">Evidence:</div>
                <ul className="text-sm text-text-secondary list-disc list-inside space-y-1">
                  {insight.evidence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => { setSelectedPlayers([insight.player1]); setActiveTab("chat"); }}
                  className="px-3 py-1 bg-bg-tertiary rounded-lg text-text-secondary text-sm hover:bg-bg-tertiary/80"
                >
                  View {insight.player1}
                </button>
                <button
                  onClick={() => { setSelectedPlayers([insight.player2]); setActiveTab("chat"); }}
                  className="px-3 py-1 bg-bg-tertiary rounded-lg text-text-secondary text-sm hover:bg-bg-tertiary/80"
                >
                  View {insight.player2}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slip Patterns Section */}
      {slipPatterns.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">
            Typing Inconsistencies ({slipPatterns.length})
          </h3>
          <p className="text-text-secondary text-sm">
            Players whose typing style changes during the session - may indicate someone
            trying to type differently but &quot;slipping&quot; back to their natural style.
          </p>

          {slipPatterns.map((slip, idx) => (
            <div
              key={idx}
              className={`bg-bg-secondary rounded-xl border p-4 ${
                slip.suspicionLevel === "high"
                  ? "border-error"
                  : slip.suspicionLevel === "medium"
                  ? "border-warning"
                  : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="font-semibold text-lg"
                    style={{ color: getPlayerColor(slip.playerName) }}
                  >
                    {slip.playerName}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded font-bold ${
                    slip.suspicionLevel === "high"
                      ? "bg-error text-white"
                      : slip.suspicionLevel === "medium"
                      ? "bg-warning text-black"
                      : "bg-info/20 text-info"
                  }`}>
                    {slip.slipType.replace(/_/g, " ").toUpperCase()}
                  </span>
                </div>
              </div>

              <p className="text-text-primary mb-3">{slip.description}</p>

              <div className="bg-bg-tertiary rounded-lg p-3">
                <div className="text-xs text-text-muted mb-1">Evidence:</div>
                <ul className="text-sm text-text-secondary list-disc list-inside space-y-1">
                  {slip.evidence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-3">
                <button
                  onClick={() => { setSelectedPlayers([slip.playerName]); setActiveTab("chat"); }}
                  className="px-3 py-1 bg-bg-tertiary rounded-lg text-text-secondary text-sm hover:bg-bg-tertiary/80"
                >
                  View messages
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-info/10 border border-info/30 rounded-xl p-4 text-sm">
        <h4 className="font-semibold text-info mb-2">Understanding Social Analysis</h4>
        <div className="text-text-secondary space-y-2">
          <p>
            <strong>Self-Talk Detected:</strong> Two accounts talk to each other but have
            identical writing styles. Real friends write differently - this suggests one
            person controlling both accounts and talking to themselves.
          </p>
          <p>
            <strong>Possible Conflict:</strong> Two players are online together but never
            interact with each other, while actively chatting with others. This may indicate
            they&apos;re avoiding each other (and are NOT the same person).
          </p>
          <p>
            <strong>Typing Inconsistencies:</strong> A player&apos;s writing style changes during
            the session - they might be &quot;slipping&quot; back to their natural style after
            trying to type differently.
          </p>
        </div>
      </div>
    </div>
  );
}

function ForensicsTab({
  players,
  compareMode,
  setCompareMode,
  getCompareStats,
}: {
  players: string[];
  compareMode: [string, string] | null;
  setCompareMode: (mode: [string, string] | null) => void;
  getCompareStats: [AdvancedPlayerStats, AdvancedPlayerStats] | null;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-bg-secondary rounded-xl border border-border p-4">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Forensics Lab - Direct Comparison
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <select
            value={compareMode?.[0] || ""}
            onChange={(e) => setCompareMode([e.target.value, compareMode?.[1] || ""])}
            className="px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
          >
            <option value="">Select player 1</option>
            {players.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={compareMode?.[1] || ""}
            onChange={(e) => setCompareMode([compareMode?.[0] || "", e.target.value])}
            className="px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
          >
            <option value="">Select player 2</option>
            {players.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {getCompareStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {getCompareStats.map((stats, idx) => (
            <ForensicsPlayerCard
              key={stats.name}
              stats={stats}
              otherStats={getCompareStats[1 - idx]}
            />
          ))}
        </div>
      )}

      {!getCompareStats && (
        <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
          <div className="text-4xl mb-4">&#128300;</div>
          <p className="text-text-secondary">
            Select two players to compare
          </p>
        </div>
      )}
    </div>
  );
}

function ForensicsPlayerCard({
  stats,
  otherStats,
}: {
  stats: AdvancedPlayerStats;
  otherStats: AdvancedPlayerStats;
}) {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-4">
      <h4
        className="text-lg font-semibold mb-4"
        style={{ color: getPlayerColor(stats.name) }}
      >
        {stats.name}
      </h4>

      <div className="space-y-4 text-sm">
        {/* Stylometry */}
        <div>
          <div className="text-text-muted mb-2 font-semibold">Stylometry</div>
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
          <div className="text-text-muted mb-2 font-semibold">Typos</div>
          <div className="flex flex-wrap gap-1">
            {stats.typoPatterns.length > 0 ? (
              stats.typoPatterns.map(t => (
                <span
                  key={t}
                  className={`px-2 py-1 rounded text-xs ${
                    otherStats.typoPatterns.includes(t)
                      ? "bg-error text-white font-bold"
                      : "bg-bg-tertiary text-text-secondary"
                  }`}
                >
                  {t}
                </span>
              ))
            ) : (
              <span className="text-text-muted">None detected</span>
            )}
          </div>
        </div>

        {/* Substitutions */}
        <div>
          <div className="text-text-muted mb-2 font-semibold">Letter substitutions</div>
          <div className="flex flex-wrap gap-1">
            {stats.letterSubstitutions.size > 0 ? (
              [...stats.letterSubstitutions.keys()].map(s => (
                <span
                  key={s}
                  className={`px-2 py-1 rounded text-xs ${
                    otherStats.letterSubstitutions.has(s)
                      ? "bg-warning text-black font-bold"
                      : "bg-bg-tertiary text-text-secondary"
                  }`}
                >
                  {s}
                </span>
              ))
            ) : (
              <span className="text-text-muted">None</span>
            )}
          </div>
        </div>

        {/* Common phrases */}
        <div>
          <div className="text-text-muted mb-2 font-semibold">Phrases</div>
          <div className="flex flex-wrap gap-1">
            {stats.commonPhrases.slice(0, 5).map(p => (
              <span
                key={p}
                className={`px-2 py-1 rounded text-xs ${
                  otherStats.commonPhrases.includes(p)
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
          <div className="text-text-muted mb-2 font-semibold">Punctuation</div>
          <div className="flex flex-wrap gap-1">
            {stats.punctuationStyle.spaceBefore && (
              <span className={`px-2 py-1 rounded text-xs ${
                otherStats.punctuationStyle.spaceBefore
                  ? "bg-success text-white"
                  : "bg-bg-tertiary text-text-secondary"
              }`}>
                space before ?!
              </span>
            )}
            {stats.punctuationStyle.doublePunctuation && (
              <span className={`px-2 py-1 rounded text-xs ${
                otherStats.punctuationStyle.doublePunctuation
                  ? "bg-success text-white"
                  : "bg-bg-tertiary text-text-secondary"
              }`}>
                !! / ??
              </span>
            )}
            {stats.punctuationStyle.ellipsisStyle !== "none" && (
              <span className={`px-2 py-1 rounded text-xs ${
                otherStats.punctuationStyle.ellipsisStyle === stats.punctuationStyle.ellipsisStyle
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
          <div className="text-text-muted mb-2 font-semibold">Word length distribution</div>
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
  );
}

function EmptyState() {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-12 text-center">
      <div className="text-6xl mb-4">&#128172;</div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Upload a chat log to begin
      </h2>
      <p className="text-text-secondary mb-4">
        Supported format: [HH:MM:SS] &lt;PlayerName&gt; message
      </p>
      <div className="bg-bg-tertiary rounded-lg p-4 text-left font-mono text-sm max-w-md mx-auto">
        <div className="text-text-muted">[21:25:05] &lt;Yarpii&gt; hey everyone whats going on</div>
        <div className="text-text-muted">[21:25:12] &lt;Minabello&gt; not much just working on my deed</div>
        <div className="text-text-muted">[21:25:18] &lt;Stormweaver&gt; anyone want to trade some bricks?</div>
      </div>

      <div className="mt-8 text-left max-w-xl mx-auto">
        <h3 className="text-lg font-semibold text-text-primary mb-3">Forensic Techniques:</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-bg-tertiary rounded-lg p-3">
            <div className="font-semibold text-error">Temporal Analysis</div>
            <div className="text-text-muted">Detects accounts that are never online together</div>
          </div>
          <div className="bg-bg-tertiary rounded-lg p-3">
            <div className="font-semibold text-warning">N-gram Fingerprinting</div>
            <div className="text-text-muted">Character patterns identify writing style</div>
          </div>
          <div className="bg-bg-tertiary rounded-lg p-3">
            <div className="font-semibold text-info">Yule&apos;s K Stylometry</div>
            <div className="text-text-muted">Statistical author fingerprint</div>
          </div>
          <div className="bg-bg-tertiary rounded-lg p-3">
            <div className="font-semibold text-success">Network Analysis</div>
            <div className="text-text-muted">Interaction patterns and conversation partners</div>
          </div>
        </div>
      </div>
    </div>
  );
}
