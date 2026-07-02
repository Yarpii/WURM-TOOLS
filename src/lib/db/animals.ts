import { query } from "./core";
import type {
  Stable,
  Animal,
  AnimalTrait,
  AnimalFamilyNode,
  CreateStableInput,
  UpdateStableInput,
  CreateAnimalInput,
  UpdateAnimalInput,
  AddAnimalTraitInput,
} from "../types";

// ==================== ANIMAL BREEDING ====================

// --- Stables ---

export async function getUserStables(userId: number): Promise<Stable[]> {
  const result = await query<Stable>(
    `SELECT s.*,
      (SELECT COUNT(*) FROM animals a WHERE a.stable_id = s.id) as animal_count
    FROM stables s
    WHERE s.user_id = ?
    ORDER BY s.name ASC`,
    [userId]
  );
  return result.rows;
}

export async function getStableById(stableId: number): Promise<Stable | null> {
  const result = await query<Stable>(
    `SELECT s.*,
      (SELECT COUNT(*) FROM animals a WHERE a.stable_id = s.id) as animal_count
    FROM stables s
    WHERE s.id = ?`,
    [stableId]
  );
  return result.rows[0] || null;
}

export async function createStable(userId: number, input: CreateStableInput): Promise<number> {
  await query(
    `INSERT INTO stables (user_id, name, server, capacity, notes) VALUES (?, ?, ?, ?, ?)`,
    [userId, input.name, input.server, input.capacity || 4, input.notes || null]
  );
  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function updateStable(
  stableId: number,
  userId: number,
  input: UpdateStableInput
): Promise<boolean> {
  const stable = await getStableById(stableId);
  if (!stable || stable.user_id !== userId) return false;

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) { updates.push("name = ?"); values.push(input.name); }
  if (input.server !== undefined) { updates.push("server = ?"); values.push(input.server); }
  if (input.capacity !== undefined) { updates.push("capacity = ?"); values.push(input.capacity); }
  if (input.notes !== undefined) { updates.push("notes = ?"); values.push(input.notes); }

  if (updates.length === 0) return true;
  values.push(stableId);
  await query(`UPDATE stables SET ${updates.join(", ")} WHERE id = ?`, values);
  return true;
}

export async function deleteStable(stableId: number, userId: number): Promise<boolean> {
  const stable = await getStableById(stableId);
  if (!stable || stable.user_id !== userId) return false;
  // Unset stable_id on animals in this stable (don't delete them)
  await query(`UPDATE animals SET stable_id = NULL WHERE stable_id = ?`, [stableId]);
  await query(`DELETE FROM stables WHERE id = ?`, [stableId]);
  return true;
}

// --- Animals ---

export async function getUserAnimals(
  userId: number,
  filters?: { stable_id?: number; animal_type?: string; is_alive?: boolean }
): Promise<Animal[]> {
  let sql = `SELECT a.*,
    s.name as stable_name,
    m.name as mother_name,
    f.name as father_name
    FROM animals a
    LEFT JOIN stables s ON a.stable_id = s.id
    LEFT JOIN animals m ON a.mother_id = m.id
    LEFT JOIN animals f ON a.father_id = f.id
    WHERE a.user_id = ?`;
  const params: unknown[] = [userId];

  if (filters?.stable_id !== undefined) {
    sql += " AND a.stable_id = ?";
    params.push(filters.stable_id);
  }
  if (filters?.animal_type) {
    sql += " AND a.animal_type = ?";
    params.push(filters.animal_type);
  }
  if (filters?.is_alive !== undefined) {
    sql += " AND a.is_alive = ?";
    params.push(filters.is_alive ? 1 : 0);
  }

  sql += " ORDER BY a.name ASC";
  const result = await query<Animal>(sql, params);
  return result.rows;
}

export async function getAnimalById(animalId: number): Promise<Animal | null> {
  const result = await query<Animal>(
    `SELECT a.*,
      s.name as stable_name,
      m.name as mother_name,
      f.name as father_name
    FROM animals a
    LEFT JOIN stables s ON a.stable_id = s.id
    LEFT JOIN animals m ON a.mother_id = m.id
    LEFT JOIN animals f ON a.father_id = f.id
    WHERE a.id = ?`,
    [animalId]
  );
  if (!result.rows[0]) return null;

  const animal = result.rows[0];
  const traits = await query<AnimalTrait>(
    `SELECT * FROM animal_traits WHERE animal_id = ? ORDER BY trait_category, trait_name`,
    [animalId]
  );
  animal.traits = traits.rows;
  return animal;
}

