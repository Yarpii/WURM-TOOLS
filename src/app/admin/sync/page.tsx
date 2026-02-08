"use client";

import { useState, useEffect } from "react";
import AdminGuard from "@/components/AdminGuard";

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
      <div>
        <div className="text-center text-text-muted py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Google Drive Sync</h1>
        <p className="text-text-secondary">
          Manage automatic synchronization of community resources from Google Drive
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-success/20 text-success border border-success/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Configuration Status */}
      <div className="bg-bg-secondary rounded-xl p-6 mb-6 border border-border">
        <h2 className="text-xl font-semibold text-white mb-4">Configuration Status</h2>

        {!syncInfo?.configured ? (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-4 rounded-lg">
            <p className="font-semibold mb-2">Google Drive API Not Configured</p>
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
                See <code className="bg-bg-tertiary px-2 py-1 rounded">.env.example</code> for details
              </p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-text-secondary text-sm">Status</p>
              <p className="text-white font-semibold">Configured</p>
            </div>
            <div>
              <p className="text-text-secondary text-sm">Auto Sync</p>
              <p className="text-white font-semibold">
                {syncInfo.autoSyncEnabled ? (
                  <span className="text-success">
                    Enabled (every {syncInfo.syncIntervalHours}h)
                  </span>
                ) : (
                  <span className="text-text-muted">Disabled</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Last Sync Info */}
      {syncInfo?.configured && (
        <>
          <div className="bg-bg-secondary rounded-xl p-6 mb-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Last Sync</h2>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {syncing ? "Syncing..." : "Sync Now"}
              </button>
            </div>

            {!syncInfo.lastSyncAt ? (
              <p className="text-text-muted">No sync has been performed yet</p>
            ) : (
              <>
                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-text-secondary text-sm">Last Synced</p>
                    <p className="text-white font-semibold">{formatDate(syncInfo.lastSyncAt)}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary text-sm">Duration</p>
                    <p className="text-white font-semibold">
                      {syncInfo.stats ? formatDuration(syncInfo.stats.duration) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-secondary text-sm">Total Size</p>
                    <p className="text-white font-semibold">
                      {syncInfo.stats ? formatBytes(syncInfo.stats.totalSize) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-secondary text-sm">Files</p>
                    <p className="text-white font-semibold">
                      {syncInfo.stats
                        ? `${syncInfo.stats.filesDownloaded + syncInfo.stats.filesUpdated} synced`
                        : "—"}
                    </p>
                  </div>
                </div>

                {syncInfo.stats && (
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="bg-white/5 p-3 rounded-lg">
                      <p className="text-success text-2xl font-bold">
                        {syncInfo.stats.filesDownloaded}
                      </p>
                      <p className="text-text-secondary text-sm">Downloaded</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg">
                      <p className="text-accent text-2xl font-bold">
                        {syncInfo.stats.filesUpdated}
                      </p>
                      <p className="text-text-secondary text-sm">Updated</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg">
                      <p className="text-text-muted text-2xl font-bold">
                        {syncInfo.stats.filesSkipped}
                      </p>
                      <p className="text-text-secondary text-sm">Skipped</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg">
                      <p className="text-red-400 text-2xl font-bold">
                        {syncInfo.stats.filesDeleted}
                      </p>
                      <p className="text-text-secondary text-sm">Deleted</p>
                    </div>
                  </div>
                )}

                {syncInfo.stats?.errors && syncInfo.stats.errors.length > 0 && (
                  <div className="mt-4 bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-400 font-semibold mb-2">Errors ({syncInfo.stats.errors.length})</p>
                    <div className="text-sm text-red-400 space-y-1 max-h-40 overflow-y-auto">
                      {syncInfo.stats.errors.map((error, idx) => (
                        <div key={idx}>- {error}</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Information */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-border">
            <h2 className="text-xl font-semibold text-white mb-4">How It Works</h2>
            <div className="text-text-secondary space-y-2 text-sm">
              <p>
                The sync process downloads files from your Google Drive community folder to local storage.
              </p>
              <p>
                Files are stored in <code className="bg-bg-tertiary px-2 py-1 rounded">/public/resources/community/</code>
              </p>
              <p>
                Users access files directly from your server (much faster than Google Drive).
              </p>
              <p>
                Changes are detected automatically — only modified files are re-downloaded.
              </p>
              <p>
                Automatic sync runs every {syncInfo.syncIntervalHours} hours when enabled.
              </p>
              <p>
                Deleted files from Drive are automatically removed from local storage.
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
