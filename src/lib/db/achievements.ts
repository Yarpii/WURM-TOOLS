import { query } from "./core";
import type {
  Achievement,
  UserAchievement,
  UserXP,
  LeaderboardEntry,
} from "../types";

// ========== ACHIEVEMENTS ==========

export async function getAllAchievements(): Promise<Achievement[]> {
  const result = await query<Achievement>("SELECT * FROM achievements ORDER BY category, name");
  return result.rows;
}

// ========== ACHIEVEMENTS & XP ==========

// Achievements definitions (can be extended)
const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_order",
    name: "First Trade",
    description: "Create your first market order",
    category: "trading",
    icon: "shopping-cart",
    xp_reward: 10,
    requirement_type: "orders_created",
    requirement_value: 1,
    is_hidden: false,
  },
  {
    id: "trader_10",
    name: "Active Trader",
    description: "Create 10 market orders",
    category: "trading",
    icon: "trending-up",
    xp_reward: 50,
    requirement_type: "orders_created",
    requirement_value: 10,
    is_hidden: false,
  },
  {
    id: "merchant",
    name: "Merchant",
    description: "Create your first merchant",
    category: "trading",
    icon: "store",
    xp_reward: 25,
    requirement_type: "merchants_created",
    requirement_value: 1,
    is_hidden: false,
  },
  {
    id: "crafter",
    name: "Crafter",
    description: "Use the crafting calculator 10 times",
    category: "crafting",
    icon: "hammer",
    xp_reward: 30,
    requirement_type: "calculations_made",
    requirement_value: 10,
    is_hidden: false,
  },
  {
    id: "alliance_leader",
    name: "Alliance Leader",
    description: "Create an alliance",
    category: "community",
    icon: "users",
    xp_reward: 50,
    requirement_type: "alliances_created",
    requirement_value: 1,
    is_hidden: false,
  },
  {
    id: "social_butterfly",
    name: "Social Butterfly",
    description: "Join an alliance",
    category: "community",
    icon: "user-plus",
    xp_reward: 20,
    requirement_type: "alliances_joined",
    requirement_value: 1,
    is_hidden: false,
  },
];

export async function checkAndUpdateAchievements(userId: number): Promise<string[]> {
  const newAchievements: string[] = [];

  // Get user stats
  const ordersCount = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM orders WHERE user_id = ?",
    [userId]
  );
  const merchantsCount = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM merchants WHERE user_id = ?",
    [userId]
  );
  const alliancesCreated = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM alliances WHERE leader_id = ?",
    [userId]
  );
  const alliancesJoined = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM alliance_members WHERE user_id = ?",
    [userId]
  );

  const stats: Record<string, number> = {
    orders_created: ordersCount.rows[0]?.count || 0,
    merchants_created: merchantsCount.rows[0]?.count || 0,
    alliances_created: alliancesCreated.rows[0]?.count || 0,
    alliances_joined: alliancesJoined.rows[0]?.count || 0,
  };

  // Check each achievement
  for (const achievement of ACHIEVEMENTS) {
    // Check if already completed
    const existing = await query<UserAchievement>(
      "SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?",
      [userId, achievement.id]
    );

    const userStat = stats[achievement.requirement_type] || 0;
    const progress = Math.min(userStat, achievement.requirement_value);
    const completed = userStat >= achievement.requirement_value;

    if (existing.rows.length === 0) {
      // Create new achievement record
      await query(
        `INSERT INTO user_achievements (user_id, achievement_id, progress, completed, completed_at)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, achievement.id, progress, completed ? 1 : 0, completed ? new Date() : null]
      );

      if (completed) {
        // Award XP
        await query(
          "INSERT INTO user_xp (user_id, total_xp) VALUES (?, ?) ON DUPLICATE KEY UPDATE total_xp = total_xp + ?",
          [userId, achievement.xp_reward, achievement.xp_reward]
        );
        newAchievements.push(achievement.id);
      }
    } else if (!existing.rows[0].completed && completed) {
      // Update to completed
      await query(
        "UPDATE user_achievements SET progress = ?, completed = 1, completed_at = NOW() WHERE user_id = ? AND achievement_id = ?",
        [progress, userId, achievement.id]
      );

      // Award XP
      await query(
        "INSERT INTO user_xp (user_id, total_xp) VALUES (?, ?) ON DUPLICATE KEY UPDATE total_xp = total_xp + ?",
        [userId, achievement.xp_reward, achievement.xp_reward]
      );
      newAchievements.push(achievement.id);
    } else if (!existing.rows[0].completed) {
      // Update progress
      await query(
        "UPDATE user_achievements SET progress = ? WHERE user_id = ? AND achievement_id = ?",
        [progress, userId, achievement.id]
      );
    }
  }

  return newAchievements;
}

export async function getCompletedAchievements(userId: number): Promise<UserAchievement[]> {
  const result = await query<UserAchievement>(
    "SELECT * FROM user_achievements WHERE user_id = ? AND completed = 1 ORDER BY completed_at DESC",
    [userId]
  );
  return result.rows;
}

// Get all achievements for a user (including incomplete with progress)
export async function getUserAchievements(userId: number): Promise<UserAchievement[]> {
  const result = await query<UserAchievement>(
    "SELECT * FROM user_achievements WHERE user_id = ? ORDER BY completed DESC, progress DESC",
    [userId]
  );
  return result.rows;
}

// Alias for backwards compatibility
export const getAchievements = getAllAchievements;

export async function getUserXP(userId: number): Promise<UserXP | null> {
  const xpResult = await query<{ total_xp: number }>(
    "SELECT total_xp FROM user_xp WHERE user_id = ?",
    [userId]
  );

  const userResult = await query<{ username: string }>(
    "SELECT username FROM users WHERE id = ?",
    [userId]
  );

  if (!userResult.rows[0]) return null;

  const totalXp = xpResult.rows[0]?.total_xp || 0;
  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;
  const xpForCurrentLevel = (level - 1) * (level - 1) * 100;
  const xpForNextLevel = level * level * 100;
  const xpToNextLevel = xpForNextLevel - totalXp;

  return {
    user_id: userId,
    username: userResult.rows[0].username,
    total_xp: totalXp,
    level,
    xp_to_next_level: xpToNextLevel,
  };
}

export async function getLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
  const result = await query<LeaderboardEntry>(
    `SELECT
      ux.user_id,
      u.username,
      u.display_name,
      u.avatar_url,
      ux.total_xp,
      (SELECT COUNT(*) FROM user_achievements WHERE user_id = ux.user_id AND completed = 1) as achievements_count
    FROM user_xp ux
    JOIN users u ON ux.user_id = u.id
    WHERE u.is_banned = 0
    ORDER BY ux.total_xp DESC
    LIMIT ?`,
    [limit]
  );

  return result.rows.map((row, index) => {
    const level = Math.floor(Math.sqrt(row.total_xp / 100)) + 1;
    return {
      rank: index + 1,
      user_id: row.user_id,
      username: row.username,
      display_name: row.display_name,
      total_xp: row.total_xp,
      level,
      achievements_count: row.achievements_count,
      avatar_url: row.avatar_url,
    };
  });
}
