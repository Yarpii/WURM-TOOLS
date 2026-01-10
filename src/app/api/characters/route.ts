import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getUserCharacters,
  getUserCharactersWithStats,
  createCharacter,
  getCharacterCount,
} from "@/lib/database";
import { sanitizeError, validateStringFields, INPUT_LIMITS } from "@/lib/security";
import { WURM_SERVERS, WURM_RELIGIONS, PLAYSTYLES } from "@/lib/constants";
import type { CreateCharacterInput } from "@/lib/types";

const MAX_CHARACTERS = 5;

// GET /api/characters - Get user's characters
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const withStats = searchParams.get("stats") === "true";

    if (withStats) {
      const characters = await getUserCharactersWithStats(result.user.id);
      return NextResponse.json({
        characters,
        count: characters.length,
        maxCharacters: MAX_CHARACTERS,
      });
    }

    const characters = await getUserCharacters(result.user.id);
    return NextResponse.json({
      characters,
      count: characters.length,
      maxCharacters: MAX_CHARACTERS,
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch characters") },
      { status: 500 }
    );
  }
}

// POST /api/characters - Create a new character
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

    // Check character limit
    const count = await getCharacterCount(result.user.id);
    if (count >= MAX_CHARACTERS) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_CHARACTERS} characters allowed` },
        { status: 400 }
      );
    }

    const body = await request.json();
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
      { value: name, name: "Character name", limits: INPUT_LIMITS.name, required: true },
      { value: server, name: "Server", limits: INPUT_LIMITS.server },
      { value: avatar_url, name: "Avatar URL", limits: INPUT_LIMITS.avatarUrl },
      { value: bio, name: "Bio", limits: INPUT_LIMITS.bio },
      { value: deed_name, name: "Deed name", limits: INPUT_LIMITS.name },
    ]);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Validate religion if provided
    if (religion && !WURM_RELIGIONS.includes(religion)) {
      return NextResponse.json(
        { error: "Invalid religion. Must be one of: " + WURM_RELIGIONS.join(", ") },
        { status: 400 }
      );
    }

    // Validate playstyle if provided
    if (playstyle && !PLAYSTYLES.includes(playstyle)) {
      return NextResponse.json(
        { error: "Invalid playstyle. Must be one of: " + PLAYSTYLES.join(", ") },
        { status: 400 }
      );
    }

    // Validate server if provided
    if (server && !WURM_SERVERS.includes(server)) {
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

    const input: CreateCharacterInput = {
      name: name.trim(),
      server: server?.trim() || undefined,
      religion: religion || undefined,
      avatar_url: avatar_url?.trim() || undefined,
      premium_until: premium_until || undefined,
      is_primary: is_primary || false,
      bio: bio?.trim() || undefined,
      deed_name: deed_name?.trim() || undefined,
      playstyle: playstyle || undefined,
    };

    const characterId = await createCharacter(result.user.id, input);

    if (!characterId) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_CHARACTERS} characters allowed` },
        { status: 400 }
      );
    }

    return NextResponse.json({ id: characterId, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Create character") },
      { status: 500 }
    );
  }
}
