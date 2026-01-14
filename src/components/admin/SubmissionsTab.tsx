"use client";

import { useState, useEffect } from "react";
import type { RecipeSubmission } from "./types";
import type { RecipeIngredientInput } from "@/lib/types";

interface SubmissionsTabProps {
  onDataChange: () => void;
  showMessage: (type: "success" | "error", text: string) => void;
  onPendingCountChange: (count: number) => void;
}

export default function SubmissionsTab({ onDataChange, showMessage, onPendingCountChange }: SubmissionsTabProps) {
  const [submissions, setSubmissions] = useState<RecipeSubmission[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [reviewingSubmission, setReviewingSubmission] = useState<RecipeSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    loadSubmissions();
    loadPendingCount();
  }, []);

  const loadSubmissions = async () => {
    try {
      const res = await fetch("/api/recipe-submissions?all=true");
      const data = await res.json();
      if (Array.isArray(data)) {
        setSubmissions(data);
      }
    } catch (err) {
      console.error("Failed to load submissions:", err);
    }
  };

  const loadPendingCount = async () => {
    try {
      const res = await fetch("/api/recipe-submissions?count=true");
      const data = await res.json();
      const count = data.count || 0;
      setPendingCount(count);
      onPendingCountChange(count);
    } catch (err) {
      console.error("Failed to load pending count:", err);
    }
  };

  const handleApproveSubmission = async (id: number, addToDatabase: boolean = false) => {
    try {
      const res = await fetch(`/api/recipe-submissions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          admin_notes: adminNotes,
          approve_and_add: addToDatabase,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (addToDatabase) {
          showMessage("success", `Recipe approved! Added ${data.itemsCreated || 0} items and ${data.recipesCreated || 0} recipes.`);
        } else {
          showMessage("success", "Recipe approved!");
        }
        setReviewingSubmission(null);
        setAdminNotes("");
        loadSubmissions();
        loadPendingCount();
        onDataChange();
      } else {
        showMessage("error", data.error || "Failed to approve submission");
      }
    } catch (err) {
      showMessage("error", "Connection error: " + String(err));
    }
  };

  const handleRejectSubmission = async (id: number) => {
    try {
      const res = await fetch(`/api/recipe-submissions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          admin_notes: adminNotes,
        }),
      });

      if (res.ok) {
        showMessage("success", "Submission rejected");
        setReviewingSubmission(null);
        setAdminNotes("");
        loadSubmissions();
        loadPendingCount();
      } else {
        const data = await res.json();
        showMessage("error", data.error || "Failed to reject submission");
      }
    } catch (err) {
      showMessage("error", "Connection error: " + String(err));
    }
  };

  const handleDeleteSubmission = async (id: number) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;

    try {
      const res = await fetch(`/api/recipe-submissions/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showMessage("success", "Submission deleted");
        loadSubmissions();
        loadPendingCount();
      } else {
        const data = await res.json();
        showMessage("error", data.error || "Failed to delete submission");
      }
    } catch (err) {
      showMessage("error", "Connection error: " + String(err));
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "approved":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      case "rejected":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  return (
    <div className="space-y-6">
      {/* Review Modal */}
      {reviewingSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-accent">Review Submission</h2>
              <button
                onClick={() => {
                  setReviewingSubmission(null);
                  setAdminNotes("");
                }}
                className="text-text-secondary hover:text-white"
              >
                &#10005;
              </button>
            </div>

            {/* Submission Details */}
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-text-secondary text-sm">Item Name</p>
                <p className="text-white text-lg font-medium">{reviewingSubmission.item_name}</p>
              </div>

              <div>
                <p className="text-text-secondary text-sm mb-2">Ingredients</p>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    try {
                      const ings: RecipeIngredientInput[] = JSON.parse(reviewingSubmission.ingredients);
                      return ings.map((ing, i) => (
                        <span key={i} className="px-3 py-1 bg-bg-tertiary rounded text-white">
                          {ing.quantity}x {ing.name}
                        </span>
                      ));
                    } catch {
                      return <span className="text-red-400">Invalid ingredients data</span>;
                    }
                  })()}
                </div>
              </div>

              {reviewingSubmission.source_url && (
                <div>
                  <p className="text-text-secondary text-sm">Source</p>
                  <a
                    href={reviewingSubmission.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline break-all"
                  >
                    {reviewingSubmission.source_url}
                  </a>
                </div>
              )}

              {reviewingSubmission.notes && (
                <div>
                  <p className="text-text-secondary text-sm">Notes from User</p>
                  <p className="text-white">{reviewingSubmission.notes}</p>
                </div>
              )}

              <div className="text-text-secondary text-sm">
                Submitted by <span className="text-white">{reviewingSubmission.username}</span> on{" "}
                {new Date(reviewingSubmission.created_at).toLocaleDateString()}
              </div>
            </div>

            {/* Admin Notes */}
            <div className="mb-6">
              <label className="block text-text-secondary text-sm mb-2">Admin Notes (optional)</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add a note for the user..."
                rows={3}
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleApproveSubmission(reviewingSubmission.id, true)}
                className="px-4 py-2 bg-success hover:bg-success/80 text-white rounded-lg font-medium transition-colors"
              >
                Approve & Add to Database
              </button>
              <button
                onClick={() => handleApproveSubmission(reviewingSubmission.id, false)}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
              >
                Approve Only
              </button>
              <button
                onClick={() => handleRejectSubmission(reviewingSubmission.id)}
                className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg font-medium transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  setReviewingSubmission(null);
                  setAdminNotes("");
                }}
                className="px-4 py-2 bg-bg-tertiary border border-border hover:border-accent text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submissions List */}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-accent text-xl font-semibold">
            Recipe Submissions ({submissions.length})
          </h2>
          {pendingCount > 0 && (
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/50 rounded-full text-sm">
              {pendingCount} pending
            </span>
          )}
        </div>

        {submissions.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">No recipe submissions yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {submissions.map((sub) => {
              let ingredients: RecipeIngredientInput[] = [];
              try {
                ingredients = JSON.parse(sub.ingredients);
              } catch {
                ingredients = [];
              }

              return (
                <div key={sub.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-white font-medium">{sub.item_name}</h3>
                      <p className="text-text-secondary text-sm">
                        by {sub.username} • {new Date(sub.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyles(sub.status)}`}
                    >
                      {sub.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {ingredients.map((ing, i) => (
                      <span key={i} className="px-2 py-0.5 bg-bg-tertiary rounded text-sm text-text-secondary">
                        {ing.quantity}x {ing.name}
                      </span>
                    ))}
                  </div>

                  {sub.source_url && (
                    <p className="text-text-tertiary text-xs mb-2 truncate">Source: {sub.source_url}</p>
                  )}

                  {sub.admin_notes && (
                    <div className="p-2 bg-bg-tertiary rounded text-sm text-text-secondary mb-2">
                      Admin: {sub.admin_notes}
                      {sub.reviewed_by_username && (
                        <span className="text-text-tertiary"> — {sub.reviewed_by_username}</span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {sub.status === "pending" && (
                      <button
                        onClick={() => setReviewingSubmission(sub)}
                        className="px-3 py-1 bg-accent hover:bg-accent-hover text-white rounded text-sm transition-colors"
                      >
                        Review
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteSubmission(sub.id)}
                      className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
