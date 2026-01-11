"use client";

import { useState, useEffect } from "react";
import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";

interface SyncStats {
  filesDownloaded: number;
  filesUpdated: number;
  filesSkipped: number;
  filesDeleted: number;
  errors: string[];
  totalSize: number;
  duration: number;
}

interface SyncInfo {
  configured: boolean;
  lastSyncAt: string | null;
  stats: SyncStats | null;
  autoSyncEnabled: boolean;
  syncIntervalHours: number;
  message?: string;
}

function AdminSyncContent() {
  const [syncInfo, setSyncInfo] = useState<SyncInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadSyncInfo = async () => {
    try {
      const response = await fetch("/api/admin/sync");
      if (!response.ok) throw new Error("Failed to load sync info");

      const data = await response.json();
      setSyncInfo(data);
    } catch (error) {
      console.error("Error loading sync info:", error);
      setMessage({ type: "error", text: "Failed to load sync information" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSyncInfo();
  }, []);

  const handleSync = async () => {
    if (!confirm("Start Google Drive sync? This may take several minutes.")) {
      return;
    }

    setSyncing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sync failed");
      }

      setMessage({
        type: "success",
        text: data.message || "Sync completed successfully",
      });

      // Reload sync info
      await loadSyncInfo();
    } catch (error) {
      console.error("Sync error:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Sync failed",
      });
    } finally {
      setSyncing(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    const mb = bytes / 1024 / 1024;
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const formatDuration = (ms: number): string => {
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${minutes.toFixed(1)}m`;
    const hours = minutes / 60;
    return `${hours.toFixed(1)}h`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-400 py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin" className="text-blue-500 hover:text-blue-400 mb-4 inline-block">
          ← Back to Admin
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">Google Drive Sync</h1>
        <p className="text-gray-400">
          Manage automatic synchronization of community resources from Google Drive
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500 text-green-500"
              : "bg-red-500/10 border border-red-500 text-red-500"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Configuration Status */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Configuration Status</h2>

        {!syncInfo?.configured ? (
          <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-500 p-4 rounded">
            <p className="font-semibold mb-2">⚠️ Google Drive API Not Configured</p>
            <p className="text-sm mb-4">{syncInfo?.message || "Please set up Google Drive API credentials"}</p>
            <div className="text-sm space-y-2">
              <p>To enable sync:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Go to Google Cloud Console</li>
                <li>Enable Google Drive API</li>
                <li>Create Service Account credentials</li>
                <li>Share your Drive folder with the service account email</li>
                <li>Add credentials to .env.local</li>
              </ol>
              <p className="mt-2">
                See <code className="bg-gray-900 px-2 py-1 rounded">.env.example</code> for details
              </p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Status</p>
              <p className="text-white font-semibold">✓ Configured</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Auto Sync</p>
              <p className="text-white font-semibold">
                {syncInfo.autoSyncEnabled ? (
                  <span className="text-green-500">
                    Enabled (every {syncInfo.syncIntervalHours}h)
                  </span>
                ) : (
                  <span className="text-gray-500">Disabled</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Last Sync Info */}
      {syncInfo?.configured && (
        <>
          <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Last Sync</h2>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
              >
                {syncing ? "Syncing..." : "Sync Now"}
              </button>
            </div>

            {!syncInfo.lastSyncAt ? (
              <p className="text-gray-400">No sync has been performed yet</p>
            ) : (
              <>
                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-gray-400 text-sm">Last Synced</p>
                    <p className="text-white font-semibold">{formatDate(syncInfo.lastSyncAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Duration</p>
                    <p className="text-white font-semibold">
                      {syncInfo.stats ? formatDuration(syncInfo.stats.duration) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total Size</p>
                    <p className="text-white font-semibold">
                      {syncInfo.stats ? formatBytes(syncInfo.stats.totalSize) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Files</p>
                    <p className="text-white font-semibold">
                      {syncInfo.stats
                        ? `${syncInfo.stats.filesDownloaded + syncInfo.stats.filesUpdated} synced`
                        : "—"}
                    </p>
                  </div>
                </div>

                {syncInfo.stats && (
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="bg-gray-750 p-3 rounded">
                      <p className="text-green-500 text-2xl font-bold">
                        {syncInfo.stats.filesDownloaded}
                      </p>
                      <p className="text-gray-400 text-sm">Downloaded</p>
                    </div>
                    <div className="bg-gray-750 p-3 rounded">
                      <p className="text-blue-500 text-2xl font-bold">
                        {syncInfo.stats.filesUpdated}
                      </p>
                      <p className="text-gray-400 text-sm">Updated</p>
                    </div>
                    <div className="bg-gray-750 p-3 rounded">
                      <p className="text-gray-500 text-2xl font-bold">
                        {syncInfo.stats.filesSkipped}
                      </p>
                      <p className="text-gray-400 text-sm">Skipped</p>
                    </div>
                    <div className="bg-gray-750 p-3 rounded">
                      <p className="text-red-500 text-2xl font-bold">
                        {syncInfo.stats.filesDeleted}
                      </p>
                      <p className="text-gray-400 text-sm">Deleted</p>
                    </div>
                  </div>
                )}

                {syncInfo.stats?.errors && syncInfo.stats.errors.length > 0 && (
                  <div className="mt-4 bg-red-500/10 border border-red-500 rounded p-4">
                    <p className="text-red-500 font-semibold mb-2">Errors ({syncInfo.stats.errors.length})</p>
                    <div className="text-sm text-red-400 space-y-1 max-h-40 overflow-y-auto">
                      {syncInfo.stats.errors.map((error, idx) => (
                        <div key={idx}>• {error}</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Information */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">How It Works</h2>
            <div className="text-gray-300 space-y-2 text-sm">
              <p>
                • The sync process downloads files from your Google Drive community folder to local storage
              </p>
              <p>
                • Files are stored in <code className="bg-gray-900 px-2 py-1 rounded">/public/resources/community/</code>
              </p>
              <p>
                • Users access files directly from your server (much faster than Google Drive)
              </p>
              <p>
                • Changes are detected automatically - only modified files are re-downloaded
              </p>
              <p>
                • Automatic sync runs every {syncInfo.syncIntervalHours} hours when enabled
              </p>
              <p>
                • Deleted files from Drive are automatically removed from local storage
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminSyncPage() {
  return (
    <AdminGuard>
      <AdminSyncContent />
    </AdminGuard>
  );
}
