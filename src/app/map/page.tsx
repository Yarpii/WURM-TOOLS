"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { MapLocation, WurmServer, LocationType } from "@/lib/types";

const SERVERS: { value: WurmServer; label: string; size: number }[] = [
  { value: "harmony", label: "Harmony", size: 4096 },
  { value: "melody", label: "Melody", size: 2048 },
  { value: "cadence", label: "Cadence", size: 4096 },
  { value: "defiance", label: "Defiance", size: 4096 },
  { value: "independence", label: "Independence", size: 4096 },
  { value: "deliverance", label: "Deliverance", size: 2048 },
  { value: "exodus", label: "Exodus", size: 2048 },
  { value: "celebration", label: "Celebration", size: 2048 },
  { value: "pristine", label: "Pristine", size: 2048 },
  { value: "release", label: "Release", size: 2048 },
  { value: "xanadu", label: "Xanadu", size: 8192 },
];

const LOCATION_TYPES: { value: LocationType; label: string; color: string }[] = [
  { value: "deed", label: "Deed", color: "#22c55e" },
  { value: "merchant", label: "Merchant", color: "#eab308" },
  { value: "landmark", label: "Landmark", color: "#3b82f6" },
  { value: "resource", label: "Resource", color: "#a855f7" },
  { value: "spawn", label: "Spawn Point", color: "#ef4444" },
  { value: "other", label: "Other", color: "#6b7280" },
];

// Extended location types for archive maps (includes roads, tunnels, etc.)
const EXTENDED_LOCATION_TYPES: { value: string; label: string; color: string }[] = [
  { value: "deed", label: "Deed", color: "#22c55e" },
  { value: "merchant", label: "Merchant", color: "#eab308" },
  { value: "road", label: "Road/Highway", color: "#f97316" },
  { value: "tunnel", label: "Mine Tunnel", color: "#78716c" },
  { value: "bridge", label: "Bridge", color: "#06b6d4" },
  { value: "landmark", label: "Landmark", color: "#3b82f6" },
  { value: "resource", label: "Resource Node", color: "#a855f7" },
  { value: "spawn", label: "Spawn Point", color: "#ef4444" },
  { value: "harbor", label: "Harbor/Port", color: "#0ea5e9" },
  { value: "other", label: "Other", color: "#6b7280" },
];

// Custom map types with display labels
const MAP_TYPE_LABELS: { [key: string]: string } = {
  isometric: "Isometric",
  terrain: "Terrain",
  topographic: "Topographic",
  routes: "Routes",
  unknown: "Other",
};

interface CustomMapInfo {
  server: string;
  date: string;
  mapTypes: {
    type: string;
    filename: string;
  }[];
}

interface CustomMapsData {
  servers: string[];
  maps: CustomMapInfo[];
}

