"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import type { TrendingItem, PriceHistory, PriceAnalytics, PriceAlert, MarketOrder } from "@/lib/types";
import InfoSection from "@/components/InfoSection";

type TabType = "overview" | "search" | "alerts";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(true);

  // Data states
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [deals, setDeals] = useState<MarketOrder[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);

  // Search states
  const [searchItem, setSearchItem] = useState("");
  const [searchDays, setSearchDays] = useState(30);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [analytics, setAnalytics] = useState<PriceAnalytics | null>(null);
  const [searching, setSearching] = useState(false);

  // Alert form states
  const [alertForm, setAlertForm] = useState({
    item_name: "",
    target_price: 0,
    condition: "below" as "above" | "below",
  });
  const [alertError, setAlertError] = useState("");
  const [alertSuccess, setAlertSuccess] = useState("");

  const fetchOverviewData = async () => {
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (Array.isArray(data.trending)) setTrending(data.trending);
      if (Array.isArray(data.deals)) setDeals(data.deals);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    }
  };

  const fetchAlerts = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/analytics?action=alerts");
      const data = await res.json();
      if (Array.isArray(data)) setAlerts(data);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchOverviewData();
      if (user) await fetchAlerts();
      setLoading(false);
    };
    loadData();
  }, [user]);

  const handleSearch = async () => {
    if (!searchItem.trim()) return;
    setSearching(true);
    setPriceHistory([]);
    setAnalytics(null);

    try {
      const [historyRes, analyticsRes] = await Promise.all([
        fetch(`/api/analytics?action=history&item=${encodeURIComponent(searchItem)}&days=${searchDays}`),
        fetch(`/api/analytics?action=analytics&item=${encodeURIComponent(searchItem)}`),
      ]);

      const historyData = await historyRes.json();
      const analyticsData = await analyticsRes.json();

      if (Array.isArray(historyData)) setPriceHistory(historyData);
      if (analyticsData && !analyticsData.error) setAnalytics(analyticsData);
    } catch (err) {
      console.error("Search failed:", err);
    }
    setSearching(false);
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertError("");
    setAlertSuccess("");

    try {
      const res = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-alert",
          ...alertForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAlertError(data.error || "Failed to create alert");
        return;
      }

      setAlertSuccess("Price alert created!");
      setAlertForm({ item_name: "", target_price: 0, condition: "below" });
      await fetchAlerts();
    } catch (err) {
      setAlertError("Connection error: " + String(err));
    }
  };

  const handleDeleteAlert = async (alertId: number) => {
    try {
      const res = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-alert", alert_id: alertId }),
      });

      if (res.ok) await fetchAlerts();
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up": return "▲";
      case "down": return "▼";
      default: return "●";
    }
  };

  const getTrendColor = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up": return "text-success";
      case "down": return "text-danger";
      default: return "text-text-muted";
    }
  };

  // Simple sparkline component using divs
  const Sparkline = ({ data }: { data: PriceHistory[] }) => {
    if (data.length < 2) return <span className="text-text-muted text-sm">Not enough data</span>;

    const prices = data.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    return (
      <div className="flex items-end gap-0.5 h-12">
        {data.slice(-30).map((point, i) => {
          const height = ((point.price - min) / range) * 100;
          const isLast = i === data.slice(-30).length - 1;
          return (
            <div
              key={i}
              className={`w-1.5 rounded-t transition-all ${isLast ? "bg-accent" : "bg-accent/50"}`}
              style={{ height: `${Math.max(10, height)}%` }}
              title={`${point.price} (${new Date(point.recorded_at).toLocaleDateString()})`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Market Analytics</h1>
        <p className="text-text-secondary">
          Track prices, find deals, and set price alerts
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "overview"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "search"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          }`}
        >
          Price Search
        </button>
        {user && (
          <button
            onClick={() => setActiveTab("alerts")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "alerts"
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            }`}
          >
            Price Alerts
            {alerts.filter(a => a.is_active).length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-accent/20 rounded">
                {alerts.filter(a => a.is_active).length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {loading ? (
            <div className="text-center py-12 text-text-muted">Loading analytics...</div>
          ) : (
            <>
              {/* Trending Items */}
              <div>
                <h2 className="text-xl font-semibold text-text-primary mb-4">Trending Items</h2>
                {trending.length === 0 ? (
                  <div className="text-center py-8 text-text-muted bg-bg-secondary rounded-lg border border-border">
                    No trending data yet. Create some orders to generate analytics!
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {trending.map((item, i) => (
                      <div
                        key={i}
                        className="bg-bg-secondary rounded-lg border border-border p-4 hover:border-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-text-primary truncate">{item.item_name}</h3>
                          <span className={`flex items-center gap-1 text-sm font-medium ${getTrendColor(item.trend)}`}>
                            {getTrendIcon(item.trend)}
                            {Math.abs(item.trend_percentage).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex gap-4 text-sm text-text-secondary">
                          <span>Orders: <span className="text-text-primary">{item.order_count}</span></span>
                          <span>Avg: <span className="text-accent">{item.avg_price.toFixed(2)}s</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Best Deals */}
              <div>
                <h2 className="text-xl font-semibold text-text-primary mb-4">Best Deals</h2>
                {deals.length === 0 ? (
                  <div className="text-center py-8 text-text-muted bg-bg-secondary rounded-lg border border-border">
                    No deals found. Deals are orders priced 15% or more below average.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {deals.map((deal) => (
                      <div
                        key={deal.id}
                        className="bg-bg-secondary rounded-lg border border-success/30 p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 text-xs font-medium bg-success/20 text-success rounded">
                            DEAL
                          </span>
                          <span className="text-sm text-text-muted">by {deal.username}</span>
                        </div>
                        <h3 className="font-semibold text-text-primary">{deal.item_name}</h3>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span>Qty: <span className="text-text-primary">{deal.quantity}</span></span>
                          {deal.quality && <span>QL: <span className="text-text-primary">{deal.quality}</span></span>}
                          <span>Price: <span className="text-success font-medium">{deal.price} {deal.currency}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Search Tab */}
      {activeTab === "search" && (
        <div className="space-y-6">
          <div className="bg-bg-secondary rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Search Price History</h2>
            <div className="flex gap-4 flex-wrap">
              <input
                type="text"
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Enter item name..."
                className="flex-1 min-w-[200px] px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
              />
              <select
                value={searchDays}
                onChange={(e) => setSearchDays(parseInt(e.target.value))}
                className="px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <button
                onClick={handleSearch}
                disabled={searching || !searchItem.trim()}
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {/* Search Results */}
          {analytics && (
            <div className="bg-bg-secondary rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">{analytics.item_name}</h2>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-bg-tertiary rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-accent">{analytics.avg_price.toFixed(2)}</div>
                  <div className="text-sm text-text-muted">Avg Price</div>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-success">{analytics.min_price.toFixed(2)}</div>
                  <div className="text-sm text-text-muted">Min Price</div>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-danger">{analytics.max_price.toFixed(2)}</div>
                  <div className="text-sm text-text-muted">Max Price</div>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-text-primary">{analytics.total_orders}</div>
                  <div className="text-sm text-text-muted">Total Orders</div>
                </div>
              </div>

              {/* Price Changes */}
              <div className="flex gap-4 mb-6 text-sm">
                <span className="flex items-center gap-2">
                  24h Change:
                  <span className={analytics.price_change_24h >= 0 ? "text-success" : "text-danger"}>
                    {analytics.price_change_24h >= 0 ? "+" : ""}{analytics.price_change_24h.toFixed(2)}%
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  7d Change:
                  <span className={analytics.price_change_7d >= 0 ? "text-success" : "text-danger"}>
                    {analytics.price_change_7d >= 0 ? "+" : ""}{analytics.price_change_7d.toFixed(2)}%
                  </span>
                </span>
              </div>

              {/* Sparkline */}
              {priceHistory.length > 0 && (
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <div className="text-sm text-text-muted mb-2">Price History</div>
                  <Sparkline data={priceHistory} />
                </div>
              )}
            </div>
          )}

          {searchItem && !analytics && !searching && priceHistory.length === 0 && (
            <div className="text-center py-12 text-text-muted bg-bg-secondary rounded-lg border border-border">
              No price data found for &quot;{searchItem}&quot;
            </div>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && user && (
        <div className="space-y-6">
          {/* Create Alert Form */}
          <div className="bg-bg-secondary rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Create Price Alert</h2>
            <form onSubmit={handleCreateAlert} className="space-y-4">
              {alertError && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  {alertError}
                </div>
              )}
              {alertSuccess && (
                <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
                  {alertSuccess}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <input
                  type="text"
                  value={alertForm.item_name}
                  onChange={(e) => setAlertForm({ ...alertForm, item_name: e.target.value })}
                  placeholder="Item name"
                  required
                  className="px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
                <div className="flex gap-2">
                  <select
                    value={alertForm.condition}
                    onChange={(e) => setAlertForm({ ...alertForm, condition: e.target.value as "above" | "below" })}
                    className="px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  >
                    <option value="below">Price drops below</option>
                    <option value="above">Price rises above</option>
                  </select>
                  <input
                    type="number"
                    value={alertForm.target_price || ""}
                    onChange={(e) => setAlertForm({ ...alertForm, target_price: parseFloat(e.target.value) || 0 })}
                    placeholder="Target price"
                    step="0.01"
                    required
                    className="w-32 px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
                >
                  Create Alert
                </button>
              </div>
            </form>
          </div>

          {/* Active Alerts */}
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Your Alerts</h2>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-text-muted bg-bg-secondary rounded-lg border border-border">
                No price alerts yet. Create one above!
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`bg-bg-secondary rounded-lg border p-4 ${
                      alert.is_active ? "border-border" : "border-success/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-text-primary">{alert.item_name}</h3>
                        <p className="text-sm text-text-secondary">
                          Alert when price {alert.condition === "below" ? "drops below" : "rises above"}{" "}
                          <span className="text-accent font-medium">{alert.target_price}s</span>
                        </p>
                        {alert.triggered_at && (
                          <p className="text-xs text-success mt-1">
                            Triggered: {new Date(alert.triggered_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="text-text-muted hover:text-danger transition-colors"
                        title="Delete alert"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-2">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        alert.is_active
                          ? "bg-success/20 text-success"
                          : "bg-text-muted/20 text-text-muted"
                      }`}>
                        {alert.is_active ? "Active" : "Triggered"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Login prompt */}
      {!user && activeTab === "alerts" && (
        <div className="text-center py-12">
          <div className="text-text-muted mb-4">Please login to set price alerts</div>
          <a
            href="/login"
            className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Login
          </a>
        </div>
      )}

      {/* ========== FEATURE SECTIONS BELOW MAIN CONTENT ========== */}

      {/* How It Works Section */}
      <section className="mt-16 pt-16 border-t border-border">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Market Intelligence
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
            How Analytics Works
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Get data-driven insights from marketplace activity. Track trends, find deals, and never miss a price drop.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur-lg" />
            <div className="relative bg-bg-secondary rounded-xl border border-border p-6 hover:border-rose-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">View Trends</h3>
              <p className="text-text-secondary text-sm">
                See what items are hot right now. Track price movements and order volume across the marketplace.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur-lg" />
            <div className="relative bg-bg-secondary rounded-xl border border-border p-6 hover:border-rose-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Search History</h3>
              <p className="text-text-secondary text-sm">
                Look up any item's price history. See charts, averages, and recent price changes over time.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur-lg" />
            <div className="relative bg-bg-secondary rounded-xl border border-border p-6 hover:border-rose-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Set Alerts</h3>
              <p className="text-text-secondary text-sm">
                Create price alerts for items you want. Get notified when prices hit your target automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stay Ahead Section */}
      <section className="mt-16 pt-16 border-t border-border">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Visual */}
          <div className="relative order-2 lg:order-1">
            <div className="absolute -inset-4 bg-gradient-to-r from-rose-500/20 to-orange-500/20 rounded-3xl blur-2xl" />
            <div className="relative bg-bg-secondary rounded-2xl border border-border p-8 overflow-hidden">
              {/* Decorative pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                  backgroundSize: "24px 24px",
                }} />
              </div>

              <div className="relative text-center">
                <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white mb-6 shadow-2xl">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>

                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <span className="text-text-secondary text-sm">Trending Items</span>
                    <span className="text-success font-semibold">Real-time</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <span className="text-text-secondary text-sm">Price History</span>
                    <span className="text-accent font-semibold">Up to 90 Days</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <span className="text-text-secondary text-sm">Alert System</span>
                    <span className="text-rose-400 font-medium">Instant Notifications</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Content */}
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Trade Smarter
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
              Stay Ahead of the Market
            </h2>
            <p className="text-text-secondary mb-8">
              Knowledge is profit. Use analytics to make informed trading decisions and spot opportunities before others.
            </p>

            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-border hover:border-orange-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-text-primary mb-1">Spot Price Trends</h4>
                  <p className="text-sm text-text-muted">Know when prices are rising or falling. Buy low, sell high with confidence.</p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-border hover:border-orange-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-text-primary mb-1">Find Below-Market Deals</h4>
                  <p className="text-sm text-text-muted">Automatically surface orders priced significantly below average market rates.</p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-border hover:border-orange-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-text-primary mb-1">Never Miss a Target Price</h4>
                  <p className="text-sm text-text-muted">Set alerts and we'll notify you the moment prices hit your desired level.</p>
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
            Complete Your Analysis
          </h2>
          <p className="text-text-secondary">
            Combine analytics with these tools for maximum trading power
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
                Put your insights to work. Create orders based on your analysis.
              </p>
              <span className="inline-flex items-center gap-2 text-violet-400 text-sm font-medium">
                Start Trading
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
                Community-submitted prices to cross-reference your analysis.
              </p>
              <span className="inline-flex items-center gap-2 text-emerald-400 text-sm font-medium">
                View Prices
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </div>
          </Link>

          {/* Trade Matching */}
          <Link
            href="/trades"
            className="group relative p-6 bg-bg-secondary rounded-xl border border-border hover:border-pink-500/50 transition-all hover:translate-y-[-4px]"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity blur-lg" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-pink-400 transition-colors">
                Trade Matching
              </h3>
              <p className="text-text-secondary text-sm mb-4">
                Find perfect trading partners matched by our smart system.
              </p>
              <span className="inline-flex items-center gap-2 text-pink-400 text-sm font-medium">
                View Matches
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500/10 to-pink-600/10 border border-rose-500/20 p-8 md:p-12">
          {/* Background decoration */}
          <div className="absolute -right-24 -top-24 w-64 h-64 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full opacity-10 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 w-48 h-48 bg-gradient-to-br from-pink-500 to-red-600 rounded-full opacity-10 blur-3xl" />

          <div className="relative text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-rose-500/25">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
              Never Miss a Deal Again
            </h2>
            <p className="text-text-secondary mb-8">
              Set up price alerts for items you're watching. We'll notify you the instant prices hit your target so you can act fast!
            </p>

            {user ? (
              <button
                onClick={() => setActiveTab("alerts")}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold hover:from-rose-600 hover:to-pink-700 transition-all hover:scale-105 shadow-lg shadow-rose-500/25"
              >
                Set Up Price Alerts
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            ) : (
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold hover:from-rose-600 hover:to-pink-700 transition-all hover:scale-105 shadow-lg shadow-rose-500/25"
              >
                Join to Use Alerts
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </section>
      </InfoSection>
    </div>
  );
}
