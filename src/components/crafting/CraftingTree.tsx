"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Item, CraftingNode } from "@/lib/types";

interface CraftingTreeProps {
  items: Item[];
}

interface TreeNodeData extends CraftingNode {
  x: number;
  y: number;
  owned: boolean;
  highlighted: boolean;
}

interface TreeLayout {
  nodes: TreeNodeData[];
  links: { source: TreeNodeData; target: TreeNodeData }[];
  width: number;
  height: number;
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 50;
const LEVEL_GAP = 100;
const SIBLING_GAP = 20;

export default function CraftingTree({ items }: CraftingTreeProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [tree, setTree] = useState<CraftingNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownedItems, setOwnedItems] = useState<Set<number>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Filter items for search (only show craftable items, not base materials)
  const filteredItems = items.filter(
    (item) =>
      !item.is_base_material &&
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Load tree when item or quantity changes
  useEffect(() => {
    if (!selectedItem) {
      setTree(null);
      return;
    }

    const loadTree = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/calculate?item=${selectedItem.id}&qty=${quantity}&mode=full&source=wurmpedia`
        );
        const data = await res.json();
        if (res.ok && data.tree) {
          setTree(data.tree);
          // Reset view when loading new tree
          setZoom(1);
          setPan({ x: 50, y: 50 });
        } else {
          setError(data.error || "Failed to load recipe tree");
          setTree(null);
        }
      } catch (err) {
        setError("Failed to load recipe tree");
        setTree(null);
      } finally {
        setLoading(false);
      }
    };

    loadTree();
  }, [selectedItem, quantity]);

  // Calculate tree layout
  const calculateLayout = useCallback((root: CraftingNode): TreeLayout => {
    const nodes: TreeNodeData[] = [];
    const links: { source: TreeNodeData; target: TreeNodeData }[] = [];

    // Count nodes at each depth level
    const levelWidths: number[] = [];
    const countNodesAtLevel = (node: CraftingNode, depth: number) => {
      levelWidths[depth] = (levelWidths[depth] || 0) + 1;
      node.children?.forEach((child) => countNodesAtLevel(child, depth + 1));
    };
    countNodesAtLevel(root, 0);

    // Position counters per level
    const levelPositions: number[] = levelWidths.map(() => 0);

    // Recursively position nodes
    const positionNode = (
      node: CraftingNode,
      depth: number,
      parentNode?: TreeNodeData
    ): TreeNodeData => {
      const levelWidth = levelWidths[depth];
      const position = levelPositions[depth]++;

      const x = depth * (NODE_WIDTH + LEVEL_GAP) + NODE_WIDTH / 2;
      const totalHeight = levelWidth * (NODE_HEIGHT + SIBLING_GAP) - SIBLING_GAP;
      const startY = -totalHeight / 2;
      const y = startY + position * (NODE_HEIGHT + SIBLING_GAP) + NODE_HEIGHT / 2;

      const treeNode: TreeNodeData = {
        ...node,
        x,
        y,
        owned: ownedItems.has(node.id),
        highlighted: false,
      };

      nodes.push(treeNode);

      if (parentNode) {
        links.push({ source: parentNode, target: treeNode });
      }

      node.children?.forEach((child) => {
        positionNode(child, depth + 1, treeNode);
      });

      return treeNode;
    };

    positionNode(root, 0);

    // Calculate bounding box
    const minX = Math.min(...nodes.map((n) => n.x)) - NODE_WIDTH / 2;
    const maxX = Math.max(...nodes.map((n) => n.x)) + NODE_WIDTH / 2;
    const minY = Math.min(...nodes.map((n) => n.y)) - NODE_HEIGHT / 2;
    const maxY = Math.max(...nodes.map((n) => n.y)) + NODE_HEIGHT / 2;

    // Adjust positions to start from 0
    nodes.forEach((node) => {
      node.x -= minX;
      node.y -= minY;
    });

    return {
      nodes,
      links,
      width: maxX - minX + 100,
      height: maxY - minY + 100,
    };
  }, [ownedItems]);

  // Find duplicate materials (shared between branches)
  const findDuplicates = useCallback((nodes: TreeNodeData[]): Set<number> => {
    const counts = new Map<number, number>();
    nodes.forEach((node) => {
      counts.set(node.id, (counts.get(node.id) || 0) + 1);
    });
    const duplicates = new Set<number>();
    counts.forEach((count, id) => {
      if (count > 1) duplicates.add(id);
    });
    return duplicates;
  }, []);

  // Toggle owned status
  const toggleOwned = (nodeId: number) => {
    setOwnedItems((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Mouse handlers for pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel handler for zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.min(Math.max(prev * delta, 0.25), 2));
  };

  // Calculate layout when tree changes
  const layout = tree ? calculateLayout(tree) : null;
  const duplicates = layout ? findDuplicates(layout.nodes) : new Set<number>();

  // Count materials summary
  const materialsSummary = layout
    ? layout.nodes.reduce((acc, node) => {
        if (node.is_base && !node.owned) {
          acc.push({ name: node.name, quantity: node.quantity, id: node.id });
        }
        return acc;
      }, [] as { name: string; quantity: number; id: number }[])
    : [];

  // Merge duplicate materials
  const mergedMaterials = materialsSummary.reduce((acc, mat) => {
    const existing = acc.find((m) => m.id === mat.id);
    if (existing) {
      existing.quantity += mat.quantity;
    } else {
      acc.push({ ...mat });
    }
    return acc;
  }, [] as { name: string; quantity: number; id: number }[]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Item Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Select Item to Visualize
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search craftable items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent placeholder-text-muted"
              />
              {searchTerm && filteredItems.length > 0 && (
                <div className="absolute z-20 w-full mt-1 max-h-60 overflow-auto bg-bg-secondary border border-border rounded-lg shadow-xl">
                  {filteredItems.slice(0, 20).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedItem(item);
                        setSearchTerm(item.name);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-bg-hover transition-colors ${
                        selectedItem?.id === item.id ? "bg-accent/20 text-accent" : ""
                      }`}
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="text-text-muted text-sm ml-2">({item.category})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2.5 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent"
            />
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
          <span className="text-sm text-text-secondary">Zoom:</span>
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
            className="px-3 py-1 bg-bg-tertiary border border-border rounded hover:border-accent"
          >
            -
          </button>
          <span className="text-sm font-mono w-16 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
            className="px-3 py-1 bg-bg-tertiary border border-border rounded hover:border-accent"
          >
            +
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 50, y: 50 });
            }}
            className="px-3 py-1 bg-bg-tertiary border border-border rounded hover:border-accent text-sm"
          >
            Reset View
          </button>
          <div className="flex-1" />
          <span className="text-xs text-text-muted">Drag to pan, scroll to zoom</span>
        </div>
      </div>

      {/* Tree Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Tree View */}
        <div className="lg:col-span-3">
          <div
            ref={containerRef}
            className="bg-bg-secondary border border-border rounded-xl overflow-hidden"
            style={{ height: "600px" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin text-4xl mb-2">&#9881;</div>
                  <p className="text-text-secondary">Loading recipe tree...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-red-400">
                  <p>{error}</p>
                </div>
              </div>
            )}

            {!selectedItem && !loading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-5xl mb-4 opacity-20">&#127795;</div>
                  <h3 className="text-lg text-text-secondary mb-2">Select an Item</h3>
                  <p className="text-text-muted text-sm">
                    Search for a craftable item above to visualize its material tree
                  </p>
                </div>
              </div>
            )}

            {layout && !loading && (
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{ cursor: isDragging ? "grabbing" : "grab" }}
              >
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  {/* Links */}
                  {layout.links.map((link, i) => (
                    <path
                      key={i}
                      d={`M ${link.source.x + NODE_WIDTH / 2} ${link.source.y}
                          C ${link.source.x + NODE_WIDTH / 2 + LEVEL_GAP / 2} ${link.source.y},
                            ${link.target.x - NODE_WIDTH / 2 - LEVEL_GAP / 2} ${link.target.y},
                            ${link.target.x - NODE_WIDTH / 2} ${link.target.y}`}
                      fill="none"
                      stroke={
                        ownedItems.has(link.target.id)
                          ? "rgba(34, 197, 94, 0.3)"
                          : "rgba(255, 255, 255, 0.2)"
                      }
                      strokeWidth={2}
                    />
                  ))}

                  {/* Nodes */}
                  {layout.nodes.map((node) => (
                    <g
                      key={`${node.id}-${node.depth}-${node.x}-${node.y}`}
                      transform={`translate(${node.x - NODE_WIDTH / 2}, ${node.y - NODE_HEIGHT / 2})`}
                      onClick={() => toggleOwned(node.id)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Node background */}
                      <rect
                        width={NODE_WIDTH}
                        height={NODE_HEIGHT}
                        rx={8}
                        fill={
                          ownedItems.has(node.id)
                            ? "rgba(34, 197, 94, 0.2)"
                            : node.is_base
                            ? "rgba(59, 130, 246, 0.2)"
                            : "rgba(139, 92, 246, 0.2)"
                        }
                        stroke={
                          duplicates.has(node.id)
                            ? "#f59e0b"
                            : ownedItems.has(node.id)
                            ? "#22c55e"
                            : node.is_base
                            ? "#3b82f6"
                            : "#8b5cf6"
                        }
                        strokeWidth={duplicates.has(node.id) ? 3 : 2}
                      />

                      {/* Owned checkmark */}
                      {ownedItems.has(node.id) && (
                        <text
                          x={NODE_WIDTH - 16}
                          y={16}
                          fill="#22c55e"
                          fontSize="14"
                          textAnchor="middle"
                        >
                          &#10003;
                        </text>
                      )}

                      {/* Node name */}
                      <text
                        x={NODE_WIDTH / 2}
                        y={NODE_HEIGHT / 2 - 5}
                        fill="white"
                        fontSize="11"
                        fontWeight="500"
                        textAnchor="middle"
                      >
                        {node.name.length > 16 ? node.name.slice(0, 14) + "..." : node.name}
                      </text>

                      {/* Quantity */}
                      <text
                        x={NODE_WIDTH / 2}
                        y={NODE_HEIGHT / 2 + 12}
                        fill={ownedItems.has(node.id) ? "#22c55e" : "#94a3b8"}
                        fontSize="10"
                        textAnchor="middle"
                      >
                        x{node.quantity.toFixed(node.quantity % 1 === 0 ? 0 : 2)}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>
            )}
          </div>
        </div>

        {/* Sidebar - Materials Summary */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-3">Legend</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-500/20 border-2 border-purple-500" />
                <span className="text-text-secondary">Crafted Item</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500/20 border-2 border-blue-500" />
                <span className="text-text-secondary">Base Material</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500/20 border-2 border-green-500" />
                <span className="text-text-secondary">Owned (click to toggle)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-500/20 border-3 border-amber-500" />
                <span className="text-text-secondary">Shared Material</span>
              </div>
            </div>
          </div>

          {/* Materials Summary */}
          {mergedMaterials.length > 0 && (
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <h3 className="font-semibold mb-3">Base Materials Needed</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {mergedMaterials.map((mat) => (
                  <div
                    key={mat.id}
                    className="flex items-center justify-between p-2 bg-bg-tertiary rounded-lg text-sm"
                  >
                    <span className="text-text-primary">{mat.name}</span>
                    <span className="text-accent font-mono">
                      x{mat.quantity.toFixed(mat.quantity % 1 === 0 ? 0 : 2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border text-sm text-text-muted">
                {mergedMaterials.length} unique materials
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {layout && (
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setOwnedItems(new Set())}
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm hover:border-accent transition-colors"
                >
                  Clear All Owned
                </button>
                <button
                  onClick={() => {
                    const baseIds = layout.nodes
                      .filter((n) => n.is_base)
                      .map((n) => n.id);
                    setOwnedItems(new Set(baseIds));
                  }}
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm hover:border-accent transition-colors"
                >
                  Mark All Base as Owned
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
