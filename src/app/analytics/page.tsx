"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { TrendingItem, PriceHistory, PriceAnalytics, PriceAlert, MarketOrder } from "@/lib/types";

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
      if (data.trending) setTrending(data.trending);
      if (data.deals) setDeals(data.deals);
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
    </div>
  );
}
