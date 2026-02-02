import { query } from "./core";
import type {
  Character,
  CharacterWithStats,
  CreateCharacterInput,
  UpdateCharacterInput,
} from "../types";

// ========== CHARACTER SHOWCASE FUNCTIONS ==========

const MAX_CHARACTERS_PER_USER = 5;

export async function getUserCharacters(userId: number): Promise<Character[]> {
  const result = await query<Character>(
    "SELECT * FROM characters WHERE user_id = ? ORDER BY is_primary DESC, name ASC",
    [userId]
  );
  return result.rows;
}

export async function getUserCharactersWithStats(userId: number): Promise<CharacterWithStats[]> {
  const result = await query<CharacterWithStats>(`
    SELECT
      c.*,
      (SELECT COUNT(*) FROM orders WHERE character_id = c.id) as orders_count,
      (SELECT COUNT(*) FROM merchants WHERE character_id = c.id) as merchants_count,
      (SELECT COUNT(*) FROM projects WHERE character_id = c.id) as projects_count,
      (SELECT COUNT(*) FROM user_skills WHERE character_id = c.id) as skills_count
    FROM characters c
    WHERE c.user_id = ?
    ORDER BY c.is_primary DESC, c.name ASC
  `, [userId]);
  return result.rows;
}

export async function getCharacterById(characterId: number): Promise<Character | null> {
  const result = await query<Character>(
    "SELECT * FROM characters WHERE id = ?",
    [characterId]
  );
  return result.rows[0] || null;
}

export async function getCharacterWithStats(characterId: number): Promise<CharacterWithStats | null> {
  const result = await query<CharacterWithStats>(`
    SELECT
      c.*,
      (SELECT COUNT(*) FROM orders WHERE character_id = c.id) as orders_count,
      (SELECT COUNT(*) FROM merchants WHERE character_id = c.id) as merchants_count,
      (SELECT COUNT(*) FROM projects WHERE character_id = c.id) as projects_count,
      (SELECT COUNT(*) FROM user_skills WHERE character_id = c.id) as skills_count
    FROM characters c
    WHERE c.id = ?
  `, [characterId]);
  return result.rows[0] || null;
}

export async function createCharacter(
  userId: number,
  input: CreateCharacterInput
): Promise<number | null> {
  // Check character limit
  const countResult = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM characters WHERE user_id = ?",
    [userId]
  );
  if (countResult.rows[0].count >= MAX_CHARACTERS_PER_USER) {
    return null; // Limit reached
  }

  // If this is the first character or marked as primary, handle primary flag
  const isFirst = countResult.rows[0].count === 0;
  const isPrimary = isFirst || input.is_primary;

  // If setting as primary, unset other primary characters
  if (isPrimary && !isFirst) {
    await query(
      "UPDATE characters SET is_primary = FALSE WHERE user_id = ?",
      [userId]
    );
  }

  const result = await query(
    `INSERT INTO characters (user_id, name, server, religion, avatar_url, premium_until, is_primary, bio, deed_name, playstyle)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.name,
      input.server || null,
      input.religion || null,
      input.avatar_url || null,
      input.premium_until || null,
      isPrimary,
      input.bio || null,
      input.deed_name || null,
      input.playstyle || null,
    ]
  );

  // Get the inserted ID
  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || null;
}

export async function updateCharacter(
  characterId: number,
  userId: number,
  input: UpdateCharacterInput,
  isAdmin: boolean = false
): Promise<boolean> {
  // Verify ownership
  const character = await getCharacterById(characterId);
  if (!character) return false;
  if (character.user_id !== userId && !isAdmin) return false;

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    values.push(input.name);
  }
  if (input.server !== undefined) {
    updates.push("server = ?");
    values.push(input.server || null);
  }
  if (input.religion !== undefined) {
    updates.push("religion = ?");
    values.push(input.religion || null);
  }
  if (input.avatar_url !== undefined) {
    updates.push("avatar_url = ?");
    values.push(input.avatar_url || null);
  }
  if (input.premium_until !== undefined) {
    updates.push("premium_until = ?");
    values.push(input.premium_until || null);
  }
  if (input.bio !== undefined) {
    updates.push("bio = ?");
    values.push(input.bio || null);
  }
  if (input.deed_name !== undefined) {
    updates.push("deed_name = ?");
    values.push(input.deed_name || null);
  }
  if (input.playstyle !== undefined) {
    updates.push("playstyle = ?");
    values.push(input.playstyle || null);
  }

  // Handle primary flag
  if (input.is_primary === true) {
    // Unset other primary characters first
    await query(
      "UPDATE characters SET is_primary = FALSE WHERE user_id = ?",
      [character.user_id]
    );
    updates.push("is_primary = TRUE");
  }

  if (updates.length === 0) return true;

  values.push(characterId);
  const result = await query(
    `UPDATE characters SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  return result.rowCount > 0;
}

export async function deleteCharacter(
  characterId: number,
  userId: number,
  isAdmin: boolean = false
): Promise<boolean> {
  const character = await getCharacterById(characterId);
  if (!character) return false;
  if (character.user_id !== userId && !isAdmin) return false;

  const wasPrimary = character.is_primary;
  const result = await query(
    "DELETE FROM characters WHERE id = ?",
    [characterId]
  );

  // If deleted character was primary, make another one primary
  if (wasPrimary && result.rowCount > 0) {
    await query(
      `UPDATE characters SET is_primary = TRUE
       WHERE user_id = ?
       ORDER BY created_at ASC
       LIMIT 1`,
      [character.user_id]
    );
  }

  return result.rowCount > 0;
}

export async function setPrimaryCharacter(
  characterId: number,
  userId: number
): Promise<boolean> {
  const character = await getCharacterById(characterId);
  if (!character || character.user_id !== userId) return false;

  // Unset all primary flags for this user
  await query(
    "UPDATE characters SET is_primary = FALSE WHERE user_id = ?",
    [userId]
  );

  // Set the new primary
  const result = await query(
    "UPDATE characters SET is_primary = TRUE WHERE id = ?",
    [characterId]
  );

  return result.rowCount > 0;
}

export async function getCharacterCount(userId: number): Promise<number> {
  const result = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM characters WHERE user_id = ?",
    [userId]
  );
  return result.rows[0]?.count || 0;
}

export async function getPrimaryCharacter(userId: number): Promise<Character | null> {
  const result = await query<Character>(
    "SELECT * FROM characters WHERE user_id = ? AND is_primary = TRUE",
    [userId]
  );
  return result.rows[0] || null;
}
