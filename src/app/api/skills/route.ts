import { NextRequest, NextResponse } from "next/server";
import { getSessionAsync as getSession } from "@/lib/auth";
import { query, getClient } from "@/lib/database";
import type { UserSkill, WurmSkill, CreateSkillInput, UpdateSkillInput } from "@/lib/types";

// GET /api/skills - Get user's skills or skill list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listAll = searchParams.get("list") === "true";

    // Return all Wurm skills for autocomplete
    if (listAll) {
      const result = await query(
        `SELECT id, name, category, parent_skill, max_level, description
         FROM wurm_skills
         ORDER BY category, name`
      );
      return NextResponse.json(result.rows);
    }

    // Get user's tracked skills
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const result = await query(
      `SELECT id, user_id, skill_name, current_level, target_level, notes, created_at, updated_at
       FROM user_skills
       WHERE user_id = $1
       ORDER BY skill_name`,
      [session.userId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch skills:", error);
    return NextResponse.json({ error: "Failed to fetch skills" }, { status: 500 });
  }
}

// POST /api/skills - Create, update, or delete skill
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
        const input: CreateSkillInput = body;

        // Check if skill already tracked
        const existing = await query(
          `SELECT id FROM user_skills WHERE user_id = $1 AND skill_name = $2`,
          [session.userId, input.skill_name]
        );

        if (existing.rows.length > 0) {
          return NextResponse.json({ error: "Skill already tracked" }, { status: 400 });
        }

        const result = await query(
          `INSERT INTO user_skills (user_id, skill_name, current_level, target_level, notes)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [session.userId, input.skill_name, input.current_level, input.target_level || null, input.notes || null]
        );

        return NextResponse.json(result.rows[0]);
      }

      case "update": {
        const { skill_id, ...input }: { skill_id: number } & UpdateSkillInput = body;

        // Get current skill for history
        const current = await query(
          `SELECT * FROM user_skills WHERE id = $1 AND user_id = $2`,
          [skill_id, session.userId]
        );

        if (current.rows.length === 0) {
          return NextResponse.json({ error: "Skill not found" }, { status: 404 });
        }

        const oldSkill = current.rows[0];

        // Build update query
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramCount = 1;

        if (input.current_level !== undefined) {
          updates.push(`current_level = $${paramCount++}`);
          values.push(input.current_level);
        }
        if (input.target_level !== undefined) {
          updates.push(`target_level = $${paramCount++}`);
          values.push(input.target_level);
        }
        if (input.notes !== undefined) {
          updates.push(`notes = $${paramCount++}`);
          values.push(input.notes);
        }

        if (updates.length === 0) {
          return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        values.push(skill_id, session.userId);

        const result = await query(
          `UPDATE user_skills SET ${updates.join(", ")}
           WHERE id = $${paramCount++} AND user_id = $${paramCount}
           RETURNING *`,
          values
        );

        // Record history if level changed
        if (input.current_level !== undefined && input.current_level !== oldSkill.current_level) {
          await query(
            `INSERT INTO skill_history (user_skill_id, old_level, new_level)
             VALUES ($1, $2, $3)`,
            [skill_id, oldSkill.current_level, input.current_level]
          );
        }

        return NextResponse.json(result.rows[0]);
      }

      case "delete": {
        const { skill_id } = body;

        await query(
          `DELETE FROM user_skills WHERE id = $1 AND user_id = $2`,
          [skill_id, session.userId]
        );

        return NextResponse.json({ success: true });
      }

      case "history": {
        const { skill_id } = body;

        const result = await query(
          `SELECT sh.* FROM skill_history sh
           JOIN user_skills us ON us.id = sh.user_skill_id
           WHERE sh.user_skill_id = $1 AND us.user_id = $2
           ORDER BY sh.recorded_at DESC
           LIMIT 50`,
          [skill_id, session.userId]
        );

        return NextResponse.json(result.rows);
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Failed to process skill request:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
