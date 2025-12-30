"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { Project, ProjectItem, ProjectMaterial, Item, ProjectStatus } from "@/lib/types";

type TabType = "my-projects" | "create" | "shared";

export default function ProjectsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("my-projects");
  const [loading, setLoading] = useState(true);

  // Data states
  const [projects, setProjects] = useState<Project[]>([]);
  const [sharedProjects, setSharedProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [projectMaterials, setProjectMaterials] = useState<ProjectMaterial[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_shared: false,
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Add item states
  const [addItemId, setAddItemId] = useState<number>(0);
  const [addItemQty, setAddItemQty] = useState<number>(1);
  const [addItemNotes, setAddItemNotes] = useState("");
  const [itemSearch, setItemSearch] = useState("");

  const fetchProjects = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (Array.isArray(data)) setProjects(data);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/items");
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (err) {
      console.error("Failed to fetch items:", err);
    }
  };

  const fetchProjectDetails = async (projectId: number) => {
    try {
      const [itemsRes, materialsRes] = await Promise.all([
        fetch(`/api/projects?id=${projectId}&action=items`),
        fetch(`/api/projects?id=${projectId}&action=materials`),
      ]);

      const itemsData = await itemsRes.json();
      const materialsData = await materialsRes.json();

      if (Array.isArray(itemsData)) setProjectItems(itemsData);
      if (Array.isArray(materialsData)) setProjectMaterials(materialsData);
    } catch (err) {
      console.error("Failed to fetch project details:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProjects(), fetchItems()]);
      setLoading(false);
    };
    if (user) loadData();
  }, [user]);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectDetails(selectedProject.id);
    }
  }, [selectedProject]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...formData }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create project");
        setSubmitting(false);
        return;
      }

      setFormSuccess("Project created!");
      setFormData({ name: "", description: "", is_shared: false });
      await fetchProjects();
      setActiveTab("my-projects");
      setSubmitting(false);
    } catch (err) {
      setFormError("Connection error: " + String(err));
      setSubmitting(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedProject || !addItemId || addItemQty < 1) return;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-item",
          project_id: selectedProject.id,
          item_id: addItemId,
          quantity: addItemQty,
          notes: addItemNotes || undefined,
        }),
      });

      if (res.ok) {
        setAddItemId(0);
        setAddItemQty(1);
        setAddItemNotes("");
        setItemSearch("");
        await fetchProjectDetails(selectedProject.id);
        await fetchProjects();
      }
    } catch (err) {
      console.error("Failed to add item:", err);
    }
  };

  const handleUpdateProgress = async (itemId: number, completedQty: number) => {
    if (!selectedProject) return;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-progress",
          project_id: selectedProject.id,
          item_id: itemId,
          completed_quantity: completedQty,
        }),
      });

      if (res.ok) {
        await fetchProjectDetails(selectedProject.id);
        await fetchProjects();
      }
    } catch (err) {
      console.error("Failed to update progress:", err);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!selectedProject || !confirm("Remove this item?")) return;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove-item",
          project_id: selectedProject.id,
          item_id: itemId,
        }),
      });

      if (res.ok) {
        await fetchProjectDetails(selectedProject.id);
        await fetchProjects();
      }
    } catch (err) {
      console.error("Failed to remove item:", err);
    }
  };

  const handleUpdateStatus = async (status: ProjectStatus) => {
    if (!selectedProject) return;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          project_id: selectedProject.id,
          status,
        }),
      });

      if (res.ok) {
        await fetchProjects();
        const updated = projects.find(p => p.id === selectedProject.id);
        if (updated) setSelectedProject({ ...updated, status });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject || !confirm("Delete this project?")) return;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          project_id: selectedProject.id,
        }),
      });

      if (res.ok) {
        setSelectedProject(null);
        await fetchProjects();
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "planning": return "bg-info/20 text-info";
      case "in_progress": return "bg-warning/20 text-warning";
      case "completed": return "bg-success/20 text-success";
      case "archived": return "bg-text-muted/20 text-text-muted";
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase()) &&
    !item.is_base_material
  );

  // Login required
  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-text-primary mb-4">Project Planner</h1>
          <p className="text-text-muted mb-6">Login to create and manage your crafting projects</p>
          <a
            href="/login"
            className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Login
          </a>
        </div>
      </div>
    );
  }

  // Project Details View
  if (selectedProject) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setSelectedProject(null)}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            ← Back
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-text-primary">{selectedProject.name}</h1>
            {selectedProject.description && (
              <p className="text-text-secondary">{selectedProject.description}</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedProject.status)}`}>
            {selectedProject.status.replace("_", " ")}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="bg-bg-secondary rounded-lg border border-border p-4 mb-6">
          <div className="flex justify-between text-sm text-text-secondary mb-2">
            <span>Overall Progress</span>
            <span>{selectedProject.progress_percentage}%</span>
          </div>
          <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${selectedProject.progress_percentage}%` }}
            />
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => handleUpdateStatus("planning")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              selectedProject.status === "planning"
                ? "bg-info text-white"
                : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
            }`}
          >
            Planning
          </button>
          <button
            onClick={() => handleUpdateStatus("in_progress")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              selectedProject.status === "in_progress"
                ? "bg-warning text-black"
                : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => handleUpdateStatus("completed")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              selectedProject.status === "completed"
                ? "bg-success text-white"
                : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
            }`}
          >
            Completed
          </button>
          <div className="flex-1" />
          <button
            onClick={handleDeleteProject}
            className="px-3 py-1.5 text-sm rounded-lg bg-danger/20 text-danger hover:bg-danger/30 transition-colors"
          >
            Delete Project
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Items List */}
          <div className="bg-bg-secondary rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Items to Craft</h2>

            {/* Add Item Form */}
            <div className="mb-4 p-3 bg-bg-tertiary rounded-lg">
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search items to add..."
                className="w-full px-3 py-2 bg-bg-primary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none mb-2"
              />
              {itemSearch && filteredItems.length > 0 && (
                <div className="max-h-40 overflow-y-auto mb-2">
                  {filteredItems.slice(0, 10).map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setAddItemId(item.id);
                        setItemSearch(item.name);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-bg-hover rounded transition-colors ${
                        addItemId === item.id ? "bg-accent/20 text-accent" : "text-text-primary"
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="number"
                  value={addItemQty}
                  onChange={(e) => setAddItemQty(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-20 px-3 py-2 bg-bg-primary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
                <button
                  onClick={handleAddItem}
                  disabled={!addItemId || addItemQty < 1}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  Add Item
                </button>
              </div>
            </div>

            {/* Items List */}
            {projectItems.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                No items yet. Add items above!
              </div>
            ) : (
              <div className="space-y-3">
                {projectItems.map(item => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border ${
                      item.is_completed
                        ? "bg-success/10 border-success/30"
                        : "bg-bg-tertiary border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${item.is_completed ? "text-success line-through" : "text-text-primary"}`}>
                        {item.item_name}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-text-muted hover:text-danger transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={item.completed_quantity}
                        onChange={(e) => handleUpdateProgress(item.id, parseInt(e.target.value) || 0)}
                        min={0}
                        max={item.quantity}
                        className="w-16 px-2 py-1 bg-bg-primary rounded text-text-primary border border-border text-sm"
                      />
                      <span className="text-text-muted text-sm">/ {item.quantity}</span>
                      <div className="flex-1 h-2 bg-bg-primary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${(item.completed_quantity / item.quantity) * 100}%` }}
                        />
                      </div>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-text-muted mt-2">{item.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Materials Summary */}
          <div className="bg-bg-secondary rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Required Materials</h2>
            {projectMaterials.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                Add items to see required materials
              </div>
            ) : (
              <div className="space-y-2">
                {projectMaterials.map(mat => (
                  <div
                    key={mat.item_id}
                    className="flex items-center justify-between p-2 bg-bg-tertiary rounded-lg"
                  >
                    <div>
                      <span className="text-text-primary">{mat.item_name}</span>
                      <span className="text-xs text-text-muted ml-2">({mat.category})</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        <span className={mat.remaining_quantity > 0 ? "text-warning" : "text-success"}>
                          {mat.remaining_quantity}
                        </span>
                        <span className="text-text-muted"> / {mat.required_quantity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Project Planner</h1>
        <p className="text-text-secondary">
          Plan large crafting projects and track your progress
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("my-projects")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "my-projects"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          }`}
        >
          My Projects
          {projects.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-accent/20 rounded">
              {projects.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("create")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "create"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          }`}
        >
          New Project
        </button>
      </div>

      {/* My Projects Tab */}
      {activeTab === "my-projects" && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-text-muted">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-text-muted mb-2">No projects yet</div>
              <button
                onClick={() => setActiveTab("create")}
                className="text-accent hover:text-accent-hover transition-colors"
              >
                Create your first project
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className="text-left bg-bg-secondary rounded-lg border border-border p-4 hover:border-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-text-primary">{project.name}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(project.status)}`}>
                      {project.status.replace("_", " ")}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-sm text-text-muted line-clamp-2 mb-3">{project.description}</p>
                  )}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-text-muted mb-1">
                      <span>{project.completed_items}/{project.total_items} items</span>
                      <span>{project.progress_percentage}%</span>
                    </div>
                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{ width: `${project.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                  {project.is_shared && project.alliance_name && (
                    <div className="text-xs text-text-muted">
                      Shared with: {project.alliance_name}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Tab */}
      {activeTab === "create" && (
        <div className="max-w-xl">
          <div className="bg-bg-secondary rounded-xl border border-border p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-6">Create New Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-6">
              {formError && (
                <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-4 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
                  {formSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm text-text-secondary mb-2">Project Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Build a Knarr"
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="What are you building?"
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none resize-none"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_shared}
                  onChange={(e) => setFormData({ ...formData, is_shared: e.target.checked })}
                  className="w-5 h-5 rounded border-border bg-bg-tertiary text-accent focus:ring-accent"
                />
                <span className="text-text-secondary">Share with my alliance</span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 rounded-lg font-medium transition-all ${
                  submitting
                    ? "bg-bg-tertiary cursor-not-allowed text-text-muted"
                    : "bg-accent hover:bg-accent-hover text-white"
                }`}
              >
                {submitting ? "Creating..." : "Create Project"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
