import { query } from "./core";
import type {
  PriceHistory,
  PriceAnalytics,
  TrendingItem,
  PriceAlert,
  CreatePriceAlertInput,
  MarketOrder,
  OrderType,
} from "../types";

// ========== PRICE TRACKING ==========

export async function recordPrice(
  itemName: string,
  price: number,
  orderType: OrderType,
  options?: {
    quality?: number;
    server?: string;
    userId?: number;
    currency?: string;
  }
): Promise<void> {
  await query(
    `INSERT INTO price_history (item_name, price, order_type, quality, server, user_id, currency)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      itemName,
      price,
      orderType,
      options?.quality || 50,
      options?.server || null,
      options?.userId || null,
      options?.currency || 'silver'
    ]
  );
}

export async function getPriceHistory(
  itemName: string,
  days: number = 30
): Promise<PriceHistory[]> {
  const result = await query<PriceHistory>(
    `SELECT * FROM price_history
     WHERE item_name = ? AND recorded_at > DATE_SUB(NOW(), INTERVAL ? DAY)
     ORDER BY recorded_at DESC`,
    [itemName, days]
  );
  return result.rows;
}

// ========== PRICE GUIDE FUNCTIONS ==========

export interface PriceGuideItem {
  item_name: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_count: number;
  last_updated: string;
  trend: 'up' | 'down' | 'stable';
  trend_percentage: number;
}

export interface ServerPriceComparison {
  server: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_count: number;
}

export async function getPriceGuideItems(
  options?: {
    search?: string;
    minPrices?: number;
    days?: number;
    limit?: number;
    offset?: number;
  }
): Promise<{ items: PriceGuideItem[]; total: number }> {
  const days = options?.days || 30;
  const minPrices = options?.minPrices || 1;
  const limit = Math.min(options?.limit || 50, 200);
  const offset = options?.offset || 0;

  let whereClause = "recorded_at > DATE_SUB(NOW(), INTERVAL ? DAY)";
  const params: (string | number)[] = [days];

  if (options?.search) {
    whereClause += " AND item_name LIKE ?";
    params.push(`%${options.search}%`);
  }

  // Count total
  const countResult = await query<{ total: number }>(`
    SELECT COUNT(DISTINCT item_name) as total
    FROM price_history
    WHERE ${whereClause}
    HAVING COUNT(*) >= ?
  `, [...params, minPrices]);
  const total = countResult.rows[0]?.total || 0;

  // Get price guide items with trend calculation
  const result = await query<PriceGuideItem & { recent_avg: number; older_avg: number }>(`
    SELECT
      item_name,
      AVG(price) as avg_price,
      MIN(price) as min_price,
      MAX(price) as max_price,
      COUNT(*) as price_count,
      MAX(recorded_at) as last_updated,
      (SELECT AVG(p2.price) FROM price_history p2
       WHERE p2.item_name = price_history.item_name
       AND p2.recorded_at > DATE_SUB(NOW(), INTERVAL 7 DAY)) as recent_avg,
      (SELECT AVG(p3.price) FROM price_history p3
       WHERE p3.item_name = price_history.item_name
       AND p3.recorded_at BETWEEN DATE_SUB(NOW(), INTERVAL ? DAY) AND DATE_SUB(NOW(), INTERVAL 7 DAY)) as older_avg
    FROM price_history
    WHERE ${whereClause}
    GROUP BY item_name
    HAVING price_count >= ?
    ORDER BY price_count DESC, item_name ASC
    LIMIT ? OFFSET ?
  `, [...params, days, minPrices, limit, offset]);

  const items = result.rows.map(row => {
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trend_percentage = 0;

    if (row.recent_avg && row.older_avg && row.older_avg > 0) {
      trend_percentage = ((row.recent_avg - row.older_avg) / row.older_avg) * 100;
      if (trend_percentage > 5) trend = 'up';
      else if (trend_percentage < -5) trend = 'down';
    }

    return {
      item_name: row.item_name,
      avg_price: Math.round(row.avg_price * 100) / 100,
      min_price: Math.round(row.min_price * 100) / 100,
      max_price: Math.round(row.max_price * 100) / 100,
      price_count: row.price_count,
      last_updated: row.last_updated,
      trend,
      trend_percentage: Math.round(trend_percentage * 10) / 10,
    };
  });

  return { items, total };
}

export async function getServerPriceComparison(itemName: string): Promise<ServerPriceComparison[]> {
  const result = await query<ServerPriceComparison>(`
    SELECT
      server,
      AVG(price) as avg_price,
      MIN(price) as min_price,
      MAX(price) as max_price,
      COUNT(*) as price_count
    FROM price_history
    WHERE item_name = ?
      AND server IS NOT NULL
      AND recorded_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY server
    ORDER BY price_count DESC
  `, [itemName]);

  return result.rows.map(row => ({
    ...row,
    avg_price: Math.round(row.avg_price * 100) / 100,
    min_price: Math.round(row.min_price * 100) / 100,
    max_price: Math.round(row.max_price * 100) / 100,
  }));
}

export async function getPopularPricedItems(limit: number = 20): Promise<PriceGuideItem[]> {
  const { items } = await getPriceGuideItems({ limit, minPrices: 3 });
  return items;
}

export async function submitPrice(
  userId: number,
  itemName: string,
  price: number,
  orderType: 'buy' | 'sell',
  options?: {
    quality?: number;
    server?: string;
    currency?: string;
  }
): Promise<void> {
  await recordPrice(itemName, price, orderType, {
    quality: options?.quality,
    server: options?.server,
    userId,
    currency: options?.currency,
  });
}

// ========== PRICE ANALYTICS ==========

export async function getPriceAnalytics(itemName: string): Promise<PriceAnalytics | null> {
  // Get price stats for the item
  const statsResult = await query<{
    avg_price: number;
    min_price: number;
    max_price: number;
    total_orders: number;
    buy_orders: number;
    sell_orders: number;
  }>(
    `SELECT
      AVG(price) as avg_price,
      MIN(price) as min_price,
      MAX(price) as max_price,
      COUNT(*) as total_orders,
      SUM(CASE WHEN order_type = 'buy' THEN 1 ELSE 0 END) as buy_orders,
      SUM(CASE WHEN order_type = 'sell' THEN 1 ELSE 0 END) as sell_orders
    FROM price_history
    WHERE item_name = ?`,
    [itemName]
  );

  if (statsResult.rows.length === 0 || !statsResult.rows[0].avg_price) return null;

  const stats = statsResult.rows[0];

  // Get price change for last 24h
  const day24Result = await query<{ avg_price: number }>(
    `SELECT AVG(price) as avg_price
    FROM price_history
    WHERE item_name = ? AND recorded_at > DATE_SUB(NOW(), INTERVAL 1 DAY)`,
    [itemName]
  );
  const price24h = day24Result.rows[0]?.avg_price || stats.avg_price;

  // Get price change for last 7 days
  const day7Result = await query<{ avg_price: number }>(
    `SELECT AVG(price) as avg_price
    FROM price_history
    WHERE item_name = ? AND recorded_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    [itemName]
  );
  const price7d = day7Result.rows[0]?.avg_price || stats.avg_price;

  return {
    item_name: itemName,
    avg_price: stats.avg_price,
    min_price: stats.min_price,
    max_price: stats.max_price,
    price_change_24h: ((stats.avg_price - price24h) / price24h) * 100,
    price_change_7d: ((stats.avg_price - price7d) / price7d) * 100,
    total_orders: stats.total_orders,
    buy_orders: stats.buy_orders,
    sell_orders: stats.sell_orders,
  };
}

