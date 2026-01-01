"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { MapLocation, WurmServer, LocationType } from "@/lib/types";

const SERVERS: { value: WurmServer; label: string }[] = [
  { value: "harmony", label: "Harmony" },
  { value: "melody", label: "Melody" },
  { value: "cadence", label: "Cadence" },
  { value: "defiance", label: "Defiance" },
  { value: "independence", label: "Independence" },
  { value: "deliverance", label: "Deliverance" },
  { value: "exodus", label: "Exodus" },
  { value: "celebration", label: "Celebration" },
  { value: "pristine", label: "Pristine" },
  { value: "release", label: "Release" },
  { value: "xanadu", label: "Xanadu" },
];

const LOCATION_TYPES: { value: LocationType; label: string; color: string }[] = [
  { value: "deed", label: "Deed", color: "#22c55e" },
  { value: "merchant", label: "Merchant", color: "#eab308" },
  { value: "landmark", label: "Landmark", color: "#3b82f6" },
  { value: "resource", label: "Resource", color: "#a855f7" },
  { value: "spawn", label: "Spawn Point", color: "#ef4444" },
  { value: "other", label: "Other", color: "#6b7280" },
];

export default function MapPage() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedServer, setSelectedServer] = useState<WurmServer>("harmony");
  const [selectedType, setSelectedType] = useState<LocationType | "all">("all");

  // Map state - Wurm maps are typically 4096x4096 or 8192x8192, so we need a low initial zoom
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.15); // Start zoomed out to see more of the map
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

  // Selected location
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);

  // Add location form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    description: "",
    location_type: "deed" as LocationType,
    x: 500,
    y: 500,
    is_public: true,
  });
  const [formError, setFormError] = useState("");

  const fetchLocations = async () => {
    try {
      const params = new URLSearchParams();
      params.set("server", selectedServer);
      if (selectedType !== "all") params.set("type", selectedType);

      const res = await fetch(`/api/map?${params}`);
      const data = await res.json();
      if (Array.isArray(data)) setLocations(data);
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchLocations();
      setLoading(false);
    };
    loadData();
  }, [selectedServer, selectedType]);

  // Handle canvas resize to fill container
  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const container = canvas.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      if (width > 0 && height > 0 && (width !== canvasSize.width || height !== canvasSize.height)) {
        setCanvasSize({ width, height });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Also update after a short delay to ensure container is rendered
    const timeout = setTimeout(updateCanvasSize, 100);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      clearTimeout(timeout);
    };
  }, [canvasSize.width, canvasSize.height]);

  // Draw map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Update canvas resolution to match container
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      // Clear
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Draw grid
      ctx.strokeStyle = "#2a2a4a";
      ctx.lineWidth = 1;
      const gridSize = 100 * zoom;

      for (let x = (offset.x % gridSize); x < canvasSize.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasSize.height);
        ctx.stroke();
      }

      for (let y = (offset.y % gridSize); y < canvasSize.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasSize.width, y);
        ctx.stroke();
      }

      // Draw locations
      for (const loc of locations) {
        const x = (loc.x * zoom) + offset.x;
        const y = (loc.y * zoom) + offset.y;

        // Skip if off-screen
        if (x < -20 || x > canvasSize.width + 20 || y < -20 || y > canvasSize.height + 20) continue;

        const typeInfo = LOCATION_TYPES.find(t => t.value === loc.location_type);
        const color = typeInfo?.color || "#6b7280";

        // Draw marker
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (loc.is_verified) {
          ctx.strokeStyle = "#ffd700";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Draw label
        ctx.fillStyle = "#fff";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(loc.name, x, y - 12);
      }

      // Draw coordinates
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      const mouseX = Math.round(-offset.x / zoom);
      const mouseY = Math.round(-offset.y / zoom);
      ctx.fillText(`Server: ${selectedServer.toUpperCase()} | Offset: ${mouseX}, ${mouseY} | Zoom: ${zoom.toFixed(1)}x`, 10, 20);
    };

    draw();
  }, [locations, offset, zoom, selectedServer, canvasSize]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    // Scale the delta based on current zoom level for smoother zooming
    const delta = e.deltaY > 0 ? -zoom * 0.1 : zoom * 0.1;
    setZoom(Math.max(0.05, Math.min(5, zoom + delta)));
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if clicked on a location
    for (const loc of locations) {
      const x = (loc.x * zoom) + offset.x;
      const y = (loc.y * zoom) + offset.y;
      const dist = Math.sqrt(Math.pow(clickX - x, 2) + Math.pow(clickY - y, 2));

      if (dist < 12) {
        setSelectedLocation(loc);
        return;
      }
    }

    // Clicked on empty space - update add form coordinates
    if (showAddForm) {
      const mapX = Math.round((clickX - offset.x) / zoom);
      const mapY = Math.round((clickY - offset.y) / zoom);
      setAddForm({ ...addForm, x: mapX, y: mapY });
    }

    setSelectedLocation(null);
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    try {
      const res = await fetch("/api/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...addForm,
          server: selectedServer,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to add location");
        return;
      }

      setShowAddForm(false);
      setAddForm({ name: "", description: "", location_type: "deed", x: 500, y: 500, is_public: true });
      await fetchLocations();
    } catch (err) {
      setFormError("Connection error");
    }
  };

  const handleDeleteLocation = async (id: number) => {
    if (!confirm("Delete this location?")) return;

    try {
      const res = await fetch("/api/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", location_id: id }),
      });

      if (res.ok) {
        setSelectedLocation(null);
        await fetchLocations();
      }
    } catch (err) {
      console.error("Failed to delete location:", err);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Controls */}
      <div className="bg-bg-secondary border-b border-border p-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-4">
          <h1 className="text-xl font-bold text-text-primary">World Map</h1>

          <select
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value as WurmServer)}
            className="px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
          >
            {SERVERS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as LocationType | "all")}
            className="px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
          >
            <option value="all">All Types</option>
            {LOCATION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span>{locations.length} locations</span>
          </div>

          <div className="flex-1" />

          {user && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showAddForm
                  ? "bg-danger text-white"
                  : "bg-accent text-white hover:bg-accent-hover"
              }`}
            >
              {showAddForm ? "Cancel" : "Add Location"}
            </button>
          )}

          <div className="flex gap-1">
            <button
              onClick={() => setZoom(Math.max(0.05, zoom * 0.7))}
              className="px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary hover:bg-bg-hover"
              title="Zoom out"
            >
              -
            </button>
            <button
              onClick={() => {
                setZoom(0.15);
                setOffset({ x: 0, y: 0 });
              }}
              className="px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary hover:bg-bg-hover"
              title="Reset view"
            >
              Reset
            </button>
            <button
              onClick={() => setZoom(Math.min(5, zoom * 1.4))}
              className="px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary hover:bg-bg-hover"
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full h-full cursor-grab active:cursor-grabbing block"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleCanvasClick}
          style={{ touchAction: 'none' }}
        />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-bg-secondary/90 rounded-lg border border-border p-3">
          <div className="text-xs font-medium text-text-primary mb-2">Legend</div>
          <div className="grid grid-cols-2 gap-2">
            {LOCATION_TYPES.map(t => (
              <div key={t.value} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-text-secondary">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Add Location Form */}
        {showAddForm && user && (
          <div className="absolute top-4 right-4 bg-bg-secondary rounded-lg border border-border p-4 w-80">
            <h3 className="font-medium text-text-primary mb-3">Add Location</h3>
            <form onSubmit={handleAddLocation} className="space-y-3">
              {formError && (
                <div className="p-2 bg-danger/10 border border-danger/30 rounded text-danger text-sm">
                  {formError}
                </div>
              )}

              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Location name"
                required
                className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border text-sm"
              />

              <textarea
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border text-sm resize-none"
              />

              <select
                value={addForm.location_type}
                onChange={(e) => setAddForm({ ...addForm, location_type: e.target.value as LocationType })}
                className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border text-sm"
              >
                {LOCATION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-text-muted">X Coordinate</label>
                  <input
                    type="number"
                    value={addForm.x}
                    onChange={(e) => setAddForm({ ...addForm, x: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Y Coordinate</label>
                  <input
                    type="number"
                    value={addForm.y}
                    onChange={(e) => setAddForm({ ...addForm, y: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border text-sm"
                  />
                </div>
              </div>

              <p className="text-xs text-text-muted">Tip: Click on the map to set coordinates</p>

              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={addForm.is_public}
                  onChange={(e) => setAddForm({ ...addForm, is_public: e.target.checked })}
                  className="rounded"
                />
                Public (visible to everyone)
              </label>

              <button
                type="submit"
                className="w-full py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm"
              >
                Add Location
              </button>
            </form>
          </div>
        )}

        {/* Selected Location Info */}
        {selectedLocation && (
          <div className="absolute top-4 left-4 bg-bg-secondary rounded-lg border border-border p-4 w-72">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-text-primary">{selectedLocation.name}</h3>
              <button
                onClick={() => setSelectedLocation(null)}
                className="text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            </div>

            {selectedLocation.is_verified && (
              <span className="inline-block px-2 py-0.5 text-xs bg-warning/20 text-warning rounded mb-2">
                Verified
              </span>
            )}

            {selectedLocation.description && (
              <p className="text-sm text-text-secondary mb-2">{selectedLocation.description}</p>
            )}

            <div className="text-sm text-text-muted space-y-1">
              <div>Type: {LOCATION_TYPES.find(t => t.value === selectedLocation.location_type)?.label}</div>
              <div>Coordinates: {selectedLocation.x}, {selectedLocation.y}</div>
              <div>Added by: {selectedLocation.username}</div>
            </div>

            {user && (user.id === selectedLocation.user_id || user.role === "admin") && (
              <button
                onClick={() => handleDeleteLocation(selectedLocation.id)}
                className="mt-3 w-full py-2 bg-danger/20 text-danger rounded-lg hover:bg-danger/30 transition-colors text-sm"
              >
                Delete Location
              </button>
            )}
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-text-primary">Loading map...</div>
          </div>
        )}
      </div>
    </div>
  );
}
