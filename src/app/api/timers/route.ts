import { NextRequest, NextResponse } from "next/server";
import { getSessionAsync as getSession } from "@/lib/auth";
import { query } from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import type { UserTimer, TimerPreset, CreateTimerInput, UpdateTimerInput } from "@/lib/types";

// GET /api/timers - Get user's timers or presets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const presets = searchParams.get("presets") === "true";

    const session = await getSession();

    // Return timer presets (public + user's own)
    if (presets) {
      const result = await query(
        `SELECT id, user_id, name, timer_type, duration_minutes, description, color, icon, is_public
         FROM timer_presets
         WHERE user_id IS NULL OR is_public = true ${session ? "OR user_id = $1" : ""}
         ORDER BY timer_type, name`,
        session ? [session.userId] : []
      );
      return NextResponse.json(result.rows);
    }

    // User's active timers require auth
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const result = await query(
      `SELECT id, user_id, name, description, timer_type, duration_minutes,
              start_time, end_time, is_recurring, recurrence_interval,
              notify_discord, is_active, color, icon, created_at
       FROM user_timers
       WHERE user_id = $1 AND is_active = true
       ORDER BY end_time ASC`,
      [session.userId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch timers") },
      { status: 500 }
    );
  }
}

// POST /api/timers - Create, update, restart, or delete timer
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
        const input: CreateTimerInput = body;

        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + input.duration_minutes * 60 * 1000);

        const result = await query(
          `INSERT INTO user_timers (
            user_id, name, description, timer_type, duration_minutes,
            start_time, end_time, is_recurring, recurrence_interval,
            notify_discord, color, icon
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *`,
          [
            session.userId,
            input.name,
            input.description || null,
            input.timer_type,
            input.duration_minutes,
            startTime,
            endTime,
            input.is_recurring || false,
            input.recurrence_interval || null,
            input.notify_discord || false,
            input.color || "#3b82f6",
            input.icon || null,
          ]
        );

        return NextResponse.json(result.rows[0]);
      }

      case "create_from_preset": {
        const { preset_id, name } = body;

        const preset = await query(
          `SELECT * FROM timer_presets WHERE id = $1`,
          [preset_id]
        );

        if (preset.rows.length === 0) {
          return NextResponse.json({ error: "Preset not found" }, { status: 404 });
        }

        const p = preset.rows[0] as { duration_minutes: number; name: string; description: string; timer_type: string; color: string; icon: string };
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + p.duration_minutes * 60 * 1000);

        const result = await query(
          `INSERT INTO user_timers (
            user_id, name, description, timer_type, duration_minutes,
            start_time, end_time, color, icon
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            session.userId,
            name || p.name,
            p.description,
            p.timer_type,
            p.duration_minutes,
            startTime,
            endTime,
            p.color,
            p.icon,
          ]
        );

        return NextResponse.json(result.rows[0]);
      }

      case "update": {
        const { timer_id, ...input }: { timer_id: number } & UpdateTimerInput = body;

        const updates: string[] = [];
        const values: unknown[] = [];
        let paramCount = 1;

        if (input.name !== undefined) {
          updates.push(`name = $${paramCount++}`);
          values.push(input.name);
        }
        if (input.description !== undefined) {
          updates.push(`description = $${paramCount++}`);
          values.push(input.description);
        }
        if (input.is_recurring !== undefined) {
          updates.push(`is_recurring = $${paramCount++}`);
          values.push(input.is_recurring);
        }
        if (input.recurrence_interval !== undefined) {
          updates.push(`recurrence_interval = $${paramCount++}`);
          values.push(input.recurrence_interval);
        }
        if (input.notify_discord !== undefined) {
          updates.push(`notify_discord = $${paramCount++}`);
          values.push(input.notify_discord);
        }
        if (input.is_active !== undefined) {
          updates.push(`is_active = $${paramCount++}`);
          values.push(input.is_active);
        }
        if (input.color !== undefined) {
          updates.push(`color = $${paramCount++}`);
          values.push(input.color);
        }

        if (updates.length === 0) {
          return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        values.push(timer_id, session.userId);

        const result = await query(
          `UPDATE user_timers SET ${updates.join(", ")}
           WHERE id = $${paramCount++} AND user_id = $${paramCount}
           RETURNING *`,
          values
        );

        return NextResponse.json(result.rows[0]);
      }

      case "restart": {
        const { timer_id } = body;

        // Get current timer
        const current = await query(
          `SELECT * FROM user_timers WHERE id = $1 AND user_id = $2`,
          [timer_id, session.userId]
        );

        if (current.rows.length === 0) {
          return NextResponse.json({ error: "Timer not found" }, { status: 404 });
        }

        const timer = current.rows[0] as { duration_minutes: number };
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + timer.duration_minutes * 60 * 1000);

        const result = await query(
          `UPDATE user_timers SET start_time = $1, end_time = $2, is_active = true
           WHERE id = $3 AND user_id = $4
           RETURNING *`,
          [startTime, endTime, timer_id, session.userId]
        );

        return NextResponse.json(result.rows[0]);
      }

      case "delete": {
        const { timer_id } = body;

        await query(
          `DELETE FROM user_timers WHERE id = $1 AND user_id = $2`,
          [timer_id, session.userId]
        );

        return NextResponse.json({ success: true });
      }

      case "save_preset": {
        const { name, timer_type, duration_minutes, description, color, icon, is_public } = body;

        const result = await query(
          `INSERT INTO timer_presets (user_id, name, timer_type, duration_minutes, description, color, icon, is_public)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [session.userId, name, timer_type, duration_minutes, description || null, color || "#3b82f6", icon || null, is_public || false]
        );

        return NextResponse.json(result.rows[0]);
      }

      case "cleanup": {
        // Mark expired non-recurring timers as inactive
        await query(
          `UPDATE user_timers SET is_active = false
           WHERE user_id = $1 AND end_time < NOW() AND is_recurring = false`,
          [session.userId]
        );

        // Restart recurring timers
        await query(
          `UPDATE user_timers
           SET start_time = NOW(),
               end_time = NOW() + (duration_minutes || ' minutes')::interval
           WHERE user_id = $1 AND end_time < NOW() AND is_recurring = true`,
          [session.userId]
        );

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Process timer request") },
      { status: 500 }
    );
  }
}