export default function MapPage() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Map source: live or archive
  const [mapSource, setMapSource] = useState<"live" | "archive">("live");

  // Live map filters
  const [selectedServer, setSelectedServer] = useState<WurmServer>("harmony");
  const [selectedType, setSelectedType] = useState<LocationType | "all">("all");

  // Archive map data
  const [customMaps, setCustomMaps] = useState<CustomMapsData | null>(null);
  const [customMapsLoading, setCustomMapsLoading] = useState(false);
  const [selectedArchiveServer, setSelectedArchiveServer] = useState<string>("");
  const [selectedArchiveDate, setSelectedArchiveDate] = useState<string>("");
  const [selectedArchiveMapType, setSelectedArchiveMapType] = useState<string>("");

  // Map state - Wurm maps are typically 4096x4096 or 8192x8192, so we need a low initial zoom
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.15); // Start zoomed out to see more of the map
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

  // Selected location
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);

  // Archive locations (pins for archive maps)
  const [archiveLocations, setArchiveLocations] = useState<MapLocation[]>([]);

  // Map image
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

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

  // Fetch custom maps data
  useEffect(() => {
    if (mapSource === "archive" && !customMaps) {
      setCustomMapsLoading(true);
      fetch("/api/map/custom")
        .then(res => res.json())
        .then((data: CustomMapsData) => {
          setCustomMaps(data);
          // Set default selections
          if (data.servers.length > 0 && !selectedArchiveServer) {
            setSelectedArchiveServer(data.servers[0]);
          }
        })
        .catch(err => {
          console.error("Failed to fetch custom maps:", err);
        })
        .finally(() => {
          setCustomMapsLoading(false);
        });
    }
  }, [mapSource, customMaps, selectedArchiveServer]);

  // Update date selection when server changes
  useEffect(() => {
    if (customMaps && selectedArchiveServer) {
      const serverMaps = customMaps.maps.filter(m => m.server === selectedArchiveServer);
      if (serverMaps.length > 0) {
        setSelectedArchiveDate(serverMaps[0].date);
      } else {
        setSelectedArchiveDate("");
      }
    }
  }, [selectedArchiveServer, customMaps]);

  // Update map type selection when date changes
  useEffect(() => {
    if (customMaps && selectedArchiveServer && selectedArchiveDate) {
      const mapInfo = customMaps.maps.find(
        m => m.server === selectedArchiveServer && m.date === selectedArchiveDate
      );
      if (mapInfo && mapInfo.mapTypes.length > 0) {
        // Prefer isometric/terrain type
        const preferred = mapInfo.mapTypes.find(t => t.type === "isometric") ||
                         mapInfo.mapTypes.find(t => t.type === "terrain") ||
                         mapInfo.mapTypes[0];
        setSelectedArchiveMapType(preferred.type);
      } else {
        setSelectedArchiveMapType("");
      }
    }
  }, [selectedArchiveDate, selectedArchiveServer, customMaps]);

  // Get available dates for selected archive server
  const archiveDates = customMaps?.maps
    .filter(m => m.server === selectedArchiveServer)
    .map(m => m.date) || [];

  // Get available map types for selected archive server and date
  const archiveMapTypes = customMaps?.maps
    .find(m => m.server === selectedArchiveServer && m.date === selectedArchiveDate)
    ?.mapTypes || [];

  // Generate archive server key for storing/fetching pins
  const getArchiveServerKey = () => {
    if (!selectedArchiveServer || !selectedArchiveDate) return null;
    return `archive_${selectedArchiveServer}_${selectedArchiveDate}`;
  };

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

  const fetchArchiveLocations = async () => {
    const archiveKey = getArchiveServerKey();
    if (!archiveKey) {
      setArchiveLocations([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set("server", archiveKey);

      const res = await fetch(`/api/map?${params}`);
      const data = await res.json();
      if (Array.isArray(data)) setArchiveLocations(data);
    } catch (err) {
      console.error("Failed to fetch archive locations:", err);
      setArchiveLocations([]);
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

  // Fetch archive locations when archive selection changes
  useEffect(() => {
    if (mapSource === "archive" && selectedArchiveServer && selectedArchiveDate) {
      fetchArchiveLocations();
    }
  }, [mapSource, selectedArchiveServer, selectedArchiveDate]);

  // Build map image URL based on source
  const getMapImageUrl = () => {
    if (mapSource === "live") {
      return `/api/map/image?server=${selectedServer}`;
    } else {
      // Archive map
      const mapInfo = customMaps?.maps.find(
        m => m.server === selectedArchiveServer && m.date === selectedArchiveDate
      );
      const mapType = mapInfo?.mapTypes.find(t => t.type === selectedArchiveMapType);
      if (mapType) {
        const params = new URLSearchParams({
          server: selectedArchiveServer,
          date: selectedArchiveDate,
          filename: mapType.filename
        });
        return `/api/map/custom/image?${params}`;
      }
      return null;
    }
  };

  // Get current map size (for archive maps, use a default)
  const getCurrentMapSize = () => {
    if (mapSource === "live") {
      const serverConfig = SERVERS.find(s => s.value === selectedServer);
      return serverConfig?.size || 4096;
    } else {
      // For archive maps, try to match with known servers or use default
      const lowerServer = selectedArchiveServer.toLowerCase();
      const matchedServer = SERVERS.find(s =>
        s.value === lowerServer || s.label.toLowerCase() === lowerServer
      );
      return matchedServer?.size || 4096;
    }
  };

  // Load map image when source or selection changes
  useEffect(() => {
    const imageUrl = getMapImageUrl();
    if (!imageUrl) {
      setMapImage(null);
      if (mapSource === "archive") {
        setMapError("Select a server, date, and map type");
      }
      return;
    }

    setMapLoading(true);
    setMapError(null);

    const img = new Image();

    img.onload = () => {
      setMapImage(img);
      setMapLoading(false);
      // Center the map initially
      const mapSize = getCurrentMapSize();
      const initialZoom = Math.min(canvasSize.width, canvasSize.height) / mapSize * 0.8;
      setZoom(initialZoom);
      setOffset({
        x: (canvasSize.width - mapSize * initialZoom) / 2,
        y: (canvasSize.height - mapSize * initialZoom) / 2,
      });
    };

    img.onerror = () => {
      setMapImage(null);
      setMapLoading(false);
      setMapError(mapSource === "live"
        ? "Failed to load map image. The server may not have public map dumps available."
        : "Failed to load archive map image."
      );
    };

    img.src = imageUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [mapSource, selectedServer, selectedArchiveServer, selectedArchiveDate, selectedArchiveMapType, customMaps]);

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

    const mapSize = getCurrentMapSize();

    const draw = () => {
      // Clear with water color
      ctx.fillStyle = "#1e3a5f";
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Draw map image if loaded
      if (mapImage) {
        const imgWidth = mapSize * zoom;
        const imgHeight = mapSize * zoom;
        ctx.drawImage(mapImage, offset.x, offset.y, imgWidth, imgHeight);
      }

      // Draw grid overlay (optional, lighter when map is loaded)
      ctx.strokeStyle = mapImage ? "rgba(255,255,255,0.1)" : "#2a2a4a";
      ctx.lineWidth = 1;
      const gridSize = 100 * zoom;

      // Only draw grid if zoomed in enough
      if (gridSize > 20) {
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
      }

      // Draw locations (for both live and archive maps)
      const currentLocations = mapSource === "live" ? locations : archiveLocations;
      for (const loc of currentLocations) {
        const x = (loc.x * zoom) + offset.x;
        const y = (loc.y * zoom) + offset.y;

        // Skip if off-screen
        if (x < -20 || x > canvasSize.width + 20 || y < -20 || y > canvasSize.height + 20) continue;

        const typeList = mapSource === "archive" ? EXTENDED_LOCATION_TYPES : LOCATION_TYPES;
        const typeInfo = typeList.find(t => t.value === loc.location_type);
        const color = typeInfo?.color || "#6b7280";

        // Draw marker shadow
        ctx.beginPath();
        ctx.arc(x + 2, y + 2, 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fill();

        // Draw marker
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Draw border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (loc.is_verified) {
          ctx.strokeStyle = "#ffd700";
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Draw label with background
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        const textWidth = ctx.measureText(loc.name).width;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(x - textWidth / 2 - 4, y - 26, textWidth + 8, 16);
        ctx.fillStyle = "#fff";
        ctx.fillText(loc.name, x, y - 14);
      }

      // Draw coordinates
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      const mouseX = Math.round(-offset.x / zoom);
      const mouseY = Math.round(-offset.y / zoom);
      const serverName = mapSource === "live" ? selectedServer.toUpperCase() : selectedArchiveServer;
      const dateInfo = mapSource === "archive" ? ` | ${selectedArchiveDate}` : "";
      ctx.fillText(`Server: ${serverName}${dateInfo} | Offset: ${mouseX}, ${mouseY} | Zoom: ${zoom.toFixed(1)}x`, 10, 20);
    };

    draw();
  }, [locations, archiveLocations, offset, zoom, selectedServer, canvasSize, mapImage, mapSource, selectedArchiveServer, selectedArchiveDate]);

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

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate map position under cursor before zoom
    const mapX = (mouseX - offset.x) / zoom;
    const mapY = (mouseY - offset.y) / zoom;

    // Calculate new zoom
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.05, Math.min(5, zoom * zoomFactor));

    // Calculate new offset to keep the same map position under cursor
    const newOffsetX = mouseX - mapX * newZoom;
    const newOffsetY = mouseY - mapY * newZoom;

    setZoom(newZoom);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if clicked on a location (for both live and archive maps)
    const currentLocations = mapSource === "live" ? locations : archiveLocations;
    for (const loc of currentLocations) {
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

    // Use archive key for archive maps, or selected server for live maps
    const serverKey = mapSource === "archive" ? getArchiveServerKey() : selectedServer;

    if (!serverKey) {
      setFormError("Please select a server and date first");
      return;
    }

    try {
      const res = await fetch("/api/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...addForm,
          server: serverKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to add location");
        return;
      }

      setShowAddForm(false);
      setAddForm({ name: "", description: "", location_type: "deed", x: 500, y: 500, is_public: true });

      // Refresh locations
      if (mapSource === "live") {
        await fetchLocations();
      } else {
        await fetchArchiveLocations();
      }
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
        // Refresh the appropriate locations list
        if (mapSource === "live") {
          await fetchLocations();
        } else {
          await fetchArchiveLocations();
        }
      }
    } catch (err) {
      console.error("Failed to delete location:", err);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Controls */}
      <div className="bg-bg-secondary border-b border-border p-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
          <h1 className="text-xl font-bold text-text-primary">World Map</h1>

          {/* Map Source Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setMapSource("live")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                mapSource === "live"
                  ? "bg-accent text-white"
                  : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
              }`}
            >
              Live
            </button>
            <button
              onClick={() => setMapSource("archive")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                mapSource === "archive"
                  ? "bg-accent text-white"
                  : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
              }`}
            >
              Archive
            </button>
          </div>

          {/* Live Map Controls */}
          {mapSource === "live" && (
            <>
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
            </>
          )}

          {/* Archive Map Controls */}
          {mapSource === "archive" && (
            <>
              {customMapsLoading ? (
                <span className="text-sm text-text-muted">Loading archives...</span>
              ) : (
                <>
                  <select
                    value={selectedArchiveServer}
                    onChange={(e) => setSelectedArchiveServer(e.target.value)}
                    className="px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                  >
                    <option value="">Select Server</option>
                    {customMaps?.servers.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  <select
                    value={selectedArchiveDate}
                    onChange={(e) => setSelectedArchiveDate(e.target.value)}
                    className="px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                    disabled={!selectedArchiveServer}
                  >
                    <option value="">Select Date</option>
                    {archiveDates.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  <select
                    value={selectedArchiveMapType}
                    onChange={(e) => setSelectedArchiveMapType(e.target.value)}
                    className="px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                    disabled={!selectedArchiveDate}
                  >
                    <option value="">Select Type</option>
                    {archiveMapTypes.map(t => (
                      <option key={t.type} value={t.type}>
                        {MAP_TYPE_LABELS[t.type] || t.type}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </>
          )}

          <div className="flex-1" />

          {user && (mapSource === "live" || (mapSource === "archive" && selectedArchiveServer && selectedArchiveDate)) && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showAddForm
                  ? "bg-danger text-white"
                  : "bg-accent text-white hover:bg-accent-hover"
              }`}
            >
              {showAddForm ? "Cancel" : "Add Pin"}
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

        {/* Legend - only show for live maps */}
        {mapSource === "live" && (
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
        )}

        {/* Archive Map Info with Legend */}
        {mapSource === "archive" && selectedArchiveServer && selectedArchiveDate && (
          <div className="absolute bottom-4 left-4 bg-bg-secondary/90 rounded-lg border border-border p-3">
            <div className="text-xs font-medium text-text-primary mb-1">Archive Map</div>
            <div className="text-sm text-text-secondary">
              {selectedArchiveServer} - {selectedArchiveDate}
            </div>
            {selectedArchiveMapType && (
              <div className="text-xs text-text-muted mt-1">
                Type: {MAP_TYPE_LABELS[selectedArchiveMapType] || selectedArchiveMapType}
              </div>
            )}
            <div className="text-xs text-text-muted mt-1">
              {archiveLocations.length} pins
            </div>

            {/* Legend */}
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-xs font-medium text-text-primary mb-2">Pin Types</div>
              <div className="grid grid-cols-2 gap-1">
                {EXTENDED_LOCATION_TYPES.map(t => (
                  <div key={t.value} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="text-text-secondary truncate">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Add Location Form */}
        {showAddForm && user && (
          <div className="absolute top-4 right-4 bg-bg-secondary rounded-lg border border-border p-4 w-80">
            <h3 className="font-medium text-text-primary mb-3">
              Add Pin {mapSource === "archive" && selectedArchiveServer && `to ${selectedArchiveServer}`}
            </h3>
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
                {(mapSource === "archive" ? EXTENDED_LOCATION_TYPES : LOCATION_TYPES).map(t => (
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
                X
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
              <div>Type: {(mapSource === "archive" ? EXTENDED_LOCATION_TYPES : LOCATION_TYPES).find(t => t.value === selectedLocation.location_type)?.label || selectedLocation.location_type}</div>
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

        {(loading || mapLoading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <div className="text-text-primary mb-2">
                {mapLoading ? "Loading map image..." : "Loading locations..."}
              </div>
              <div className="text-sm text-text-muted">This may take a moment for larger maps</div>
            </div>
          </div>
        )}

        {mapError && !mapLoading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-warning/20 border border-warning/30 rounded-lg px-4 py-2 text-warning text-sm">
            {mapError}
          </div>
        )}
      </div>
    </div>
  );
}
