import { query } from "./core";
import { recordPrice } from "./prices";
import type {
  MarketOrder,
  CreateOrderInput,
  OrderType,
  OrderStatus,
  Merchant,
  CreateMerchantInput,
  MerchantCategory,
} from "../types";
import type { PaginatedResult, PaginationParams } from "./pagination";
import { validatePagination } from "./pagination";

// ========== MARKET ORDERS ==========

export async function getAllOrders(filters?: {
  type?: OrderType;
  status?: OrderStatus;
  item?: string;
  userId?: number;
}): Promise<MarketOrder[]> {
  let sql = `
    SELECT o.*, u.username
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (filters?.type) {
    sql += " AND o.order_type = ?";
    params.push(filters.type);
  }
  if (filters?.status) {
    sql += " AND o.status = ?";
    params.push(filters.status);
  }
  if (filters?.item) {
    sql += " AND LOWER(o.item_name) LIKE LOWER(?)";
    params.push(`%${filters.item}%`);
  }
  if (filters?.userId) {
    sql += " AND o.user_id = ?";
    params.push(filters.userId);
  }

  sql += " ORDER BY o.created_at DESC";

  const result = await query<MarketOrder>(sql, params);
  return result.rows;
}

export async function getOrdersPaginated(
  params?: PaginationParams,
  filters?: {
    type?: OrderType;
    status?: OrderStatus;
    item?: string;
    userId?: number;
  }
): Promise<PaginatedResult<MarketOrder>> {
  const { offset, limit, page } = validatePagination(params);

  let countSql = "SELECT COUNT(*) as count FROM orders WHERE 1=1";
  let dataSql = `
    SELECT o.*, u.username
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE 1=1
  `;
  const countParams: (string | number)[] = [];
  const dataParams: (string | number)[] = [];

  if (filters?.type) {
    countSql += " AND order_type = ?";
    dataSql += " AND o.order_type = ?";
    countParams.push(filters.type);
    dataParams.push(filters.type);
  }
  if (filters?.status) {
    countSql += " AND status = ?";
    dataSql += " AND o.status = ?";
    countParams.push(filters.status);
    dataParams.push(filters.status);
  }
  if (filters?.item) {
    countSql += " AND LOWER(item_name) LIKE LOWER(?)";
    dataSql += " AND LOWER(o.item_name) LIKE LOWER(?)";
    countParams.push(`%${filters.item}%`);
    dataParams.push(`%${filters.item}%`);
  }
  if (filters?.userId) {
    countSql += " AND user_id = ?";
    dataSql += " AND o.user_id = ?";
    countParams.push(filters.userId);
    dataParams.push(filters.userId);
  }

  dataSql += " ORDER BY o.created_at DESC LIMIT ? OFFSET ?";
  dataParams.push(limit, offset);

  const [countResult, dataResult] = await Promise.all([
    query<{ count: number }>(countSql, countParams),
    query<MarketOrder>(dataSql, dataParams),
  ]);

  return {
    data: dataResult.rows,
    total: countResult.rows[0]?.count || 0,
    page,
    limit,
    totalPages: Math.ceil((countResult.rows[0]?.count || 0) / limit),
  };
}

export async function getOrderById(id: number): Promise<MarketOrder | null> {
  const result = await query<MarketOrder>(
    `SELECT o.*, u.username
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.id
     WHERE o.id = ?`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getUserOrders(userId: number): Promise<MarketOrder[]> {
  const result = await query<MarketOrder>(
    "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

export async function createOrder(userId: number, input: CreateOrderInput): Promise<number> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await query(
    `INSERT INTO orders (user_id, order_type, item_name, quantity, quality, price, currency, trade_for, location, notes, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.order_type,
      input.item_name,
      input.quantity,
      input.quality || null,
      input.price || null,
      input.currency || "silver",
      input.trade_for || null,
      input.location || null,
      input.notes || null,
      expiresAt,
    ]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  const orderId = idResult.rows[0]?.id || 0;

  // Automatically record price to price history for buy/sell orders
  if (input.price && (input.order_type === 'buy' || input.order_type === 'sell')) {
    // Extract server from location if it matches a known server pattern
    const serverMatch = input.location?.match(/\b(Harmony|Melody|Cadence|Defiance|Xanadu|Deliverance|Exodus|Celebration|Pristine|Release|Independence|Chaos)\b/i);
    const server = serverMatch ? serverMatch[1] : null;

    await recordPrice(input.item_name, input.price, input.order_type, {
      quality: input.quality,
      server: server || undefined,
      userId,
      currency: input.currency,
    });
  }

  return orderId;
}

