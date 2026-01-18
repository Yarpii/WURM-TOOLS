/**
 * Background Scheduler for Automated Tasks
 *
 * Handles periodic tasks like Google Drive sync
 */

import { getResourceSyncService } from './resource-sync';

class TaskScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private running = false;

  /**
   * Start all scheduled tasks
   */
  start() {
    if (this.running) {
      return;
    }

    this.running = true;

    // Schedule Google Drive sync if enabled
    if (process.env.DRIVE_SYNC_AUTO_ENABLED === 'true') {
      this.scheduleGoogleDriveSync();
    }
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();
    this.running = false;
  }

  /**
   * Schedule Google Drive sync task
   */
  private scheduleGoogleDriveSync() {
    const syncService = getResourceSyncService();

    if (!syncService.isConfigured()) {
      return;
    }

    const intervalHours = parseInt(process.env.DRIVE_SYNC_INTERVAL_HOURS || '6');
    const intervalMs = intervalHours * 60 * 60 * 1000;

    // Run initial sync after 1 minute (to allow server to fully start)
    setTimeout(async () => {
      try {
        await syncService.syncAll();
      } catch (error) {
        console.error('Initial sync failed:', error);
      }
    }, 60 * 1000);

    // Schedule periodic sync
    const interval = setInterval(async () => {
      try {
        await syncService.syncAll();
      } catch (error) {
        console.error('Scheduled sync failed:', error);
      }
    }, intervalMs);

    this.intervals.set('google-drive-sync', interval);
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.running;
  }
}

// Singleton instance
let scheduler: TaskScheduler | null = null;

export function getScheduler(): TaskScheduler {
  if (!scheduler) {
    scheduler = new TaskScheduler();
  }
  return scheduler;
}

// Auto-start scheduler when this module is imported
// Only in production or when explicitly enabled
if (
  process.env.NODE_ENV === 'production' ||
  process.env.ENABLE_SCHEDULER === 'true'
) {
  const autoScheduler = getScheduler();
  autoScheduler.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    autoScheduler.stop();
  });

  process.on('SIGINT', () => {
    autoScheduler.stop();
  });
}
