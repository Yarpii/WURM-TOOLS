import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getUserTreasureHunts,
  getTreasureHuntById,
  getChildHunts,
  createTreasureHunt,
  updateTreasureHunt,
  deleteTreasureHunt,
  getTreasureLoot,
  addTreasureLoot,
  deleteTreasureLoot,
  getTreasureStats,
  getSharedTreasures,
  getSharedTreasureById,
  createSharedTreasure,
  updateSharedTreasure,
  deleteSharedTreasure,
  voteSharedTreasure,
  verifySharedTreasure,
  shareTreasureHuntWithUser,
  unshareTreasureHunt,
  getTreasureHuntShares,
  getHuntsSharedWithMe,
  searchUsersForSharing,
} from "@/lib/database";
import { sanitizeError, validateStringLength, INPUT_LIMITS } from "@/lib/security";
import type {
  CreateTreasureHuntInput,
  UpdateTreasureHuntInput,
  AddTreasureLootInput,
  CreateSharedTreasureInput,
  UpdateSharedTreasureInput,
  TreasureHuntStatus,
  SharedTreasureStatus,
} from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const huntId = searchParams.get("id");
    const sharedId = searchParams.get("shared_id");

    // Public endpoints - shared treasures
    if (action === "shared" || sharedId) {
      const result = sessionId ? await getSession(sessionId) : null;
      const userId = result?.user?.id;

      if (sharedId) {
        const parsedSharedId = parseInt(sharedId);
        if (isNaN(parsedSharedId)) {
          return NextResponse.json({ error: "Invalid shared ID" }, { status: 400 });
        }
        const treasure = await getSharedTreasureById(parsedSharedId, userId);
        if (!treasure) {
          return NextResponse.json({ error: "Treasure not found" }, { status: 404 });
        }
        return NextResponse.json(treasure);
      }

      const filters = {
        server: searchParams.get("server") || undefined,
        treasure_type: searchParams.get("type") || undefined,
        status: (searchParams.get("status") as SharedTreasureStatus) || undefined,
        verified_only: searchParams.get("verified") === "true",
      };

      const treasures = await getSharedTreasures(filters, userId);
      return NextResponse.json(treasures);
    }

    // Protected endpoints - require authentication
    if (!sessionId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const result = await getSession(sessionId);
    if (!result) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = result.user.id;

    // Get single treasure hunt
    if (huntId) {
      const parsedHuntId = parseInt(huntId);
      if (isNaN(parsedHuntId)) {
        return NextResponse.json({ error: "Invalid hunt ID" }, { status: 400 });
      }
      const hunt = await getTreasureHuntById(parsedHuntId);
      if (!hunt) {
        return NextResponse.json({ error: "Treasure hunt not found" }, { status: 404 });
      }

      // Check access
      if (hunt.user_id !== userId && !hunt.is_public) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      // Get loot if requested
      if (action === "loot") {
        const loot = await getTreasureLoot(parsedHuntId);
        return NextResponse.json(loot);
      }

      // Get child hunts (chained maps) if requested
      if (action === "children") {
        const children = await getChildHunts(parsedHuntId);
        return NextResponse.json(children);
      }

      // Get shares for this hunt (only owner can see)
      if (action === "shares") {
        if (hunt.user_id !== userId) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        const shares = await getTreasureHuntShares(parsedHuntId, userId);
        return NextResponse.json(shares);
      }

      // Include child hunts in the response
      const childHunts = await getChildHunts(parsedHuntId);
      return NextResponse.json({ ...hunt, child_hunts: childHunts });
    }

    // Get stats
    if (action === "stats") {
      const stats = await getTreasureStats(userId);
      return NextResponse.json(stats);
    }

    // Get hunts shared with me
    if (action === "shared-with-me") {
      const sharedHunts = await getHuntsSharedWithMe(userId);
      return NextResponse.json(sharedHunts);
    }

    // Search users to share with
    if (action === "search-users") {
      const searchTerm = searchParams.get("q");
      if (!searchTerm || searchTerm.length < 2) {
        return NextResponse.json([]);
      }
      const users = await searchUsersForSharing(searchTerm, userId);
      return NextResponse.json(users);
    }

    // Get user's treasure hunts with filters
    const filters = {
      status: (searchParams.get("status") as TreasureHuntStatus) || undefined,
      server: searchParams.get("server") || undefined,
      difficulty: searchParams.get("difficulty") || undefined,
    };

    const hunts = await getUserTreasureHunts(userId, filters);
    return NextResponse.json(hunts);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch treasures") },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const result = await getSession(sessionId);
    if (!result) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = result.user.id;
    const isAdmin = result.user.role === "admin";
    const body = await request.json();
    const { action } = body;

    // ========== PERSONAL TREASURE HUNTS ==========

    if (action === "create") {
      const { name, description, server, map_quality, difficulty, character_id, is_public, alliance_id, parent_hunt_id, screenshot_url } = body;

      const nameError = validateStringLength(name, "Name", INPUT_LIMITS.name, true);
      if (nameError) return NextResponse.json({ error: nameError }, { status: 400 });

      if (description) {
        const descError = validateStringLength(description, "Description", INPUT_LIMITS.description, false);
        if (descError) return NextResponse.json({ error: descError }, { status: 400 });
      }

      if (!server) {
        return NextResponse.json({ error: "Server is required" }, { status: 400 });
      }

      // Validate parent hunt exists and belongs to user
      if (parent_hunt_id) {
        const parsedParentHuntId = parseInt(parent_hunt_id);
        if (isNaN(parsedParentHuntId)) {
          return NextResponse.json({ error: "Invalid parent hunt ID" }, { status: 400 });
        }
        const parentHunt = await getTreasureHuntById(parsedParentHuntId);
        if (!parentHunt || parentHunt.user_id !== userId) {
          return NextResponse.json({ error: "Invalid parent hunt" }, { status: 400 });
        }
      }

      const input: CreateTreasureHuntInput = {
        name,
        description,
        server,
        map_quality: map_quality ? parseInt(map_quality) : undefined,
        difficulty: difficulty || "easy",
        character_id: character_id ? parseInt(character_id) : undefined,
        is_public: is_public || false,
        alliance_id: alliance_id ? parseInt(alliance_id) : undefined,
        parent_hunt_id: parent_hunt_id ? parseInt(parent_hunt_id) : undefined,
        screenshot_url: screenshot_url || undefined,
      };

      const huntId = await createTreasureHunt(userId, input);
      return NextResponse.json({ success: true, id: huntId });
    }

    if (action === "update") {
      const { hunt_id, ...updateData } = body;
      if (!hunt_id) {
        return NextResponse.json({ error: "Hunt ID required" }, { status: 400 });
      }
      const parsedHuntId = parseInt(hunt_id);
      if (isNaN(parsedHuntId)) {
        return NextResponse.json({ error: "Invalid hunt ID" }, { status: 400 });
      }

      if (updateData.name) {
        const nameError = validateStringLength(updateData.name, "Name", INPUT_LIMITS.name, true);
        if (nameError) return NextResponse.json({ error: nameError }, { status: 400 });
      }

      const input: UpdateTreasureHuntInput = {};
      if (updateData.name !== undefined) input.name = updateData.name;
      if (updateData.description !== undefined) input.description = updateData.description;
      if (updateData.server !== undefined) input.server = updateData.server;
      if (updateData.map_quality !== undefined) input.map_quality = parseInt(updateData.map_quality);
      if (updateData.difficulty !== undefined) input.difficulty = updateData.difficulty;
      if (updateData.x !== undefined) input.x = parseInt(updateData.x);
      if (updateData.y !== undefined) input.y = parseInt(updateData.y);
      if (updateData.status !== undefined) input.status = updateData.status;
      if (updateData.chest_type !== undefined) input.chest_type = updateData.chest_type;
      if (updateData.requires_key !== undefined) input.requires_key = updateData.requires_key;
      if (updateData.is_public !== undefined) input.is_public = updateData.is_public;
      if (updateData.parent_hunt_id !== undefined) input.parent_hunt_id = updateData.parent_hunt_id ? parseInt(updateData.parent_hunt_id) : undefined;
      if (updateData.screenshot_url !== undefined) input.screenshot_url = updateData.screenshot_url;

      const success = await updateTreasureHunt(parsedHuntId, userId, input, isAdmin);
      if (!success) {
        return NextResponse.json({ error: "Update failed or access denied" }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { hunt_id } = body;
      if (!hunt_id) {
        return NextResponse.json({ error: "Hunt ID required" }, { status: 400 });
      }
      const parsedHuntId = parseInt(hunt_id);
      if (isNaN(parsedHuntId)) {
        return NextResponse.json({ error: "Invalid hunt ID" }, { status: 400 });
      }

      const success = await deleteTreasureHunt(parsedHuntId, userId, isAdmin);
      if (!success) {
        return NextResponse.json({ error: "Delete failed or access denied" }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    // ========== TREASURE LOOT ==========

    if (action === "add-loot") {
      const { hunt_id, item_name, quantity, quality, rarity, notes } = body;
      if (!hunt_id || !item_name) {
        return NextResponse.json({ error: "Hunt ID and item name required" }, { status: 400 });
      }
      const parsedHuntId = parseInt(hunt_id);
      if (isNaN(parsedHuntId)) {
        return NextResponse.json({ error: "Invalid hunt ID" }, { status: 400 });
      }

      const input: AddTreasureLootInput = {
        item_name,
        quantity: quantity ? parseInt(quantity) : 1,
        quality: quality ? parseInt(quality) : undefined,
        rarity,
        notes,
      };

      const lootId = await addTreasureLoot(parsedHuntId, userId, input);
      if (!lootId) {
        return NextResponse.json({ error: "Failed to add loot" }, { status: 400 });
      }

      return NextResponse.json({ success: true, id: lootId });
    }

    if (action === "delete-loot") {
      const { loot_id } = body;
      if (!loot_id) {
        return NextResponse.json({ error: "Loot ID required" }, { status: 400 });
      }
      const parsedLootId = parseInt(loot_id);
      if (isNaN(parsedLootId)) {
        return NextResponse.json({ error: "Invalid loot ID" }, { status: 400 });
      }

      const success = await deleteTreasureLoot(parsedLootId, userId);
      if (!success) {
        return NextResponse.json({ error: "Delete failed or access denied" }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    // ========== SHARED TREASURES ==========

    if (action === "share") {
      const { name, description, server, x, y, treasure_type } = body;

      const nameError = validateStringLength(name, "Name", INPUT_LIMITS.name, true);
      if (nameError) return NextResponse.json({ error: nameError }, { status: 400 });

      if (!server || x === undefined || y === undefined || !treasure_type) {
        return NextResponse.json({ error: "Server, coordinates, and type are required" }, { status: 400 });
      }

      const input: CreateSharedTreasureInput = {
        name,
        description,
        server,
        x: parseInt(x),
        y: parseInt(y),
        treasure_type,
      };

      const treasureId = await createSharedTreasure(userId, input);
      return NextResponse.json({ success: true, id: treasureId });
    }

    if (action === "update-shared") {
      const { treasure_id, ...updateData } = body;
      if (!treasure_id) {
        return NextResponse.json({ error: "Treasure ID required" }, { status: 400 });
      }
      const parsedTreasureId = parseInt(treasure_id);
      if (isNaN(parsedTreasureId)) {
        return NextResponse.json({ error: "Invalid treasure ID" }, { status: 400 });
      }

      const input: UpdateSharedTreasureInput = {};
      if (updateData.name !== undefined) input.name = updateData.name;
      if (updateData.description !== undefined) input.description = updateData.description;
      if (updateData.x !== undefined) input.x = parseInt(updateData.x);
      if (updateData.y !== undefined) input.y = parseInt(updateData.y);
      if (updateData.treasure_type !== undefined) input.treasure_type = updateData.treasure_type;
      if (updateData.status !== undefined && isAdmin) input.status = updateData.status;

      const success = await updateSharedTreasure(parsedTreasureId, userId, input, isAdmin);
      if (!success) {
        return NextResponse.json({ error: "Update failed or access denied" }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "delete-shared") {
      const { treasure_id } = body;
      if (!treasure_id) {
        return NextResponse.json({ error: "Treasure ID required" }, { status: 400 });
      }
      const parsedTreasureId = parseInt(treasure_id);
      if (isNaN(parsedTreasureId)) {
        return NextResponse.json({ error: "Invalid treasure ID" }, { status: 400 });
      }

      const success = await deleteSharedTreasure(parsedTreasureId, userId, isAdmin);
      if (!success) {
        return NextResponse.json({ error: "Delete failed or access denied" }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "vote") {
      const { treasure_id, vote_type } = body;
      if (!treasure_id || !vote_type) {
        return NextResponse.json({ error: "Treasure ID and vote type required" }, { status: 400 });
      }
      const parsedTreasureId = parseInt(treasure_id);
      if (isNaN(parsedTreasureId)) {
        return NextResponse.json({ error: "Invalid treasure ID" }, { status: 400 });
      }

      if (!["up", "down"].includes(vote_type)) {
        return NextResponse.json({ error: "Invalid vote type" }, { status: 400 });
      }

      await voteSharedTreasure(parsedTreasureId, userId, vote_type);
      return NextResponse.json({ success: true });
    }

    if (action === "verify" && isAdmin) {
      const { treasure_id, verified } = body;
      if (!treasure_id) {
        return NextResponse.json({ error: "Treasure ID required" }, { status: 400 });
      }
      const parsedTreasureId = parseInt(treasure_id);
      if (isNaN(parsedTreasureId)) {
        return NextResponse.json({ error: "Invalid treasure ID" }, { status: 400 });
      }

      const success = await verifySharedTreasure(parsedTreasureId, userId, verified !== false);
      if (!success) {
        return NextResponse.json({ error: "Verification failed" }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    // ========== PRIVATE SHARING WITH USERS ==========

    if (action === "share-with-user") {
      const { hunt_id, user_id: shareWithUserId, message, can_edit } = body;
      if (!hunt_id || !shareWithUserId) {
        return NextResponse.json({ error: "Hunt ID and user ID required" }, { status: 400 });
      }
      const parsedHuntId = parseInt(hunt_id);
      const parsedShareWithUserId = parseInt(shareWithUserId);
      if (isNaN(parsedHuntId) || isNaN(parsedShareWithUserId)) {
        return NextResponse.json({ error: "Invalid hunt ID or user ID" }, { status: 400 });
      }

      const shareId = await shareTreasureHuntWithUser(
        parsedHuntId,
        userId,
        parsedShareWithUserId,
        message,
        can_edit || false
      );

      if (!shareId) {
        return NextResponse.json({ error: "Share failed. Hunt not found, not owner, or already shared." }, { status: 400 });
      }

      return NextResponse.json({ success: true, id: shareId });
    }

    if (action === "unshare") {
      const { share_id } = body;
      if (!share_id) {
        return NextResponse.json({ error: "Share ID required" }, { status: 400 });
      }
      const parsedShareId = parseInt(share_id);
      if (isNaN(parsedShareId)) {
        return NextResponse.json({ error: "Invalid share ID" }, { status: 400 });
      }

      const success = await unshareTreasureHunt(parsedShareId, userId);
      if (!success) {
        return NextResponse.json({ error: "Unshare failed or access denied" }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Treasure operation") },
      { status: 500 }
    );
  }
}
