import { NextRequest, NextResponse } from "next/server";
import { getSessionAsync as getSession } from "@/lib/auth";
import { query } from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import { checkRateLimit } from "@/lib/rate-limit";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { randomBytes } from "crypto";

// Generate a cryptographically secure 8-character code
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters like 0, O, 1, I
  const bytes = randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(bytes[i] % chars.length);
  }
  return code;
}

// GET /api/discord/link - Get current Discord link status
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if user has Discord linked
    const users = await query<RowDataPacket>(
      'SELECT discord_id FROM users WHERE id = ?',
      [session.userId]
    );

    if (users.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const discordId = users.rows[0].discord_id;

    // Get any pending verification code
    const codes = await query<RowDataPacket>(
      `SELECT verification_code, expires_at
       FROM discord_link_codes
       WHERE user_id = ? AND expires_at > NOW() AND used_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [session.userId]
    );

    return NextResponse.json({
      linked: !!discordId,
      discordId: discordId || null,
      pendingCode: codes.rows.length > 0 ? {
        code: codes.rows[0].verification_code,
        expiresAt: codes.rows[0].expires_at,
      } : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Get Discord link status") },
      { status: 500 }
    );
  }
}

// POST /api/discord/link - Generate a new verification code
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'generate') {
      // Rate limit check (Redis-backed, works across multiple instances)
      const rateLimitResult = await checkRateLimit(`discord-link:${session.userId}`, "twoFactor");
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: "Too many requests. Please wait before generating a new code." },
          { status: 429, headers: { "Retry-After": rateLimitResult.retryAfter?.toString() || "300" } }
        );
      }

      // Check if already linked
      const users = await query<RowDataPacket>(
        'SELECT discord_id FROM users WHERE id = ?',
        [session.userId]
      );

      if (users.rows[0]?.discord_id) {
        return NextResponse.json(
          { error: "Discord account already linked" },
          { status: 400 }
        );
      }

      // Invalidate any existing codes
      await query(
        'UPDATE discord_link_codes SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
        [session.userId]
      );

      // Generate new code
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await query<ResultSetHeader>(
        `INSERT INTO discord_link_codes (user_id, verification_code, expires_at)
         VALUES (?, ?, ?)`,
        [session.userId, code, expiresAt]
      );

      return NextResponse.json({
        code,
        expiresAt: expiresAt.toISOString(),
        instructions: 'Use /link <code> in Discord to link your account',
      });
    }

    if (action === 'unlink') {
      // Unlink Discord account
      await query(
        'UPDATE users SET discord_id = NULL WHERE id = ?',
        [session.userId]
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Discord link action") },
      { status: 500 }
    );
  }
}
