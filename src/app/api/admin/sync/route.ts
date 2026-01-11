import { NextRequest, NextResponse } from "next/server";
import { getSessionAsync as getSession, isAdminAsync as isAdmin } from "@/lib/auth";
import { getResourceSyncService } from "@/lib/resource-sync";
import { sanitizeError } from "@/lib/security";

// GET /api/admin/sync - Get sync status and history
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const syncService = getResourceSyncService();

    // Check if sync is configured
    if (!syncService.isConfigured()) {
      return NextResponse.json({
        configured: false,
        message: "Google Drive API is not configured. Please set up credentials in .env.local",
      });
    }

    // Get last sync info
    const { lastSyncAt, stats } = await syncService.getLastSyncInfo();

    return NextResponse.json({
      configured: true,
      lastSyncAt,
      stats,
      autoSyncEnabled: process.env.DRIVE_SYNC_AUTO_ENABLED === 'true',
      syncIntervalHours: parseInt(process.env.DRIVE_SYNC_INTERVAL_HOURS || '6'),
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Get sync status") },
      { status: 500 }
    );
  }
}

// POST /api/admin/sync - Trigger manual sync
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const syncService = getResourceSyncService();

    // Check if sync is configured
    if (!syncService.isConfigured()) {
      return NextResponse.json(
        { error: "Google Drive API is not configured" },
        { status: 400 }
      );
    }

    console.log(`Manual sync triggered by user ${session.userId}`);

    // Run sync
    const stats = await syncService.syncAll();

    return NextResponse.json({
      success: true,
      stats,
      message: `Sync completed. Downloaded: ${stats.filesDownloaded}, Updated: ${stats.filesUpdated}, Skipped: ${stats.filesSkipped}`,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: sanitizeError(error, "Sync failed") },
      { status: 500 }
    );
  }
}
