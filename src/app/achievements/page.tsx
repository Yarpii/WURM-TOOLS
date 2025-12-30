"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { Achievement, UserAchievement, UserXP, LeaderboardEntry } from "@/lib/types";

type TabType = "achievements" | "leaderboard" | "my-progress";

const CATEGORY_COLORS: Record<string, string> = {
  trading: "text-success",
  community: "text-info",
  exploration: "text-warning",
  crafting: "text-accent",
  special: "text-purple-400",
};

const CATEGORY_BG: Record<string, string> = {
  trading: "bg-success/20",
  community: "bg-info/20",
  exploration: "bg-warning/20",
  crafting: "bg-accent/20",
  special: "bg-purple-400/20",
};

export default function AchievementsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("achievements");
  const [loading, setLoading] = useState(true);

  // Data
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userProgress, setUserProgress] = useState<{
    xp: UserXP | null;
    achievements: UserAchievement[];
    completed: Achievement[];
    total_achievements: number;
  } | null>(null);

  // Newly completed achievements
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/achievements");
      const data = await res.json();
      if (data.achievements) setAchievements(data.achievements);
      if (data.leaderboard) setLeaderboard(data.leaderboard);
    } catch (err) {
      console.error("Failed to fetch achievements:", err);
    }
  };

  const fetchMyProgress = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "my-progress" }),
      });
      const data = await res.json();
      setUserProgress(data);
    } catch (err) {
      console.error("Failed to fetch progress:", err);
    }
  };

  const checkAchievements = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check" }),
      });
      const data = await res.json();
      if (data.newly_completed && data.newly_completed.length > 0) {
        setNewAchievements(data.newly_completed);
      }
      await fetchMyProgress();
    } catch (err) {
      console.error("Failed to check achievements:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchData();
      if (user) {
        await fetchMyProgress();
        await checkAchievements();
      }
      setLoading(false);
    };
    loadData();
  }, [user]);

  const getProgressPercent = (achievementId: string) => {
    if (!userProgress) return 0;
    const progress = userProgress.achievements.find(a => a.achievement_id === achievementId);
    if (!progress) return 0;
    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement) return 0;
    return Math.min(100, (progress.progress / achievement.requirement_value) * 100);
  };

  const isCompleted = (achievementId: string) => {
    if (!userProgress) return false;
    return userProgress.completed.some(a => a.id === achievementId);
  };

  const getLevelProgress = () => {
    if (!userProgress?.xp) return 0;
    const { total_xp, level, xp_to_next_level } = userProgress.xp;
    const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
    const xpForNextLevel = Math.pow(level, 2) * 100;
    const levelXP = total_xp - xpForCurrentLevel;
    const levelRange = xpForNextLevel - xpForCurrentLevel;
    return (levelXP / levelRange) * 100;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Achievements</h1>
        <p className="text-text-secondary">
          Earn badges, gain XP, and climb the leaderboard!
        </p>
      </div>

      {/* User XP Summary (if logged in) */}
      {user && userProgress?.xp && (
        <div className="bg-bg-secondary rounded-xl border border-border p-6 mb-8">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-accent">{userProgress.xp.level}</span>
              </div>
              <div>
                <div className="text-lg font-semibold text-text-primary">Level {userProgress.xp.level}</div>
                <div className="text-sm text-text-muted">{userProgress.xp.total_xp} XP total</div>
              </div>
            </div>

            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-sm text-text-muted mb-1">
                <span>Progress to Level {userProgress.xp.level + 1}</span>
                <span>{userProgress.xp.xp_to_next_level} XP needed</span>
              </div>
              <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${getLevelProgress()}%` }}
                />
              </div>
            </div>

            <div className="text-center px-4">
              <div className="text-2xl font-bold text-warning">#{userProgress.xp.rank}</div>
              <div className="text-sm text-text-muted">Global Rank</div>
            </div>

            <div className="text-center px-4">
              <div className="text-2xl font-bold text-text-primary">
                {userProgress.completed.length}/{userProgress.total_achievements}
              </div>
              <div className="text-sm text-text-muted">Achievements</div>
            </div>
          </div>
        </div>
      )}

      {/* New Achievements Toast */}
      {newAchievements.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {newAchievements.map(achievement => (
            <div
              key={achievement.id}
              className="bg-bg-secondary border border-success rounded-lg p-4 shadow-lg animate-slide-in flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-xl">
                🏆
              </div>
              <div>
                <div className="font-medium text-success">Achievement Unlocked!</div>
                <div className="text-text-primary">{achievement.name}</div>
                <div className="text-sm text-text-muted">+{achievement.xp_reward} XP</div>
              </div>
              <button
                onClick={() => setNewAchievements(prev => prev.filter(a => a.id !== achievement.id))}
                className="text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("achievements")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "achievements"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          }`}
        >
          All Achievements
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "leaderboard"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          }`}
        >
          Leaderboard
        </button>
        {user && (
          <button
            onClick={() => setActiveTab("my-progress")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "my-progress"
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            }`}
          >
            My Progress
          </button>
        )}
      </div>

      {/* Achievements Tab */}
      {activeTab === "achievements" && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-text-muted">Loading achievements...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {achievements.map(achievement => {
                const completed = isCompleted(achievement.id);
                const progress = getProgressPercent(achievement.id);

                return (
                  <div
                    key={achievement.id}
                    className={`bg-bg-secondary rounded-lg border p-4 transition-all ${
                      completed
                        ? "border-success/50 bg-success/5"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${
                        completed ? "bg-success/20" : CATEGORY_BG[achievement.category]
                      }`}>
                        {completed ? "✓" : "🎯"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium ${completed ? "text-success" : "text-text-primary"}`}>
                            {achievement.name}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_BG[achievement.category]} ${CATEGORY_COLORS[achievement.category]}`}>
                            {achievement.category}
                          </span>
                        </div>
                        <p className="text-sm text-text-muted mt-1">{achievement.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-accent">+{achievement.xp_reward} XP</span>
                          {user && !completed && (
                            <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-accent rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === "leaderboard" && (
        <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-text-primary">Top Players</h2>
          </div>
          <div className="divide-y divide-border">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.user_id}
                className={`flex items-center gap-4 p-4 ${
                  user?.id === entry.user_id ? "bg-accent/10" : ""
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  index === 0 ? "bg-warning/20 text-warning" :
                  index === 1 ? "bg-gray-400/20 text-gray-400" :
                  index === 2 ? "bg-orange-400/20 text-orange-400" :
                  "bg-bg-tertiary text-text-muted"
                }`}>
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-primary truncate">
                    {entry.display_name || entry.username}
                  </div>
                  <div className="text-sm text-text-muted">
                    Level {entry.level} • {entry.achievements_count} achievements
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-accent">{entry.total_xp}</div>
                  <div className="text-xs text-text-muted">XP</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Progress Tab */}
      {activeTab === "my-progress" && user && userProgress && (
        <div className="space-y-6">
          {/* Completed Achievements */}
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Completed ({userProgress.completed.length})
            </h2>
            {userProgress.completed.length === 0 ? (
              <div className="text-center py-8 text-text-muted bg-bg-secondary rounded-lg border border-border">
                Complete achievements to see them here!
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {userProgress.completed.map(achievement => (
                  <div
                    key={achievement.id}
                    className="bg-bg-secondary rounded-lg border border-success/30 p-3 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center text-success">
                      ✓
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary truncate">{achievement.name}</div>
                      <div className="text-xs text-success">+{achievement.xp_reward} XP earned</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* In Progress */}
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">In Progress</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {achievements
                .filter(a => !isCompleted(a.id) && getProgressPercent(a.id) > 0)
                .map(achievement => {
                  const progress = getProgressPercent(achievement.id);
                  const userAch = userProgress.achievements.find(ua => ua.achievement_id === achievement.id);

                  return (
                    <div
                      key={achievement.id}
                      className="bg-bg-secondary rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-text-primary">{achievement.name}</h3>
                        <span className="text-xs text-accent">+{achievement.xp_reward} XP</span>
                      </div>
                      <p className="text-sm text-text-muted mb-3">{achievement.description}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-muted">
                          {userAch?.progress || 0}/{achievement.requirement_value}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Login prompt */}
      {!user && activeTab === "my-progress" && (
        <div className="text-center py-12">
          <div className="text-text-muted mb-4">Login to track your achievement progress</div>
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
