import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getAchievements,
  getUserAchievements,
  getCompletedAchievements,
  checkAndUpdateAchievements,
  getUserXP,
  getLeaderboard,
} from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const userId = searchParams.get("user_id");
    const limit = parseInt(searchParams.get("limit") || "20");

    switch (action) {
      case "all":
        // Get all available achievements
        return NextResponse.json(getAchievements());

      case "leaderboard":
        // Get public leaderboard
        return NextResponse.json(getLeaderboard(limit));

      case "user-xp":
        if (!userId) {
          return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 }
          );
        }
        const xp = getUserXP(parseInt(userId));
        return NextResponse.json(xp || { error: "User not found" });

      case "user-achievements":
        if (!userId) {
          return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 }
          );
        }
        const achievements = getCompletedAchievements(parseInt(userId));
        return NextResponse.json(achievements);

      default:
        // Default: return achievements list and leaderboard
        return NextResponse.json({
          achievements: getAchievements(),
          leaderboard: getLeaderboard(10),
        });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch achievements: " + String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const result = getSession(sessionId);
    if (!result) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "check": {
        // Check and update achievements for current user
        const newlyCompleted = checkAndUpdateAchievements(result.user.id);
        const userXP = getUserXP(result.user.id);
        const userAchievements = getUserAchievements(result.user.id);

        return NextResponse.json({
          newly_completed: newlyCompleted,
          xp: userXP,
          achievements: userAchievements,
        });
      }

      case "my-progress": {
        // Get current user's progress
        const xp = getUserXP(result.user.id);
        const achievements = getUserAchievements(result.user.id);
        const completed = getCompletedAchievements(result.user.id);
        const allAchievements = getAchievements();

        return NextResponse.json({
          xp,
          achievements,
          completed,
          total_achievements: allAchievements.length,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process request: " + String(error) },
      { status: 500 }
    );
  }
}
