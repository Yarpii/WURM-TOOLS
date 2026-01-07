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
import { sanitizeError } from "@/lib/security";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const userId = searchParams.get("user_id");
    const limitParam = parseInt(searchParams.get("limit") || "20");
    const limit = isNaN(limitParam) ? 20 : Math.min(Math.max(limitParam, 1), 100);

    switch (action) {
      case "all":
        // Get all available achievements
        return NextResponse.json(await getAchievements());

      case "leaderboard":
        // Get public leaderboard
        return NextResponse.json(await getLeaderboard(limit));

      case "user-xp":
        if (!userId) {
          return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 }
          );
        }
        const parsedUserIdXp = parseInt(userId);
        if (isNaN(parsedUserIdXp)) {
          return NextResponse.json(
            { error: "Invalid user ID" },
            { status: 400 }
          );
        }
        const xp = await getUserXP(parsedUserIdXp);
        return NextResponse.json(xp || { error: "User not found" });

      case "user-achievements":
        if (!userId) {
          return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 }
          );
        }
        const parsedUserIdAch = parseInt(userId);
        if (isNaN(parsedUserIdAch)) {
          return NextResponse.json(
            { error: "Invalid user ID" },
            { status: 400 }
          );
        }
        const achievements = await getCompletedAchievements(parsedUserIdAch);
        return NextResponse.json(achievements);

      default:
        // Default: return achievements list and leaderboard
        return NextResponse.json({
          achievements: await getAchievements(),
          leaderboard: await getLeaderboard(10),
        });
    }
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch achievements") },
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

    const result = await getSession(sessionId);
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
        const newlyCompleted = await checkAndUpdateAchievements(result.user.id);
        const userXP = await getUserXP(result.user.id);
        const userAchievements = await getUserAchievements(result.user.id);

        return NextResponse.json({
          newly_completed: newlyCompleted,
          xp: userXP,
          achievements: userAchievements,
        });
      }

      case "my-progress": {
        // Get current user's progress
        const xp = await getUserXP(result.user.id);
        const achievements = await getUserAchievements(result.user.id);
        const completed = await getCompletedAchievements(result.user.id);
        const allAchievements = await getAchievements();

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
      { error: sanitizeError(error, "Process achievements") },
      { status: 500 }
    );
  }
}
