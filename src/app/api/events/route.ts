import { NextRequest, NextResponse } from "next/server";
import { getSessionAsync as getSession, isAdminAsync as isAdmin } from "@/lib/auth";
import { query } from "@/lib/database";
import type { WurmEvent, CreateEventInput, UpdateEventInput, UpdateAttendanceInput } from "@/lib/types";

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

    let sql = `
      SELECT e.*, u.username,
        (SELECT COUNT(*) FROM event_attendees ea WHERE ea.event_id = e.id AND ea.status = 'going') as attendee_count
        ${session ? `, (SELECT status FROM event_attendees ea WHERE ea.event_id = e.id AND ea.user_id = $1) as user_status` : ""}
      FROM events e
      LEFT JOIN users u ON u.id = e.user_id
      WHERE (e.is_public = true ${session ? "OR e.user_id = $1" : ""})
    `;

    const params: unknown[] = session ? [session.userId] : [];
    let paramCount = session ? 2 : 1;

    if (server) {
      sql += ` AND e.server = $${paramCount++}`;
      params.push(server);
    }

    if (type) {
      sql += ` AND e.event_type = $${paramCount++}`;
      params.push(type);
    }

    if (upcoming) {
      sql += ` AND e.start_date >= NOW()`;
    }

    if (featured) {
      sql += ` AND e.is_featured = true`;
    }

    if (userId) {
      sql += ` AND e.user_id = $${paramCount++}`;
      params.push(parseInt(userId));
    }

    sql += ` ORDER BY e.start_date ASC LIMIT 100`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
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

        const result = await query(
          `INSERT INTO events (
            user_id, title, description, event_type, server, location, coordinates,
            start_date, end_date, is_all_day, is_public, max_attendees,
            contact_info, external_link, image_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *`,
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

        return NextResponse.json(result.rows[0]);
      }

      case "update": {
        const { event_id, ...input }: { event_id: number } & UpdateEventInput = body;

        // Check ownership or admin
        const event = await query(
          `SELECT user_id FROM events WHERE id = $1`,
          [event_id]
        );

        if (event.rows.length === 0) {
          return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        const admin = await isAdmin();
        if (event.rows[0].user_id !== session.userId && !admin) {
          return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        const updates: string[] = [];
        const values: unknown[] = [];
        let paramCount = 1;

        const fields = [
          "title", "description", "event_type", "server", "location", "coordinates",
          "start_date", "end_date", "is_all_day", "is_public", "is_featured",
          "max_attendees", "contact_info", "external_link", "image_url"
        ];

        for (const field of fields) {
          if ((input as Record<string, unknown>)[field] !== undefined) {
            updates.push(`${field} = $${paramCount++}`);
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

        const result = await query(
          `UPDATE events SET ${updates.join(", ")}
           WHERE id = $${paramCount}
           RETURNING *`,
          values
        );

        return NextResponse.json(result.rows[0]);
      }

      case "delete": {
        const { event_id } = body;

        const event = await query(
          `SELECT user_id FROM events WHERE id = $1`,
          [event_id]
        );

        if (event.rows.length === 0) {
          return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        const admin = await isAdmin();
        if (event.rows[0].user_id !== session.userId && !admin) {
          return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        await query(`DELETE FROM events WHERE id = $1`, [event_id]);
        return NextResponse.json({ success: true });
      }

      case "attend": {
        const { event_id, ...input }: { event_id: number } & UpdateAttendanceInput = body;

        // Check if event exists and is public
        const event = await query(
          `SELECT * FROM events WHERE id = $1`,
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
             WHERE event_id = $1 AND status = 'going' AND user_id != $2`,
            [event_id, session.userId]
          );

          if (parseInt(String(currentCount.rows[0].count)) >= Number(e.max_attendees)) {
            return NextResponse.json({ error: "Event is full" }, { status: 400 });
          }
        }

        // Upsert attendance
        const result = await query(
          `INSERT INTO event_attendees (event_id, user_id, status, character_name, notes)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (event_id, user_id)
           DO UPDATE SET status = $3, character_name = $4, notes = $5
           RETURNING *`,
          [event_id, session.userId, input.status, input.character_name || null, input.notes || null]
        );

        return NextResponse.json(result.rows[0]);
      }

      case "unattend": {
        const { event_id } = body;

        await query(
          `DELETE FROM event_attendees WHERE event_id = $1 AND user_id = $2`,
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
           WHERE ea.event_id = $1
           ORDER BY ea.status, ea.created_at`,
          [event_id]
        );

        return NextResponse.json(result.rows);
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Failed to process event request:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
