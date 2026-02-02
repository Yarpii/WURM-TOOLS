import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getUserStables,
  getStableById,
  createStable,
  updateStable,
  deleteStable,
  getUserAnimals,
  getAnimalById,
  createAnimal,
  updateAnimal,
  deleteAnimal,
  addAnimalTrait,
  removeAnimalTrait,
  getAnimalFamilyTree,
} from "@/lib/database";
import { sanitizeError, validateStringLength, INPUT_LIMITS } from "@/lib/security";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const result = await getSession(sessionId);
    if (!result) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const userId = result.user.id;
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get("resource");

    // Get stables
    if (resource === "stables") {
      const stables = await getUserStables(userId);
      return NextResponse.json(stables);
    }

    // Get single animal with family tree
    if (resource === "family-tree") {
      const animalId = parseInt(searchParams.get("animal_id") || "");
      if (isNaN(animalId)) return NextResponse.json({ error: "Invalid animal ID" }, { status: 400 });

      const animal = await getAnimalById(animalId);
      if (!animal) return NextResponse.json({ error: "Animal not found" }, { status: 404 });
      if (animal.user_id !== userId) return NextResponse.json({ error: "Access denied" }, { status: 403 });

      const depth = parseInt(searchParams.get("depth") || "4");
      const tree = await getAnimalFamilyTree(animalId, Math.min(depth, 6));
      return NextResponse.json(tree);
    }

    // Get single animal
    const animalId = searchParams.get("animal_id");
    if (animalId) {
      const parsedId = parseInt(animalId);
      if (isNaN(parsedId)) return NextResponse.json({ error: "Invalid animal ID" }, { status: 400 });

      const animal = await getAnimalById(parsedId);
      if (!animal) return NextResponse.json({ error: "Animal not found" }, { status: 404 });
      if (animal.user_id !== userId) return NextResponse.json({ error: "Access denied" }, { status: 403 });
      return NextResponse.json(animal);
    }

    // Get user's animals with optional filters
    const filters = {
      stable_id: searchParams.get("stable_id") ? parseInt(searchParams.get("stable_id")!) : undefined,
      animal_type: searchParams.get("animal_type") || undefined,
      is_alive: searchParams.get("is_alive") !== null ? searchParams.get("is_alive") === "true" : undefined,
    };
    const animals = await getUserAnimals(userId, filters);
    return NextResponse.json(animals);
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error, "Fetch animals") }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const result = await getSession(sessionId);
    if (!result) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const userId = result.user.id;
    const body = await request.json();
    const { action } = body;

    // === STABLE ACTIONS ===

    if (action === "create_stable") {
      const nameErr = validateStringLength(body.name, "Name", INPUT_LIMITS.name, true);
      if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });
      if (!body.server) return NextResponse.json({ error: "Server is required" }, { status: 400 });

      const id = await createStable(userId, {
        name: body.name,
        server: body.server,
        capacity: body.capacity ? parseInt(body.capacity) : 4,
        notes: body.notes,
      });
      return NextResponse.json({ success: true, id });
    }

    if (action === "update_stable") {
      const stableId = parseInt(body.stable_id);
      if (isNaN(stableId)) return NextResponse.json({ error: "Invalid stable ID" }, { status: 400 });

      if (body.name) {
        const nameErr = validateStringLength(body.name, "Name", INPUT_LIMITS.name, true);
        if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });
      }

      const success = await updateStable(stableId, userId, {
        name: body.name,
        server: body.server,
        capacity: body.capacity !== undefined ? parseInt(body.capacity) : undefined,
        notes: body.notes,
      });
      if (!success) return NextResponse.json({ error: "Update failed or access denied" }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_stable") {
      const stableId = parseInt(body.stable_id);
      if (isNaN(stableId)) return NextResponse.json({ error: "Invalid stable ID" }, { status: 400 });

      const success = await deleteStable(stableId, userId);
      if (!success) return NextResponse.json({ error: "Delete failed or access denied" }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    // === ANIMAL ACTIONS ===

    if (action === "create_animal") {
      const nameErr = validateStringLength(body.name, "Name", INPUT_LIMITS.name, true);
      if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });
      if (!body.animal_type) return NextResponse.json({ error: "Animal type is required" }, { status: 400 });
      if (!body.gender) return NextResponse.json({ error: "Gender is required" }, { status: 400 });

      const id = await createAnimal(userId, {
        stable_id: body.stable_id ? parseInt(body.stable_id) : undefined,
        name: body.name,
        animal_type: body.animal_type,
        gender: body.gender,
        color: body.color,
        mother_id: body.mother_id ? parseInt(body.mother_id) : undefined,
        father_id: body.father_id ? parseInt(body.father_id) : undefined,
        notes: body.notes,
      });
      return NextResponse.json({ success: true, id });
    }

    if (action === "update_animal") {
      const animalId = parseInt(body.animal_id);
      if (isNaN(animalId)) return NextResponse.json({ error: "Invalid animal ID" }, { status: 400 });

      const success = await updateAnimal(animalId, userId, {
        stable_id: body.stable_id !== undefined ? (body.stable_id ? parseInt(body.stable_id) : null) : undefined,
        name: body.name,
        animal_type: body.animal_type,
        gender: body.gender,
        color: body.color,
        mother_id: body.mother_id !== undefined ? (body.mother_id ? parseInt(body.mother_id) : null) : undefined,
        father_id: body.father_id !== undefined ? (body.father_id ? parseInt(body.father_id) : null) : undefined,
        is_alive: body.is_alive !== undefined ? body.is_alive : undefined,
        notes: body.notes,
      });
      if (!success) return NextResponse.json({ error: "Update failed or access denied" }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_animal") {
      const animalId = parseInt(body.animal_id);
      if (isNaN(animalId)) return NextResponse.json({ error: "Invalid animal ID" }, { status: 400 });

      const success = await deleteAnimal(animalId, userId);
      if (!success) return NextResponse.json({ error: "Delete failed or access denied" }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    // === TRAIT ACTIONS ===

    if (action === "add_trait") {
      const animalId = parseInt(body.animal_id);
      if (isNaN(animalId)) return NextResponse.json({ error: "Invalid animal ID" }, { status: 400 });
      if (!body.trait_name) return NextResponse.json({ error: "Trait name is required" }, { status: 400 });
      if (!body.trait_category) return NextResponse.json({ error: "Trait category is required" }, { status: 400 });

      const id = await addAnimalTrait(userId, {
        animal_id: animalId,
        trait_name: body.trait_name,
        trait_category: body.trait_category,
        is_inherited: body.is_inherited || false,
      });
      if (!id) return NextResponse.json({ error: "Failed to add trait or access denied" }, { status: 400 });
      return NextResponse.json({ success: true, id });
    }

    if (action === "remove_trait") {
      const traitId = parseInt(body.trait_id);
      if (isNaN(traitId)) return NextResponse.json({ error: "Invalid trait ID" }, { status: 400 });

      const success = await removeAnimalTrait(traitId, userId);
      if (!success) return NextResponse.json({ error: "Remove failed or access denied" }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error, "Animal operation") }, { status: 500 });
  }
}
