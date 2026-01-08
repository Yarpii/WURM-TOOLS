import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getMapLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  verifyLocation,
} from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import type { WurmServer, LocationType, CreateLocationInput, UpdateLocationInput } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const server = searchParams.get("server") as WurmServer | null;
    const locationType = searchParams.get("type") as LocationType | null;
    const locationId = searchParams.get("id");

    // Get specific location
    if (locationId) {
      const location = await getLocationById(parseInt(locationId));
      if (!location) {
        return NextResponse.json(
          { error: "Location not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(location);
    }

    // Get all locations with optional filters
    const locations = await getMapLocations({
      server: server || undefined,
      type: locationType || undefined,
    });

    return NextResponse.json(locations);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch locations") },
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
    const { action, location_id, ...data } = body;

    switch (action) {
      case "create": {
        const { name, description, location_type, server, x, y, is_public, alliance_id, merchant_id } = data;

        if (!name || !location_type || !server || x === undefined || y === undefined) {
          return NextResponse.json(
            { error: "Missing required fields: name, location_type, server, x, y" },
            { status: 400 }
          );
        }

        const input: CreateLocationInput = {
          name: name.trim(),
          description: description?.trim() || undefined,
          location_type,
          server,
          x,
          y,
          is_public: is_public !== false,
          alliance_id,
          merchant_id,
        };

        const id = await createLocation(result.user.id, input);
        return NextResponse.json({ id, success: true });
      }

      case "update": {
        if (!location_id) {
          return NextResponse.json(
            { error: "Location ID is required" },
            { status: 400 }
          );
        }

        const updateInput: UpdateLocationInput = {};
        if (data.name !== undefined) updateInput.name = data.name.trim();
        if (data.description !== undefined) updateInput.description = data.description?.trim();
        if (data.location_type !== undefined) updateInput.location_type = data.location_type;
        if (data.x !== undefined) updateInput.x = data.x;
        if (data.y !== undefined) updateInput.y = data.y;
        if (data.is_public !== undefined) updateInput.is_public = data.is_public;

        const updated = await updateLocation(
          location_id,
          result.user.id,
          updateInput,
          result.user.role === "admin"
        );
        return NextResponse.json({ success: updated });
      }

      case "delete": {
        if (!location_id) {
          return NextResponse.json(
            { error: "Location ID is required" },
            { status: 400 }
          );
        }

        const deleted = await deleteLocation(
          location_id,
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

        if (!location_id) {
          return NextResponse.json(
            { error: "Location ID is required" },
            { status: 400 }
          );
        }

        const verified = await verifyLocation(location_id);
        return NextResponse.json({ success: verified });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Process map request") },
      { status: 500 }
    );
  }
}
