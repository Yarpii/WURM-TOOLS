"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import type { MarketOrder, OrderType, OrderStatus } from "@/lib/types";

type TabType = "browse" | "create" | "my-orders";

// Character type for location quick-select
interface CharacterLocation {
  id: number;
  name: string;
  server?: string;
  deed_name?: string;
}

// Wurm Online servers
const WURM_SERVERS = [
  "Xanadu",
  "Deliverance",
  "Exodus",
  "Celebration",
  "Pristine",
  "Release",
  "Independence",
  "Chaos",
  "Harmony",
  "Melody",
  "Cadence",
  "Defiance",
];

export default function MarketPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("browse");
  const [orders, setOrders] = useState<MarketOrder[]>([]);
  const [myOrders, setMyOrders] = useState<MarketOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    active: 0,
    buy_orders: 0,
    sell_orders: 0,
    trade_orders: 0,
  });

  // Filters
  const [filterType, setFilterType] = useState<OrderType | "all">("all");
  const [filterItem, setFilterItem] = useState("");

  // User's characters for quick location select
  const [characters, setCharacters] = useState<CharacterLocation[]>([]);

  // Create form state
  const [formData, setFormData] = useState({
    order_type: "sell" as OrderType,
    item_name: "",
    quantity: 1,
    quality: 50,
    price: 0,
    currency: "silver",
    trade_for: "",
    server: "",
    location: "",
    notes: "",
    expires_days: 30,
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      params.set("status", "active");
      if (filterType !== "all") params.set("type", filterType);
      if (filterItem) params.set("item", filterItem);

      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      // Ensure we always set an array, even if API returns an error object
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setOrders([]);
    }
  };

  const fetchMyOrders = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/orders?user_id=${user.id}`);
      const data = await res.json();
      // Ensure we always set an array, even if API returns an error object
      setMyOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch my orders:", err);
      setMyOrders([]);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/orders?stats=1");
      const data = await res.json();
      if (data && !data.error) {
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const fetchCharacters = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/characters");
      const data = await res.json();
      if (data.characters && Array.isArray(data.characters)) {
        setCharacters(data.characters);
      }
    } catch (err) {
      console.error("Failed to fetch characters:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchOrders(), fetchStats()]);
      if (user) {
        await fetchMyOrders();
        await fetchCharacters();
      }
      setLoading(false);
    };
    loadData();
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [filterType, filterItem]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to create order");
        setSubmitting(false);
        return;
      }

      setFormSuccess("Order created successfully!");
      setFormData({
        order_type: "sell",
        item_name: "",
        quantity: 1,
        quality: 50,
        price: 0,
        currency: "silver",
        trade_for: "",
        server: "",
        location: "",
        notes: "",
        expires_days: 30,
      });

      // Refresh orders
      await Promise.all([fetchOrders(), fetchMyOrders(), fetchStats()]);
      setSubmitting(false);
    } catch (err) {
      setFormError("Connection error: " + String(err));
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (orderId: number, status: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        await Promise.all([fetchOrders(), fetchMyOrders(), fetchStats()]);
      }
    } catch (err) {
      console.error("Failed to update order:", err);
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await Promise.all([fetchOrders(), fetchMyOrders(), fetchStats()]);
      }
    } catch (err) {
      console.error("Failed to delete order:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format price to remove unnecessary decimal places
  // e.g., 1.0000 -> "1", 1.5000 -> "1.5", 1.2500 -> "1.25"
  const formatPrice = (price: number | string | undefined): string => {
    if (price === undefined || price === null) return "0";
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(numPrice)) return "0";

    // Remove trailing zeros after decimal point
    // If it's a whole number, show without decimals
    if (Number.isInteger(numPrice)) {
      return numPrice.toString();
    }

    // Otherwise, show up to 2 decimal places (removing trailing zeros)
    return parseFloat(numPrice.toFixed(2)).toString();
  };

  const getOrderTypeStyles = (type: OrderType) => {
    switch (type) {
      case "buy":
        return "bg-success/20 text-success border-success/30";
      case "sell":
        return "bg-info/20 text-info border-info/30";
      case "trade":
        return "bg-warning/20 text-warning border-warning/30";
    }
  };

  const getStatusStyles = (status: OrderStatus) => {
    switch (status) {
      case "active":
        return "bg-success/20 text-success";
      case "completed":
        return "bg-info/20 text-info";
      case "cancelled":
        return "bg-text-muted/20 text-text-muted";
      case "expired":
        return "bg-danger/20 text-danger";
    }
  };

  const OrderCard = ({ order, showActions = false }: { order: MarketOrder; showActions?: boolean }) => (
    <div className="bg-bg-tertiary rounded-lg border border-border p-4 hover:border-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getOrderTypeStyles(order.order_type)}`}>
              {order.order_type.toUpperCase()}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs ${getStatusStyles(order.status)}`}>
              {order.status}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-text-primary truncate">
            {order.item_name}
          </h3>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-text-secondary">
            <span>Qty: <span className="text-text-primary">{order.quantity}</span></span>
            {order.quality && (
              <span>QL: <span className="text-text-primary">{order.quality}</span></span>
            )}
            {order.price && order.order_type !== "trade" && (
              <span>
                Price: <span className="text-accent font-medium">{formatPrice(order.price)} {order.currency}</span>
              </span>
            )}
            {order.order_type === "trade" && order.trade_for && (
              <span>
                For: <span className="text-warning font-medium">{order.trade_for}</span>
              </span>
            )}
          </div>

          {order.location && (
            <div className="mt-2 text-sm text-text-muted">
              Location: {order.location}
            </div>
          )}

          {order.notes && (
            <div className="mt-2 text-sm text-text-muted line-clamp-2">
              {order.notes}
            </div>
          )}

          <div className="mt-3 flex items-center gap-3 text-xs text-text-muted">
            <span>By: <span className="text-text-secondary">{order.username}</span></span>
            <span>{formatDate(order.created_at)}</span>
          </div>
        </div>

        {showActions && order.status === "active" && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleUpdateStatus(order.id, "completed")}
              className="px-3 py-1.5 text-xs bg-success/20 text-success rounded hover:bg-success/30 transition-colors"
            >
              Complete
            </button>
            <button
              onClick={() => handleUpdateStatus(order.id, "cancelled")}
              className="px-3 py-1.5 text-xs bg-text-muted/20 text-text-muted rounded hover:bg-text-muted/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteOrder(order.id)}
              className="px-3 py-1.5 text-xs bg-danger/20 text-danger rounded hover:bg-danger/30 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Market</h1>
            <p className="text-text-secondary">
              Browse buy/sell/trade orders from the community
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/prices"
              className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-border rounded-lg hover:border-accent/50 hover:bg-bg-hover transition-colors text-sm text-text-secondary hover:text-text-primary whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Price Guide</span>
            </Link>
            <Link
              href="/merchants"
              className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-border rounded-lg hover:border-accent/50 hover:bg-bg-hover transition-colors text-sm text-text-secondary hover:text-text-primary whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Merchants</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
          <div className="text-2xl font-bold text-text-primary">{stats.active}</div>
          <div className="text-sm text-text-muted">Active Orders</div>
        </div>
        <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
          <div className="text-2xl font-bold text-success">{stats.buy_orders}</div>
          <div className="text-sm text-text-muted">Buying</div>
        </div>
        <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
          <div className="text-2xl font-bold text-info">{stats.sell_orders}</div>
          <div className="text-sm text-text-muted">Selling</div>
        </div>
        <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
          <div className="text-2xl font-bold text-warning">{stats.trade_orders}</div>
          <div className="text-sm text-text-muted">Trading</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("browse")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "browse"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          }`}
        >
          Browse Orders
        </button>
        {user && (
          <>
            <button
              onClick={() => setActiveTab("create")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "create"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              Create Order
            </button>
            <button
              onClick={() => setActiveTab("my-orders")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "my-orders"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              My Orders
              {myOrders.filter((o) => o.status === "active").length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-accent/20 rounded">
                  {myOrders.filter((o) => o.status === "active").length}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Browse Tab */}
      {activeTab === "browse" && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex gap-2">
              {(["all", "buy", "sell", "trade"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterType === type
                      ? "bg-accent text-white"
                      : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search items..."
              value={filterItem}
              onChange={(e) => setFilterItem(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
            />
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="text-center py-12 text-text-muted">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-text-muted mb-2">No orders found</div>
              <p className="text-sm text-text-muted">
                {user
                  ? "Be the first to create an order!"
                  : "Login to create orders"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Tab */}
      {activeTab === "create" && user && (
        <div className="max-w-2xl">
          <div className="bg-bg-secondary rounded-xl border border-border p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-6">Create New Order</h2>

            <form onSubmit={handleCreateOrder} className="space-y-6">
              {formError && (
                <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-4 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
                  {formSuccess}
                </div>
              )}

              {/* Order Type */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Order Type</label>
                <div className="flex gap-2">
                  {(["buy", "sell", "trade"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, order_type: type })}
                      className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                        formData.order_type === type
                          ? getOrderTypeStyles(type)
                          : "bg-bg-tertiary text-text-secondary border-border hover:border-accent/50"
                      }`}
                    >
                      {type === "buy" && "I want to BUY"}
                      {type === "sell" && "I want to SELL"}
                      {type === "trade" && "I want to TRADE"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Name */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Item Name</label>
                <input
                  type="text"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  required
                  placeholder="e.g., Rare Bone, Iron Lump, Drake Hide"
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>

              {/* Quantity and Quality */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    min={1}
                    required
                    className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Quality (Optional)</label>
                  <input
                    type="number"
                    value={formData.quality || ""}
                    onChange={(e) => setFormData({ ...formData, quality: parseInt(e.target.value) || 0 })}
                    min={1}
                    max={100}
                    placeholder="1-100"
                    className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Price (for buy/sell) */}
              {formData.order_type !== "trade" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">Price</label>
                    <input
                      type="number"
                      value={formData.price || ""}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                    >
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="copper">Copper</option>
                      <option value="iron">Iron</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Trade For (for trade) */}
              {formData.order_type === "trade" && (
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Trade For (Required)</label>
                  <input
                    type="text"
                    value={formData.trade_for}
                    onChange={(e) => setFormData({ ...formData, trade_for: e.target.value })}
                    required
                    placeholder="What do you want in exchange?"
                    className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  />
                </div>
              )}

              {/* Server */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Server</label>
                <select
                  value={formData.server}
                  onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                >
                  <option value="">Select server...</option>
                  {WURM_SERVERS.map((server) => (
                    <option key={server} value={server}>
                      {server}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location with quick-select */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Location (Optional)</label>
                {characters.length > 0 && characters.some(c => c.deed_name) && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-xs text-text-muted py-1">Quick select:</span>
                    {characters
                      .filter((c) => c.deed_name)
                      .map((character) => (
                        <button
                          key={character.id}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              location: character.deed_name || "",
                              server: character.server || formData.server,
                            });
                          }}
                          className="px-2 py-1 text-xs bg-bg-hover hover:bg-accent/20 rounded border border-border hover:border-accent/50 transition-colors"
                          title={`${character.name}${character.server ? ` - ${character.server}` : ""}`}
                        >
                          {character.deed_name}
                        </button>
                      ))}
                  </div>
                )}
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., My Deed, N15 coast"
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Additional details about your order..."
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none resize-none"
                />
              </div>

              {/* Expires */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Expires In</label>
                <select
                  value={formData.expires_days}
                  onChange={(e) => setFormData({ ...formData, expires_days: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 rounded-lg font-medium transition-all ${
                  submitting
                    ? "bg-bg-tertiary cursor-not-allowed text-text-muted"
                    : "bg-accent hover:bg-accent-hover text-white"
                }`}
              >
                {submitting ? "Creating..." : "Create Order"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* My Orders Tab */}
      {activeTab === "my-orders" && user && (
        <div>
          {myOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-text-muted mb-2">You haven&apos;t created any orders yet</div>
              <button
                onClick={() => setActiveTab("create")}
                className="text-accent hover:text-accent-hover transition-colors"
              >
                Create your first order
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {myOrders.map((order) => (
                <OrderCard key={order.id} order={order} showActions />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Login prompt for non-authenticated users */}
      {!user && activeTab !== "browse" && (
        <div className="text-center py-12">
          <div className="text-text-muted mb-4">Please login to access this feature</div>
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Getting Started
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
            How Trading Works
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Our marketplace connects buyers and sellers across all Wurm Online servers. Here's how to get started.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur-lg" />
            <div className="relative bg-bg-secondary rounded-xl border border-border p-6 hover:border-violet-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Create an Order</h3>
              <p className="text-text-secondary text-sm">
                Post what you want to buy, sell, or trade. Include item details, quantity, quality, and your preferred price.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur-lg" />
            <div className="relative bg-bg-secondary rounded-xl border border-border p-6 hover:border-violet-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Find Matches</h3>
              <p className="text-text-secondary text-sm">
                Browse orders from other players or wait for someone to find yours. Filter by type, item, or server.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur-lg" />
            <div className="relative bg-bg-secondary rounded-xl border border-border p-6 hover:border-violet-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Complete the Trade</h3>
              <p className="text-text-secondary text-sm">
                Contact the other player in-game, meet up, and complete your trade. Mark your order as completed when done.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trading Tips Section */}
      <section className="mt-16 pt-16 border-t border-border">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Pro Tips
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
              Trade Like a Veteran
            </h2>
            <p className="text-text-secondary mb-8">
              Make the most of your trading experience with these helpful tips from experienced Wurm traders.
            </p>

            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-border hover:border-amber-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-text-primary mb-1">Check the Price Guide</h4>
                  <p className="text-sm text-text-muted">Use our price guide to ensure you're getting fair market rates for your items.</p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-border hover:border-amber-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-text-primary mb-1">Specify Your Location</h4>
                  <p className="text-sm text-text-muted">Include your deed name and server to make it easier for buyers to find you.</p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-border hover:border-amber-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-text-primary mb-1">Build Your Reputation</h4>
                  <p className="text-sm text-text-muted">Complete trades and get rated by other players to become a trusted trader.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-3xl blur-2xl" />
            <div className="relative bg-bg-secondary rounded-2xl border border-border p-8 overflow-hidden">
              {/* Decorative pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                  backgroundSize: "24px 24px",
                }} />
              </div>

              <div className="relative text-center">
                <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white mb-6 shadow-2xl">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <span className="text-text-secondary text-sm">Average Trade Value</span>
                    <span className="text-accent font-semibold">2.5s</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <span className="text-text-secondary text-sm">Most Traded Item</span>
                    <span className="text-text-primary font-medium">Rare Materials</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <span className="text-text-secondary text-sm">Active Traders</span>
                    <span className="text-success font-semibold">Growing Daily!</span>
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
            More Trading Tools
          </h2>
          <p className="text-text-secondary">
            Everything you need for successful trading in Wurm Online
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                Check market prices and historical trends. Know the value before you trade.
              </p>
              <span className="inline-flex items-center gap-2 text-emerald-400 text-sm font-medium">
                View Prices
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
                Find player-run merchants across all servers. Shop from the comfort of your deed.
              </p>
              <span className="inline-flex items-center gap-2 text-blue-400 text-sm font-medium">
                Find Merchants
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </div>
          </Link>

          {/* Map */}
          <Link
            href="/map"
            className="group relative p-6 bg-bg-secondary rounded-xl border border-border hover:border-cyan-500/50 transition-all hover:translate-y-[-4px]"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity blur-lg" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-cyan-400 transition-colors">
                World Map
              </h3>
              <p className="text-text-secondary text-sm mb-4">
                Find deeds, resource spots, and plan your trade routes across the world.
              </p>
              <span className="inline-flex items-center gap-2 text-cyan-400 text-sm font-medium">
                Explore Map
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mt-16 pt-16 border-t border-border pb-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20 p-8 md:p-12">
          {/* Background decoration */}
          <div className="absolute -right-24 -top-24 w-64 h-64 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full opacity-10 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 w-48 h-48 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full opacity-10 blur-3xl" />

          <div className="relative text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-violet-500/25">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
              Ready to Start Trading?
            </h2>
            <p className="text-text-secondary mb-8">
              Join hundreds of Wurmians buying, selling, and trading every day. Create your first order and become part of the marketplace!
            </p>

            {user ? (
              <button
                onClick={() => setActiveTab("create")}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-purple-700 transition-all hover:scale-105 shadow-lg shadow-violet-500/25"
              >
                Create Your First Order
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            ) : (
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-purple-700 transition-all hover:scale-105 shadow-lg shadow-violet-500/25"
              >
                Join the Community
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
