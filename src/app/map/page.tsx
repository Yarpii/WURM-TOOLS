"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { MapLocation, LocationType } from "@/lib/types";

// Server sizes for coordinate calculations
const SERVER_SIZES: { [key: string]: number } = {
  harmony: 4096,
  melody: 2048,
  cadence: 4096,
  defiance: 4096,
  independence: 4096,
  deliverance: 2048,
  exodus: 2048,
  celebration: 2048,
  pristine: 2048,
  release: 2048,
  xanadu: 8192,
};

// Location types for map pins
const LOCATION_TYPES: { value: string; label: string; color: string }[] = [
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

  // Map data
  const [customMaps, setCustomMaps] = useState<CustomMapsData | null>(null);
  const [customMapsLoading, setCustomMapsLoading] = useState(false);
  const [selectedServer, setSelectedServer] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedMapType, setSelectedMapType] = useState<string>("");

  // Map state - Wurm maps are typically 4096x4096 or 8192x8192, so we need a low initial zoom
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.15); // Start zoomed out to see more of the map
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

  // Selected location
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);

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

  // Right-click context menu
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    screenX: number;
    screenY: number;
    mapX: number;
    mapY: number;
  }>({
    visible: false,
    screenX: 0,
    screenY: 0,
    mapX: 0,
    mapY: 0,
  });

  // Quick pin modal (for right-click pin creation)
  const [showQuickPin, setShowQuickPin] = useState(false);
  const [quickPinForm, setQuickPinForm] = useState({
    name: "",
    description: "",
    location_type: "landmark" as LocationType | string,
  });

  // Fetch custom maps data on mount
  useEffect(() => {
    if (!customMaps) {
      setCustomMapsLoading(true);
      fetch("/api/map/custom")
        .then(res => res.json())
        .then((data: CustomMapsData) => {
          setCustomMaps(data);
          // Set default selections
          if (data.servers.length > 0 && !selectedServer) {
            setSelectedServer(data.servers[0]);
          }
        })
        .catch(err => {
          console.error("Failed to fetch custom maps:", err);
        })
        .finally(() => {
          setCustomMapsLoading(false);
        });
    }
  }, [customMaps, selectedServer]);

  // Update date selection when server changes
  useEffect(() => {
    if (customMaps && selectedServer) {
      const serverMaps = customMaps.maps.filter(m => m.server === selectedServer);
      if (serverMaps.length > 0) {
        setSelectedDate(serverMaps[0].date);
      } else {
        setSelectedDate("");
      }
    }
  }, [selectedServer, customMaps]);

  // Update map type selection when date changes
  useEffect(() => {
    if (customMaps && selectedServer && selectedDate) {
      const mapInfo = customMaps.maps.find(
        m => m.server === selectedServer && m.date === selectedDate
      );
      if (mapInfo && mapInfo.mapTypes.length > 0) {
        // Prefer isometric/terrain type
        const preferred = mapInfo.mapTypes.find(t => t.type === "isometric") ||
                         mapInfo.mapTypes.find(t => t.type === "terrain") ||
                         mapInfo.mapTypes[0];
        setSelectedMapType(preferred.type);
      } else {
        setSelectedMapType("");
      }
    }
  }, [selectedDate, selectedServer, customMaps]);

  // Get available dates for selected server
  const availableDates = customMaps?.maps
    .filter(m => m.server === selectedServer)
    .map(m => m.date) || [];

  // Get available map types for selected server and date
  const availableMapTypes = customMaps?.maps
    .find(m => m.server === selectedServer && m.date === selectedDate)
    ?.mapTypes || [];

  // Generate server key for storing/fetching pins
  const getServerKey = () => {
    if (!selectedServer || !selectedDate) return null;
    return `archive_${selectedServer}_${selectedDate}`;
  };

  const fetchLocations = async () => {
    const serverKey = getServerKey();
    if (!serverKey) {
      setLocations([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set("server", serverKey);

      const res = await fetch(`/api/map?${params}`);
      const data = await res.json();
      if (Array.isArray(data)) setLocations(data);
    } catch (err) {
      console.error("Failed to fetch locations:", err);
      setLocations([]);
    }
  };

  // Fetch locations when selection changes
  useEffect(() => {
    if (selectedServer && selectedDate) {
      setLoading(true);
      fetchLocations().finally(() => setLoading(false));
    }
  }, [selectedServer, selectedDate]);

  // Build map image URL
  const getMapImageUrl = () => {
    const mapInfo = customMaps?.maps.find(
      m => m.server === selectedServer && m.date === selectedDate
    );
    const mapType = mapInfo?.mapTypes.find(t => t.type === selectedMapType);
    if (mapType) {
      const params = new URLSearchParams({
        server: selectedServer,
        date: selectedDate,
        filename: mapType.filename
      });
      return `/api/map/custom/image?${params}`;
    }
    return null;
  };

  // Get current map size
  const getCurrentMapSize = () => {
    const lowerServer = selectedServer.toLowerCase();
    return SERVER_SIZES[lowerServer] || 4096;
  };

  // Load map image when selection changes
  useEffect(() => {
    const imageUrl = getMapImageUrl();
    if (!imageUrl) {
      setMapImage(null);
      if (selectedServer) {
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
      setMapError("Failed to load map image.");
    };

    img.src = imageUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [selectedServer, selectedDate, selectedMapType, customMaps]);

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

      // Draw locations
      for (const loc of locations) {
        const x = (loc.x * zoom) + offset.x;
        const y = (loc.y * zoom) + offset.y;

        // Skip if off-screen
        if (x < -20 || x > canvasSize.width + 20 || y < -20 || y > canvasSize.height + 20) continue;

        const typeInfo = LOCATION_TYPES.find(t => t.value === loc.location_type);
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
      const dateInfo = selectedDate ? ` | ${selectedDate}` : "";
      ctx.fillText(`Server: ${selectedServer}${dateInfo} | Offset: ${mouseX}, ${mouseY} | Zoom: ${zoom.toFixed(1)}x`, 10, 20);
    };

    draw();
  }, [locations, offset, zoom, selectedServer, selectedDate, canvasSize, mapImage]);

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

  // Use a ref to store latest zoom/offset values for the wheel handler
  const zoomRef = useRef(zoom);
  const offsetRef = useRef(offset);

  // Keep refs in sync with state
  useEffect(() => {
    zoomRef.current = zoom;
    offsetRef.current = offset;
  }, [zoom, offset]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };

    if (contextMenu.visible) {
      // Add listener with a small delay to prevent immediate close
      const timeout = setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 10);

      return () => {
        clearTimeout(timeout);
        document.removeEventListener("click", handleClickOutside);
      };
    }
  }, [contextMenu.visible]);

  // Add wheel event listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const currentZoom = zoomRef.current;
      const currentOffset = offsetRef.current;

      // Calculate map position under cursor before zoom
      const mapX = (mouseX - currentOffset.x) / currentZoom;
      const mapY = (mouseY - currentOffset.y) / currentZoom;

      // Calculate new zoom
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.05, Math.min(5, currentZoom * zoomFactor));

      // Calculate new offset to keep the same map position under cursor
      const newOffsetX = mouseX - mapX * newZoom;
      const newOffsetY = mouseY - mapY * newZoom;

      setZoom(newZoom);
      setOffset({ x: newOffsetX, y: newOffsetY });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Close context menu on any click
    if (contextMenu.visible) {
      setContextMenu({ ...contextMenu, visible: false });
      return;
    }

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

  // Right-click context menu handler
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Calculate map coordinates from screen position
    const mapX = Math.round((clickX - offset.x) / zoom);
    const mapY = Math.round((clickY - offset.y) / zoom);

    // Position context menu at mouse location
    setContextMenu({
      visible: true,
      screenX: e.clientX,
      screenY: e.clientY,
      mapX,
      mapY,
    });
  };

  // Open quick pin modal from context menu
  const openQuickPinModal = () => {
    setQuickPinForm({
      name: "",
      description: "",
      location_type: "landmark",
    });
    setShowQuickPin(true);
    setContextMenu({ ...contextMenu, visible: false });
  };

  // Copy coordinates to clipboard
  const copyCoordinates = async () => {
    const coordText = `${contextMenu.mapX}, ${contextMenu.mapY}`;
    try {
      await navigator.clipboard.writeText(coordText);
      // Could show a toast notification here
    } catch (err) {
      console.error("Failed to copy:", err);
    }
    setContextMenu({ ...contextMenu, visible: false });
  };

  // Capture a minimap screenshot of a specific location
  const captureMinimapScreenshot = async (
    mapX: number,
    mapY: number,
    server: string
  ): Promise<string | null> => {
    try {
      // Get the map size for this server
      const serverKey = server.toLowerCase();
      const mapSize = SERVER_SIZES[serverKey] || 4096;

      // Create an offscreen canvas for the minimap (300x300)
      const screenshotSize = 300;
      const canvas = document.createElement("canvas");
      canvas.width = screenshotSize;
      canvas.height = screenshotSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Calculate zoom to show roughly 400 tiles around the location
      const viewRadius = 200; // tiles to show in each direction
      const screenshotZoom = screenshotSize / (viewRadius * 2);

      // Load the map image
      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load map"));

        // Use the currently loaded map image URL
        if (selectedDate && selectedMapType) {
          // Custom map
          const mapInfo = customMaps?.maps.find(
            m => m.server === selectedServer && m.date === selectedDate
          );
          const mapTypeInfo = mapInfo?.mapTypes.find(t => t.type === selectedMapType);
          if (mapTypeInfo) {
            img.src = `/api/map/custom/image?server=${selectedServer}&date=${selectedDate}&filename=${mapTypeInfo.filename}`;
          } else {
            img.src = `/api/map/image?server=${serverKey}`;
          }
        } else {
          img.src = `/api/map/image?server=${serverKey}`;
        }
      });

      // Fill background
      ctx.fillStyle = "#1e3a5f";
      ctx.fillRect(0, 0, screenshotSize, screenshotSize);

      // Calculate the source area from the map to draw
      // We want to center on (mapX, mapY) and show viewRadius tiles around it
      const sourceX = mapX - viewRadius;
      const sourceY = mapY - viewRadius;
      const sourceWidth = viewRadius * 2;
      const sourceHeight = viewRadius * 2;

      // Scale factor between original map image and map size
      const imgScale = img.width / mapSize;

      // Draw the map section
      ctx.drawImage(
        img,
        sourceX * imgScale,
        sourceY * imgScale,
        sourceWidth * imgScale,
        sourceHeight * imgScale,
        0,
        0,
        screenshotSize,
        screenshotSize
      );

      // Draw marker at center
      const centerX = screenshotSize / 2;
      const centerY = screenshotSize / 2;

      // Marker shadow
      ctx.beginPath();
      ctx.arc(centerX + 2, centerY + 2, 12, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fill();

      // Marker circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();

      // Marker border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Crosshair
      ctx.beginPath();
      ctx.moveTo(centerX - 6, centerY);
      ctx.lineTo(centerX + 6, centerY);
      ctx.moveTo(centerX, centerY - 6);
      ctx.lineTo(centerX, centerY + 6);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw coordinates label at bottom
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, screenshotSize - 24, screenshotSize, 24);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${server} - ${mapX}, ${mapY}`, screenshotSize / 2, screenshotSize - 8);

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png", 0.9);
      });

      if (!blob) return null;

      // Upload the screenshot
      const formData = new FormData();
      formData.append("file", blob, `treasure_${mapX}_${mapY}_${Date.now()}.png`);
      formData.append("category", "screenshots");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        console.error("Failed to upload screenshot");
        return null;
      }

      const uploadData = await uploadRes.json();
      return uploadData.url || null;
    } catch (err) {
      console.error("Failed to capture minimap screenshot:", err);
      return null;
    }
  };

  // Open treasures page with coordinates pre-filled
  const openTreasureWithCoords = async () => {
    setContextMenu({ ...contextMenu, visible: false });

    // Capture minimap screenshot of the location
    const screenshotUrl = await captureMinimapScreenshot(
      contextMenu.mapX,
      contextMenu.mapY,
      selectedServer
    );

    const params = new URLSearchParams({
      x: contextMenu.mapX.toString(),
      y: contextMenu.mapY.toString(),
      server: selectedServer,
    });

    // Add screenshot URL if captured successfully
    if (screenshotUrl) {
      params.append("screenshot", screenshotUrl);
    }

    window.open(`/treasures?${params}`, "_blank");
  };

  // Handle quick pin submit
  const handleQuickPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const serverKey = getServerKey();
    if (!serverKey) {
      setFormError("Please select a server first");
      return;
    }

    try {
      const res = await fetch("/api/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: quickPinForm.name,
          description: quickPinForm.description,
          location_type: quickPinForm.location_type,
          x: contextMenu.mapX,
          y: contextMenu.mapY,
          server: serverKey,
          is_public: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to add pin");
        return;
      }

      setShowQuickPin(false);
      setQuickPinForm({ name: "", description: "", location_type: "landmark" });

      // Refresh locations
      await fetchLocations();
    } catch (err) {
      setFormError("Connection error");
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const serverKey = getServerKey();

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
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
          <h1 className="text-xl font-bold text-text-primary">World Map</h1>

          {/* Map Controls */}
          {customMapsLoading ? (
            <span className="text-sm text-text-muted">Loading maps...</span>
          ) : (
            <>
              <select
                value={selectedServer}
                onChange={(e) => setSelectedServer(e.target.value)}
                className="px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
              >
                <option value="">Select Server</option>
                {customMaps?.servers.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                disabled={!selectedServer}
              >
                <option value="">Select Date</option>
                {availableDates.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={selectedMapType}
                onChange={(e) => setSelectedMapType(e.target.value)}
                className="px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                disabled={!selectedDate}
              >
                <option value="">Select Type</option>
                {availableMapTypes.map(t => (
                  <option key={t.type} value={t.type}>
                    {MAP_TYPE_LABELS[t.type] || t.type}
                  </option>
                ))}
              </select>
            </>
          )}

          <div className="flex-1" />

          {user && selectedServer && selectedDate && (
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
          onClick={handleCanvasClick}
          onContextMenu={handleContextMenu}
          style={{ touchAction: 'none' }}
        />

        {/* Map Info with Legend */}
        {selectedServer && selectedDate && (
          <div className="absolute bottom-4 left-4 bg-bg-secondary/90 rounded-lg border border-border p-3">
            <div className="text-xs font-medium text-text-primary mb-1">Map</div>
            <div className="text-sm text-text-secondary">
              {selectedServer} - {selectedDate}
            </div>
            {selectedMapType && (
              <div className="text-xs text-text-muted mt-1">
                Type: {MAP_TYPE_LABELS[selectedMapType] || selectedMapType}
              </div>
            )}
            <div className="text-xs text-text-muted mt-1">
              {locations.length} pins
            </div>

            {/* Legend */}
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-xs font-medium text-text-primary mb-2">Pin Types</div>
              <div className="grid grid-cols-2 gap-1">
                {LOCATION_TYPES.map(t => (
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
              Add Pin {selectedServer && `to ${selectedServer}`}
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
              <div>Type: {LOCATION_TYPES.find(t => t.value === selectedLocation.location_type)?.label || selectedLocation.location_type}</div>
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

        {/* Right-click Context Menu */}
        {contextMenu.visible && (
          <div
            className="fixed bg-bg-secondary border border-border rounded-lg shadow-xl py-1 z-50 min-w-[180px]"
            style={{
              left: contextMenu.screenX,
              top: contextMenu.screenY,
            }}
          >
            {/* Coordinates header */}
            <div className="px-3 py-2 border-b border-border">
              <div className="text-xs text-text-muted">Coordinates</div>
              <div className="font-mono text-sm text-accent">
                {contextMenu.mapX}, {contextMenu.mapY}
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              {user && (
                <button
                  onClick={openQuickPinModal}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-bg-tertiary flex items-center gap-2"
                >
                  <span className="text-success">+</span>
                  <span>Add Pin Here</span>
                </button>
              )}

              {user && (
                <button
                  onClick={openTreasureWithCoords}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-bg-tertiary flex items-center gap-2"
                >
                  <span className="text-warning">X</span>
                  <span>New Treasure Hunt</span>
                </button>
              )}

              <button
                onClick={copyCoordinates}
                className="w-full px-3 py-2 text-left text-sm hover:bg-bg-tertiary flex items-center gap-2"
              >
                <span className="text-info">@</span>
                <span>Copy Coordinates</span>
              </button>

              <div className="border-t border-border my-1" />

              <button
                onClick={() => setContextMenu({ ...contextMenu, visible: false })}
                className="w-full px-3 py-2 text-left text-sm text-text-muted hover:bg-bg-tertiary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Quick Pin Modal */}
        {showQuickPin && user && (
          <div className="absolute top-4 right-4 bg-bg-secondary rounded-lg border border-border p-4 w-80 z-40">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-text-primary">Quick Pin</h3>
              <button
                onClick={() => setShowQuickPin(false)}
                className="text-text-muted hover:text-text-primary"
              >
                X
              </button>
            </div>

            <div className="mb-3 p-2 bg-bg-tertiary rounded text-sm">
              <span className="text-text-muted">Location: </span>
              <span className="font-mono text-accent">{contextMenu.mapX}, {contextMenu.mapY}</span>
            </div>

            <form onSubmit={handleQuickPinSubmit} className="space-y-3">
              {formError && (
                <div className="p-2 bg-danger/10 border border-danger/30 rounded text-danger text-sm">
                  {formError}
                </div>
              )}

              <input
                type="text"
                value={quickPinForm.name}
                onChange={(e) => setQuickPinForm({ ...quickPinForm, name: e.target.value })}
                placeholder="Pin name"
                required
                autoFocus
                className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border text-sm"
              />

              <select
                value={quickPinForm.location_type}
                onChange={(e) => setQuickPinForm({ ...quickPinForm, location_type: e.target.value })}
                className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border text-sm"
              >
                {LOCATION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <textarea
                value={quickPinForm.description}
                onChange={(e) => setQuickPinForm({ ...quickPinForm, description: e.target.value })}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border text-sm resize-none"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickPin(false)}
                  className="flex-1 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-bg-hover transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm"
                >
                  Add Pin
                </button>
              </div>
            </form>
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
