"use client";

import type { WurmpediaStats, WurmpediaImportLog } from "@/lib/types";

interface ImportContentProps {
  wurmpediaStats: WurmpediaStats | null;
  importLogs: WurmpediaImportLog[];
  importing: boolean;
  clearing: boolean;
  previewData: { count: number; sample: Array<{ id: number; name: string }> } | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  onClearAll: () => void;
}

export default function ImportContent({
  wurmpediaStats,
  importLogs,
  importing,
  clearing,
  previewData,
  fileInputRef,
  onFileSelect,
  onImport,
  onClearAll,
}: ImportContentProps) {
  return (
    <>
      {/* Import Section */}
      <div className="bg-bg-secondary border border-border p-6 rounded-xl">
        <h2 className="text-accent text-xl font-semibold mb-4">Import Wurmpedia Recipes</h2>
        <p className="text-text-secondary mb-4">
          Upload a JSON file exported from Wurmpedia containing recipe data. The import will add
          new recipes and update existing ones (by wurmpedia_id).
        </p>

        <div className="space-y-4">
          {/* File Input */}
          <div className="p-4 bg-white/5 rounded-lg">
            <label className="block text-white font-medium mb-2">Select JSON File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={onFileSelect}
              className="block w-full text-sm text-text-secondary
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-accent file:text-white
                hover:file:bg-accent-hover
                file:cursor-pointer cursor-pointer"
            />
          </div>

          {/* Preview */}
          {previewData && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h3 className="text-blue-400 font-medium mb-2">
                Preview: {previewData.count} recipes found
              </h3>
              <div className="text-sm text-text-secondary space-y-1">
                {previewData.sample.map((r) => (
                  <div key={r.id}>
                    #{r.id}: {r.name}
                  </div>
                ))}
                {previewData.count > 5 && (
                  <div className="text-text-tertiary">...and {previewData.count - 5} more</div>
                )}
              </div>
              <button
                onClick={onImport}
                disabled={importing}
                className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importing && <span className="animate-spin">&#9881;</span>}
                {importing ? "Importing..." : `Import ${previewData.count} Recipes`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Import Logs */}
      {importLogs.length > 0 && (
        <div className="bg-bg-secondary border border-border p-6 rounded-xl">
          <h2 className="text-accent text-xl font-semibold mb-4">Recent Imports</h2>
          <div className="space-y-2">
            {importLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-white/5 rounded-lg flex items-center justify-between"
              >
                <div>
                  <span className="text-green-400">+{log.recipes_added}</span>
                  <span className="text-text-secondary mx-2">/</span>
                  <span className="text-blue-400">~{log.recipes_updated}</span>
                  {log.recipes_failed > 0 && (
                    <>
                      <span className="text-text-secondary mx-2">/</span>
                      <span className="text-red-400">-{log.recipes_failed}</span>
                    </>
                  )}
                </div>
                <span className="text-text-secondary text-sm">
                  {new Date(log.imported_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-bg-secondary border border-border p-6 rounded-xl">
        <h2 className="text-red-400 text-xl font-semibold mb-4">Danger Zone</h2>
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <h3 className="font-medium text-white mb-2">Clear All Wurmpedia Recipes</h3>
          <p className="text-text-secondary text-sm mb-3">
            Delete all imported Wurmpedia recipes. This does NOT delete activated calculator items.
            Use this before re-importing to avoid duplicates.
          </p>
          <button
            onClick={onClearAll}
            disabled={clearing || (wurmpediaStats?.total_recipes || 0) === 0}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {clearing && <span className="animate-spin">&#9881;</span>}
            {clearing ? "Clearing..." : "Clear All Recipes"}
          </button>
        </div>
      </div>
    </>
  );
}
