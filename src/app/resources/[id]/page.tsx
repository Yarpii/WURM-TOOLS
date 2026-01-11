"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { CommunityResource, ResourceRating, ResourceComment } from "@/lib/types";
import Link from "next/link";

function formatFileSize(bytes?: number): string {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const resourceId = params.id as string;

  const [resource, setResource] = useState<CommunityResource | null>(null);
  const [ratings, setRatings] = useState<ResourceRating[]>([]);
  const [comments, setComments] = useState<ResourceComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Rating form
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState("");
  const [showRatingForm, setShowRatingForm] = useState(false);

  // Comment form
  const [newComment, setNewComment] = useState("");

  const fetchResource = async () => {
    try {
      const response = await fetch(`/api/resources/${resourceId}`);
      if (!response.ok) throw new Error("Failed to fetch resource");

      const data = await response.json();
      setResource(data);
    } catch (error) {
      console.error("Error fetching resource:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const fetchRatings = async () => {
    try {
      const response = await fetch(`/api/resources/${resourceId}?action=ratings`);
      if (!response.ok) throw new Error("Failed to fetch ratings");

      const data = await response.json();
      setRatings(data);

      // Check if user has already rated
      if (user) {
        const existingRating = data.find((r: ResourceRating) => r.user_id === user.id);
        if (existingRating) {
          setUserRating(existingRating.rating);
          setUserReview(existingRating.review || "");
        }
      }
    } catch (error) {
      console.error("Error fetching ratings:", error);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/resources/${resourceId}?action=comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");

      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchResource(), fetchRatings(), fetchComments()]);
      setLoading(false);
    };
    loadData();
  }, [resourceId]);

  const handleRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rate",
          rating: userRating,
          review: userReview,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit rating");

      setShowRatingForm(false);
      fetchRatings();
      fetchResource();
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert("Failed to submit rating");
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    try {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "comment",
          comment: newComment,
        }),
      });

      if (!response.ok) throw new Error("Failed to add comment");

      setNewComment("");
      fetchComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to add comment");
    }
  };

  const handleDownload = async () => {
    if (!resource?.external_url) return;

    // Track download
    await fetch(`/api/resources/${resourceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "download" }),
    });

    // Open in new tab
    window.open(resource.external_url, "_blank");

    // Refresh to update download count
    fetchResource();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-400 py-12">Loading...</div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
          {error || "Resource not found"}
        </div>
        <Link href="/resources" className="text-blue-500 hover:text-blue-400 mt-4 inline-block">
          ← Back to Resources
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/resources" className="text-blue-500 hover:text-blue-400 mb-4 inline-block">
        ← Back to Resources
      </Link>

      {/* Resource Header */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{resource.name}</h1>
            <p className="text-gray-400">{resource.category}</p>
          </div>
          {resource.is_featured && (
            <span className="text-yellow-500 text-lg font-semibold">★ Featured</span>
          )}
        </div>

        {resource.description && (
          <p className="text-gray-300 mb-4">{resource.description}</p>
        )}

        <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="text-gray-400">Type:</span>{" "}
            <span className="text-white capitalize">{resource.resource_type}</span>
          </div>
          <div>
            <span className="text-gray-400">Added by:</span>{" "}
            <span className="text-white">{resource.creator_username || "Unknown"}</span>
          </div>
          <div>
            <span className="text-gray-400">Date:</span>{" "}
            <span className="text-white">{formatDate(resource.created_at)}</span>
          </div>
          {resource.file_size && (
            <div>
              <span className="text-gray-400">Size:</span>{" "}
              <span className="text-white">{formatFileSize(resource.file_size)}</span>
            </div>
          )}
          {resource.alliance_name && (
            <div>
              <span className="text-gray-400">Alliance:</span>{" "}
              <span className="text-white">{resource.alliance_name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
          <span>👁️ {resource.view_count} views</span>
          <span>⬇️ {resource.download_count} downloads</span>
          {resource.average_rating && (
            <span>⭐ {resource.average_rating.toFixed(1)} ({resource.rating_count} ratings)</span>
          )}
        </div>

        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {resource.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-sm bg-gray-700 text-gray-300 px-3 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {resource.external_url && (
          <button
            onClick={handleDownload}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded font-semibold transition-colors"
          >
            Open Resource / Download
          </button>
        )}
      </div>

      {/* Ratings Section */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-white">Ratings & Reviews</h2>
          {user && (
            <button
              onClick={() => setShowRatingForm(!showRatingForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
            >
              {userRating > 0 ? "Update Rating" : "Add Rating"}
            </button>
          )}
        </div>

        {showRatingForm && user && (
          <form onSubmit={handleRating} className="bg-gray-750 p-4 rounded mb-4">
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Your Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setUserRating(star)}
                    className={`text-3xl ${
                      star <= userRating ? "text-yellow-500" : "text-gray-600"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Your Review (optional)</label>
              <textarea
                value={userReview}
                onChange={(e) => setUserReview(e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                rows={3}
                placeholder="Share your thoughts..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={userRating === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
              >
                Submit Rating
              </button>
              <button
                type="button"
                onClick={() => setShowRatingForm(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {ratings.length === 0 ? (
          <p className="text-gray-400">No ratings yet.</p>
        ) : (
          <div className="space-y-4">
            {ratings.map((rating) => (
              <div key={rating.id} className="bg-gray-750 p-4 rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{rating.username}</span>
                    <span className="text-yellow-500">{"★".repeat(rating.rating)}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(rating.created_at)}
                  </span>
                </div>
                {rating.review && <p className="text-gray-300 text-sm">{rating.review}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-semibold text-white mb-4">Comments</h2>

        {user && (
          <form onSubmit={handleComment} className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 mb-2"
              rows={3}
              placeholder="Add a comment..."
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
            >
              Post Comment
            </button>
          </form>
        )}

        {comments.length === 0 ? (
          <p className="text-gray-400">No comments yet.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-gray-750 p-4 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold">{comment.username}</span>
                  <span className="text-xs text-gray-400">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <p className="text-gray-300">{comment.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
