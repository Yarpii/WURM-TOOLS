"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import type { RecipeSubmission, RecipeIngredientInput } from "@/lib/types";

type TabType = "submit" | "my-submissions";

export default function RecipeSubmitPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("submit");
  const [submissions, setSubmissions] = useState<RecipeSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [itemName, setItemName] = useState("");
  const [ingredients, setIngredients] = useState<RecipeIngredientInput[]>([
    { name: "", quantity: 1 },
  ]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchMySubmissions = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/recipe-submissions");
      const data = await res.json();
      if (Array.isArray(data)) {
        setSubmissions(data);
      }
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMySubmissions();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: "", quantity: 1 }]);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const handleIngredientChange = (
    index: number,
    field: "name" | "quantity",
    value: string | number
  ) => {
    const updated = [...ingredients];
    if (field === "name") {
      updated[index].name = value as string;
    } else {
      updated[index].quantity = Math.max(0.01, Number(value) || 0.01);
    }
    setIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);

    // Validate
    if (!itemName.trim()) {
      setFormError("Item name is required");
      setSubmitting(false);
      return;
    }

    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    if (validIngredients.length === 0) {
      setFormError("At least one ingredient is required");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/recipe-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: itemName.trim(),
          ingredients: validIngredients,
          source_url: sourceUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to submit recipe");
        setSubmitting(false);
        return;
      }

      setFormSuccess(
        "Recipe submitted successfully! It will be reviewed by an admin."
      );
      setItemName("");
      setIngredients([{ name: "", quantity: 1 }]);
      setSourceUrl("");
      setNotes("");

      // Refresh submissions
      await fetchMySubmissions();
    } catch (err) {
      setFormError("Connection error: " + String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;

    try {
      const res = await fetch(`/api/recipe-submissions/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchMySubmissions();
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
      approved: "bg-green-500/20 text-green-400 border-green-500/50",
      rejected: "bg-red-500/20 text-red-400 border-red-500/50",
    };
    return styles[status] || styles.pending;
  };

  // Not logged in
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-amber-400 mb-4">
              Login Required
            </h1>
            <p className="text-gray-300 mb-6">
              You need to be logged in to submit crafting recipes.
            </p>
            <Link
              href="/login"
              className="inline-block bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-400">Submit Recipe</h1>
          <p className="text-gray-400 mt-2">
            Help expand our crafting database by submitting recipes that are
            missing.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab("submit")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "submit"
                ? "text-amber-400 border-b-2 border-amber-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Submit New Recipe
          </button>
          <button
            onClick={() => setActiveTab("my-submissions")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "my-submissions"
                ? "text-amber-400 border-b-2 border-amber-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            My Submissions ({submissions.length})
          </button>
        </div>

        {/* Submit Form Tab */}
        {activeTab === "submit" && (
          <div className="bg-gray-800 rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {formError && (
                <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg">
                  {formSuccess}
                </div>
              )}

              {/* Item Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g., Stone Brick"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                  required
                />
                <p className="text-gray-500 text-sm mt-1">
                  The name of the item this recipe creates
                </p>
              </div>

              {/* Ingredients */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ingredients *
                </label>
                <div className="space-y-3">
                  {ingredients.map((ing, index) => (
                    <div key={index} className="flex gap-3">
                      <input
                        type="text"
                        value={ing.name}
                        onChange={(e) =>
                          handleIngredientChange(index, "name", e.target.value)
                        }
                        placeholder="Ingredient name"
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                      />
                      <input
                        type="number"
                        value={ing.quantity}
                        onChange={(e) =>
                          handleIngredientChange(
                            index,
                            "quantity",
                            e.target.value
                          )
                        }
                        min="0.01"
                        step="0.01"
                        className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(index)}
                        className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
                        disabled={ingredients.length <= 1}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="mt-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
                >
                  + Add Ingredient
                </button>
              </div>

              {/* Source URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Source URL (optional)
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://www.wurmpedia.com/index.php/..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                />
                <p className="text-gray-500 text-sm mt-1">
                  Link to Wurmpedia or other source for verification
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information about this recipe..."
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                >
                  {submitting ? "Submitting..." : "Submit Recipe"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* My Submissions Tab */}
        {activeTab === "my-submissions" && (
          <div className="space-y-4">
            {loading ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-400">Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-400">
                  You haven&apos;t submitted any recipes yet.
                </p>
                <button
                  onClick={() => setActiveTab("submit")}
                  className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
                >
                  Submit Your First Recipe
                </button>
              </div>
            ) : (
              submissions.map((sub) => {
                let parsedIngredients: RecipeIngredientInput[] = [];
                try {
                  parsedIngredients = JSON.parse(sub.ingredients);
                } catch {
                  parsedIngredients = [];
                }

                return (
                  <div
                    key={sub.id}
                    className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-amber-400">
                          {sub.item_name}
                        </h3>
                        <p className="text-gray-500 text-sm">
                          Submitted{" "}
                          {new Date(sub.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                          sub.status
                        )}`}
                      >
                        {sub.status.charAt(0).toUpperCase() +
                          sub.status.slice(1)}
                      </span>
                    </div>

                    {/* Ingredients */}
                    <div className="mb-4">
                      <p className="text-gray-400 text-sm mb-2">Ingredients:</p>
                      <div className="flex flex-wrap gap-2">
                        {parsedIngredients.map((ing, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-gray-700 rounded text-sm text-gray-300"
                          >
                            {ing.quantity}x {ing.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Source URL */}
                    {sub.source_url && (
                      <div className="mb-4">
                        <p className="text-gray-400 text-sm">Source:</p>
                        <a
                          href={sub.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline text-sm break-all"
                        >
                          {sub.source_url}
                        </a>
                      </div>
                    )}

                    {/* Notes */}
                    {sub.notes && (
                      <div className="mb-4">
                        <p className="text-gray-400 text-sm">Notes:</p>
                        <p className="text-gray-300 text-sm">{sub.notes}</p>
                      </div>
                    )}

                    {/* Admin Notes */}
                    {sub.admin_notes && (
                      <div className="mb-4 bg-gray-700/50 rounded p-3">
                        <p className="text-gray-400 text-sm">Admin Response:</p>
                        <p className="text-gray-300 text-sm">
                          {sub.admin_notes}
                        </p>
                        {sub.reviewed_by_username && (
                          <p className="text-gray-500 text-xs mt-1">
                            — {sub.reviewed_by_username}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {sub.status === "pending" && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleDelete(sub.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
