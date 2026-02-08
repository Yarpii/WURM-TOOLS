"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";

interface AuditEntry {
  id: number;
  user_id: number;
  username: string;
  role_id: number;
  role_name: string;
  action: "assigned" | "removed";
  performed_by: number | null;
  performed_by_username: string | null;
  reason: string | null;
  created_at: string;
}

function AuditContent() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterUser, setFilterUser] = useState("");
  const [error, setError] = useState<string | null>(null);

  const LIMIT = 50;

  const loadEntries = async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(LIMIT),
      });
      if (filterUser.trim()) {
        params.set("userId", filterUser.trim());
      }

      const res = await fetch(`/api/admin/audit?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load audit log");
      }
      const data = await res.json();
      setEntries(data.entries || []);
      setHasMore((data.entries || []).length === LIMIT);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries(page);
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadEntries(1);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Audit Log</h1>
        <p className="text-text-secondary">Track role assignments and administrative actions</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
          {error}
        </div>
      )}

      {/* Filter */}
      <form onSubmit={handleSearch} className="mb-6 flex items-center gap-3">
        <input
          type="text"
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          placeholder="Filter by user ID..."
          className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-white text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent w-64"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
        >
          Filter
        </button>
        {filterUser && (
          <button
            type="button"
            onClick={() => {
              setFilterUser("");
              setPage(1);
              loadEntries(1);
            }}
            className="px-4 py-2 bg-bg-secondary border border-border text-text-secondary hover:text-white rounded-lg text-sm transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {/* Entries */}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted">Loading audit log...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            No audit entries found.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((entry) => (
              <div key={entry.id} className="px-6 py-4 flex items-start gap-4">
                {/* Action indicator */}
                <div
                  className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                    entry.action === "assigned" ? "bg-success" : "bg-red-400"
                  }`}
                />

                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white">
                    <Link
                      href={`/members/${entry.user_id}`}
                      className="font-medium hover:text-accent transition-colors"
                    >
                      {entry.username}
                    </Link>
                    {" was "}
                    <span
                      className={
                        entry.action === "assigned" ? "text-success" : "text-red-400"
                      }
                    >
                      {entry.action === "assigned" ? "assigned" : "removed from"}
                    </span>
                    {" role "}
                    <span className="font-medium text-accent">{entry.role_name}</span>
                  </div>

                  <div className="text-text-muted text-xs mt-1">
                    {formatDate(entry.created_at)}
                    {entry.performed_by_username && (
                      <>
                        {" \u00b7 by "}
                        <Link
                          href={`/members/${entry.performed_by}`}
                          className="hover:text-accent transition-colors"
                        >
                          {entry.performed_by_username}
                        </Link>
                      </>
                    )}
                    {entry.reason && ` \u00b7 ${entry.reason}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && entries.length > 0 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-bg-secondary border border-border text-text-secondary hover:text-white rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-text-muted text-sm">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="px-4 py-2 bg-bg-secondary border border-border text-text-secondary hover:text-white rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function AuditPage() {
  return (
    <AdminGuard>
      <AuditContent />
    </AdminGuard>
  );
}
