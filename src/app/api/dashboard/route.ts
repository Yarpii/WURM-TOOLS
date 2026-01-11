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
    active_projects: Array<{
      id: number;
      name: string;
      progress: number;
      item_count: number;
    }>;
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
    main_character: {
      name: string;
      server: string;
      is_premium: boolean;
    } | null;
  };
  leaderboard: {
    rank: number;
    total_players: number;
  };
  skills: {
    total: number;
    at_goal: number;
    closest_to_goal: Array<{
      id: number;
      skill_name: string;
      current_level: number;
      target_level: number;
      progress: number;
    }>;
  };
  events: {
    upcoming: Array<{
      id: number;
      title: string;
      event_type: string;
      start_date: string;
      server: string;
      status: string;
    }>;
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
    recent_hunts: Array<{
      id: number;
      name: string;
      status: string;
      server: string;
      updated_at: string;
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

    // Active projects with progress
    const activeProjectsResult = await query<{
      id: number;
      name: string;
      total_items: number;
      completed_items: number;
    }>(`
      SELECT
        p.id, p.name,
        COUNT(pi.id) as total_items,
        SUM(CASE WHEN pi.completed_quantity >= pi.quantity THEN 1 ELSE 0 END) as completed_items
      FROM projects p
      LEFT JOIN project_items pi ON p.id = pi.project_id
      WHERE p.user_id = ? AND p.status = 'in_progress'
      GROUP BY p.id, p.name, p.updated_at
      ORDER BY p.updated_at DESC
      LIMIT 3
    `, [userId]);
    const activeProjects = activeProjectsResult.rows.map(p => ({
      id: p.id,
      name: p.name,
      progress: p.total_items > 0 ? Math.round((p.completed_items / p.total_items) * 100) : 0,
      item_count: p.total_items,
    }));

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
        JOIN treasure_hunts th ON tl.treasure_hunt_id = th.id
        WHERE th.user_id = ?
      `, [userId]),
    ]);

    // Timers stats
    const timersResult = await query<{ count: number; active: number }>(`
      SELECT
        COUNT(*) as count,
        SUM(CASE WHEN end_time > NOW() THEN 1 ELSE 0 END) as active
      FROM user_timers WHERE user_id = ?
    `, [userId]);
    const timersStats = timersResult.rows[0] || { count: 0, active: 0 };

    const recentTimersResult = await query<{
      id: number;
      name: string;
      timer_type: string;
      end_time: string;
    }>(`
      SELECT id, name, timer_type, end_time FROM user_timers
      WHERE user_id = ? AND end_time > NOW()
      ORDER BY end_time ASC LIMIT 3
    `, [userId]);
    const recentTimers = recentTimersResult.rows;

    // Characters stats
    const charactersCountResult = await query<{ count: number }>(
      "SELECT COUNT(*) as count FROM characters WHERE user_id = ?",
      [userId]
    );
    const charactersCount = charactersCountResult.rows[0]?.count || 0;

    const mainCharacterResult = await query<{
      name: string;
      server: string;
      is_premium: boolean;
    }>(`
      SELECT name, server, (premium_until > NOW()) as is_premium
      FROM characters WHERE user_id = ? AND is_primary = 1
      LIMIT 1
    `, [userId]);
    const mainChar = mainCharacterResult.rows[0];

    // Leaderboard position
    const leaderboardResult = await query<{ user_rank: number; total: number }>(`
      SELECT
        (SELECT COUNT(*) + 1 FROM user_xp WHERE total_xp > COALESCE((SELECT total_xp FROM user_xp WHERE user_id = ?), 0)) as user_rank,
        (SELECT COUNT(*) FROM user_xp) as total
    `, [userId]);
    const leaderboard = leaderboardResult.rows[0] || { user_rank: 0, total: 0 };

    // Skills stats
    const skillsStatsResult = await query<{ total: number; at_goal: number }>(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN current_level >= target_level THEN 1 ELSE 0 END) as at_goal
      FROM user_skills WHERE user_id = ? AND target_level > 0
    `, [userId]);
    const skillsStats = skillsStatsResult.rows[0] || { total: 0, at_goal: 0 };

    const closestSkillsResult = await query<{
      id: number;
      skill_name: string;
      current_level: number;
      target_level: number;
    }>(`
      SELECT id, skill_name, current_level, target_level
      FROM user_skills
      WHERE user_id = ? AND target_level > 0 AND current_level < target_level
      ORDER BY (current_level * 1.0 / target_level) DESC
      LIMIT 3
    `, [userId]);
    const closestSkills = closestSkillsResult.rows.map(s => ({
      ...s,
      progress: Math.round((s.current_level / s.target_level) * 100)
    }));

    // Upcoming events
    const upcomingEventsResult = await query<{
      id: number;
      title: string;
      event_type: string;
      start_date: string;
      server: string;
      status: string;
    }>(`
      SELECT e.id, e.title, e.event_type, e.start_date, e.server, ea.status
      FROM events e
      JOIN event_attendees ea ON e.id = ea.event_id
      WHERE ea.user_id = ? AND ea.status IN ('going', 'maybe')
        AND e.start_date >= NOW()
      ORDER BY e.start_date ASC
      LIMIT 3
    `, [userId]);
    const upcomingEvents = upcomingEventsResult.rows;

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
      ORDER BY created_at DESC LIMIT 5
    `, [userId]);
    const recentOrders = recentOrdersResult.rows;

    // Recent treasure hunts
    const recentHuntsResult = await query<{
      id: number;
      name: string;
      status: string;
      server: string;
      updated_at: string;
    }>(`
      SELECT id, name, status, server, updated_at
      FROM treasure_hunts WHERE user_id = ?
      ORDER BY updated_at DESC LIMIT 3
    `, [userId]);
    const recentHunts = recentHuntsResult.rows;

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
        active_projects: activeProjects,
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
        total: charactersCount,
        main_character: mainChar ? {
          name: mainChar.name,
          server: mainChar.server,
          is_premium: !!mainChar.is_premium,
        } : null,
      },
      leaderboard: {
        rank: leaderboard.user_rank,
        total_players: leaderboard.total,
      },
      skills: {
        total: skillsStats.total,
        at_goal: skillsStats.at_goal || 0,
        closest_to_goal: closestSkills,
      },
      events: {
        upcoming: upcomingEvents,
      },
      activity: {
        recent_orders: recentOrders,
        recent_hunts: recentHunts,
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