export async function createAnimal(userId: number, input: CreateAnimalInput): Promise<number> {
  // Calculate generation based on parents
  let generation = 0;
  if (input.mother_id || input.father_id) {
    const parentIds = [input.mother_id, input.father_id].filter(Boolean);
    if (parentIds.length > 0) {
      const parentResult = await query<{ max_gen: number }>(
        `SELECT MAX(generation) as max_gen FROM animals WHERE id IN (${parentIds.map(() => "?").join(",")})`,
        parentIds
      );
      generation = (parentResult.rows[0]?.max_gen || 0) + 1;
    }
  }

  await query(
    `INSERT INTO animals (user_id, stable_id, name, animal_type, gender, color, mother_id, father_id, generation, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId, input.stable_id || null, input.name, input.animal_type,
      input.gender, input.color || null, input.mother_id || null,
      input.father_id || null, generation, input.notes || null,
    ]
  );
  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function updateAnimal(
  animalId: number,
  userId: number,
  input: UpdateAnimalInput
): Promise<boolean> {
  const animal = await getAnimalById(animalId);
  if (!animal || animal.user_id !== userId) return false;

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.stable_id !== undefined) { updates.push("stable_id = ?"); values.push(input.stable_id); }
  if (input.name !== undefined) { updates.push("name = ?"); values.push(input.name); }
  if (input.animal_type !== undefined) { updates.push("animal_type = ?"); values.push(input.animal_type); }
  if (input.gender !== undefined) { updates.push("gender = ?"); values.push(input.gender); }
  if (input.color !== undefined) { updates.push("color = ?"); values.push(input.color); }
  if (input.mother_id !== undefined) { updates.push("mother_id = ?"); values.push(input.mother_id); }
  if (input.father_id !== undefined) { updates.push("father_id = ?"); values.push(input.father_id); }
  if (input.is_alive !== undefined) { updates.push("is_alive = ?"); values.push(input.is_alive ? 1 : 0); }
  if (input.notes !== undefined) { updates.push("notes = ?"); values.push(input.notes); }

  if (updates.length === 0) return true;
  values.push(animalId);
  await query(`UPDATE animals SET ${updates.join(", ")} WHERE id = ?`, values);
  return true;
}

export async function deleteAnimal(animalId: number, userId: number): Promise<boolean> {
  const animal = await getAnimalById(animalId);
  if (!animal || animal.user_id !== userId) return false;
  // Unset parent references on children
  await query(`UPDATE animals SET mother_id = NULL WHERE mother_id = ?`, [animalId]);
  await query(`UPDATE animals SET father_id = NULL WHERE father_id = ?`, [animalId]);
  await query(`DELETE FROM animals WHERE id = ?`, [animalId]);
  return true;
}

// --- Traits ---

export async function getAnimalTraits(animalId: number): Promise<AnimalTrait[]> {
  const result = await query<AnimalTrait>(
    `SELECT * FROM animal_traits WHERE animal_id = ? ORDER BY trait_category, trait_name`,
    [animalId]
  );
  return result.rows;
}

export class DuplicateTraitError extends Error {
  constructor() {
    super("This trait has already been added to this animal.");
    this.name = "DuplicateTraitError";
  }
}

export async function addAnimalTrait(userId: number, input: AddAnimalTraitInput): Promise<number> {
  const animal = await getAnimalById(input.animal_id);
  if (!animal || animal.user_id !== userId) return 0;

  const traitName = input.trait_name.trim();

  try {
    await query(
      `INSERT INTO animal_traits (animal_id, trait_name, trait_category, is_inherited) VALUES (?, ?, ?, ?)`,
      [input.animal_id, traitName, input.trait_category, input.is_inherited ? 1 : 0]
    );
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === "ER_DUP_ENTRY") {
      throw new DuplicateTraitError();
    }
    throw error;
  }
  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function removeAnimalTrait(traitId: number, userId: number): Promise<boolean> {
  const traitResult = await query<AnimalTrait>(
    `SELECT at.*, a.user_id FROM animal_traits at JOIN animals a ON at.animal_id = a.id WHERE at.id = ?`,
    [traitId]
  );
  const trait = traitResult.rows[0] as (AnimalTrait & { user_id: number }) | undefined;
  if (!trait || trait.user_id !== userId) return false;
  await query(`DELETE FROM animal_traits WHERE id = ?`, [traitId]);
  return true;
}

// --- Family Tree ---

export async function getAnimalFamilyTree(animalId: number, depth: number = 4): Promise<AnimalFamilyNode | null> {
  const animal = await getAnimalById(animalId);
  if (!animal) return null;

  const node: AnimalFamilyNode = { animal };

  if (depth > 0) {
    if (animal.mother_id) {
      node.mother = await getAnimalFamilyTree(animal.mother_id, depth - 1) || undefined;
    }
    if (animal.father_id) {
      node.father = await getAnimalFamilyTree(animal.father_id, depth - 1) || undefined;
    }
  }

  // Get children
  const children = await query<Animal>(
    `SELECT a.*, s.name as stable_name FROM animals a
     LEFT JOIN stables s ON a.stable_id = s.id
     WHERE a.mother_id = ? OR a.father_id = ?
     ORDER BY a.name`,
    [animalId, animalId]
  );
  if (children.rows.length > 0) {
    node.children = children.rows;
  }

  return node;
}
