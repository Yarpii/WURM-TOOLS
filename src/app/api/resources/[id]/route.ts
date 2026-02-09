import { NextRequest, NextResponse } from "next/server";
import { getSessionAsync as getSession, isAdminAsync as isAdmin } from "@/lib/auth";
import {
  getCommunityResourceById,
  updateCommunityResource,
  deleteCommunityResource,
  incrementResourceViewCount,
  incrementResourceDownloadCount,
  getResourceVersions,
  getResourceRatings,
  addOrUpdateResourceRating,
  deleteResourceRating,
  getResourceComments,
  addResourceComment,
  deleteResourceComment,
  addResourceVersion
} from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import type { UpdateResourceInput, CreateResourceRatingInput, CreateResourceVersionInput } from "@/lib/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/resources/[id] - Get a single resource
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const resourceId = parseInt(id);

    if (isNaN(resourceId)) {
      return NextResponse.json({ error: "Invalid resource ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Sub-actions
    if (action === "versions") {
      const versions = await getResourceVersions(resourceId);
      return NextResponse.json(versions);
    }

    if (action === "ratings") {
      const ratings = await getResourceRatings(resourceId);
      return NextResponse.json(ratings);
    }

    if (action === "comments") {
      const comments = await getResourceComments(resourceId);
      return NextResponse.json(comments);
    }

    // Default: get resource details
    const resource = await getCommunityResourceById(resourceId);

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Increment view count (async, don't await)
    incrementResourceViewCount(resourceId).catch(() => {
      // Silently fail if view count increment fails
    });

    return NextResponse.json(resource);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch resource") },
      { status: 500 }
    );
  }
}

// POST /api/resources/[id] - Perform actions on a resource
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await context.params;
    const resourceId = parseInt(id);

    if (isNaN(resourceId)) {
      return NextResponse.json({ error: "Invalid resource ID" }, { status: 400 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "download": {
        // Increment download count
        await incrementResourceDownloadCount(resourceId);
        return NextResponse.json({ success: true });
      }

      case "rate": {
        // SECURITY: Sanitize review text
        const sanitizedReview = body.review
          ? body.review.trim().replace(/<[^>]*>/g, "").substring(0, 2000)
          : undefined;

        const input: CreateResourceRatingInput = {
          resource_id: resourceId,
          rating: body.rating,
          review: sanitizedReview
        };

        if (!input.rating || input.rating < 1 || input.rating > 5) {
          return NextResponse.json(
            { error: "Rating must be between 1 and 5" },
            { status: 400 }
          );
        }

        await addOrUpdateResourceRating(input, session.userId);
        return NextResponse.json({ success: true });
      }

      case "unrate": {
        const deleted = await deleteResourceRating(resourceId, session.userId);
        if (!deleted) {
          return NextResponse.json({ error: "Rating not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }

      case "comment": {
        if (!body.comment || body.comment.trim().length === 0) {
          return NextResponse.json(
            { error: "Comment cannot be empty" },
            { status: 400 }
          );
        }

        // SECURITY: Validate length and strip HTML tags to prevent stored XSS
        const sanitizedComment = body.comment.trim().replace(/<[^>]*>/g, "");
        if (sanitizedComment.length > 2000) {
          return NextResponse.json(
            { error: "Comment must be under 2000 characters" },
            { status: 400 }
          );
        }

        const commentId = await addResourceComment(resourceId, session.userId, sanitizedComment);
        return NextResponse.json({ id: commentId, success: true });
      }

      case "delete_comment": {
        const admin = await isAdmin();
        const deleted = await deleteResourceComment(body.comment_id, session.userId, admin);
        if (!deleted) {
          return NextResponse.json(
            { error: "Comment not found or not authorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case "add_version": {
        const resource = await getCommunityResourceById(resourceId);
        if (!resource) {
          return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

        const admin = await isAdmin();
        if (resource.created_by !== session.userId && !admin) {
          return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        const input: CreateResourceVersionInput = {
          resource_id: resourceId,
          version: body.version,
          file_path: body.file_path,
          file_size: body.file_size,
          changelog: body.changelog
        };

        if (!input.version || !input.file_path) {
          return NextResponse.json(
            { error: "Missing required fields: version, file_path" },
            { status: 400 }
          );
        }

        const versionId = await addResourceVersion(input, session.userId);
        return NextResponse.json({ id: versionId, success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Process resource action") },
      { status: 500 }
    );
  }
}

// PUT /api/resources/[id] - Update a resource
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await context.params;
    const resourceId = parseInt(id);

    if (isNaN(resourceId)) {
      return NextResponse.json({ error: "Invalid resource ID" }, { status: 400 });
    }

    const body = await request.json();
    const input: UpdateResourceInput = body;

    const admin = await isAdmin();
    const success = await updateCommunityResource(resourceId, session.userId, input, admin);

    if (!success) {
      return NextResponse.json(
        { error: "Resource not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Update resource") },
      { status: 500 }
    );
  }
}

// DELETE /api/resources/[id] - Delete a resource
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await context.params;
    const resourceId = parseInt(id);

    if (isNaN(resourceId)) {
      return NextResponse.json({ error: "Invalid resource ID" }, { status: 400 });
    }

    const admin = await isAdmin();
    const success = await deleteCommunityResource(resourceId, session.userId, admin);

    if (!success) {
      return NextResponse.json(
        { error: "Resource not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Delete resource") },
      { status: 500 }
    );
  }
}
