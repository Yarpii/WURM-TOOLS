/**
 * Google Drive API Client
 *
 * Handles authentication and communication with Google Drive API
 * for syncing community resources
 */

import { google } from 'googleapis';
import type { drive_v3 } from 'googleapis';

interface GoogleDriveConfig {
  apiKey?: string;
  serviceAccountEmail?: string;
  serviceAccountKey?: string;
  serviceAccountKeyFile?: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
  description?: string;
}

interface DriveFolder {
  id: string;
  name: string;
  files: DriveFile[];
  folders: DriveFolder[];
}

class GoogleDriveClient {
  private drive: drive_v3.Drive | null = null;
  private auth: any = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const config = this.getConfig();

      // Use Service Account authentication
      if (config.serviceAccountKey || config.serviceAccountKeyFile) {
        let credentials;

        if (config.serviceAccountKeyFile) {
          // Load from file
          credentials = require(config.serviceAccountKeyFile);
        } else if (config.serviceAccountKey) {
          // Parse from env variable
          credentials = typeof config.serviceAccountKey === 'string'
            ? JSON.parse(config.serviceAccountKey)
            : config.serviceAccountKey;
        }

        this.auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });

        this.drive = google.drive({ version: 'v3', auth: this.auth });
      } else if (config.apiKey) {
        // Fallback to API Key (limited functionality)
        this.drive = google.drive({ version: 'v3', auth: config.apiKey });
      } else {
        console.warn('Google Drive API not configured. Sync will be disabled.');
      }
    } catch (error) {
      console.error('Failed to initialize Google Drive client:', error);
      this.drive = null;
    }
  }

  private getConfig(): GoogleDriveConfig {
    return {
      apiKey: process.env.GOOGLE_DRIVE_API_KEY,
      serviceAccountEmail: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
      serviceAccountKey: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY,
      serviceAccountKeyFile: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_FILE,
    };
  }

  isConfigured(): boolean {
    return this.drive !== null;
  }

  /**
   * List files in a Google Drive folder
   */
  async listFiles(folderId: string, pageToken?: string): Promise<{
    files: DriveFile[];
    nextPageToken?: string;
  }> {
    if (!this.drive) {
      throw new Error('Google Drive client not initialized');
    }

    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, parents, description)',
        pageSize: 100,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      return {
        files: (response.data.files || []) as DriveFile[],
        nextPageToken: response.data.nextPageToken || undefined,
      };
    } catch (error: any) {
      console.error('Error listing Drive files:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Get all files recursively from a folder
   */
  async listAllFiles(folderId: string): Promise<DriveFile[]> {
    const allFiles: DriveFile[] = [];
    let pageToken: string | undefined;

    do {
      const { files, nextPageToken } = await this.listFiles(folderId, pageToken);
      allFiles.push(...files);
      pageToken = nextPageToken;
    } while (pageToken);

    return allFiles;
  }

  /**
   * Get folder structure recursively
   */
  async getFolderStructure(folderId: string, folderName: string = 'Root'): Promise<DriveFolder> {
    const allFiles = await this.listAllFiles(folderId);

    // Separate files and folders
    const files = allFiles.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
    const folderFiles = allFiles.filter(f => f.mimeType === 'application/vnd.google-apps.folder');

    // Recursively get subfolders
    const folders: DriveFolder[] = [];
    for (const folder of folderFiles) {
      try {
        const subFolder = await this.getFolderStructure(folder.id, folder.name);
        folders.push(subFolder);
      } catch (error) {
        console.error(`Failed to get subfolder ${folder.name}:`, error);
      }
    }

    return {
      id: folderId,
      name: folderName,
      files,
      folders,
    };
  }

  /**
   * Download a file from Google Drive
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    if (!this.drive) {
      throw new Error('Google Drive client not initialized');
    }

    try {
      const response = await this.drive.files.get(
        {
          fileId,
          alt: 'media',
          supportsAllDrives: true,
        },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<DriveFile | null> {
    if (!this.drive) {
      throw new Error('Google Drive client not initialized');
    }

    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, parents, description',
        supportsAllDrives: true,
      });

      return response.data as DriveFile;
    } catch (error: any) {
      console.error('Error getting file metadata:', error);
      return null;
    }
  }

  /**
   * Export Google Workspace files to downloadable formats
   */
  async exportFile(fileId: string, mimeType: string): Promise<Buffer> {
    if (!this.drive) {
      throw new Error('Google Drive client not initialized');
    }

    // Map Google Workspace types to export formats
    const exportFormats: Record<string, string> = {
      'application/vnd.google-apps.document': 'application/pdf',
      'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.google-apps.presentation': 'application/pdf',
      'application/vnd.google-apps.drawing': 'application/pdf',
    };

    const exportMimeType = exportFormats[mimeType];
    if (!exportMimeType) {
      throw new Error(`Cannot export file type: ${mimeType}`);
    }

    try {
      const response = await this.drive.files.export(
        {
          fileId,
          mimeType: exportMimeType,
        },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error: any) {
      console.error('Error exporting file:', error);
      throw new Error(`Failed to export file: ${error.message}`);
    }
  }

  /**
   * Check if a file has been modified since a given date
   */
  async hasFileChanged(fileId: string, lastModified: Date): Promise<boolean> {
    const metadata = await this.getFileMetadata(fileId);
    if (!metadata || !metadata.modifiedTime) return false;

    const fileModified = new Date(metadata.modifiedTime);
    return fileModified > lastModified;
  }
}

// Singleton instance
let driveClient: GoogleDriveClient | null = null;

export function getGoogleDriveClient(): GoogleDriveClient {
  if (!driveClient) {
    driveClient = new GoogleDriveClient();
  }
  return driveClient;
}

export type { DriveFile, DriveFolder };
