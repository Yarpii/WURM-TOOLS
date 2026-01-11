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
      console.log('Scheduler already running');
      return;
    }

    this.running = true;
    console.log('Starting background scheduler...');

    // Schedule Google Drive sync if enabled
    if (process.env.DRIVE_SYNC_AUTO_ENABLED === 'true') {
      this.scheduleGoogleDriveSync();
    }

    console.log('Background scheduler started');
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    console.log('Stopping background scheduler...');
    this.intervals.forEach((interval, task) => {
      clearInterval(interval);
      console.log(`Stopped task: ${task}`);
    });
    this.intervals.clear();
    this.running = false;
    console.log('Background scheduler stopped');
  }

  /**
   * Schedule Google Drive sync task
   */
  private scheduleGoogleDriveSync() {
    const syncService = getResourceSyncService();

    if (!syncService.isConfigured()) {
      console.log('Google Drive sync not configured, skipping scheduler');
      return;
    }

    const intervalHours = parseInt(process.env.DRIVE_SYNC_INTERVAL_HOURS || '6');
    const intervalMs = intervalHours * 60 * 60 * 1000;

    console.log(`Scheduling Google Drive sync every ${intervalHours} hours`);

    // Run initial sync after 1 minute (to allow server to fully start)
    setTimeout(async () => {
      console.log('Running initial Google Drive sync...');
      try {
        const stats = await syncService.syncAll();
        console.log(`Initial sync completed: ${stats.filesDownloaded} downloaded, ${stats.filesUpdated} updated`);
      } catch (error) {
        console.error('Initial sync failed:', error);
      }
    }, 60 * 1000);

    // Schedule periodic sync
    const interval = setInterval(async () => {
      console.log('Running scheduled Google Drive sync...');
      try {
        const stats = await syncService.syncAll();
        console.log(`Scheduled sync completed: ${stats.filesDownloaded} downloaded, ${stats.filesUpdated} updated`);
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
    console.log('SIGTERM received, stopping scheduler...');
    autoScheduler.stop();
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, stopping scheduler...');
    autoScheduler.stop();
  });
}
