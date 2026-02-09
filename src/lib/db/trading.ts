import { query } from "./core";
import type {
  TradeMatch,
  MatchStatus,
  BarterSuggestion,
  MarketOrder,
  UserRating,
  UserReputation,
  CreateRatingInput,
} from "../types";

// Escape SQL LIKE wildcard characters to prevent pattern injection
function escapeLike(str: string): string {
  return str.replace(/[%_\\]/g, "\\$&");
}

// ========== TRADE MATCHING ==========

export async function findMatches(userId: number): Promise<TradeMatch[]> {
  // Find potential matches: user's buy orders matched with others' sell orders and vice versa
  const userOrders = await query<MarketOrder>(
    "SELECT * FROM orders WHERE user_id = ? AND status = 'active'",
    [userId]
  );

  const matches: TradeMatch[] = [];

  for (const order of userOrders.rows) {
    const oppositeType = order.order_type === "buy" ? "sell" : "buy";
    const matchingOrders = await query<MarketOrder>(
      `SELECT o.*, u.username
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.user_id != ?
         AND o.status = 'active'
         AND o.order_type = ?
         AND LOWER(o.item_name) LIKE LOWER(?)`,
      [userId, oppositeType, `%${escapeLike(order.item_name)}%`]
    );

    for (const match of matchingOrders.rows) {
      // Check if price is compatible
      const priceMatch =
        !order.price ||
        !match.price ||
        (order.order_type === "buy" ? order.price >= match.price : order.price <= match.price);

      if (priceMatch) {
        matches.push({
          id: 0,
          buyer_id: order.order_type === "buy" ? userId : match.user_id!,
          seller_id: order.order_type === "sell" ? userId : match.user_id!,
          buy_order_id: order.order_type === "buy" ? order.id : match.id,
          sell_order_id: order.order_type === "sell" ? order.id : match.id,
          item_name: order.item_name,
          status: "pending" as MatchStatus,
          created_at: new Date().toISOString(),
        } as TradeMatch);
      }
    }
  }

  return matches;
}

export async function getUserMatches(userId: number): Promise<TradeMatch[]> {
  const result = await query<TradeMatch>(
    `SELECT tm.*,
      bu.username as buyer_username,
      su.username as seller_username
    FROM trade_matches tm
    JOIN users bu ON tm.buyer_id = bu.id
    JOIN users su ON tm.seller_id = su.id
    WHERE (tm.buyer_id = ? OR tm.seller_id = ?)
      AND tm.status != 'expired'
    ORDER BY tm.created_at DESC`,
    [userId, userId]
  );
  return result.rows;
}

export async function getMatchById(matchId: number): Promise<TradeMatch | null> {
  const result = await query<TradeMatch>(
    `SELECT tm.*,
      bu.username as buyer_username,
      su.username as seller_username
    FROM trade_matches tm
    JOIN users bu ON tm.buyer_id = bu.id
    JOIN users su ON tm.seller_id = su.id
    WHERE tm.id = ?`,
    [matchId]
  );
  return result.rows[0] || null;
}

export async function updateMatchStatus(
  matchId: number,
  userId: number,
  status: MatchStatus
): Promise<boolean> {
  const match = await getMatchById(matchId);
  if (!match) return false;

  // Only buyer or seller can update status
  if (match.buyer_id !== userId && match.seller_id !== userId) return false;

  const updates: string[] = ["status = ?"];
  const params: (string | number)[] = [status];

  if (status === "contacted") {
    updates.push("contacted_at = NOW()");
  }

  params.push(matchId);
  const result = await query(
    `UPDATE trade_matches SET ${updates.join(", ")} WHERE id = ?`,
    params
  );
  return result.rowCount > 0;
}

export async function expireOldMatches(): Promise<number> {
  const result = await query(
    `UPDATE trade_matches
     SET status = 'expired'
     WHERE status = 'pending'
       AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`
  );
  return result.rowCount;
}

