import { NextRequest, NextResponse } from "next/server";
import { getSessionAsync as getSession, isAdminAsync as isAdmin } from "@/lib/auth";
import { query } from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import type { WurmEvent, CreateEventInput, UpdateEventInput, UpdateAttendanceInput } from "@/lib/types";

const VALID_EVENT_TYPES = ["impalong", "slaying", "rift", "sermon", "hunt", "exploration", "social", "pvp", "market", "other"];

function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function validateEventInput(input: Record<string, unknown>): string | null {
  if (input.title !== undefined && input.title !== null) {
    if (typeof input.title !== "string" || input.title.trim().length === 0) return "Title is required";
    if (input.title.length > 200) return "Title must be under 200 characters";
  }
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== "string") return "Invalid description";
    if (input.description.length > 5000) return "Description must be under 5000 characters";
  }
  if (input.event_type !== undefined && input.event_type !== null) {
    if (!VALID_EVENT_TYPES.includes(input.event_type as string)) return "Invalid event type";
  }
  if (input.external_link !== undefined && input.external_link !== null && input.external_link !== "") {
    if (typeof input.external_link !== "string" || !isSafeUrl(input.external_link)) return "External link must be a valid http(s) URL";
  }
  if (input.image_url !== undefined && input.image_url !== null && input.image_url !== "") {
    if (typeof input.image_url !== "string" || !isSafeUrl(input.image_url)) return "Image URL must be a valid http(s) URL";
  }
  if (input.location !== undefined && input.location !== null) {
    if (typeof input.location !== "string" || input.location.length > 200) return "Location must be under 200 characters";
  }
  if (input.contact_info !== undefined && input.contact_info !== null) {
    if (typeof input.contact_info !== "string" || input.contact_info.length > 500) return "Contact info must be under 500 characters";
  }
  return null;
}

// GET /api/events - Get events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const server = searchParams.get("server");
    const type = searchParams.get("type");
    const upcoming = searchParams.get("upcoming") === "true";
    const featured = searchParams.get("featured") === "true";
    const userId = searchParams.get("user_id");

    const session = await getSession();

    // Build SQL with proper parameter placeholders for MySQL
    // Each ? needs its own value in the params array
    let sql = `
      SELECT e.*, u.username,
        (SELECT COUNT(*) FROM event_attendees ea WHERE ea.event_id = e.id AND ea.status = 'going') as attendee_count
        ${session ? `, (SELECT status FROM event_attendees ea WHERE ea.event_id = e.id AND ea.user_id = ?) as user_status` : ""}
      FROM events e
      LEFT JOIN users u ON u.id = e.user_id
      WHERE (e.is_public = true ${session ? "OR e.user_id = ?" : ""})
    `;

    // When session exists, userId is used twice in the query (subquery + WHERE)
    const params: unknown[] = session ? [session.userId, session.userId] : [];
    let paramCount = session ? 3 : 1;

    if (server) {
      sql += ` AND e.server = ?`;
      params.push(server);
    }

    if (type) {
      sql += ` AND e.event_type = ?`;
      params.push(type);
    }

    if (upcoming) {
      sql += ` AND e.start_date >= NOW()`;
    }

    if (featured) {
      sql += ` AND e.is_featured = true`;
    }

    if (userId) {
      sql += ` AND e.user_id = ?`;
      params.push(parseInt(userId));
    }

    sql += ` ORDER BY e.start_date ASC LIMIT 100`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch events") },
      { status: 500 }
    );
  }
}

