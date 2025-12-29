"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { MarketOrder, OrderType, OrderStatus } from "@/lib/types";

type TabType = "browse" | "create" | "my-orders";

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

  // Create form state
  const [formData, setFormData] = useState({
    order_type: "sell" as OrderType,
    item_name: "",
    quantity: 1,
    quality: 50,
    price: 0,
    currency: "silver",
    trade_for: "",
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchOrders(), fetchStats()]);
      if (user) await fetchMyOrders();
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
                Price: <span className="text-accent font-medium">{order.price} {order.currency}</span>
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
        <h1 className="text-3xl font-bold text-text-primary mb-2">Market</h1>
        <p className="text-text-secondary">
          Browse buy/sell/trade orders from the community
        </p>
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

              {/* Location */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Location (Optional)</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Xanadu N15, Harmony coast"
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
    </div>
  );
}
