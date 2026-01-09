import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/database";
import { sanitizeError } from "@/lib/security";

interface DashboardStats {
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
    completeness: number;
    missing_fields: string[];
  };
  orders: {
    total: number;
    active: number;
    completed: number;
    buy: number;
    sell: number;
  };
  projects: {
    total: number;
    in_progress: number;
    completed: number;
    total_items: number;
  };
  merchants: {
    total: number;
    active: number;
  };
  alliances: {
    member_of: number;
    is_leader: boolean;
    alliance_name: string | null;
  };
  trades: {
    total_matches: number;
    completed: number;
    pending: number;
  };
  reputation: {
    avg_rating: number;
    total_ratings: number;
  };
  achievements: {
    unlocked: number;
    total_xp: number;
    level: number;
  };
  treasures: {
    total_hunts: number;
    active_hunts: number;
    completed_hunts: number;
    shared_with_me: number;
    total_loot: number;
  };
  timers: {
    total: number;
    active: number;
    recent: Array<{
      id: number;
      name: string;
      timer_type: string;
      end_time: string;
    }>;
  };
  characters: {
    total: number;
    main_character: string | null;
  };
  activity: {
    recent_orders: Array<{
      id: number;
      order_type: string;
      item_name: string;
      quantity: number;
      status: string;
      created_at: string;
    }>;
  };
}

