import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getCharacterById,
  getCharacterWithStats,
  updateCharacter,
  deleteCharacter,
  setPrimaryCharacter,
  query,
} from "@/lib/database";
import { sanitizeError, validateStringFields, INPUT_LIMITS } from "@/lib/security";
import { WURM_SERVERS, WURM_RELIGIONS, PLAYSTYLES } from "@/lib/constants";
import type { UpdateCharacterInput } from "@/lib/types";

// GET /api/characters/[id] - Get a specific character (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const characterId = parseInt(id);
    if (isNaN(characterId)) {
      return NextResponse.json(
        { error: "Invalid character ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const withStats = searchParams.get("stats") === "true";
    const fullProfile = searchParams.get("full") === "true";

    // Get character with username
    const characterResult = await query(
      `SELECT c.*, u.username
       FROM characters c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = $1`,
      [characterId]
    );

    if (characterResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }

    const character = characterResult.rows[0];

    // If full profile requested, also get skills, orders, and hunts
    if (fullProfile) {
      // Get skills for this user
      const skillsResult = await query(
        `SELECT id, skill_name, current_level, target_level, notes, updated_at
         FROM user_skills
         WHERE user_id = $1
         ORDER BY current_level DESC`,
        [character.user_id]
      );

      // Get orders for this user
      const ordersResult = await query(
        `SELECT id, order_type, item_name, quantity, price, currency, status, created_at
         FROM market_orders
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [character.user_id]
      );

      // Get treasure hunts for this user
      const huntsResult = await query(
        `SELECT id, name, server, difficulty, status, created_at
         FROM treasure_hunts
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [character.user_id]
      );

      return NextResponse.json({
        character,
        skills: skillsResult.rows,
        orders: ordersResult.rows,
        hunts: huntsResult.rows,
      });
    }

    // Simple response
    if (withStats) {
      const characterWithStats = await getCharacterWithStats(characterId);
      return NextResponse.json({ character: characterWithStats });
    }

    return NextResponse.json({ character });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch character") },
      { status: 500 }
    );
  }
}

// PUT /api/characters/[id] - Update a character
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const characterId = parseInt(id);
    if (isNaN(characterId)) {
      return NextResponse.json(
        { error: "Invalid character ID" },
        { status: 400 }
      );
    }

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

    // Handle set_primary action
    if (body.action === "set_primary") {
      const success = await setPrimaryCharacter(characterId, result.user.id);
      if (!success) {
        return NextResponse.json(
          { error: "Failed to set primary character" },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true });
    }

    const {
      name,
      server,
      religion,
      avatar_url,
      premium_until,
      is_primary,
      bio,
      deed_name,
      playstyle,
    } = body;

    // Validate string field lengths
    const validationError = validateStringFields([
      { value: name, name: "Character name", limits: INPUT_LIMITS.name },
      { value: server, name: "Server", limits: INPUT_LIMITS.server },
      { value: avatar_url, name: "Avatar URL", limits: INPUT_LIMITS.avatarUrl },
      { value: bio, name: "Bio", limits: INPUT_LIMITS.bio },
      { value: deed_name, name: "Deed name", limits: INPUT_LIMITS.name },
    ]);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Validate religion if provided
    if (religion !== undefined && religion !== null && religion !== "" && !WURM_RELIGIONS.includes(religion)) {
      return NextResponse.json(
        { error: "Invalid religion. Must be one of: " + WURM_RELIGIONS.join(", ") },
        { status: 400 }
      );
    }

    // Validate playstyle if provided
    if (playstyle !== undefined && playstyle !== null && playstyle !== "" && !PLAYSTYLES.includes(playstyle)) {
      return NextResponse.json(
        { error: "Invalid playstyle. Must be one of: " + PLAYSTYLES.join(", ") },
        { status: 400 }
      );
    }

    // Validate server if provided
    if (server !== undefined && server !== null && server !== "" && !WURM_SERVERS.includes(server)) {
      return NextResponse.json(
        { error: "Invalid server. Must be one of: " + WURM_SERVERS.join(", ") },
        { status: 400 }
      );
    }

    // Validate premium_until date if provided
    if (premium_until) {
      const date = new Date(premium_until);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid premium_until date" },
          { status: 400 }
        );
      }
    }

    const input: UpdateCharacterInput = {};
    if (name !== undefined) {
      const trimmedName = name?.trim();
      if (trimmedName === "") {
        return NextResponse.json(
          { error: "Character name cannot be empty" },
          { status: 400 }
        );
      }
      input.name = trimmedName;
    }
    if (server !== undefined) input.server = server?.trim() || undefined;
    if (religion !== undefined) input.religion = religion || undefined;
    if (avatar_url !== undefined) input.avatar_url = avatar_url?.trim() || undefined;
    if (premium_until !== undefined) input.premium_until = premium_until || undefined;
    if (is_primary !== undefined) input.is_primary = is_primary;
    if (bio !== undefined) input.bio = bio?.trim() || undefined;
    if (deed_name !== undefined) input.deed_name = deed_name?.trim() || undefined;
    if (playstyle !== undefined) input.playstyle = playstyle || undefined;

    const isAdmin = result.user.role === "admin";
    const success = await updateCharacter(characterId, result.user.id, input, isAdmin);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update character or access denied" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Update character") },
      { status: 500 }
    );
  }
}

// DELETE /api/characters/[id] - Delete a character
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const characterId = parseInt(id);
    if (isNaN(characterId)) {
      return NextResponse.json(
        { error: "Invalid character ID" },
        { status: 400 }
      );
    }

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

    const isAdmin = result.user.role === "admin";
    const success = await deleteCharacter(characterId, result.user.id, isAdmin);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete character or access denied" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Delete character") },
      { status: 500 }
    );
  }
}
