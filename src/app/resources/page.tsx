"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { CommunityResource, ResourceType } from "@/lib/types";
import Link from "next/link";
import InfoSection from "@/components/InfoSection";

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
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

    // Validation
    if (!addForm.name || !addForm.category) {
      setFormError("Please fill in name and category");
      return;
    }

    if (uploadMode === "url" && !addForm.external_url) {
      setFormError("Please provide an external URL");
      return;
    }

    if (uploadMode === "file" && !selectedFile) {
      setFormError("Please select a file to upload");
      return;
    }

    try {
      setUploading(true);

      if (uploadMode === "file" && selectedFile) {
        // Upload file
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("name", addForm.name);
        formData.append("category", addForm.category);
        formData.append("resource_type", addForm.resource_type);
        if (addForm.description) formData.append("description", addForm.description);
        if (addForm.tags) formData.append("tags", addForm.tags);

        const response = await fetch("/api/resources/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to upload file");
        }
      } else {
        // Add external URL
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
      setSelectedFile(null);
      setShowAddForm(false);
      fetchResources();
      fetchFeatured();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setUploading(false);
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
          {resource.external_url && /^https?:\/\//i.test(resource.external_url) ? (
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
          ) : resource.file_path ? (
            <a
              href={resource.file_path}
              download
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded text-center transition-colors"
              onClick={async () => {
                // Track download
                await fetch(`/api/resources/${resource.id}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "download" }),
                });
              }}
            >
              Download
            </a>
          ) : null}
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

            {/* Upload Mode Toggle */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Source</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUploadMode("url")}
                  className={`flex-1 py-2 px-4 rounded transition-colors ${
                    uploadMode === "url"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  🔗 External URL
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("file")}
                  className={`flex-1 py-2 px-4 rounded transition-colors ${
                    uploadMode === "file"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  📁 Upload File
                </button>
              </div>
            </div>

            {/* URL Input */}
            {uploadMode === "url" && (
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
                />
                <p className="text-xs text-gray-500 mt-1">
                  Link to Google Drive, Dropbox, or any external resource
                </p>
              </div>
            )}

            {/* File Upload */}
            {uploadMode === "file" && (
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Upload File <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-gray-600 file:text-white file:cursor-pointer hover:file:bg-gray-500"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.json"
                  />
                </div>
                {selectedFile && (
                  <p className="text-sm text-gray-400 mt-2">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Max 100MB. Supported: Images, PDFs, Office docs, Archives
                </p>
              </div>
            )}

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
                disabled={uploading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-2 rounded transition-colors"
              >
                {uploading ? "Uploading..." : uploadMode === "file" ? "Upload Resource" : "Add Resource"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormError("");
                  setSelectedFile(null);
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

      <InfoSection>
      {/* ============================================ */}
      {/* Feature Sections - Resources Theme */}
      {/* ============================================ */}

      {/* Section 1: Resource Types */}
      <div className="mt-20 mb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-cyan-100 mb-4">
            Community Knowledge Hub
          </h2>
          <p className="text-stone-400 max-w-2xl mx-auto">
            Everything you need to master Wurm Online, created and shared by the community.
            Find guides, tools, data sheets, and more!
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Type 1: Guides */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50"></div>
            <div className="relative bg-stone-800/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 h-full">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
                <span className="text-2xl">📖</span>
              </div>
              <h3 className="text-lg font-semibold text-blue-100 mb-2">Guides & Tutorials</h3>
              <p className="text-stone-400 text-sm">
                Step-by-step guides for skills, mechanics, and strategies.
                From beginner basics to advanced techniques.
              </p>
            </div>
          </div>

          {/* Type 2: Tools */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50"></div>
            <div className="relative bg-stone-800/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300 h-full">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/25">
                <span className="text-2xl">🔧</span>
              </div>
              <h3 className="text-lg font-semibold text-amber-100 mb-2">Tools & Calculators</h3>
              <p className="text-stone-400 text-sm">
                Spreadsheets, calculators, and utilities to help you plan
                builds, track skills, and optimize your gameplay.
              </p>
            </div>
          </div>

          {/* Type 3: Data */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50"></div>
            <div className="relative bg-stone-800/80 backdrop-blur-sm rounded-2xl p-6 border border-violet-500/20 hover:border-violet-500/40 transition-all duration-300 h-full">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-violet-500/25">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-violet-100 mb-2">Data & References</h3>
              <p className="text-stone-400 text-sm">
                Item databases, material charts, and reference tables.
                Everything you need to look up in one place.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Contribution Tips */}
      <div className="mb-16">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/30 via-teal-900/20 to-cyan-900/30 rounded-3xl"></div>
          <div className="relative bg-stone-800/40 backdrop-blur-sm rounded-3xl p-8 border border-cyan-500/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-cyan-100">Share Your Knowledge</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-teal-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-cyan-200 font-medium">Upload or Link</h4>
                    <p className="text-stone-400 text-sm">Share files directly or link to external sources like Google Docs, Dropbox, or your own site.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-teal-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-cyan-200 font-medium">Add Good Descriptions</h4>
                    <p className="text-stone-400 text-sm">Help others find your resource with clear titles, descriptions, and relevant tags.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-teal-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-cyan-200 font-medium">Keep It Updated</h4>
                    <p className="text-stone-400 text-sm">Game mechanics change! Update your resources when patches affect them.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-cyan-200 font-medium">Rate & Review</h4>
                    <p className="text-stone-400 text-sm">Help quality content rise to the top by rating resources you find helpful.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-cyan-200 font-medium">Choose Categories</h4>
                    <p className="text-stone-400 text-sm">Pick the right category so players can easily browse and find what they need.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-cyan-200 font-medium">Get Featured</h4>
                    <p className="text-stone-400 text-sm">High-quality, well-maintained resources may be featured at the top of the page!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Related Tools */}
      <div className="mb-16">
        <h3 className="text-xl font-bold text-cyan-100 mb-6 text-center">Explore More Tools</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Link href="/prices" className="group">
            <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-700 hover:border-cyan-500/50 transition-all duration-300 hover:bg-stone-800/70">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/30 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <h4 className="font-semibold text-stone-200 group-hover:text-emerald-300 transition-colors">Price Guide</h4>
              </div>
              <p className="text-sm text-stone-400">Community-driven item price references.</p>
            </div>
          </Link>

          <Link href="/market" className="group">
            <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-700 hover:border-cyan-500/50 transition-all duration-300 hover:bg-stone-800/70">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-violet-500/20 rounded-lg group-hover:bg-violet-500/30 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-stone-200 group-hover:text-violet-300 transition-colors">Trade Calculator</h4>
              </div>
              <p className="text-sm text-stone-400">Calculate silver-to-euro conversions.</p>
            </div>
          </Link>

          <Link href="/analytics" className="group">
            <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-700 hover:border-cyan-500/50 transition-all duration-300 hover:bg-stone-800/70">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-rose-500/20 rounded-lg group-hover:bg-rose-500/30 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-stone-200 group-hover:text-rose-300 transition-colors">Analytics</h4>
              </div>
              <p className="text-sm text-stone-400">Track market trends and trading data.</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Section 4: Call to Action */}
      <div className="mb-8">
        <div className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 via-teal-500/20 to-blue-600/20"></div>
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="relative px-8 py-12 text-center">
            <h3 className="text-2xl font-bold text-cyan-100 mb-4">
              Have Something to Share?
            </h3>
            <p className="text-stone-300 mb-6 max-w-xl mx-auto">
              {user
                ? "Your knowledge helps the entire community. Upload a guide, share a spreadsheet, or link to your favorite tool!"
                : "Sign in to share your guides, tools, and resources with the Wurm community."
              }
            </p>
            {user ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 hover:scale-105"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add a Resource
              </button>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 hover:scale-105"
              >
                Sign In to Contribute
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>
      </InfoSection>
    </div>
  );
}
