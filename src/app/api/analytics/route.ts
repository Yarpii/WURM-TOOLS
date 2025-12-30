import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getPriceHistory,
  getPriceAnalytics,
  getTrendingItems,
  getBestDeals,
  getUserPriceAlerts,
  createPriceAlert,
  deletePriceAlert,
  checkPriceAlerts,
} from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const itemName = searchParams.get("item");
    const days = parseInt(searchParams.get("days") || "30");
    const limit = parseInt(searchParams.get("limit") || "10");

    switch (action) {
      case "history":
        if (!itemName) {
          return NextResponse.json(
            { error: "Item name is required" },
            { status: 400 }
          );
        }
        const history = getPriceHistory(itemName, days);
        return NextResponse.json(history);

      case "analytics":
        if (!itemName) {
          return NextResponse.json(
            { error: "Item name is required" },
            { status: 400 }
          );
        }
        const analytics = getPriceAnalytics(itemName);
        return NextResponse.json(analytics || { error: "No data found" });

      case "trending":
        const trending = getTrendingItems(limit);
        return NextResponse.json(trending);

      case "deals":
        const deals = getBestDeals(limit);
        return NextResponse.json(deals);

      case "alerts":
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
        const alerts = getUserPriceAlerts(result.user.id);
        return NextResponse.json(alerts);

      case "check-alerts":
        const triggered = checkPriceAlerts();
        return NextResponse.json({ triggered });

      default:
        // Return summary of all analytics
        return NextResponse.json({
          trending: getTrendingItems(5),
          deals: getBestDeals(5),
        });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch analytics: " + String(error) },
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
    const { action, item_name, target_price, condition, alert_id } = body;

    if (action === "create-alert") {
      if (!item_name || !target_price || !condition) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      if (!["above", "below"].includes(condition)) {
        return NextResponse.json(
          { error: "Condition must be 'above' or 'below'" },
          { status: 400 }
        );
      }

      const alertId = createPriceAlert(result.user.id, {
        item_name,
        target_price,
        condition,
      });

      return NextResponse.json({ id: alertId, success: true });
    }

    if (action === "delete-alert") {
      if (!alert_id) {
        return NextResponse.json(
          { error: "Alert ID is required" },
          { status: 400 }
        );
      }

      const deleted = deletePriceAlert(alert_id, result.user.id);
      return NextResponse.json({ success: deleted });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process request: " + String(error) },
      { status: 500 }
    );
  }
}