// GET /api/dashboard - Get comprehensive dashboard stats for current user
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user profile info
    const userResult = await query<{
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      bio: string | null;
      location: string | null;
      wurm_server: string | null;
      created_at: string;
    }>(`
      SELECT username, display_name, avatar_url, bio, location, wurm_server, created_at
      FROM users WHERE id = ?
    `, [userId]);
    const user = userResult.rows[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate profile completeness
    const profileFields = [
      { name: "Display Name", filled: !!user.display_name },
      { name: "Bio", filled: !!user.bio },
      { name: "Avatar", filled: !!user.avatar_url },
      { name: "Location", filled: !!user.location },
      { name: "Wurm Server", filled: !!user.wurm_server },
    ];
    const filledCount = profileFields.filter(f => f.filled).length;
    const completeness = Math.round((filledCount / profileFields.length) * 100);
    const missingFields = profileFields.filter(f => !f.filled).map(f => f.name);

    // Orders stats
    const [ordersTotal, ordersActive, ordersCompleted, ordersBuy, ordersSell] = await Promise.all([
      query<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE user_id = ?", [userId]),
      query<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status = 'active'", [userId]),
      query<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status = 'completed'", [userId]),
      query<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND order_type = 'buy'", [userId]),
      query<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND order_type = 'sell'", [userId]),
    ]);

    // Projects stats
    const [projectsTotal, projectsInProgress, projectsCompleted, projectItems] = await Promise.all([
      query<{ count: number }>("SELECT COUNT(*) as count FROM projects WHERE user_id = ?", [userId]),
      query<{ count: number }>("SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status = 'in_progress'", [userId]),
      query<{ count: number }>("SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status = 'completed'", [userId]),
      query<{ total: number }>(`
        SELECT COALESCE(SUM(pi.quantity), 0) as total
        FROM project_items pi
        JOIN projects p ON pi.project_id = p.id
        WHERE p.user_id = ?
      `, [userId]),
    ]);

    // Merchants stats
    const [merchantsTotal, merchantsActive] = await Promise.all([
      query<{ count: number }>("SELECT COUNT(*) as count FROM merchants WHERE user_id = ?", [userId]),
      query<{ count: number }>("SELECT COUNT(*) as count FROM merchants WHERE user_id = ? AND is_active = 1", [userId]),
    ]);

    // Alliance stats
    const allianceMembershipResult = await query<{ name: string; role: string }>(`
      SELECT a.name, am.role
      FROM alliance_members am
      JOIN alliances a ON am.alliance_id = a.id
      WHERE am.user_id = ?
    `, [userId]);
    const allianceMembership = allianceMembershipResult.rows[0];

    // Trade matches stats
    const [tradesTotal, tradesCompleted, tradesPending] = await Promise.all([
      query<{ count: number }>(`
        SELECT COUNT(*) as count FROM trade_matches
        WHERE buyer_id = ? OR seller_id = ?
      `, [userId, userId]),
      query<{ count: number }>(`
        SELECT COUNT(*) as count FROM trade_matches
        WHERE (buyer_id = ? OR seller_id = ?) AND status = 'completed'
      `, [userId, userId]),
      query<{ count: number }>(`
        SELECT COUNT(*) as count FROM trade_matches
        WHERE (buyer_id = ? OR seller_id = ?) AND status = 'pending'
      `, [userId, userId]),
    ]);

    // Reputation stats
    const reputationResult = await query<{ avg_rating: number | null; total_ratings: number }>(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
      FROM user_ratings WHERE rated_user_id = ?
    `, [userId]);
    const reputation = reputationResult.rows[0] || { avg_rating: null, total_ratings: 0 };

    // Achievement stats
    const achievementsResult = await query<{ unlocked: number }>(`
      SELECT COUNT(*) as unlocked FROM user_achievements
      WHERE user_id = ? AND completed = 1
    `, [userId]);
    const achievements = achievementsResult.rows[0] || { unlocked: 0 };

    const xpResult = await query<{ total_xp: number; level: number }>(
      "SELECT total_xp, FLOOR(SQRT(total_xp / 100)) + 1 as level FROM user_xp WHERE user_id = ?", [userId]
    );
    const xp = xpResult.rows[0];

    // Treasure hunts stats
    const [treasuresTotal, treasuresActive, treasuresCompleted, treasuresShared, treasuresLoot] = await Promise.all([
      query<{ count: number }>("SELECT COUNT(*) as count FROM treasure_hunts WHERE user_id = ?", [userId]),
      query<{ count: number }>("SELECT COUNT(*) as count FROM treasure_hunts WHERE user_id = ? AND status NOT IN ('completed', 'abandoned')", [userId]),
      query<{ count: number }>("SELECT COUNT(*) as count FROM treasure_hunts WHERE user_id = ? AND status = 'completed'", [userId]),
      query<{ count: number }>("SELECT COUNT(*) as count FROM treasure_hunt_shares WHERE shared_with_user_id = ?", [userId]),
      query<{ count: number }>(`
        SELECT COUNT(*) as count FROM treasure_loot tl
        JOIN treasure_hunts th ON tl.hunt_id = th.id
        WHERE th.user_id = ?
      `, [userId]),
    ]);

    // Timers stats
    const timersResult = await query<{ count: number; active: number }>(`
      SELECT
        COUNT(*) as count,
        SUM(CASE WHEN end_time > datetime('now') THEN 1 ELSE 0 END) as active
      FROM timers WHERE user_id = ?
    `, [userId]);
    const timersStats = timersResult.rows[0] || { count: 0, active: 0 };

    const recentTimersResult = await query<{
      id: number;
      name: string;
      timer_type: string;
      end_time: string;
    }>(`
      SELECT id, name, timer_type, end_time FROM timers
      WHERE user_id = ? AND end_time > datetime('now')
      ORDER BY end_time ASC LIMIT 3
    `, [userId]);
    const recentTimers = recentTimersResult.rows;

    // Characters stats
    const charactersResult = await query<{ count: number; main_name: string | null }>(`
      SELECT
        COUNT(*) as count,
        (SELECT name FROM characters WHERE user_id = ? AND is_main = 1 LIMIT 1) as main_name
      FROM characters WHERE user_id = ?
    `, [userId, userId]);
    const charactersStats = charactersResult.rows[0] || { count: 0, main_name: null };

    // Recent activity - orders
    const recentOrdersResult = await query<{
      id: number;
      order_type: string;
      item_name: string;
      quantity: number;
      status: string;
      created_at: string;
    }>(`
      SELECT id, order_type, item_name, quantity, status, created_at
      FROM orders WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 8
    `, [userId]);
    const recentOrders = recentOrdersResult.rows;

    const stats: DashboardStats = {
      profile: {
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        completeness,
        missing_fields: missingFields,
      },
      orders: {
        total: ordersTotal.rows[0]?.count || 0,
        active: ordersActive.rows[0]?.count || 0,
        completed: ordersCompleted.rows[0]?.count || 0,
        buy: ordersBuy.rows[0]?.count || 0,
        sell: ordersSell.rows[0]?.count || 0,
      },
      projects: {
        total: projectsTotal.rows[0]?.count || 0,
        in_progress: projectsInProgress.rows[0]?.count || 0,
        completed: projectsCompleted.rows[0]?.count || 0,
        total_items: projectItems.rows[0]?.total || 0,
      },
      merchants: {
        total: merchantsTotal.rows[0]?.count || 0,
        active: merchantsActive.rows[0]?.count || 0,
      },
      alliances: {
        member_of: allianceMembership ? 1 : 0,
        is_leader: allianceMembership?.role === "leader",
        alliance_name: allianceMembership?.name || null,
      },
      trades: {
        total_matches: tradesTotal.rows[0]?.count || 0,
        completed: tradesCompleted.rows[0]?.count || 0,
        pending: tradesPending.rows[0]?.count || 0,
      },
      reputation: {
        avg_rating: reputation.avg_rating ? Math.round(reputation.avg_rating * 10) / 10 : 0,
        total_ratings: reputation.total_ratings,
      },
      achievements: {
        unlocked: achievements.unlocked,
        total_xp: xp?.total_xp || 0,
        level: xp?.level || 1,
      },
      treasures: {
        total_hunts: treasuresTotal.rows[0]?.count || 0,
        active_hunts: treasuresActive.rows[0]?.count || 0,
        completed_hunts: treasuresCompleted.rows[0]?.count || 0,
        shared_with_me: treasuresShared.rows[0]?.count || 0,
        total_loot: treasuresLoot.rows[0]?.count || 0,
      },
      timers: {
        total: timersStats.count,
        active: timersStats.active || 0,
        recent: recentTimers,
      },
      characters: {
        total: charactersStats.count,
        main_character: charactersStats.main_name,
      },
      activity: {
        recent_orders: recentOrders,
      },
    };

    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch dashboard stats") },
      { status: 500 }
    );
  }
}
