"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { TradeMatch, UserReputation, BarterSuggestion, MatchStatus } from "@/lib/types";

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
