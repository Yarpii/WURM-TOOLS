import { NextResponse } from "next/server";
import { query } from "@/lib/database";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint
 * GET /api/health
 *
 * Returns app status and database connectivity
 */
export async function GET() {
  const startTime = Date.now();

  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    database: {
      connected: false,
      responseTime: 0,
    },
  };

  // Check database connection
  try {
    const dbStartTime = Date.now();
    await query("SELECT 1");
    health.database.connected = true;
    health.database.responseTime = Date.now() - dbStartTime;
  } catch (error) {
    health.status = "degraded";
    health.database.connected = false;
    console.error("[Health Check] Database error:", error);
  }

  const responseTime = Date.now() - startTime;

  // SECURITY: Only expose timing data in non-production environments
  const isProduction = process.env.NODE_ENV === "production";

  return NextResponse.json(
    {
      status: health.status,
      timestamp: health.timestamp,
      ...(!isProduction && { environment: health.environment }),
      ...(!isProduction && { version: health.version }),
      database: {
        connected: health.database.connected,
        ...(!isProduction && { responseTime: health.database.responseTime }),
      },
      ...(!isProduction && { uptime: health.uptime, responseTime }),
    },
    {
      status: health.status === "ok" ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    }
  );
}
