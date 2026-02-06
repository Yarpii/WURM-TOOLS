"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import type { TradeMatch, UserReputation, BarterSuggestion, MatchStatus } from "@/lib/types";
import InfoSection from "@/components/InfoSection";

type TabType = "matches" | "suggestions" | "reputation";

export default function TradesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("matches");
  const [loading, setLoading] = useState(true);

  // Data states
  const [matches, setMatches] = useState<TradeMatch[]>([]);
  const [suggestions, setSuggestions] = useState<BarterSuggestion[]>([]);
  const [reputation, setReputation] = useState<UserReputation | null>(null);

  // Rating form states
  const [ratingMatch, setRatingMatch] = useState<TradeMatch | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");

  const fetchData = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/matches");
      const data = await res.json();
      if (data.matches) setMatches(data.matches);
      if (data.suggestions) setSuggestions(data.suggestions);
      if (data.reputation) setReputation(data.reputation);
    } catch (err) {
      console.error("Failed to fetch trades:", err);
    }
  };

  const findNewMatches = async () => {
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "find-matches" }),
      });
      const data = await res.json();
      if (data.found > 0) {
        await fetchData();
      }
      return data.found;
    } catch (err) {
      console.error("Failed to find matches:", err);
      return 0;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchData();
      // Auto-find new matches
      await findNewMatches();
      setLoading(false);
    };
    if (user) loadData();
  }, [user]);

  const handleUpdateStatus = async (matchId: number, status: MatchStatus) => {
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-status", match_id: matchId, status }),
      });

      if (res.ok) {
        await fetchData();
        // If completed, open rating dialog
        if (status === "completed") {
          const match = matches.find(m => m.id === matchId);
          if (match) {
            const otherUserId = match.buyer_id === user?.id ? match.seller_id : match.buyer_id;
            setRatingMatch({ ...match });
          }
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingMatch || !user) return;

    const otherUserId = ratingMatch.buyer_id === user.id ? ratingMatch.seller_id : ratingMatch.buyer_id;

    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rate",
          rated_user_id: otherUserId,
          rating: ratingValue,
          comment: ratingComment || undefined,
          match_id: ratingMatch.id,
        }),
      });

      if (res.ok) {
        setRatingMatch(null);
        setRatingValue(5);
        setRatingComment("");
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to submit rating:", err);
    }
  };

  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case "pending": return "bg-warning/20 text-warning";
      case "contacted": return "bg-info/20 text-info";
      case "completed": return "bg-success/20 text-success";
      case "declined": return "bg-danger/20 text-danger";
      case "expired": return "bg-text-muted/20 text-text-muted";
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-text-muted";
  };

  // Login required
  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-text-primary mb-4">Trade Matching</h1>
          <p className="text-text-muted mb-6">Login to see your trade matches and suggestions</p>
          <a
            href="/login"
            className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Trade Matching</h1>
        <p className="text-text-secondary">
          Find perfect matches for your buy and sell orders
        </p>
      </div>

      {/* Reputation Summary */}
      {reputation && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
            <div className="text-2xl font-bold text-warning">
              {"★".repeat(Math.round(reputation.avg_rating))}
            </div>
            <div className="text-sm text-text-muted">{reputation.avg_rating.toFixed(1)} Rating</div>
          </div>
          <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
            <div className="text-2xl font-bold text-text-primary">{reputation.total_ratings}</div>
            <div className="text-sm text-text-muted">Reviews</div>
          </div>
          <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
            <div className="text-2xl font-bold text-success">{reputation.completed_trades}</div>
            <div className="text-sm text-text-muted">Trades</div>
          </div>
          <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
            <div className="text-2xl font-bold text-info">{reputation.successful_matches}</div>
            <div className="text-sm text-text-muted">Matches</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("matches")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "matches"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          }`}
        >
          My Matches
          {matches.filter(m => m.status === "pending").length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-warning/30 text-warning rounded">
              {matches.filter(m => m.status === "pending").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("suggestions")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "suggestions"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          }`}
        >
          Barter Suggestions
          {suggestions.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-accent/20 rounded">
              {suggestions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("reputation")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "reputation"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          }`}
        >
          My Reputation
        </button>
      </div>

      {/* Matches Tab */}
      {activeTab === "matches" && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-text-muted">Loading matches...</div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12 bg-bg-secondary rounded-lg border border-border">
              <div className="text-text-muted mb-4">No trade matches found</div>
              <p className="text-sm text-text-muted">
                Create buy or sell orders in the{" "}
                <a href="/market" className="text-accent hover:text-accent-hover">
                  Market
                </a>{" "}
                to get matched with traders!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map(match => {
                const isBuyer = match.buyer_id === user.id;
                const otherUser = isBuyer ? match.seller_username : match.buyer_username;

                return (
                  <div
                    key={match.id}
                    className="bg-bg-secondary rounded-lg border border-border p-4 hover:border-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(match.status)}`}>
                            {match.status}
                          </span>
                          <span className={`text-sm font-bold ${getMatchScoreColor(match.match_score)}`}>
                            {match.match_score}% match
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold text-text-primary mb-1">
                          {match.item_name}
                        </h3>

                        <div className="text-sm text-text-secondary">
                          <span>Quantity: {match.quantity}</span>
                          {match.sell_price && (
                            <span className="ml-4">
                              Price: <span className="text-accent">{match.sell_price}s</span>
                            </span>
                          )}
                        </div>

                        <div className="mt-2 text-sm">
                          <span className="text-text-muted">
                            {isBuyer ? "Seller" : "Buyer"}:{" "}
                          </span>
                          <span className="text-text-primary font-medium">{otherUser}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {match.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(match.id, "contacted")}
                              className="px-4 py-2 bg-info/20 text-info rounded-lg hover:bg-info/30 transition-colors"
                            >
                              Contact
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(match.id, "declined")}
                              className="px-4 py-2 bg-text-muted/20 text-text-muted rounded-lg hover:bg-text-muted/30 transition-colors"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {match.status === "contacted" && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(match.id, "completed")}
                              className="px-4 py-2 bg-success/20 text-success rounded-lg hover:bg-success/30 transition-colors"
                            >
                              Complete Trade
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(match.id, "declined")}
                              className="px-4 py-2 bg-text-muted/20 text-text-muted rounded-lg hover:bg-text-muted/30 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Suggestions Tab */}
      {activeTab === "suggestions" && (
        <div>
          {suggestions.length === 0 ? (
            <div className="text-center py-12 bg-bg-secondary rounded-lg border border-border">
              <div className="text-text-muted mb-2">No barter suggestions</div>
              <p className="text-sm text-text-muted">
                Create trade orders to find barter opportunities!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion, i) => (
                <div
                  key={i}
                  className="bg-bg-secondary rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <span className="px-2 py-0.5 text-xs bg-info/20 text-info rounded">
                      BARTER
                    </span>
                    <span className="text-sm text-text-muted">{suggestion.match_reason}</span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-3 bg-bg-tertiary rounded-lg">
                      <div className="text-xs text-text-muted mb-1">Your Order</div>
                      <div className="font-medium text-text-primary">
                        {suggestion.your_order.item_name}
                      </div>
                      <div className="text-sm text-text-secondary">
                        {suggestion.your_order.quantity}x
                      </div>
                    </div>

                    <div className="p-3 bg-bg-tertiary rounded-lg">
                      <div className="text-xs text-text-muted mb-1">Their Order</div>
                      <div className="font-medium text-text-primary">
                        {suggestion.their_order.item_name}
                      </div>
                      <div className="text-sm text-text-secondary">
                        {suggestion.their_order.quantity}x • by {suggestion.their_order.username}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reputation Tab */}
      {activeTab === "reputation" && reputation && (
        <div className="space-y-6">
          <div className="bg-bg-secondary rounded-lg border border-border p-6 text-center">
            <div className="text-4xl mb-2">
              {reputation.avg_rating > 0 ? (
                <span className="text-warning">
                  {"★".repeat(Math.round(reputation.avg_rating))}
                  {"☆".repeat(5 - Math.round(reputation.avg_rating))}
                </span>
              ) : (
                <span className="text-text-muted">No ratings yet</span>
              )}
            </div>
            <div className="text-lg text-text-primary font-medium">
              {reputation.avg_rating.toFixed(1)} out of 5
            </div>
            <div className="text-sm text-text-muted">
              Based on {reputation.total_ratings} review{reputation.total_ratings !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-bg-secondary rounded-lg border border-border p-4">
              <h3 className="font-semibold text-text-primary mb-2">Trading Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Completed Trades</span>
                  <span className="text-text-primary">{reputation.completed_trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Successful Matches</span>
                  <span className="text-text-primary">{reputation.successful_matches}</span>
                </div>
              </div>
            </div>

            <div className="bg-bg-secondary rounded-lg border border-border p-4">
              <h3 className="font-semibold text-text-primary mb-2">Tips to Improve</h3>
              <ul className="text-sm text-text-muted space-y-1">
                <li>• Respond quickly to matches</li>
                <li>• Complete trades as agreed</li>
                <li>• Be honest about item quality</li>
                <li>• Communicate clearly</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========== FEATURE SECTIONS BELOW MAIN CONTENT ========== */}

      {/* How It Works Section */}
      <section className="mt-16 pt-16 border-t border-border">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-sm font-medium mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Smart Matching
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
            How Trade Matching Works
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Our matching system automatically finds perfect trades between buyers and sellers, saving you time and effort.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur-lg" />
            <div className="relative bg-bg-secondary rounded-xl border border-border p-6 hover:border-pink-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Create Orders</h3>
              <p className="text-text-secondary text-sm">
                List what you want to buy or sell in the Marketplace. Include item details, quantity, and your preferred price.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur-lg" />
            <div className="relative bg-bg-secondary rounded-xl border border-border p-6 hover:border-pink-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Get Matched</h3>
              <p className="text-text-secondary text-sm">
                Our system automatically finds compatible trades. You'll see a match score showing how well the orders align.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur-lg" />
            <div className="relative bg-bg-secondary rounded-xl border border-border p-6 hover:border-pink-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Complete & Rate</h3>
              <p className="text-text-secondary text-sm">
                Contact your match, complete the trade in-game, then rate each other to build your trading reputation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Build Reputation Section */}
      <section className="mt-16 pt-16 border-t border-border">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Reputation System
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
              Build Your Trading Reputation
            </h2>
            <p className="text-text-secondary mb-8">
              Your reputation is your trading passport. Good ratings attract more traders and better deals.
            </p>

            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-border hover:border-yellow-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-text-primary mb-1">Complete Trades Honestly</h4>
                  <p className="text-sm text-text-muted">Deliver what you promise. Honest trading leads to positive reviews.</p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-border hover:border-yellow-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-text-primary mb-1">Respond Quickly</h4>
                  <p className="text-sm text-text-muted">Fast responses show you're reliable. Don't leave matches waiting.</p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-border hover:border-yellow-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-text-primary mb-1">Communicate Clearly</h4>
                  <p className="text-sm text-text-muted">Clear communication prevents misunderstandings and disputes.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-3xl blur-2xl" />
            <div className="relative bg-bg-secondary rounded-2xl border border-border p-8 overflow-hidden">
              {/* Decorative pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                  backgroundSize: "24px 24px",
                }} />
              </div>

              <div className="relative text-center">
                <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-white mb-6 shadow-2xl">
                  <span className="text-4xl">★</span>
                </div>

                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <span className="text-text-secondary text-sm">5-Star Rating</span>
                    <span className="text-yellow-400 font-semibold">★★★★★</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <span className="text-text-secondary text-sm">Completed Trades</span>
                    <span className="text-success font-semibold">Track Record</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <span className="text-text-secondary text-sm">Match Success</span>
                    <span className="text-accent font-medium">Higher Priority</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Tools Section */}
      <section className="mt-16 pt-16 border-t border-border">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-text-primary mb-3">
            Your Trading Ecosystem
          </h2>
          <p className="text-text-secondary">
            Use these tools together with Trade Matching for the complete experience
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Marketplace */}
          <Link
            href="/market"
            className="group relative p-6 bg-bg-secondary rounded-xl border border-border hover:border-violet-500/50 transition-all hover:translate-y-[-4px]"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity blur-lg" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-violet-400 transition-colors">
                Marketplace
              </h3>
              <p className="text-text-secondary text-sm mb-4">
                Create buy and sell orders. This is where matches come from!
              </p>
              <span className="inline-flex items-center gap-2 text-violet-400 text-sm font-medium">
                Create Orders
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </div>
          </Link>

          {/* Analytics */}
          <Link
            href="/analytics"
            className="group relative p-6 bg-bg-secondary rounded-xl border border-border hover:border-rose-500/50 transition-all hover:translate-y-[-4px]"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity blur-lg" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-rose-400 transition-colors">
                Market Analytics
              </h3>
              <p className="text-text-secondary text-sm mb-4">
                Track market trends and set price alerts for better trading decisions.
              </p>
              <span className="inline-flex items-center gap-2 text-rose-400 text-sm font-medium">
                View Trends
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </div>
          </Link>

          {/* Price Guide */}
          <Link
            href="/prices"
            className="group relative p-6 bg-bg-secondary rounded-xl border border-border hover:border-emerald-500/50 transition-all hover:translate-y-[-4px]"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity blur-lg" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-emerald-400 transition-colors">
                Price Guide
              </h3>
              <p className="text-text-secondary text-sm mb-4">
                Know fair prices before accepting or declining a match.
              </p>
              <span className="inline-flex items-center gap-2 text-emerald-400 text-sm font-medium">
                Check Prices
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </div>
          </Link>
        </div>
      </section>

      <InfoSection>
      {/* CTA Section */}
      <section className="mt-16 pt-16 border-t border-border pb-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500/10 to-rose-600/10 border border-pink-500/20 p-8 md:p-12">
          {/* Background decoration */}
          <div className="absolute -right-24 -top-24 w-64 h-64 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full opacity-10 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 w-48 h-48 bg-gradient-to-br from-rose-500 to-red-600 rounded-full opacity-10 blur-3xl" />

          <div className="relative text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-pink-500/25">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
              Ready to Find Your Match?
            </h2>
            <p className="text-text-secondary mb-8">
              Create your first order in the Marketplace and let our smart matching system find compatible traders for you!
            </p>

            <Link
              href="/market"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-700 transition-all hover:scale-105 shadow-lg shadow-pink-500/25"
            >
              Go to Marketplace
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
      </InfoSection>

      {/* Rating Modal */}
      {ratingMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-primary rounded-xl border border-border p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Rate This Trade</h2>

            <div className="mb-4 text-center">
              <div className="text-3xl mb-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRatingValue(star)}
                    className={`${star <= ratingValue ? "text-warning" : "text-text-muted"} hover:scale-110 transition-transform`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div className="text-sm text-text-muted">
                Rate{" "}
                {ratingMatch.buyer_id === user.id
                  ? ratingMatch.seller_username
                  : ratingMatch.buyer_username}
              </div>
            </div>

            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Leave a comment (optional)"
              rows={3}
              className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none resize-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setRatingMatch(null)}
                className="flex-1 px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-hover transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleSubmitRating}
                className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
