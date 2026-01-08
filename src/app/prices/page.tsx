"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

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
    if (trend === "up") return "text-green-400";
    if (trend === "down") return "text-red-400";
    return "text-gray-400";
  };

  const formatPrice = (price: number) => {
    if (price >= 100) return `${(price / 100).toFixed(2)}g`;
    if (price >= 1) return `${price.toFixed(2)}s`;
    return `${(price * 100).toFixed(0)}c`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Price Guide</h1>
          <p className="text-gray-400 mt-1">
            Community-driven price database with historical trends
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700 pb-2">
          <button
            onClick={() => {
              setActiveTab("browse");
              setSelectedItem(null);
            }}
            className={`px-4 py-2 rounded-t ${
              activeTab === "browse"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Browse Prices
          </button>
          {user && (
            <button
              onClick={() => setActiveTab("submit")}
              className={`px-4 py-2 rounded-t ${
                activeTab === "submit"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              Submit Price
            </button>
          )}
          {activeTab === "detail" && selectedItem && (
            <button className="px-4 py-2 rounded-t bg-blue-600 text-white">
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
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Search
              </button>
            </form>

            {/* Price Table */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <p className="text-gray-400">
                  {search ? "No items found matching your search." : "No price data available yet."}
                </p>
                {user && (
                  <button
                    onClick={() => setActiveTab("submit")}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
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
                      <tr className="border-b border-gray-700 text-left">
                        <th className="pb-3 text-gray-400 font-medium">Item</th>
                        <th className="pb-3 text-gray-400 font-medium text-right">Avg Price</th>
                        <th className="pb-3 text-gray-400 font-medium text-right">Min</th>
                        <th className="pb-3 text-gray-400 font-medium text-right">Max</th>
                        <th className="pb-3 text-gray-400 font-medium text-center">Trend</th>
                        <th className="pb-3 text-gray-400 font-medium text-right">Samples</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.item_name}
                          onClick={() => fetchItemDetail(item.item_name)}
                          className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer"
                        >
                          <td className="py-3 font-medium">{item.item_name}</td>
                          <td className="py-3 text-right text-yellow-400">
                            {formatPrice(item.avg_price)}
                          </td>
                          <td className="py-3 text-right text-gray-400">
                            {formatPrice(item.min_price)}
                          </td>
                          <td className="py-3 text-right text-gray-400">
                            {formatPrice(item.max_price)}
                          </td>
                          <td className={`py-3 text-center ${getTrendColor(item.trend)}`}>
                            {getTrendIcon(item.trend)}{" "}
                            {item.trend !== "stable" && `${Math.abs(item.trend_percentage)}%`}
                          </td>
                          <td className="py-3 text-right text-gray-500">{item.price_count}</td>
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
                      className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-gray-400">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50"
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
              className="mb-4 text-blue-400 hover:text-blue-300"
            >
              ← Back to Browse
            </button>

            <h2 className="text-2xl font-bold mb-6">{selectedItem}</h2>

            {/* Analytics */}
            {itemDetail.analytics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Average Price</div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {formatPrice(itemDetail.analytics.avg_price)}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Min / Max</div>
                  <div className="text-lg">
                    {formatPrice(itemDetail.analytics.min_price)} -{" "}
                    {formatPrice(itemDetail.analytics.max_price)}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">24h Change</div>
                  <div
                    className={`text-xl font-bold ${
                      itemDetail.analytics.price_change_24h > 0
                        ? "text-green-400"
                        : itemDetail.analytics.price_change_24h < 0
                        ? "text-red-400"
                        : "text-gray-400"
                    }`}
                  >
                    {itemDetail.analytics.price_change_24h > 0 ? "+" : ""}
                    {itemDetail.analytics.price_change_24h.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">7d Change</div>
                  <div
                    className={`text-xl font-bold ${
                      itemDetail.analytics.price_change_7d > 0
                        ? "text-green-400"
                        : itemDetail.analytics.price_change_7d < 0
                        ? "text-red-400"
                        : "text-gray-400"
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
                    <div key={server.server} className="bg-gray-800 rounded-lg p-3">
                      <div className="font-medium">{server.server}</div>
                      <div className="text-yellow-400">{formatPrice(server.avg_price)}</div>
                      <div className="text-xs text-gray-500">{server.price_count} prices</div>
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
                      <tr className="border-b border-gray-700 text-left">
                        <th className="pb-2 text-gray-400 text-sm">Date</th>
                        <th className="pb-2 text-gray-400 text-sm text-right">Price</th>
                        <th className="pb-2 text-gray-400 text-sm text-center">Type</th>
                        <th className="pb-2 text-gray-400 text-sm text-center">QL</th>
                        <th className="pb-2 text-gray-400 text-sm">Server</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemDetail.history.slice(0, 20).map((entry) => (
                        <tr key={entry.id} className="border-b border-gray-800">
                          <td className="py-2 text-sm text-gray-400">
                            {new Date(entry.recorded_at).toLocaleDateString()}
                          </td>
                          <td className="py-2 text-right text-yellow-400">
                            {formatPrice(entry.price)}
                          </td>
                          <td className="py-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                entry.order_type === "sell"
                                  ? "bg-green-900 text-green-300"
                                  : "bg-blue-900 text-blue-300"
                              }`}
                            >
                              {entry.order_type}
                            </span>
                          </td>
                          <td className="py-2 text-center text-gray-400">{entry.quality}</td>
                          <td className="py-2 text-sm text-gray-500">{entry.server || "-"}</td>
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
            <p className="text-gray-400 mb-6">
              Help the community by submitting prices you&apos;ve seen or paid in-game.
            </p>

            <form onSubmit={handleSubmitPrice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Item Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={submitForm.item_name}
                  onChange={(e) => setSubmitForm({ ...submitForm, item_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. Rare Longsword"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Price (silver) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={submitForm.price}
                    onChange={(e) => setSubmitForm({ ...submitForm, price: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
                    placeholder="1.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={submitForm.order_type}
                    onChange={(e) =>
                      setSubmitForm({ ...submitForm, order_type: e.target.value as "buy" | "sell" })
                    }
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
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
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
                    placeholder="50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Server</label>
                  <select
                    value={submitForm.server}
                    onChange={(e) => setSubmitForm({ ...submitForm, server: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
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
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Price"}
              </button>
            </form>
          </div>
        )}

        {/* Not logged in for submit */}
        {activeTab === "submit" && !user && (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400 mb-4">Please log in to submit prices.</p>
            <Link href="/login" className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
              Log In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
