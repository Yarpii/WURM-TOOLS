import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getArchaeologyPinpoints,
  getArchaeologyPinpointById,
  createArchaeologyPinpoint,
  updateArchaeologyPinpoint,
  deleteArchaeologyPinpoint,
  verifyArchaeologyPinpoint,
  voteOnArchaeologyPinpoint,
  getArchaeologyComments,
  addArchaeologyComment,
  deleteArchaeologyComment,
  getArchaeologyStats,
} from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import type {
  ArchaeologySiteType,
  CreateArchaeologyPinpointInput,
  UpdateArchaeologyPinpointInput,
} from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const server = searchParams.get("server");
    const siteType = searchParams.get("site_type") as ArchaeologySiteType | null;
    const pinpointId = searchParams.get("id");
    const commentsFor = searchParams.get("comments_for");
    const getStats = searchParams.get("stats");
    const search = searchParams.get("search");
    const myPinpoints = searchParams.get("my_pinpoints");

    // Get session (optional for public pinpoints)
    const sessionId = request.cookies.get("session")?.value;
    const session = sessionId ? await getSession(sessionId) : null;
    const userId = session?.user?.id;

    // Get stats
    if (getStats === "true") {
      const stats = await getArchaeologyStats();
      return NextResponse.json(stats);
    }

    // Get comments for a pinpoint
    if (commentsFor) {
      const comments = await getArchaeologyComments(parseInt(commentsFor));
      return NextResponse.json(comments);
    }

    // Get specific pinpoint
    if (pinpointId) {
      const pinpoint = await getArchaeologyPinpointById(parseInt(pinpointId), userId);
      if (!pinpoint) {
        return NextResponse.json(
          { error: "Pinpoint not found" },
          { status: 404 }
        );
      }
      // Check access
      if (!pinpoint.is_public && pinpoint.user_id !== userId) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
      return NextResponse.json(pinpoint);
    }

    // Get all pinpoints with filters
    const filters: {
      server?: string;
      site_type?: ArchaeologySiteType;
      search?: string;
      user_id?: number;
    } = {};

    if (server) filters.server = server;
    if (siteType) filters.site_type = siteType;
    if (search) filters.search = search;
    if (myPinpoints === "true" && userId) filters.user_id = userId;

    const pinpoints = await getArchaeologyPinpoints(userId, filters);
    return NextResponse.json(pinpoints);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch archaeology pinpoints") },
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
    const { action, pinpoint_id, comment_id, ...data } = body;

    switch (action) {
      case "create": {
        const { name, description, server, x, y, site_type, deed_name, former_owner, estimated_age, findings, notable_items, is_public } = data;

        if (!name || !server || x === undefined || y === undefined) {
          return NextResponse.json(
            { error: "Missing required fields: name, server, x, y" },
            { status: 400 }
          );
        }

        const input: CreateArchaeologyPinpointInput = {
          name: name.trim(),
          description: description?.trim() || undefined,
          server,
          x,
          y,
          site_type: site_type || "unknown",
          deed_name: deed_name?.trim() || undefined,
          former_owner: former_owner?.trim() || undefined,
          estimated_age: estimated_age?.trim() || undefined,
          findings: findings?.trim() || undefined,
          notable_items: notable_items?.trim() || undefined,
          is_public: is_public === true, // Default to private
        };

        const id = await createArchaeologyPinpoint(result.user.id, input);
        return NextResponse.json({ id, success: true });
      }

      case "update": {
        if (!pinpoint_id) {
          return NextResponse.json(
            { error: "Pinpoint ID is required" },
            { status: 400 }
          );
        }

        const updateInput: UpdateArchaeologyPinpointInput = {};
        if (data.name !== undefined) updateInput.name = data.name.trim();
        if (data.description !== undefined) updateInput.description = data.description?.trim();
        if (data.server !== undefined) updateInput.server = data.server;
        if (data.x !== undefined) updateInput.x = data.x;
        if (data.y !== undefined) updateInput.y = data.y;
        if (data.site_type !== undefined) updateInput.site_type = data.site_type;
        if (data.deed_name !== undefined) updateInput.deed_name = data.deed_name?.trim();
        if (data.former_owner !== undefined) updateInput.former_owner = data.former_owner?.trim();
        if (data.estimated_age !== undefined) updateInput.estimated_age = data.estimated_age?.trim();
        if (data.findings !== undefined) updateInput.findings = data.findings?.trim();
        if (data.notable_items !== undefined) updateInput.notable_items = data.notable_items?.trim();
        if (data.is_public !== undefined) updateInput.is_public = data.is_public;

        const updated = await updateArchaeologyPinpoint(
          pinpoint_id,
          result.user.id,
          updateInput,
          result.user.role === "admin"
        );
        return NextResponse.json({ success: updated });
      }

      case "delete": {
        if (!pinpoint_id) {
          return NextResponse.json(
            { error: "Pinpoint ID is required" },
            { status: 400 }
          );
        }

        const deleted = await deleteArchaeologyPinpoint(
          pinpoint_id,
          result.user.id,
          result.user.role === "admin"
        );
        return NextResponse.json({ success: deleted });
      }

      case "verify": {
        if (result.user.role !== "admin") {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 }
          );
        }

        if (!pinpoint_id) {
          return NextResponse.json(
            { error: "Pinpoint ID is required" },
            { status: 400 }
          );
        }

        const verified = await verifyArchaeologyPinpoint(pinpoint_id, result.user.id);
        return NextResponse.json({ success: verified });
      }

      case "vote": {
        if (!pinpoint_id) {
          return NextResponse.json(
            { error: "Pinpoint ID is required" },
            { status: 400 }
          );
        }

        const voteType = data.vote_type as "up" | "down";
        if (!voteType || !["up", "down"].includes(voteType)) {
          return NextResponse.json(
            { error: "Invalid vote type" },
            { status: 400 }
          );
        }

        const voted = await voteOnArchaeologyPinpoint(pinpoint_id, result.user.id, voteType);
        return NextResponse.json({ success: voted });
      }

      case "add-comment": {
        if (!pinpoint_id) {
          return NextResponse.json(
            { error: "Pinpoint ID is required" },
            { status: 400 }
          );
        }

        const comment = data.comment?.trim();
        if (!comment) {
          return NextResponse.json(
            { error: "Comment is required" },
            { status: 400 }
          );
        }

        const commentId = await addArchaeologyComment(result.user.id, {
          pinpoint_id,
          comment,
        });
        return NextResponse.json({ id: commentId, success: commentId > 0 });
      }

      case "delete-comment": {
        if (!comment_id) {
          return NextResponse.json(
            { error: "Comment ID is required" },
            { status: 400 }
          );
        }

        const deleted = await deleteArchaeologyComment(
          comment_id,
          result.user.id,
          result.user.role === "admin"
        );
        return NextResponse.json({ success: deleted });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Process archaeology request") },
      { status: 500 }
    );
  }
}
