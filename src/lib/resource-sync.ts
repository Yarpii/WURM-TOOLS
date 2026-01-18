/**
 * Resource Sync Service
 *
 * Handles downloading and syncing files from Google Drive to local storage
 */

import fs from 'fs/promises';
import path from 'path';
import { getGoogleDriveClient } from './google-drive';
import type { DriveFile, DriveFolder } from './google-drive';
import { query } from './database';

interface SyncStats {
  filesDownloaded: number;
  filesUpdated: number;
  filesSkipped: number;
  filesDeleted: number;
  errors: string[];
  totalSize: number;
  duration: number;
}

interface SyncMetadata {
  id: number;
  drive_file_id: string;
  drive_folder_id: string;
  file_name: string;
  local_path: string;
  file_size: number;
  mime_type: string;
  drive_modified_time: string;
  last_synced_at: string;
  checksum?: string;
}

export class ResourceSyncService {
  private readonly LOCAL_STORAGE_PATH = path.join(process.cwd(), 'public', 'resources', 'community');
  private readonly MAX_FILE_SIZE = parseInt(process.env.DRIVE_MAX_FILE_SIZE_MB || '100') * 1024 * 1024; // 100MB default
  private driveClient = getGoogleDriveClient();

  /**
   * Check if Google Drive is configured
   */
  isConfigured(): boolean {
    return this.driveClient.isConfigured();
  }

