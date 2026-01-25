"use client";

import { useState, useEffect } from "react";
import { SessionInfo } from "./types";

export default function ActiveSessionsSection() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [sessionSuccess, setSessionSuccess] = useState("");

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/auth/sessions");
      const data = await res.json();
      if (res.ok) {
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setSessionError("");
    setSessionSuccess("");
    setRevokingSession(sessionId);

    try {
      const res = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSessionError(data.error || "Failed to revoke session");
        return;
      }

      setSessionSuccess("Session revoked successfully");
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch (err) {
      setSessionError("Failed to revoke session: " + String(err));
    } finally {
      setRevokingSession(null);
    }
  };

  const revokeAllOther = async () => {
    setSessionError("");
    setSessionSuccess("");
    setRevokingSession("all");

    try {
      const res = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSessionError(data.error || "Failed to revoke sessions");
        return;
      }

      setSessionSuccess(data.message || "All other sessions revoked");
      setSessions(sessions.filter((s) => s.isCurrent));
    } catch (err) {
      setSessionError("Failed to revoke sessions: " + String(err));
    } finally {
      setRevokingSession(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-text-primary">
          Active Sessions
        </h2>
        {sessions.length > 1 && (
          <button
            onClick={revokeAllOther}
            disabled={revokingSession !== null}
            className="text-sm text-danger hover:text-danger/80 transition-colors disabled:opacity-50"
          >
            {revokingSession === "all"
              ? "Logging out..."
              : "Log out all other devices"}
          </button>
        )}
      </div>
      <p className="text-text-muted mb-4">
        Manage devices where you&apos;re currently logged in
      </p>

      {sessionError && (
        <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
          {sessionError}
        </div>
      )}

      {sessionSuccess && (
        <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
          {sessionSuccess}
        </div>
      )}

      {loadingSessions ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 bg-bg-tertiary rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-text-muted text-sm">No active sessions found.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-4 rounded-lg border ${
                session.isCurrent
                  ? "bg-accent/5 border-accent/30"
                  : "bg-bg-tertiary border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${session.isCurrent ? "bg-accent/10" : "bg-bg-secondary"}`}
                  >
                    <svg
                      className={`w-5 h-5 ${session.isCurrent ? "text-accent" : "text-text-muted"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">
                        {session.deviceName || "Unknown device"}
                      </span>
                      {session.isCurrent && (
                        <span className="px-2 py-0.5 text-xs bg-accent/20 text-accent rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-text-muted mt-0.5">
                      {session.ipAddress && <span>{session.ipAddress} • </span>}
                      {session.lastActiveAt
                        ? `Last active: ${formatDate(session.lastActiveAt)}`
                        : `Created: ${formatDate(session.createdAt)}`}
                    </div>
                  </div>
                </div>
                {!session.isCurrent && (
                  <button
                    onClick={() => revokeSession(session.id)}
                    disabled={revokingSession !== null}
                    className="text-sm text-danger hover:text-danger/80 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {revokingSession === session.id ? "Revoking..." : "Log out"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-info/10 border border-info/30 rounded-lg">
        <p className="text-xs text-text-muted">
          <strong className="text-text-secondary">Tip:</strong> If you see a
          device you don&apos;t recognize, log it out immediately and change
          your password.
        </p>
      </div>
    </div>
  );
}
