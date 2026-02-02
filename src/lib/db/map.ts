import { query } from "./core";
import type {
  MapLocation,
  LocationType,
  WurmServer,
  CreateLocationInput,
  UpdateLocationInput,
} from "../types";

// ========== MAP LOCATIONS ==========

export async function getMapLocations(filters?: {
  server?: WurmServer;
  type?: LocationType;
  userId?: number;
}): Promise<MapLocation[]> {
  let sql = "SELECT * FROM map_locations WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters?.server) {
    sql += " AND server = ?";
    params.push(filters.server);
  }
  if (filters?.type) {
    sql += " AND location_type = ?";
    params.push(filters.type);
  }
  if (filters?.userId) {
    sql += " AND user_id = ?";
    params.push(filters.userId);
  }

  sql += " ORDER BY name";

  const result = await query<MapLocation>(sql, params);
  return result.rows;
}

export async function getLocationById(id: number): Promise<MapLocation | null> {
  const result = await query<MapLocation>("SELECT * FROM map_locations WHERE id = ?", [id]);
  return result.rows[0] || null;
}

export async function createLocation(userId: number, input: CreateLocationInput): Promise<number> {
  await query(
    `INSERT INTO map_locations (user_id, name, location_type, server, x, y, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, input.name, input.location_type, input.server, input.x, input.y, input.description || null]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function updateLocation(
  id: number,
  userId: number,
  input: UpdateLocationInput,
  isAdmin: boolean = false
): Promise<boolean> {
  const location = await getLocationById(id);
  if (!location) return false;
  if (!isAdmin && location.user_id !== userId) return false;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description);
  }
  if (input.x !== undefined) {
    fields.push("x = ?");
    values.push(input.x);
  }
  if (input.y !== undefined) {
    fields.push("y = ?");
    values.push(input.y);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const result = await query(`UPDATE map_locations SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.rowCount > 0;
}

export async function deleteLocation(id: number, userId: number, isAdmin: boolean = false): Promise<boolean> {
  const location = await getLocationById(id);
  if (!location) return false;
  if (!isAdmin && location.user_id !== userId) return false;

  const result = await query("DELETE FROM map_locations WHERE id = ?", [id]);
  return result.rowCount > 0;
}

export async function verifyLocation(id: number): Promise<boolean> {
  const result = await query("UPDATE map_locations SET is_verified = 1 WHERE id = ?", [id]);
  return result.rowCount > 0;
}