  /**
   * Ensure local storage directory exists
   */
  private async ensureStorageDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      console.error(`Failed to create directory ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Sanitize filename for safe storage
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }

  /**
   * Get file extension based on mime type
   */
  private getExtensionForMimeType(mimeType: string, originalName: string): string {
    // Try to get extension from original name first
    const originalExt = path.extname(originalName);
    if (originalExt) return originalExt;

    // Fallback to mime type mapping
    const mimeToExt: Record<string, string> = {
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/msword': '.doc',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'text/plain': '.txt',
      'text/csv': '.csv',
    };

    return mimeToExt[mimeType] || '';
  }

  /**
   * Check if file should be synced (size limits, file type, etc.)
   */
  private shouldSyncFile(file: DriveFile): { sync: boolean; reason?: string } {
    // Skip Google Workspace files that can't be directly downloaded
    const googleAppTypes = [
      'application/vnd.google-apps.folder',
      'application/vnd.google-apps.shortcut',
    ];

    if (googleAppTypes.includes(file.mimeType)) {
      return { sync: false, reason: 'Google app type (will be exported)' };
    }

    // Check file size
    const fileSize = parseInt(file.size || '0');
    if (fileSize > this.MAX_FILE_SIZE) {
      return { sync: false, reason: `File too large (${(fileSize / 1024 / 1024).toFixed(2)}MB)` };
    }

    return { sync: true };
  }

  /**
   * Get sync metadata from database
   */
  private async getSyncMetadata(driveFileId: string): Promise<SyncMetadata | null> {
    const result = await query<SyncMetadata>(
      'SELECT * FROM resource_sync_metadata WHERE drive_file_id = ?',
      [driveFileId]
    );
    return result.rows[0] || null;
  }

  /**
   * Save sync metadata to database
   */
  private async saveSyncMetadata(data: Partial<SyncMetadata>): Promise<void> {
    await query(
      `INSERT INTO resource_sync_metadata
       (drive_file_id, drive_folder_id, file_name, local_path, file_size, mime_type, drive_modified_time, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         file_name = VALUES(file_name),
         local_path = VALUES(local_path),
         file_size = VALUES(file_size),
         mime_type = VALUES(mime_type),
         drive_modified_time = VALUES(drive_modified_time),
         last_synced_at = NOW()`,
      [
        data.drive_file_id,
        data.drive_folder_id,
        data.file_name,
        data.local_path,
        data.file_size,
        data.mime_type,
        data.drive_modified_time,
      ]
    );
  }

  /**
   * Download a single file from Google Drive
   */
  private async downloadFile(
    file: DriveFile,
    folderId: string,
    localDir: string,
    stats: SyncStats
  ): Promise<void> {
    try {
      // Check if we should sync this file
      const { sync } = this.shouldSyncFile(file);
      if (!sync) {
        stats.filesSkipped++;
        return;
      }

      // Check if file needs updating
      const metadata = await this.getSyncMetadata(file.id);
      if (metadata && file.modifiedTime) {
        const driveModified = new Date(file.modifiedTime);
        const lastSynced = new Date(metadata.drive_modified_time);

        if (driveModified <= lastSynced) {
          stats.filesSkipped++;
          return;
        }
      }

      // Determine if this is a Google Workspace file that needs exporting
      const isGoogleDoc = file.mimeType.startsWith('application/vnd.google-apps.');
      let fileBuffer: Buffer;
      let finalMimeType = file.mimeType;

      if (isGoogleDoc && !file.mimeType.includes('folder') && !file.mimeType.includes('shortcut')) {
        // Export Google Workspace file
        fileBuffer = await this.driveClient.exportFile(file.id, file.mimeType);

        // Update mime type based on export format
        if (file.mimeType.includes('document')) {
          finalMimeType = 'application/pdf';
        } else if (file.mimeType.includes('spreadsheet')) {
          finalMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        }
      } else {
        // Download regular file
        fileBuffer = await this.driveClient.downloadFile(file.id);
      }

      // Sanitize filename and ensure proper extension
      const ext = this.getExtensionForMimeType(finalMimeType, file.name);
      const baseName = path.parse(file.name).name;
      const sanitizedName = this.sanitizeFilename(baseName) + ext;
      const localPath = path.join(localDir, sanitizedName);

      // Save file to disk
      await fs.writeFile(localPath, fileBuffer);

      // Get relative path for database
      const relativePath = path.relative(path.join(process.cwd(), 'public'), localPath);

      // Save metadata
      await this.saveSyncMetadata({
        drive_file_id: file.id,
        drive_folder_id: folderId,
        file_name: file.name,
        local_path: '/' + relativePath.replace(/\\/g, '/'),
        file_size: fileBuffer.length,
        mime_type: finalMimeType,
        drive_modified_time: file.modifiedTime || new Date().toISOString(),
      });

      stats.totalSize += fileBuffer.length;
      if (metadata) {
        stats.filesUpdated++;
      } else {
        stats.filesDownloaded++;
      }
    } catch (error) {
      console.error(`Failed to download ${file.name}:`, error);
      stats.errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync a folder recursively
   */
  private async syncFolder(
    folder: DriveFolder,
    parentPath: string,
    stats: SyncStats
  ): Promise<void> {
    // Create local folder
    const localDir = path.join(parentPath, this.sanitizeFilename(folder.name));
    await this.ensureStorageDirectory(localDir);

    // Download all files in this folder
    for (const file of folder.files) {
      await this.downloadFile(file, folder.id, localDir, stats);
    }

    // Recursively sync subfolders
    for (const subfolder of folder.folders) {
      await this.syncFolder(subfolder, localDir, stats);
    }
  }

  /**
   * Clean up orphaned files (files that no longer exist in Drive)
   */
  private async cleanupOrphanedFiles(folderId: string, stats: SyncStats): Promise<void> {
    try {
      // Get all synced files for this folder
      const result = await query<SyncMetadata>(
        'SELECT * FROM resource_sync_metadata WHERE drive_folder_id = ?',
        [folderId]
      );

      // Get current Drive files
      const driveFiles = await this.driveClient.listAllFiles(folderId);
      const driveFileIds = new Set(driveFiles.map(f => f.id));

      // Delete files that no longer exist in Drive
      for (const metadata of result.rows) {
        if (!driveFileIds.has(metadata.drive_file_id)) {
          try {
            // Delete local file
            const fullPath = path.join(process.cwd(), 'public', metadata.local_path);
            await fs.unlink(fullPath);

            // Delete metadata
            await query(
              'DELETE FROM resource_sync_metadata WHERE id = ?',
              [metadata.id]
            );

            stats.filesDeleted++;
          } catch (error) {
            console.error(`Failed to delete ${metadata.file_name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up orphaned files:', error);
      stats.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync all resources from Google Drive
   */
  async syncAll(): Promise<SyncStats> {
    const startTime = Date.now();
    const stats: SyncStats = {
      filesDownloaded: 0,
      filesUpdated: 0,
      filesSkipped: 0,
      filesDeleted: 0,
      errors: [],
      totalSize: 0,
      duration: 0,
    };

    if (!this.isConfigured()) {
      throw new Error('Google Drive API is not configured');
    }

    try {
      const folderId = process.env.GOOGLE_DRIVE_COMMUNITY_FOLDER_ID;
      if (!folderId) {
        throw new Error('GOOGLE_DRIVE_COMMUNITY_FOLDER_ID not set');
      }

      // Ensure base storage directory exists
      await this.ensureStorageDirectory(this.LOCAL_STORAGE_PATH);

      // Get folder structure
      const folderStructure = await this.driveClient.getFolderStructure(folderId, 'Community');

      // Sync all files and folders
      await this.syncFolder(folderStructure, this.LOCAL_STORAGE_PATH, stats);

      // Clean up orphaned files
      await this.cleanupOrphanedFiles(folderId, stats);

      // Update last sync time in database
      await query(
        `INSERT INTO resource_sync_log (folder_id, files_downloaded, files_updated, files_skipped, files_deleted, total_size, errors, duration)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          folderId,
          stats.filesDownloaded,
          stats.filesUpdated,
          stats.filesSkipped,
          stats.filesDeleted,
          stats.totalSize,
          JSON.stringify(stats.errors),
          Date.now() - startTime,
        ]
      );

      stats.duration = Date.now() - startTime;

      return stats;
    } catch (error) {
      console.error('Sync failed:', error);
      stats.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      stats.duration = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Get last sync information
   */
  async getLastSyncInfo(): Promise<{
    lastSyncAt: string | null;
    stats: SyncStats | null;
  }> {
    try {
      const result = await query<{
        synced_at: string;
        files_downloaded: number;
        files_updated: number;
        files_skipped: number;
        files_deleted: number;
        total_size: number;
        errors: string;
        duration: number;
      }>(
        `SELECT * FROM resource_sync_log
         ORDER BY synced_at DESC
         LIMIT 1`
      );

      if (result.rows.length === 0) {
        return { lastSyncAt: null, stats: null };
      }

      const row = result.rows[0];
      return {
        lastSyncAt: row.synced_at,
        stats: {
          filesDownloaded: row.files_downloaded,
          filesUpdated: row.files_updated,
          filesSkipped: row.files_skipped,
          filesDeleted: row.files_deleted,
          errors: JSON.parse(row.errors || '[]'),
          totalSize: row.total_size,
          duration: row.duration,
        },
      };
    } catch (error) {
      console.error('Failed to get last sync info:', error);
      return { lastSyncAt: null, stats: null };
    }
  }
}

// Singleton instance
let syncService: ResourceSyncService | null = null;

export function getResourceSyncService(): ResourceSyncService {
  if (!syncService) {
    syncService = new ResourceSyncService();
  }
  return syncService;
}

export type { SyncStats, SyncMetadata };
