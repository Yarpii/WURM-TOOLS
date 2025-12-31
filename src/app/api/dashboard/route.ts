import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/database";
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
  prospects: {
    total: number;
    pages: number;
    recruited: number;
    pending: number;
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
  activity: {
    recent_orders: Array<{
      id: number;
      order_type: string;
      item_name: string;
      quantity: number;
      status: string;
      created_at: string;
    }>;
    recent_prospects: Array<{
      id: number;
      name: string;
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

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const db = getDb();
    const userId = session.user.id;

    // Get user profile info
    const user = db.prepare(`
      SELECT username, display_name, avatar_url, bio, location, wurm_server, created_at
      FROM users WHERE id = ?
    `).get(userId) as {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      bio: string | null;
      location: string | null;
      wurm_server: string | null;
      created_at: string;
    };

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
    const ordersTotal = db.prepare("SELECT COUNT(*) as count FROM orders WHERE user_id = ?").get(userId) as { count: number };
    const ordersActive = db.prepare("SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status = 'active'").get(userId) as { count: number };
    const ordersCompleted = db.prepare("SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status = 'completed'").get(userId) as { count: number };
    const ordersBuy = db.prepare("SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND order_type = 'buy'").get(userId) as { count: number };
    const ordersSell = db.prepare("SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND order_type = 'sell'").get(userId) as { count: number };

    // Projects stats
    const projectsTotal = db.prepare("SELECT COUNT(*) as count FROM projects WHERE user_id = ?").get(userId) as { count: number };
    const projectsInProgress = db.prepare("SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status = 'in_progress'").get(userId) as { count: number };
    const projectsCompleted = db.prepare("SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status = 'completed'").get(userId) as { count: number };
    const projectItems = db.prepare(`
      SELECT COALESCE(SUM(pi.quantity), 0) as total
      FROM project_items pi
      JOIN projects p ON pi.project_id = p.id
      WHERE p.user_id = ?
    `).get(userId) as { total: number };

    // Prospects stats
    const prospectsTotal = db.prepare("SELECT COUNT(*) as count FROM prospects WHERE user_id = ?").get(userId) as { count: number };
    const prospectPages = db.prepare("SELECT COUNT(*) as count FROM prospect_pages WHERE user_id = ?").get(userId) as { count: number };
    const prospectsRecruited = db.prepare("SELECT COUNT(*) as count FROM prospects WHERE user_id = ? AND status = 'recruited'").get(userId) as { count: number };
    const prospectsPending = db.prepare("SELECT COUNT(*) as count FROM prospects WHERE user_id = ? AND status IN ('potential', 'contacted', 'interested')").get(userId) as { count: number };

    // Merchants stats
    const merchantsTotal = db.prepare("SELECT COUNT(*) as count FROM merchants WHERE user_id = ?").get(userId) as { count: number };
    const merchantsActive = db.prepare("SELECT COUNT(*) as count FROM merchants WHERE user_id = ? AND is_active = 1").get(userId) as { count: number };

    // Alliance stats
    const allianceMembership = db.prepare(`
      SELECT a.name, am.role
      FROM alliance_members am
      JOIN alliances a ON am.alliance_id = a.id
      WHERE am.user_id = ?
    `).get(userId) as { name: string; role: string } | undefined;

    // Trade matches stats
    const tradesTotal = db.prepare(`
      SELECT COUNT(*) as count FROM trade_matches
      WHERE buyer_id = ? OR seller_id = ?
    `).get(userId, userId) as { count: number };
    const tradesCompleted = db.prepare(`
      SELECT COUNT(*) as count FROM trade_matches
      WHERE (buyer_id = ? OR seller_id = ?) AND status = 'completed'
    `).get(userId, userId) as { count: number };
    const tradesPending = db.prepare(`
      SELECT COUNT(*) as count FROM trade_matches
      WHERE (buyer_id = ? OR seller_id = ?) AND status = 'pending'
    `).get(userId, userId) as { count: number };

    // Reputation stats
    const reputation = db.prepare(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
      FROM user_ratings WHERE rated_user_id = ?
    `).get(userId) as { avg_rating: number | null; total_ratings: number };

    // Achievement stats
    const achievements = db.prepare(`
      SELECT COUNT(*) as unlocked FROM user_achievements
      WHERE user_id = ? AND completed = 1
    `).get(userId) as { unlocked: number };
    const xp = db.prepare("SELECT total_xp, level FROM user_xp WHERE user_id = ?").get(userId) as { total_xp: number; level: number } | undefined;

    // Recent activity - orders
    const recentOrders = db.prepare(`
      SELECT id, order_type, item_name, quantity, status, created_at
      FROM orders WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 5
    `).all(userId) as Array<{
      id: number;
      order_type: string;
      item_name: string;
      quantity: number;
      status: string;
      created_at: string;
    }>;

    // Recent activity - prospects
    const recentProspects = db.prepare(`
      SELECT id, name, status, created_at
      FROM prospects WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 5
    `).all(userId) as Array<{
      id: number;
      name: string;
      status: string;
      created_at: string;
    }>;

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
        total: ordersTotal.count,
        active: ordersActive.count,
        completed: ordersCompleted.count,
        buy: ordersBuy.count,
        sell: ordersSell.count,
      },
      projects: {
        total: projectsTotal.count,
        in_progress: projectsInProgress.count,
        completed: projectsCompleted.count,
        total_items: projectItems.total,
      },
      prospects: {
        total: prospectsTotal.count,
        pages: prospectPages.count,
        recruited: prospectsRecruited.count,
        pending: prospectsPending.count,
      },
      merchants: {
        total: merchantsTotal.count,
        active: merchantsActive.count,
      },
      alliances: {
        member_of: allianceMembership ? 1 : 0,
        is_leader: allianceMembership?.role === "leader",
        alliance_name: allianceMembership?.name || null,
      },
      trades: {
        total_matches: tradesTotal.count,
        completed: tradesCompleted.count,
        pending: tradesPending.count,
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
      activity: {
        recent_orders: recentOrders,
        recent_prospects: recentProspects,
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