export async function getTrendingItems(limit: number = 10): Promise<TrendingItem[]> {
  const result = await query<{
    item_name: string;
    order_count: number;
    total_quantity: number;
    avg_price: number;
    recent_avg: number;
    old_avg: number;
  }>(
    `SELECT
      o.item_name,
      COUNT(*) as order_count,
      SUM(o.quantity) as total_quantity,
      AVG(ph.price) as avg_price,
      (SELECT AVG(price) FROM price_history WHERE item_name = o.item_name AND recorded_at > DATE_SUB(NOW(), INTERVAL 3 DAY)) as recent_avg,
      (SELECT AVG(price) FROM price_history WHERE item_name = o.item_name AND recorded_at BETWEEN DATE_SUB(NOW(), INTERVAL 7 DAY) AND DATE_SUB(NOW(), INTERVAL 3 DAY)) as old_avg
    FROM orders o
    LEFT JOIN price_history ph ON o.item_name = ph.item_name
    WHERE o.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY o.item_name
    ORDER BY order_count DESC
    LIMIT ?`,
    [limit]
  );

  return result.rows.map((row) => {
    const recentAvg = row.recent_avg || row.avg_price;
    const oldAvg = row.old_avg || row.avg_price;
    const change = oldAvg > 0 ? ((recentAvg - oldAvg) / oldAvg) * 100 : 0;

    let trend: "up" | "down" | "stable" = "stable";
    if (change > 5) trend = "up";
    else if (change < -5) trend = "down";

    return {
      item_name: row.item_name,
      order_count: row.order_count,
      total_quantity: row.total_quantity,
      avg_price: row.avg_price || 0,
      trend,
      trend_percentage: change,
    };
  });
}