export async function updateOrder(
  id: number,
  userId: number,
  input: Partial<CreateOrderInput>,
  isAdmin: boolean = false
): Promise<boolean> {
  const order = await getOrderById(id);
  if (!order) return false;
  if (!isAdmin && order.user_id !== userId) return false;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.item_name !== undefined) {
    fields.push("item_name = ?");
    values.push(input.item_name);
  }
  if (input.quantity !== undefined) {
    fields.push("quantity = ?");
    values.push(input.quantity);
  }
  if (input.quality !== undefined) {
    fields.push("quality = ?");
    values.push(input.quality);
  }
  if (input.price !== undefined) {
    fields.push("price = ?");
    values.push(input.price);
  }
  if (input.currency !== undefined) {
    fields.push("currency = ?");
    values.push(input.currency);
  }
  if (input.trade_for !== undefined) {
    fields.push("trade_for = ?");
    values.push(input.trade_for);
  }
  if (input.location !== undefined) {
    fields.push("location = ?");
    values.push(input.location);
  }
  if (input.notes !== undefined) {
    fields.push("notes = ?");
    values.push(input.notes);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const result = await query(`UPDATE orders SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.rowCount > 0;
}

export async function updateOrderStatus(
  id: number,
  userId: number,
  status: OrderStatus,
  isAdmin: boolean = false
): Promise<boolean> {
  const order = await getOrderById(id);
  if (!order) return false;
  if (!isAdmin && order.user_id !== userId) return false;

  const result = await query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
  return result.rowCount > 0;
}

export async function deleteOrder(id: number, userId: number, isAdmin: boolean = false): Promise<boolean> {
  const order = await getOrderById(id);
  if (!order) return false;
  if (!isAdmin && order.user_id !== userId) return false;

  const result = await query("DELETE FROM orders WHERE id = ?", [id]);
  return result.rowCount > 0;
}

export async function expireOldOrders(): Promise<number> {
  const result = await query(
    "UPDATE orders SET status = 'expired' WHERE status = 'active' AND expires_at < NOW()"
  );
  return result.rowCount;
}

export async function getOrderStats(): Promise<{
  total: number;
  active: number;
  completed: number;
  buyOrders: number;
  sellOrders: number;
  tradeOrders: number;
}> {
  const [total, active, completed, buy, sell, trade] = await Promise.all([
    query<{ count: number }>("SELECT COUNT(*) as count FROM orders"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE status = 'active'"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE order_type = 'buy'"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE order_type = 'sell'"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE order_type = 'trade'"),
  ]);

  return {
    total: total.rows[0]?.count || 0,
    active: active.rows[0]?.count || 0,
    completed: completed.rows[0]?.count || 0,
    buyOrders: buy.rows[0]?.count || 0,
    sellOrders: sell.rows[0]?.count || 0,
    tradeOrders: trade.rows[0]?.count || 0,
  };
}

// ========== MERCHANTS ==========

export async function getAllMerchants(filters?: {
  category?: MerchantCategory;
  active?: boolean;
  server?: string;
  userId?: number;
}): Promise<Merchant[]> {
  let sql = `
    SELECT m.*, u.username
    FROM merchants m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (filters?.category) {
    sql += " AND m.category = ?";
    params.push(filters.category);
  }
  if (filters?.active !== undefined) {
    sql += " AND m.is_active = ?";
    params.push(filters.active ? 1 : 0);
  }
  if (filters?.server) {
    sql += " AND m.server = ?";
    params.push(filters.server);
  }
  if (filters?.userId) {
    sql += " AND m.user_id = ?";
    params.push(filters.userId);
  }

  sql += " ORDER BY m.name";

  const result = await query<Merchant>(sql, params);
  return result.rows;
}

export async function getMerchantsPaginated(
  params?: PaginationParams,
  filters?: { category?: MerchantCategory; active?: boolean; server?: string; userId?: number }
): Promise<PaginatedResult<Merchant>> {
  const { offset, limit, page } = validatePagination(params);
  const merchants = await getAllMerchants(filters);
  const total = merchants.length;
  const data = merchants.slice(offset, offset + limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getMerchantById(id: number): Promise<Merchant | null> {
  const result = await query<Merchant>(
    `SELECT m.*, u.username
     FROM merchants m
     LEFT JOIN users u ON m.user_id = u.id
     WHERE m.id = ?`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getUserMerchants(userId: number): Promise<Merchant[]> {
  const result = await query<Merchant>(
    "SELECT * FROM merchants WHERE user_id = ? ORDER BY name",
    [userId]
  );
  return result.rows;
}

export async function createMerchant(userId: number, input: CreateMerchantInput): Promise<number> {
  await query(
    `INSERT INTO merchants (user_id, name, category, location, server, description, stock_list)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.name,
      input.category,
      input.location || null,
      input.server || null,
      input.description || null,
      input.stock_list || null,
    ]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function updateMerchant(
  id: number,
  userId: number,
  input: Partial<CreateMerchantInput>,
  isAdmin: boolean = false
): Promise<boolean> {
  const merchant = await getMerchantById(id);
  if (!merchant) return false;
  if (!isAdmin && merchant.user_id !== userId) return false;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.category !== undefined) {
    fields.push("category = ?");
    values.push(input.category);
  }
  if (input.location !== undefined) {
    fields.push("location = ?");
    values.push(input.location);
  }
  if (input.server !== undefined) {
    fields.push("server = ?");
    values.push(input.server);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description);
  }
  if (input.stock_list !== undefined) {
    fields.push("stock_list = ?");
    values.push(input.stock_list);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const result = await query(`UPDATE merchants SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.rowCount > 0;
}

export async function toggleMerchantActive(
  id: number,
  userId: number,
  isAdmin: boolean = false
): Promise<boolean> {
  const merchant = await getMerchantById(id);
  if (!merchant) return false;
  if (!isAdmin && merchant.user_id !== userId) return false;

  const result = await query(
    "UPDATE merchants SET is_active = NOT is_active WHERE id = ?",
    [id]
  );
  return result.rowCount > 0;
}

export async function deleteMerchant(id: number, userId: number, isAdmin: boolean = false): Promise<boolean> {
  const merchant = await getMerchantById(id);
  if (!merchant) return false;
  if (!isAdmin && merchant.user_id !== userId) return false;

  const result = await query("DELETE FROM merchants WHERE id = ?", [id]);
  return result.rowCount > 0;
}

export async function getMerchantStats(): Promise<{
  total: number;
  active: number;
  byCategory: Record<string, number>;
}> {
  const [total, active, byCategory] = await Promise.all([
    query<{ count: number }>("SELECT COUNT(*) as count FROM merchants"),
    query<{ count: number }>("SELECT COUNT(*) as count FROM merchants WHERE is_active = 1"),
    query<{ category: string; count: number }>(
      "SELECT category, COUNT(*) as count FROM merchants GROUP BY category"
    ),
  ]);

  const categories: Record<string, number> = {};
  for (const row of byCategory.rows) {
    categories[row.category] = row.count;
  }

  return {
    total: total.rows[0]?.count || 0,
    active: active.rows[0]?.count || 0,
    byCategory: categories,
  };
}

export async function getServers(): Promise<string[]> {
  const result = await query<{ server: string }>(
    "SELECT DISTINCT server FROM merchants WHERE server IS NOT NULL ORDER BY server"
  );
  return result.rows.map((r) => r.server);
}
