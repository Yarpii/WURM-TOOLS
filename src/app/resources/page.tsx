"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { CommunityResource, ResourceType } from "@/lib/types";
import Link from "next/link";

const RESOURCE_TYPES: { value: ResourceType; label: string; icon: string; color: string }[] = [
  { value: "guide", label: "Guides", icon: "📖", color: "#3b82f6" },
  { value: "tool", label: "Tools", icon: "🔧", color: "#f59e0b" },
  { value: "data", label: "Data", icon: "📊", color: "#8b5cf6" },
  { value: "media", label: "Media", icon: "🎨", color: "#ec4899" },
  { value: "template", label: "Templates", icon: "📄", color: "#22c55e" },
  { value: "other", label: "Other", icon: "📦", color: "#6b7280" },
];

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
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<CommunityResource[]>([]);
  const [featuredResources, setFeaturedResources] = useState<CommunityResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  // Filters
  const [filterType, setFilterType] = useState<ResourceType | "all">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Add resource form
  const [addForm, setAddForm] = useState({
    name: "",
    description: "",
    resource_type: "guide" as ResourceType,
    category: "",
    external_url: "",
    tags: "",
  });
  const [formError, setFormError] = useState("");

  const fetchResources = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filterType !== "all") params.append("resource_type", filterType);
      if (filterCategory !== "all") params.append("category", filterCategory);
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(`/api/resources?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch resources");

      const data = await response.json();
      setResources(data);
    } catch (error) {
      console.error("Error fetching resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatured = async () => {
    try {
      const response = await fetch("/api/resources?featured=true");
      if (!response.ok) throw new Error("Failed to fetch featured resources");

      const data = await response.json();
      setFeaturedResources(data);
    } catch (error) {
      console.error("Error fetching featured resources:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/resources?categories=true");
      if (!response.ok) throw new Error("Failed to fetch categories");

      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    fetchResources();
    fetchFeatured();
    fetchCategories();
  }, [filterType, filterCategory, searchTerm]);

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!addForm.name || !addForm.category || !addForm.external_url) {
      setFormError("Please fill in all required fields");
      return;
    }

    try {
      const tags = addForm.tags
        ? addForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
        : [];

      const response = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addForm,
          tags,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add resource");
      }

      // Reset form
      setAddForm({
        name: "",
        description: "",
        resource_type: "guide",
        category: "",
        external_url: "",
        tags: "",
      });
      setShowAddForm(false);
      fetchResources();
      fetchFeatured();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const ResourceCard = ({ resource }: { resource: CommunityResource }) => {
    const resourceType = RESOURCE_TYPES.find((t) => t.value === resource.resource_type);

    return (
      <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors border border-gray-700">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{resourceType?.icon}</span>
            <div>
              <h3 className="font-semibold text-white">{resource.name}</h3>
              <p className="text-xs text-gray-400">{resource.category}</p>
            </div>
          </div>
          {resource.is_featured && (
            <span className="text-yellow-500 text-xs font-semibold">★ Featured</span>
          )}
        </div>

        {resource.description && (
          <p className="text-sm text-gray-300 mb-3 line-clamp-2">{resource.description}</p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
          <span>By {resource.creator_username || "Unknown"}</span>
          <span>{formatDate(resource.created_at)}</span>
        </div>

        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {resource.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
          <span>👁️ {resource.view_count}</span>
          <span>⬇️ {resource.download_count}</span>
          {resource.average_rating && (
            <span>⭐ {resource.average_rating.toFixed(1)} ({resource.rating_count})</span>
          )}
          {resource.file_size && <span>{formatFileSize(resource.file_size)}</span>}
        </div>

        <div className="flex gap-2">
          {resource.external_url && (
            <a
              href={resource.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded text-center transition-colors"
              onClick={async () => {
                // Track download/view
                await fetch(`/api/resources/${resource.id}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "download" }),
                });
              }}
            >
              Open Resource
            </a>
          )}
          <Link
            href={`/resources/${resource.id}`}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded transition-colors"
          >
            Details
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Community Resources</h1>
          <p className="text-gray-400">
            Shared guides, tools, data, and more from the WURM community
          </p>
        </div>
        {user && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
          >
            {showAddForm ? "Cancel" : "+ Add Resource"}
          </button>
        )}
      </div>

      {/* Add Resource Form */}
      {showAddForm && user && (
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Add New Resource</h2>
          <form onSubmit={handleAddResource} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Resource Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={addForm.resource_type}
                  onChange={(e) =>
                    setAddForm({ ...addForm, resource_type: e.target.value as ResourceType })
                  }
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  {RESOURCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addForm.category}
                  onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Crafting Guides, Spreadsheets, Maps"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  External URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={addForm.external_url}
                  onChange={(e) => setAddForm({ ...addForm, external_url: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="https://..."
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Description</label>
              <textarea
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                rows={3}
                placeholder="Describe what this resource is about..."
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={addForm.tags}
                onChange={(e) => setAddForm({ ...addForm, tags: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="guide, beginner, crafting"
              />
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded">
                {formError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded transition-colors"
              >
                Add Resource
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormError("");
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Featured Resources */}
      {featuredResources.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">⭐ Featured Resources</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Resource Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ResourceType | "all")}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
            >
              <option value="all">All Types</option>
              {RESOURCE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search resources..."
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
            />
          </div>
        </div>
      </div>

      {/* Resources Grid */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading resources...</div>
      ) : resources.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p>No resources found.</p>
          {user && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-blue-500 hover:text-blue-400"
            >
              Be the first to add one!
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}