export async function getBestDeals(limit: number = 10): Promise<MarketOrder[]> {
  // Find sell orders with prices below average
  const result = await query<MarketOrder>(
    `SELECT o.*, u.username
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.status = 'active'
      AND o.order_type = 'sell'
      AND o.price IS NOT NULL
      AND o.price < (
        SELECT AVG(price) * 0.9
        FROM price_history ph
        WHERE ph.item_name = o.item_name
          AND ph.recorded_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
      )
    ORDER BY (
      SELECT AVG(price) FROM price_history ph
      WHERE ph.item_name = o.item_name
    ) / o.price DESC
    LIMIT ?`,
    [limit]
  );

  return result.rows;
}

export async function getUserPriceAlerts(userId: number): Promise<PriceAlert[]> {
  const result = await query<PriceAlert>(
    "SELECT * FROM price_alerts WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

export async function createPriceAlert(
  userId: number,
  input: CreatePriceAlertInput
): Promise<number> {
  await query(
    `INSERT INTO price_alerts (user_id, item_name, target_price, \`condition\`)
     VALUES (?, ?, ?, ?)`,
    [userId, input.item_name, input.target_price, input.condition]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function deletePriceAlert(alertId: number, userId: number): Promise<boolean> {
  const result = await query(
    "DELETE FROM price_alerts WHERE id = ? AND user_id = ?",
    [alertId, userId]
  );
  return result.rowCount > 0;
}

export async function checkPriceAlerts(): Promise<number> {
  // Get all active alerts
  const alerts = await query<PriceAlert>(
    "SELECT * FROM price_alerts WHERE is_active = 1 AND triggered_at IS NULL"
  );

  let triggeredCount = 0;

  for (const alert of alerts.rows) {
    // Get recent average price
    const priceResult = await query<{ avg_price: number }>(
      `SELECT AVG(price) as avg_price
      FROM price_history
      WHERE item_name = ? AND recorded_at > DATE_SUB(NOW(), INTERVAL 1 DAY)`,
      [alert.item_name]
    );

    const avgPrice = priceResult.rows[0]?.avg_price;
    if (!avgPrice) continue;

    let triggered = false;
    if (alert.condition === "above" && avgPrice >= alert.target_price) {
      triggered = true;
    } else if (alert.condition === "below" && avgPrice <= alert.target_price) {
      triggered = true;
    }

    if (triggered) {
      await query(
        "UPDATE price_alerts SET triggered_at = NOW(), is_active = 0 WHERE id = ?",
        [alert.id]
      );
      triggeredCount++;
    }
  }

  return triggeredCount;
}
