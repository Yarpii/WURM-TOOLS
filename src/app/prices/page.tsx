"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import InfoSection from "@/components/InfoSection";

interface PriceGuideItem {
  item_name: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_count: number;
  last_updated: string;
  trend: "up" | "down" | "stable";
  trend_percentage: number;
}

interface ServerPrice {
  server: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_count: number;
}

interface PriceHistory {
  id: number;
  item_name: string;
  price: number;
  quality: number;
  order_type: string;
  server: string | null;
  recorded_at: string;
}

interface ItemDetail {
  analytics: {
    item_name: string;
    avg_price: number;
    min_price: number;
    max_price: number;
    price_change_24h: number;
    price_change_7d: number;
    total_orders: number;
  } | null;
  history: PriceHistory[];
  servers: ServerPrice[];
}

const WURM_SERVERS = [
  "Harmony", "Melody", "Cadence", "Defiance",
  "Xanadu", "Deliverance", "Exodus", "Celebration",
  "Pristine", "Release", "Independence", "Chaos",
];

type TabType = "browse" | "submit" | "detail";

export default function PriceGuidePage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("browse");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Browse state
  const [items, setItems] = useState<PriceGuideItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail state
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [itemDetail, setItemDetail] = useState<ItemDetail | null>(null);

  // Submit form state
  const [submitForm, setSubmitForm] = useState({
    item_name: "",
    price: "",
    order_type: "sell" as "buy" | "sell",
    quality: "",
    server: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/prices?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load prices");
        return;
      }

      setItems(data.items);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError("Failed to load prices: " + String(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchItemDetail = async (itemName: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/prices?action=detail&item=${encodeURIComponent(itemName)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load item details");
        return;
      }

      setItemDetail(data);
      setSelectedItem(itemName);
      setActiveTab("detail");
    } catch (err) {
      setError("Failed to load item details: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "browse") {
      fetchItems();
    }
  }, [activeTab, fetchItems]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchItems();
  };

  const handleSubmitPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: submitForm.item_name.trim(),
          price: parseFloat(submitForm.price),
          order_type: submitForm.order_type,
          quality: submitForm.quality ? parseInt(submitForm.quality) : undefined,
          server: submitForm.server || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit price");
        return;
      }

      setSuccess("Price submitted successfully! Thank you for contributing.");
      setSubmitForm({
        item_name: "",
        price: "",
        order_type: "sell",
        quality: "",
        server: "",
      });
    } catch (err) {
      setError("Failed to submit price: " + String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    if (trend === "up") return "↑";
    if (trend === "down") return "↓";
    return "→";
  };

  const getTrendColor = (trend: "up" | "down" | "stable") => {
    if (trend === "up") return "text-success";
    if (trend === "down") return "text-danger";
    return "text-text-secondary";
  };

  const formatPrice = (price: number) => {
    if (price >= 100) return `${(price / 100).toFixed(2)}g`;
    if (price >= 1) return `${price.toFixed(2)}s`;
    return `${(price * 100).toFixed(0)}c`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Price Guide</h1>
          <p className="text-text-secondary mt-1">
            Community-driven price database with historical trends
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-danger/20 border border-danger text-danger px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-success/20 border border-success text-success px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border pb-2">
          <button
            onClick={() => {
              setActiveTab("browse");
              setSelectedItem(null);
            }}
            className={`px-4 py-2 rounded-t ${
              activeTab === "browse"
                ? "bg-accent text-white"
                : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
            }`}
          >
            Browse Prices
          </button>
          {user && (
            <button
              onClick={() => setActiveTab("submit")}
              className={`px-4 py-2 rounded-t ${
                activeTab === "submit"
                  ? "bg-accent text-white"
                  : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
              }`}
            >
              Submit Price
            </button>
          )}
          {activeTab === "detail" && selectedItem && (
            <button className="px-4 py-2 rounded-t bg-accent text-white">
              {selectedItem}
            </button>
          )}
        </div>

        {/* Browse Tab */}
        {activeTab === "browse" && (
          <div>
            {/* Search */}
            <form onSubmit={handleSearch} className="mb-6 flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items..."
                className="flex-1 px-4 py-2 bg-bg-secondary border border-border rounded focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-accent hover:bg-accent-hover rounded"
              >
                Search
              </button>
            </form>

            {/* Price Table */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent mx-auto"></div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 bg-bg-secondary rounded-lg">
                <p className="text-text-secondary">
                  {search ? "No items found matching your search." : "No price data available yet."}
                </p>
                {user && (
                  <button
                    onClick={() => setActiveTab("submit")}
                    className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover rounded"
                  >
                    Be the first to submit a price!
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 text-text-secondary font-medium">Item</th>
                        <th className="pb-3 text-text-secondary font-medium text-right">Avg Price</th>
                        <th className="pb-3 text-text-secondary font-medium text-right">Min</th>
                        <th className="pb-3 text-text-secondary font-medium text-right">Max</th>
                        <th className="pb-3 text-text-secondary font-medium text-center">Trend</th>
                        <th className="pb-3 text-text-secondary font-medium text-right">Samples</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.item_name}
                          onClick={() => fetchItemDetail(item.item_name)}
                          className="border-b border-border hover:bg-bg-secondary/50 cursor-pointer"
                        >
                          <td className="py-3 font-medium">{item.item_name}</td>
                          <td className="py-3 text-right text-warning">
                            {formatPrice(item.avg_price)}
                          </td>
                          <td className="py-3 text-right text-text-secondary">
                            {formatPrice(item.min_price)}
                          </td>
                          <td className="py-3 text-right text-text-secondary">
                            {formatPrice(item.max_price)}
                          </td>
                          <td className={`py-3 text-center ${getTrendColor(item.trend)}`}>
                            {getTrendIcon(item.trend)}{" "}
                            {item.trend !== "stable" && `${Math.abs(item.trend_percentage)}%`}
                          </td>
                          <td className="py-3 text-right text-text-muted">{item.price_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-bg-secondary rounded hover:bg-bg-tertiary disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-text-secondary">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-bg-secondary rounded hover:bg-bg-tertiary disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Detail Tab */}
        {activeTab === "detail" && selectedItem && itemDetail && (
          <div>
            <button
              onClick={() => {
                setActiveTab("browse");
                setSelectedItem(null);
              }}
              className="mb-4 text-accent hover:text-accent-hover"
            >
              ← Back to Browse
            </button>

            <h2 className="text-2xl font-bold mb-6">{selectedItem}</h2>

            {/* Analytics */}
            {itemDetail.analytics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-bg-secondary rounded-lg p-4">
                  <div className="text-text-secondary text-sm">Average Price</div>
                  <div className="text-2xl font-bold text-warning">
                    {formatPrice(itemDetail.analytics.avg_price)}
                  </div>
                </div>
                <div className="bg-bg-secondary rounded-lg p-4">
                  <div className="text-text-secondary text-sm">Min / Max</div>
                  <div className="text-lg">
                    {formatPrice(itemDetail.analytics.min_price)} -{" "}
                    {formatPrice(itemDetail.analytics.max_price)}
                  </div>
                </div>
                <div className="bg-bg-secondary rounded-lg p-4">
                  <div className="text-text-secondary text-sm">24h Change</div>
                  <div
                    className={`text-xl font-bold ${
                      itemDetail.analytics.price_change_24h > 0
                        ? "text-success"
                        : itemDetail.analytics.price_change_24h < 0
                        ? "text-danger"
                        : "text-text-secondary"
                    }`}
                  >
                    {itemDetail.analytics.price_change_24h > 0 ? "+" : ""}
                    {itemDetail.analytics.price_change_24h.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-bg-secondary rounded-lg p-4">
                  <div className="text-text-secondary text-sm">7d Change</div>
                  <div
                    className={`text-xl font-bold ${
                      itemDetail.analytics.price_change_7d > 0
                        ? "text-success"
                        : itemDetail.analytics.price_change_7d < 0
                        ? "text-danger"
                        : "text-text-secondary"
                    }`}
                  >
                    {itemDetail.analytics.price_change_7d > 0 ? "+" : ""}
                    {itemDetail.analytics.price_change_7d.toFixed(1)}%
                  </div>
                </div>
              </div>
            )}

            {/* Server Comparison */}
            {itemDetail.servers.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-4">Price by Server</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {itemDetail.servers.map((server) => (
                    <div key={server.server} className="bg-bg-secondary rounded-lg p-3">
                      <div className="font-medium">{server.server}</div>
                      <div className="text-warning">{formatPrice(server.avg_price)}</div>
                      <div className="text-xs text-text-muted">{server.price_count} prices</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price History */}
            {itemDetail.history.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-4">Recent Prices</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-2 text-text-secondary text-sm">Date</th>
                        <th className="pb-2 text-text-secondary text-sm text-right">Price</th>
                        <th className="pb-2 text-text-secondary text-sm text-center">Type</th>
                        <th className="pb-2 text-text-secondary text-sm text-center">QL</th>
                        <th className="pb-2 text-text-secondary text-sm">Server</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemDetail.history.slice(0, 20).map((entry) => (
                        <tr key={entry.id} className="border-b border-border">
                          <td className="py-2 text-sm text-text-secondary">
                            {new Date(entry.recorded_at).toLocaleDateString()}
                          </td>
                          <td className="py-2 text-right text-warning">
                            {formatPrice(entry.price)}
                          </td>
                          <td className="py-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                entry.order_type === "sell"
                                  ? "bg-success/20 text-success"
                                  : "bg-accent/20 text-accent"
                              }`}
                            >
                              {entry.order_type}
                            </span>
                          </td>
                          <td className="py-2 text-center text-text-secondary">{entry.quality}</td>
                          <td className="py-2 text-sm text-text-muted">{entry.server || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Tab */}
        {activeTab === "submit" && user && (
          <div className="max-w-lg">
            <p className="text-text-secondary mb-6">
              Help the community by submitting prices you&apos;ve seen or paid in-game.
            </p>

            <form onSubmit={handleSubmitPrice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Item Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={submitForm.item_name}
                  onChange={(e) => setSubmitForm({ ...submitForm, item_name: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-secondary border border-border rounded focus:border-accent focus:outline-none"
                  placeholder="e.g. Rare Longsword"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Price (silver) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={submitForm.price}
                    onChange={(e) => setSubmitForm({ ...submitForm, price: e.target.value })}
                    className="w-full px-4 py-2 bg-bg-secondary border border-border rounded focus:border-accent focus:outline-none"
                    placeholder="1.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Type <span className="text-danger">*</span>
                  </label>
                  <select
                    value={submitForm.order_type}
                    onChange={(e) =>
                      setSubmitForm({ ...submitForm, order_type: e.target.value as "buy" | "sell" })
                    }
                    className="w-full px-4 py-2 bg-bg-secondary border border-border rounded focus:border-accent focus:outline-none"
                  >
                    <option value="sell">Sell Price</option>
                    <option value="buy">Buy Price</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quality (QL)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={submitForm.quality}
                    onChange={(e) => setSubmitForm({ ...submitForm, quality: e.target.value })}
                    className="w-full px-4 py-2 bg-bg-secondary border border-border rounded focus:border-accent focus:outline-none"
                    placeholder="50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Server</label>
                  <select
                    value={submitForm.server}
                    onChange={(e) => setSubmitForm({ ...submitForm, server: e.target.value })}
                    className="w-full px-4 py-2 bg-bg-secondary border border-border rounded focus:border-accent focus:outline-none"
                  >
                    <option value="">Select server...</option>
                    {WURM_SERVERS.map((server) => (
                      <option key={server} value={server}>
                        {server}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !submitForm.item_name || !submitForm.price}
                className="w-full px-4 py-2 bg-accent hover:bg-accent-hover rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Price"}
              </button>
            </form>
          </div>
        )}

        {/* Not logged in for submit */}
        {activeTab === "submit" && !user && (
          <div className="text-center py-12 bg-bg-secondary rounded-lg">
            <p className="text-text-secondary mb-4">Please log in to submit prices.</p>
            <Link href="/login" className="px-4 py-2 bg-accent rounded hover:bg-accent-hover">
              Log In
            </Link>
          </div>
        )}

        {/* ========== FEATURE SECTIONS BELOW MAIN CONTENT ========== */}

        {/* How It Works Section */}
        <section className="mt-16 pt-16 border-t border-border">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Community Powered
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
              How the Price Guide Works
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Our price database is built by the community, for the community. Every price you see comes from real trades and observations.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur-lg" />
              <div className="relative bg-bg-secondary rounded-xl border border-border p-6 hover:border-emerald-500/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                  1
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Browse Prices</h3>
                <p className="text-text-secondary text-sm">
                  Search our database of community-submitted prices. See averages, trends, and historical data for any item.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur-lg" />
              <div className="relative bg-bg-secondary rounded-xl border border-border p-6 hover:border-emerald-500/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                  2
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Compare Servers</h3>
                <p className="text-text-secondary text-sm">
                  Click on any item to see price breakdowns by server. Find where items are cheapest or most valuable.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur-lg" />
              <div className="relative bg-bg-secondary rounded-xl border border-border p-6 hover:border-emerald-500/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                  3
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Contribute Data</h3>
                <p className="text-text-secondary text-sm">
                  Help keep prices accurate by submitting prices you see in-game. Every contribution helps the whole community.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Contribute Section */}
        <section className="mt-16 pt-16 border-t border-border">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Visual */}
            <div className="relative order-2 lg:order-1">
              <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-3xl blur-2xl" />
              <div className="relative bg-bg-secondary rounded-2xl border border-border p-8 overflow-hidden">
                {/* Decorative pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                    backgroundSize: "24px 24px",
                  }} />
                </div>

                <div className="relative text-center">
                  <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white mb-6 shadow-2xl">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>

                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                      <span className="text-text-secondary text-sm">Price Samples</span>
                      <span className="text-accent font-semibold">Community Driven</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                      <span className="text-text-secondary text-sm">Update Frequency</span>
                      <span className="text-success font-semibold">Real-time</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                      <span className="text-text-secondary text-sm">Server Coverage</span>
                      <span className="text-text-primary font-medium">All Servers</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Content */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Be a Hero
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
                Why Your Prices Matter
              </h2>
              <p className="text-text-secondary mb-8">
                Every price submission helps the entire Wurm community make better trading decisions. Here's why you should contribute.
              </p>

              <div className="space-y-4">
                <div className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-border hover:border-amber-500/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary mb-1">Help Fellow Players</h4>
                    <p className="text-sm text-text-muted">New players don't know what things are worth. Your data helps them avoid scams.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-border hover:border-amber-500/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary mb-1">Track Market Trends</h4>
                    <p className="text-sm text-text-muted">More data means better trend analysis. See where the market is heading.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-border hover:border-amber-500/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary mb-1">Compare Across Servers</h4>
                    <p className="text-sm text-text-muted">Server-specific data helps find the best deals, wherever you play.</p>
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
              Complete Your Trading Toolkit
            </h2>
            <p className="text-text-secondary">
              Use these tools alongside the Price Guide for maximum trading success
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
                  Create buy and sell orders. Find trades using fair prices from this guide.
                </p>
                <span className="inline-flex items-center gap-2 text-violet-400 text-sm font-medium">
                  Browse Orders
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </div>
            </Link>

            {/* Merchants */}
            <Link
              href="/merchants"
              className="group relative p-6 bg-bg-secondary rounded-xl border border-border hover:border-blue-500/50 transition-all hover:translate-y-[-4px]"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity blur-lg" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-blue-400 transition-colors">
                  Merchant Directory
                </h3>
                <p className="text-text-secondary text-sm mb-4">
                  Find player-run merchants. Compare their prices to the market average.
                </p>
                <span className="inline-flex items-center gap-2 text-blue-400 text-sm font-medium">
                  Find Merchants
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </div>
            </Link>

            {/* Crafting Calculator */}
            <Link
              href="/crafting"
              className="group relative p-6 bg-bg-secondary rounded-xl border border-border hover:border-orange-500/50 transition-all hover:translate-y-[-4px]"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity blur-lg" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-orange-400 transition-colors">
                  Crafting Calculator
                </h3>
                <p className="text-text-secondary text-sm mb-4">
                  Calculate material costs. Know if crafting or buying is more cost-effective.
                </p>
                <span className="inline-flex items-center gap-2 text-orange-400 text-sm font-medium">
                  Start Crafting
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
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-500/20 p-8 md:p-12">
            {/* Background decoration */}
            <div className="absolute -right-24 -top-24 w-64 h-64 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full opacity-10 blur-3xl" />
            <div className="absolute -left-24 -bottom-24 w-48 h-48 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full opacity-10 blur-3xl" />

            <div className="relative text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-emerald-500/25">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
                Help Build the Database
              </h2>
              <p className="text-text-secondary mb-8">
                See a price in-game? Take 30 seconds to submit it. Every contribution makes the guide more accurate for everyone!
              </p>

              {user ? (
                <button
                  onClick={() => setActiveTab("submit")}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all hover:scale-105 shadow-lg shadow-emerald-500/25"
                >
                  Submit a Price
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              ) : (
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all hover:scale-105 shadow-lg shadow-emerald-500/25"
                >
                  Join to Contribute
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
    </div>
  );
}