export async function getBarterSuggestions(userId: number): Promise<BarterSuggestion[]> {
  // Find potential barter matches: user's sell orders vs others' sell orders where items might be tradeable
  const userOrders = await query<MarketOrder>(
    `SELECT * FROM orders
     WHERE user_id = ?
       AND status = 'active'
       AND (order_type = 'trade' OR trade_for IS NOT NULL)`,
    [userId]
  );

  const suggestions: BarterSuggestion[] = [];

  for (const userOrder of userOrders.rows) {
    // Find matching orders
    const matches = await query<MarketOrder>(
      `SELECT o.*, u.username
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.user_id != ?
         AND o.status = 'active'
         AND (o.order_type = 'trade' OR o.trade_for IS NOT NULL)
         AND (
           LOWER(o.item_name) LIKE LOWER(?)
           OR LOWER(o.trade_for) LIKE LOWER(?)
         )
       LIMIT 10`,
      [userId, `%${escapeLike(userOrder.trade_for || "")}%`, `%${escapeLike(userOrder.item_name)}%`]
    );

    for (const match of matches.rows) {
      let score = 50;
      let reason = "Potential barter match";

      // Check if items match each other's trade_for
      if (
        userOrder.trade_for &&
        match.item_name.toLowerCase().includes(userOrder.trade_for.toLowerCase())
      ) {
        score += 30;
        reason = `They have ${match.item_name} which you're looking for`;
      }

      if (
        match.trade_for &&
        userOrder.item_name.toLowerCase().includes(match.trade_for.toLowerCase())
      ) {
        score += 20;
        reason += `, and you have ${userOrder.item_name} which they're looking for`;
      }

      suggestions.push({
        your_order: userOrder,
        their_order: match,
        match_reason: reason,
        compatibility_score: score,
      });
    }
  }

  // Sort by score
  return suggestions.sort((a, b) => b.compatibility_score - a.compatibility_score).slice(0, 20);
}

// ========== USER RATINGS ==========

export async function createRating(raterId: number, input: CreateRatingInput): Promise<number> {
  // Prevent self-rating
  if (raterId === input.rated_user_id) {
    throw new Error("Cannot rate yourself");
  }

  // Check if already rated for this trade
  if (input.trade_match_id) {
    const existing = await query<{ id: number }>(
      "SELECT id FROM user_ratings WHERE rater_id = ? AND trade_match_id = ?",
      [raterId, input.trade_match_id]
    );
    if (existing.rows.length > 0) {
      throw new Error("Already rated this trade");
    }
  }

  await query(
    `INSERT INTO user_ratings (rater_id, rated_user_id, rating, comment, trade_match_id)
     VALUES (?, ?, ?, ?, ?)`,
    [raterId, input.rated_user_id, input.rating, input.comment || null, input.trade_match_id || null]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function getUserRatings(userId: number): Promise<UserRating[]> {
  const result = await query<UserRating>(
    `SELECT r.*,
      ru.username as rater_username,
      u.username as rated_username
    FROM user_ratings r
    JOIN users ru ON r.rater_id = ru.id
    JOIN users u ON r.rated_user_id = u.id
    WHERE r.rated_user_id = ?
    ORDER BY r.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getUserReputation(userId: number): Promise<UserReputation | null> {
  const ratingsResult = await query<{
    avg_rating: number;
    total_ratings: number;
  }>(
    `SELECT
      AVG(rating) as avg_rating,
      COUNT(*) as total_ratings
    FROM user_ratings
    WHERE rated_user_id = ?`,
    [userId]
  );

  const tradesResult = await query<{
    completed_trades: number;
    successful_matches: number;
  }>(
    `SELECT
      COUNT(DISTINCT CASE WHEN status = 'completed' THEN id END) as completed_trades,
      COUNT(DISTINCT CASE WHEN status IN ('completed', 'contacted') THEN id END) as successful_matches
    FROM trade_matches
    WHERE buyer_id = ? OR seller_id = ?`,
    [userId, userId]
  );

  const userResult = await query<{ username: string }>(
    "SELECT username FROM users WHERE id = ?",
    [userId]
  );

  if (!userResult.rows[0]) return null;

  return {
    user_id: userId,
    username: userResult.rows[0].username,
    avg_rating: ratingsResult.rows[0]?.avg_rating || 0,
    total_ratings: ratingsResult.rows[0]?.total_ratings || 0,
    completed_trades: tradesResult.rows[0]?.completed_trades || 0,
    successful_matches: tradesResult.rows[0]?.successful_matches || 0,
  };
}
