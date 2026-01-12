"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const SERVERS: { value: string; label: string; size: number }[] = [
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

interface MiniMapProps {
  server: string;
  markerX?: number | null;
  markerY?: number | null;
  onLocationSelect?: (x: number, y: number) => void;
  className?: string;
  height?: number;
}

export function MiniMap({
  server,
  markerX,
  markerY,
  onLocationSelect,
  className = "",
  height = 300,
}: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height });

  // Map navigation state
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Cursor coordinates (for display)
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number } | null>(null);

  // Refs for wheel handler
  const zoomRef = useRef(zoom);
  const offsetRef = useRef(offset);

  useEffect(() => {
    zoomRef.current = zoom;
    offsetRef.current = offset;
  }, [zoom, offset]);

  // Get map size for server
  const getMapSize = useCallback(() => {
    const serverLower = server.toLowerCase();
    const serverConfig = SERVERS.find(
      (s) => s.value === serverLower || s.label.toLowerCase() === serverLower
    );
    return serverConfig?.size || 4096;
  }, [server]);

  // Load map image
  useEffect(() => {
    if (!server) return;

    const serverLower = server.toLowerCase();
    const imageUrl = `/api/map/image?server=${serverLower}`;

    setMapLoading(true);
    setMapError(null);

    const img = new Image();

    img.onload = () => {
      setMapImage(img);
      setMapLoading(false);

      // Center the map initially, zoom to show marker if exists
      const mapSize = getMapSize();
      const initialZoom = Math.min(canvasSize.width, canvasSize.height) / mapSize * 0.9;
      setZoom(initialZoom);

      if (markerX && markerY) {
        // Center on marker
        setOffset({
          x: canvasSize.width / 2 - markerX * initialZoom,
          y: canvasSize.height / 2 - markerY * initialZoom,
        });
      } else {
        setOffset({
          x: (canvasSize.width - mapSize * initialZoom) / 2,
          y: (canvasSize.height - mapSize * initialZoom) / 2,
        });
      }
    };

    img.onerror = () => {
      setMapImage(null);
      setMapLoading(false);
      setMapError("Map not available");
    };

    img.src = imageUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [server, getMapSize, canvasSize.width, canvasSize.height, markerX, markerY]);

  // Handle container resize
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const width = Math.floor(rect.width);

      if (width > 0 && width !== canvasSize.width) {
        setCanvasSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    const timeout = setTimeout(updateSize, 100);

    return () => {
      window.removeEventListener("resize", updateSize);
      clearTimeout(timeout);
    };
  }, [height, canvasSize.width]);

  // Draw map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mapSize = getMapSize();

    // Clear with water color
    ctx.fillStyle = "#1e3a5f";
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw map image if loaded
    if (mapImage) {
      const imgWidth = mapSize * zoom;
      const imgHeight = mapSize * zoom;
      ctx.drawImage(mapImage, offset.x, offset.y, imgWidth, imgHeight);
    }

    // Draw marker if coordinates exist
    if (markerX && markerY) {
      const x = markerX * zoom + offset.x;
      const y = markerY * zoom + offset.y;

      // Draw marker shadow
      ctx.beginPath();
      ctx.arc(x + 2, y + 2, 10, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fill();

      // Draw marker
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();

      // Draw border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw crosshair
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y);
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x, y + 5);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw cursor coords if hovering
    if (cursorCoords) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(5, canvasSize.height - 25, 100, 20);
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px monospace";
      ctx.fillText(`${cursorCoords.x}, ${cursorCoords.y}`, 10, canvasSize.height - 10);
    }
  }, [mapImage, offset, zoom, markerX, markerY, canvasSize, getMapSize, cursorCoords]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate map coordinates
    const mapX = Math.round((mouseX - offset.x) / zoom);
    const mapY = Math.round((mouseY - offset.y) / zoom);
    setCursorCoords({ x: mapX, y: mapY });

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

  const handleMouseLeave = () => {
    setIsDragging(false);
    setCursorCoords(null);
  };

  // Handle click to select location
  const handleClick = (e: React.MouseEvent) => {
    if (isDragging || !onLocationSelect) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const mapX = Math.round((clickX - offset.x) / zoom);
    const mapY = Math.round((clickY - offset.y) / zoom);

    onLocationSelect(mapX, mapY);
  };

  // Wheel zoom handler
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

      const mapX = (mouseX - currentOffset.x) / currentZoom;
      const mapY = (mouseY - currentOffset.y) / currentZoom;

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.02, Math.min(3, currentZoom * zoomFactor));

      const newOffsetX = mouseX - mapX * newZoom;
      const newOffsetY = mouseY - mapY * newZoom;

      setZoom(newZoom);
      setOffset({ x: newOffsetX, y: newOffsetY });
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, []);

  // Center on marker button
  const centerOnMarker = () => {
    if (!markerX || !markerY) return;

    setOffset({
      x: canvasSize.width / 2 - markerX * zoom,
      y: canvasSize.height / 2 - markerY * zoom,
    });
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-text-primary">{server}</div>
        <div className="flex gap-1">
          {markerX && markerY && (
            <button
              onClick={centerOnMarker}
              className="px-2 py-1 text-xs bg-bg-tertiary rounded hover:bg-bg-hover"
              title="Center on location"
            >
              Center
            </button>
          )}
          <button
            onClick={() => setZoom((z) => Math.min(3, z * 1.3))}
            className="px-2 py-1 text-xs bg-bg-tertiary rounded hover:bg-bg-hover"
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.02, z * 0.7))}
            className="px-2 py-1 text-xs bg-bg-tertiary rounded hover:bg-bg-hover"
          >
            -
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={`w-full rounded-lg border border-border ${
          onLocationSelect ? "cursor-crosshair" : "cursor-grab"
        } active:cursor-grabbing`}
        style={{ height: `${height}px` }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      {/* Loading overlay */}
      {mapLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="text-sm text-text-muted">Loading map...</div>
        </div>
      )}

      {/* Error message */}
      {mapError && !mapLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-tertiary/90 rounded-lg">
          <div className="text-sm text-text-muted">{mapError}</div>
        </div>
      )}

      {/* Location info */}
      {markerX && markerY && (
        <div className="mt-2 text-xs text-text-muted text-center">
          Location: <span className="font-mono text-accent">{markerX}, {markerY}</span>
        </div>
      )}

      {/* Click hint */}
      {onLocationSelect && (
        <div className="mt-1 text-xs text-text-muted text-center">
          Click on map to set location
        </div>
      )}
    </div>
  );
}