// POST /api/events - Create, update, delete events or manage attendance
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const input: CreateEventInput = body;

        // SECURITY: Validate input lengths and URL protocols
        const validationError = validateEventInput(input as unknown as Record<string, unknown>);
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
        }

        await query(
          `INSERT INTO events (
            user_id, title, description, event_type, server, location, coordinates,
            start_date, end_date, is_all_day, is_public, max_attendees,
            contact_info, external_link, image_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            session.userId,
            input.title,
            input.description || null,
            input.event_type,
            input.server || null,
            input.location || null,
            input.coordinates || null,
            input.start_date,
            input.end_date || null,
            input.is_all_day || false,
            input.is_public !== false,
            input.max_attendees || null,
            input.contact_info || null,
            input.external_link || null,
            input.image_url || null,
          ]
        );

        // Fetch the inserted event
        const result = await query(
          `SELECT * FROM events WHERE id = LAST_INSERT_ID()`
        );

        return NextResponse.json(result.rows[0]);
      }

      case "update": {
        const { event_id, ...input }: { event_id: number } & UpdateEventInput = body;

        // Check ownership or admin
        const event = await query(
          `SELECT user_id FROM events WHERE id = ?`,
          [event_id]
        );

        if (event.rows.length === 0) {
          return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        const admin = await isAdmin();
        if (event.rows[0].user_id !== session.userId && !admin) {
          return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        // SECURITY: Validate input lengths and URL protocols
        const updateValidationError = validateEventInput(input as unknown as Record<string, unknown>);
        if (updateValidationError) {
          return NextResponse.json({ error: updateValidationError }, { status: 400 });
        }

        const updates: string[] = [];
        const values: unknown[] = [];

        const fields = [
          "title", "description", "event_type", "server", "location", "coordinates",
          "start_date", "end_date", "is_all_day", "is_public", "is_featured",
          "max_attendees", "contact_info", "external_link", "image_url"
        ];

        for (const field of fields) {
          if ((input as Record<string, unknown>)[field] !== undefined) {
            updates.push(`${field} = ?`);
            values.push((input as Record<string, unknown>)[field]);
          }
        }

        // Only admin can set featured
        if (input.is_featured !== undefined && !admin) {
          return NextResponse.json({ error: "Only admins can feature events" }, { status: 403 });
        }

        if (updates.length === 0) {
          return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        values.push(event_id);

        await query(
          `UPDATE events SET ${updates.join(", ")} WHERE id = ?`,
          values
        );

        // Fetch the updated event
        const result = await query(
          `SELECT * FROM events WHERE id = ?`,
          [event_id]
        );

        return NextResponse.json(result.rows[0]);
      }

      case "delete": {
        const { event_id } = body;

        const event = await query(
          `SELECT user_id FROM events WHERE id = ?`,
          [event_id]
        );

        if (event.rows.length === 0) {
          return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        const admin = await isAdmin();
        if (event.rows[0].user_id !== session.userId && !admin) {
          return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        await query(`DELETE FROM events WHERE id = ?`, [event_id]);
        return NextResponse.json({ success: true });
      }

      case "attend": {
        const { event_id, ...input }: { event_id: number } & UpdateAttendanceInput = body;

        // Check if event exists and is public
        const event = await query(
          `SELECT * FROM events WHERE id = ?`,
          [event_id]
        );

        if (event.rows.length === 0) {
          return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        const e = event.rows[0];
        if (!e.is_public && e.user_id !== session.userId) {
          return NextResponse.json({ error: "Event not accessible" }, { status: 403 });
        }

        // Check max attendees
        if (e.max_attendees && input.status === "going") {
          const currentCount = await query(
            `SELECT COUNT(*) as count FROM event_attendees
             WHERE event_id = ? AND status = 'going' AND user_id != ?`,
            [event_id, session.userId]
          );

          if (parseInt(String(currentCount.rows[0].count)) >= Number(e.max_attendees)) {
            return NextResponse.json({ error: "Event is full" }, { status: 400 });
          }
        }

        // Upsert attendance (MySQL syntax)
        await query(
          `INSERT INTO event_attendees (event_id, user_id, status, character_name, notes)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = VALUES(status), character_name = VALUES(character_name), notes = VALUES(notes)`,
          [event_id, session.userId, input.status, input.character_name || null, input.notes || null]
        );

        // Fetch the updated/inserted row
        const result = await query(
          `SELECT * FROM event_attendees WHERE event_id = ? AND user_id = ?`,
          [event_id, session.userId]
        );

        return NextResponse.json(result.rows[0]);
      }

      case "unattend": {
        const { event_id } = body;

        await query(
          `DELETE FROM event_attendees WHERE event_id = ? AND user_id = ?`,
          [event_id, session.userId]
        );

        return NextResponse.json({ success: true });
      }

      case "attendees": {
        const { event_id } = body;

        const result = await query(
          `SELECT ea.*, u.username
           FROM event_attendees ea
           LEFT JOIN users u ON u.id = ea.user_id
           WHERE ea.event_id = ?
           ORDER BY ea.status, ea.created_at`,
          [event_id]
        );

        return NextResponse.json(result.rows);
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Process event request") },
      { status: 500 }
    );
  }
}
