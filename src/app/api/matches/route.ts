import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  findMatches,
  getUserMatches,
  getMatchById,
  updateMatchStatus,
  createRating,
  getUserRatings,
  getUserReputation,
  getBarterSuggestions,
  expireOldMatches,
} from "@/lib/database";
import type { MatchStatus, CreateRatingInput } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const matchId = searchParams.get("id");
    const userId = searchParams.get("user_id");

    // Public endpoints
    if (action === "reputation" && userId) {
      const reputation = await getUserReputation(parseInt(userId));
      return NextResponse.json(reputation || { error: "User not found" });
    }

    if (action === "ratings" && userId) {
      const ratings = await getUserRatings(parseInt(userId));
      return NextResponse.json(ratings);
    }

    // Authenticated endpoints
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

    switch (action) {
      case "my-matches":
        // Expire old matches first
        await expireOldMatches();
        const matches = await getUserMatches(result.user.id);
        return NextResponse.json(matches);

      case "details":
        if (!matchId) {
          return NextResponse.json(
            { error: "Match ID is required" },
            { status: 400 }
          );
        }
        const match = await getMatchById(parseInt(matchId));
        if (!match) {
          return NextResponse.json(
            { error: "Match not found" },
            { status: 404 }
          );
        }
        // Only participants can view details
        if (match.buyer_id !== result.user.id && match.seller_id !== result.user.id) {
          return NextResponse.json(
            { error: "Access denied" },
            { status: 403 }
          );
        }
        return NextResponse.json(match);

      case "suggestions":
        const suggestions = await getBarterSuggestions(result.user.id);
        return NextResponse.json(suggestions);

      case "my-reputation":
        const myReputation = await getUserReputation(result.user.id);
        return NextResponse.json(myReputation);

      case "my-ratings":
        const myRatings = await getUserRatings(result.user.id);
        return NextResponse.json(myRatings);

      case "find":
        // Find new matches (can be called periodically)
        const matchCount = await findMatches();
        return NextResponse.json({
          found: matchCount,
        });

      default:
        // Return user's matches and suggestions
        await expireOldMatches();
        return NextResponse.json({
          matches: await getUserMatches(result.user.id),
          suggestions: await getBarterSuggestions(result.user.id),
          reputation: await getUserReputation(result.user.id),
        });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch matches: " + String(error) },
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
    const { action, match_id, status, rated_user_id, rating, comment } = body;

    switch (action) {
      case "update-status": {
        if (!match_id || !status) {
          return NextResponse.json(
            { error: "Match ID and status are required" },
            { status: 400 }
          );
        }

        const validStatuses: MatchStatus[] = ["pending", "contacted", "completed", "declined"];
        if (!validStatuses.includes(status)) {
          return NextResponse.json(
            { error: "Invalid status" },
            { status: 400 }
          );
        }

        const updated = await updateMatchStatus(match_id, result.user.id, status);
        return NextResponse.json({ success: updated });
      }

      case "rate": {
        if (!rated_user_id || !rating) {
          return NextResponse.json(
            { error: "User ID and rating are required" },
            { status: 400 }
          );
        }

        if (rating < 1 || rating > 5) {
          return NextResponse.json(
            { error: "Rating must be between 1 and 5" },
            { status: 400 }
          );
        }

        if (rated_user_id === result.user.id) {
          return NextResponse.json(
            { error: "Cannot rate yourself" },
            { status: 400 }
          );
        }

        const ratingInput: CreateRatingInput = {
          rated_user_id,
          rating,
          comment: comment?.trim() || undefined,
          trade_match_id: match_id || undefined,
        };

        try {
          const ratingId = await createRating(result.user.id, ratingInput);
          return NextResponse.json({ id: ratingId, success: true });
        } catch (error) {
          return NextResponse.json(
            { error: String(error) },
            { status: 400 }
          );
        }
      }

      case "find-matches": {
        // Trigger match finding
        const foundCount = await findMatches();
        return NextResponse.json({
          found: foundCount,
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
