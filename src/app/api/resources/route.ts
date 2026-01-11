import { NextRequest, NextResponse } from "next/server";
import { getSessionAsync as getSession, isAdminAsync as isAdmin } from "@/lib/auth";
import {
  getCommunityResources,
  createCommunityResource,
  getResourceCategories,
  getFeaturedResources,
  getPopularResources
} from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import type { CreateResourceInput, ResourceFilters } from "@/lib/types";

// GET /api/resources - Get resources with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Special endpoints
    const categories = searchParams.get("categories");
    const featured = searchParams.get("featured");
    const popular = searchParams.get("popular");

    if (categories === "true") {
      const result = await getResourceCategories();
      return NextResponse.json(result);
    }

    if (featured === "true") {
      const result = await getFeaturedResources();
      return NextResponse.json(result);
    }

    if (popular === "true") {
      const limit = parseInt(searchParams.get("limit") || "10");
      const result = await getPopularResources(limit);
      return NextResponse.json(result);
    }

    // Build filters
    const filters: ResourceFilters = {};

    const resourceType = searchParams.get("resource_type");
    if (resourceType) {
      filters.resource_type = resourceType as ResourceFilters["resource_type"];
    }

    const category = searchParams.get("category");
    if (category) {
      filters.category = category;
    }

    const allianceId = searchParams.get("alliance_id");
    if (allianceId) {
      filters.alliance_id = parseInt(allianceId);
    }

    const createdBy = searchParams.get("created_by");
    if (createdBy) {
      filters.created_by = parseInt(createdBy);
    }

    const isFeatured = searchParams.get("is_featured");
    if (isFeatured !== null) {
      filters.is_featured = isFeatured === "true";
    }

    const search = searchParams.get("search");
    if (search) {
      filters.search = search;
    }

    const tags = searchParams.get("tags");
    if (tags) {
      filters.tags = tags.split(",").map(tag => tag.trim());
    }

    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const resources = await getCommunityResources(filters, limit, offset);
    return NextResponse.json(resources);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch resources") },
      { status: 500 }
    );
  }
}

// POST /api/resources - Create a new resource
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const input: CreateResourceInput = body;

    // Validate required fields
    if (!input.name || !input.resource_type || !input.category) {
      return NextResponse.json(
        { error: "Missing required fields: name, resource_type, category" },
        { status: 400 }
      );
    }

    // Validate that either external_url or file_path is provided
    if (!input.external_url && !input.file_path) {
      return NextResponse.json(
        { error: "Either external_url or file_path must be provided" },
        { status: 400 }
      );
    }

    const resourceId = await createCommunityResource(input, session.userId);

    return NextResponse.json({ id: resourceId, success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Create resource") },
      { status: 500 }
    );
  }
}
