import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getAllMerchants,
  getMerchantsPaginated,
  createMerchant,
  getMerchantStats,
  getServers,
} from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import type { MerchantCategory, CreateMerchantInput } from "@/lib/types";

const VALID_CATEGORIES: MerchantCategory[] = [
  "tools",
  "weapons",
  "armor",
  "materials",
  "food",
  "animals",
  "vehicles",
  "furniture",
  "misc",
];

const WURM_SERVERS = [
  "Xanadu",
  "Deliverance",
  "Exodus",
  "Celebration",
  "Pristine",
  "Release",
  "Independence",
  "Chaos",
  "Harmony",
  "Melody",
  "Cadence",
  "Defiance",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as MerchantCategory | null;
    const server = searchParams.get("server");
    const search = searchParams.get("search");
    const user_id = searchParams.get("user_id");
    const stats_only = searchParams.get("stats");
    const servers_only = searchParams.get("servers");

    // Pagination parameters with validation
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const limitParam = parseInt(searchParams.get("limit") || "50", 10);
    const page = isNaN(pageParam) ? 1 : Math.max(pageParam, 1);
    const limit = isNaN(limitParam) ? 50 : Math.min(Math.max(limitParam, 1), 100);
    const paginate = searchParams.get("paginate") === "true";

    if (stats_only) {
      const stats = await getMerchantStats();
      return NextResponse.json(stats);
    }

    if (servers_only) {
      // Return available servers (existing + WURM default servers)
      const existingServers = await getServers();
      const allServers = [...new Set([...WURM_SERVERS, ...existingServers])].sort();
      return NextResponse.json(allServers);
    }

    // Validate user_id if provided
    let parsedUserId: number | undefined;
    if (user_id) {
      parsedUserId = parseInt(user_id);
      if (isNaN(parsedUserId)) {
        return NextResponse.json(
          { error: "Invalid user ID" },
          { status: 400 }
        );
      }
    }

    const filters = {
      active: true,
      category: category || undefined,
      server: server || undefined,
      userId: parsedUserId,
    };

    // SECURITY: Use paginated version for large datasets
    if (paginate) {
      const result = await getMerchantsPaginated({ page, limit }, filters);
      return NextResponse.json(result);
    }

    const merchants = await getAllMerchants(filters);
    return NextResponse.json(merchants);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch merchants") },
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
    const {
      name,
      description,
      location,
      server,
      coordinates,
      category,
      stock_list,
    } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Merchant name is required" },
        { status: 400 }
      );
    }

    if (!location || location.trim() === "") {
      return NextResponse.json(
        { error: "Location is required" },
        { status: 400 }
      );
    }

    if (!server || server.trim() === "") {
      return NextResponse.json(
        { error: "Server is required" },
        { status: 400 }
      );
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    if (!stock_list || stock_list.trim() === "") {
      return NextResponse.json(
        { error: "Stock list is required" },
        { status: 400 }
      );
    }

    const input: CreateMerchantInput = {
      name: name.trim(),
      description: description?.trim() || undefined,
      location: location.trim(),
      server: server.trim(),
      coordinates: coordinates?.trim() || undefined,
      category,
      stock_list: stock_list.trim(),
    };

    const merchantId = await createMerchant(result.user.id, input);

    return NextResponse.json({ id: merchantId, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Create merchant") },
      { status: 500 }
    );
  }
}
