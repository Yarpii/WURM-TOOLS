"use client";

import { useState } from "react";
import { WURM_SERVERS } from "@/lib/constants";
import { MiniMap } from "@/components/MiniMap";
import type {
  TreasureHunt,
  TreasureHuntStatus,
  TreasureDifficulty,
  SharedTreasureType,
} from "@/lib/types";
import { STATUS_LABELS, TREASURE_TYPES, ModalMode } from "./constants";

export interface HuntFormData {
  name: string;
  description: string;
  server: string;
  map_quality: string;
  difficulty: TreasureDifficulty;
  x: string;
  y: string;
  status: TreasureHuntStatus;
  treasure_type: SharedTreasureType;
  parent_hunt_id: string;
  screenshot_url: string;
}

export interface LootFormData {
  item_name: string;
  quantity: string;
  quality: string;
  rarity: string;
  notes: string;
}

interface TreasureModalProps {
  isOpen: boolean;
  mode: ModalMode;
  formData: HuntFormData;
  lootData: LootFormData;
  selectedHunt: TreasureHunt | null;
  saving: boolean;
  uploading: boolean;
  uploadPreview: string | null;
  screenshotMode: "upload" | "url";
  userSearchQuery: string;
  userSearchResults: { id: number; username: string; display_name?: string }[];
  selectedShareUser: { id: number; username: string } | null;
  shareMessage: string;
  error: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormDataChange: (data: HuntFormData) => void;
  onLootDataChange: (data: LootFormData) => void;
  onScreenshotUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onScreenshotModeChange: (mode: "upload" | "url") => void;
  onUploadPreviewChange: (preview: string | null) => void;
  onUserSearchQueryChange: (query: string) => void;
  onSearchUsers: (query: string) => void;
  onSelectShareUser: (user: { id: number; username: string } | null) => void;
  onShareMessageChange: (message: string) => void;
  onShareWithUser: () => void;
  onOpenShareFriend: () => void;
  onOpenShareCommunity: () => void;
}

export function TreasureModal({
  isOpen,
  mode,
  formData,
  lootData,
  selectedHunt,
  saving,
  uploading,
  uploadPreview,
  screenshotMode,
  userSearchQuery,
  userSearchResults,
  selectedShareUser,
  shareMessage,
  error,
  onClose,
  onSubmit,
  onFormDataChange,
  onLootDataChange,
  onScreenshotUpload,
  onScreenshotModeChange,
  onUploadPreviewChange,
  onUserSearchQueryChange,
  onSearchUsers,
  onSelectShareUser,
  onShareMessageChange,
  onShareWithUser,
  onOpenShareFriend,
  onOpenShareCommunity,
}: TreasureModalProps) {
  if (!isOpen) return null;

  const modalTitle = {
    create: formData.parent_hunt_id ? "Add Map from Chest" : "New Treasure Hunt",
    edit: "Edit Hunt",
    loot: "Add Loot",
    share: "Share to Community",
    "share-friend": "Share with Friend",
    "share-options": "Share Hunt",
  }[mode];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold">{modalTitle}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            ×
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-danger/20 border border-danger text-danger rounded text-sm">
            {error}
          </div>
        )}

        {/* Content based on mode */}
        {(mode === "create" || mode === "edit") && (
          <CreateEditForm
            formData={formData}
            mode={mode}
            saving={saving}
            uploading={uploading}
            uploadPreview={uploadPreview}
            screenshotMode={screenshotMode}
            onFormDataChange={onFormDataChange}
            onScreenshotUpload={onScreenshotUpload}
            onScreenshotModeChange={onScreenshotModeChange}
            onUploadPreviewChange={onUploadPreviewChange}
            onSubmit={onSubmit}
            onClose={onClose}
          />
        )}

        {mode === "loot" && (
          <LootForm
            lootData={lootData}
            saving={saving}
            onLootDataChange={onLootDataChange}
            onSubmit={onSubmit}
            onClose={onClose}
          />
        )}

        {mode === "share" && (
          <ShareCommunityForm
            formData={formData}
            saving={saving}
            onFormDataChange={onFormDataChange}
            onSubmit={onSubmit}
            onClose={onClose}
          />
        )}

        {mode === "share-friend" && selectedHunt && (
          <ShareFriendForm
            selectedHunt={selectedHunt}
            userSearchQuery={userSearchQuery}
            userSearchResults={userSearchResults}
            selectedShareUser={selectedShareUser}
            shareMessage={shareMessage}
            saving={saving}
            onUserSearchQueryChange={onUserSearchQueryChange}
            onSearchUsers={onSearchUsers}
            onSelectShareUser={onSelectShareUser}
            onShareMessageChange={onShareMessageChange}
            onShareWithUser={onShareWithUser}
            onClose={onClose}
          />
        )}

        {mode === "share-options" && selectedHunt && (
          <ShareOptionsForm
            selectedHunt={selectedHunt}
            onOpenShareFriend={onOpenShareFriend}
            onOpenShareCommunity={onOpenShareCommunity}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

// Create/Edit Hunt Form
function CreateEditForm({
  formData,
  mode,
  saving,
  uploading,
  uploadPreview,
  screenshotMode,
  onFormDataChange,
  onScreenshotUpload,
  onScreenshotModeChange,
  onUploadPreviewChange,
  onSubmit,
  onClose,
}: {
  formData: HuntFormData;
  mode: "create" | "edit";
  saving: boolean;
  uploading: boolean;
  uploadPreview: string | null;
  screenshotMode: "upload" | "url";
  onFormDataChange: (data: HuntFormData) => void;
  onScreenshotUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onScreenshotModeChange: (mode: "upload" | "url") => void;
  onUploadPreviewChange: (preview: string | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Server *</label>
        <select
          value={formData.server}
          onChange={(e) => onFormDataChange({ ...formData, server: e.target.value })}
          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
        >
          {WURM_SERVERS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Difficulty</label>
          <select
            value={formData.difficulty}
            onChange={(e) => onFormDataChange({ ...formData, difficulty: e.target.value as TreasureDifficulty })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
          >
            <option value="easy">Easy (15 tiles)</option>
            <option value="challenging">Challenging (10 tiles)</option>
            <option value="difficult">Difficult (5 tiles)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Map QL</label>
          <input
            type="number"
            min="1"
            max="100"
            value={formData.map_quality}
            onChange={(e) => onFormDataChange({ ...formData, map_quality: e.target.value })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {mode === "edit" && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => onFormDataChange({ ...formData, status: e.target.value as TreasureHuntStatus })}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
            >
              {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">X Coordinate</label>
              <input
                type="number"
                value={formData.x}
                onChange={(e) => onFormDataChange({ ...formData, x: e.target.value })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Y Coordinate</label>
              <input
                type="number"
                value={formData.y}
                onChange={(e) => onFormDataChange({ ...formData, y: e.target.value })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-2">
            <MiniMap
              server={formData.server}
              markerX={formData.x ? parseInt(formData.x) : undefined}
              markerY={formData.y ? parseInt(formData.y) : undefined}
              height={180}
              onLocationSelect={(x, y) => {
                onFormDataChange({ ...formData, x: x.toString(), y: y.toString() });
              }}
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none resize-none"
          rows={3}
        />
      </div>

      {/* Screenshot Section */}
      <ScreenshotInput
        formData={formData}
        uploading={uploading}
        uploadPreview={uploadPreview}
        screenshotMode={screenshotMode}
        onFormDataChange={onFormDataChange}
        onScreenshotUpload={onScreenshotUpload}
        onScreenshotModeChange={onScreenshotModeChange}
        onUploadPreviewChange={onUploadPreviewChange}
      />

      {formData.parent_hunt_id && (
        <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
          <p className="text-warning text-sm">
            This map will be linked as found in the chest from the parent hunt.
          </p>
        </div>
      )}

      <FormButtons saving={saving} onClose={onClose} />
    </form>
  );
}

// Screenshot Input Component
function ScreenshotInput({
  formData,
  uploading,
  uploadPreview,
  screenshotMode,
  onFormDataChange,
  onScreenshotUpload,
  onScreenshotModeChange,
  onUploadPreviewChange,
}: {
  formData: HuntFormData;
  uploading: boolean;
  uploadPreview: string | null;
  screenshotMode: "upload" | "url";
  onFormDataChange: (data: HuntFormData) => void;
  onScreenshotUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onScreenshotModeChange: (mode: "upload" | "url") => void;
  onUploadPreviewChange: (preview: string | null) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">Screenshot</label>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => onScreenshotModeChange("upload")}
          className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
            screenshotMode === "upload"
              ? "bg-accent text-white"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Upload Image
        </button>
        <button
          type="button"
          onClick={() => onScreenshotModeChange("url")}
          className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
            screenshotMode === "url"
              ? "bg-accent text-white"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Use URL
        </button>
      </div>

      {screenshotMode === "upload" ? (
        <div>
          <div className="relative">
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={onScreenshotUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <div className={`w-full px-3 py-4 bg-bg-tertiary border-2 border-dashed border-border rounded text-center transition-colors ${
              uploading ? "opacity-50" : "hover:border-accent"
            }`}>
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent"></div>
                  <span className="text-text-muted">Uploading...</span>
                </div>
              ) : uploadPreview || formData.screenshot_url ? (
                <span className="text-success">Click to replace image</span>
              ) : (
                <span className="text-text-muted">Click or drag image here (max 5MB)</span>
              )}
            </div>
          </div>
          <p className="text-xs text-text-muted mt-1">Supports JPEG, PNG, GIF, WebP</p>
        </div>
      ) : (
        <div>
          <input
            type="url"
            value={formData.screenshot_url}
            onChange={(e) => {
              onFormDataChange({ ...formData, screenshot_url: e.target.value });
              onUploadPreviewChange(e.target.value || null);
            }}
            placeholder="https://imgur.com/..."
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
          />
          <p className="text-xs text-text-muted mt-1">Link to screenshot of your treasure map</p>
        </div>
      )}

      {/* Preview */}
      {(uploadPreview || formData.screenshot_url) && (
        <div className="mt-3 relative">
          <img
            src={uploadPreview || formData.screenshot_url}
            alt="Screenshot preview"
            className="max-h-32 rounded border border-border"
            onError={() => onUploadPreviewChange(null)}
          />
          <button
            type="button"
            onClick={() => {
              onFormDataChange({ ...formData, screenshot_url: "" });
              onUploadPreviewChange(null);
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-danger text-white rounded-full text-sm hover:bg-danger/80"
          >
            x
          </button>
        </div>
      )}
    </div>
  );
}

// Loot Form
function LootForm({
  lootData,
  saving,
  onLootDataChange,
  onSubmit,
  onClose,
}: {
  lootData: LootFormData;
  saving: boolean;
  onLootDataChange: (data: LootFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Item Name *</label>
        <input
          type="text"
          value={lootData.item_name}
          onChange={(e) => onLootDataChange({ ...lootData, item_name: e.target.value })}
          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Quantity</label>
          <input
            type="number"
            min="1"
            value={lootData.quantity}
            onChange={(e) => onLootDataChange({ ...lootData, quantity: e.target.value })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Quality</label>
          <input
            type="number"
            min="1"
            max="100"
            value={lootData.quality}
            onChange={(e) => onLootDataChange({ ...lootData, quality: e.target.value })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Rarity</label>
          <select
            value={lootData.rarity}
            onChange={(e) => onLootDataChange({ ...lootData, rarity: e.target.value })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
          >
            <option value="">Normal</option>
            <option value="rare">Rare</option>
            <option value="supreme">Supreme</option>
            <option value="fantastic">Fantastic</option>
          </select>
        </div>
      </div>

      <FormButtons saving={saving} onClose={onClose} />
    </form>
  );
}

// Share to Community Form
function ShareCommunityForm({
  formData,
  saving,
  onFormDataChange,
  onSubmit,
  onClose,
}: {
  formData: HuntFormData;
  saving: boolean;
  onFormDataChange: (data: HuntFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Server *</label>
          <select
            value={formData.server}
            onChange={(e) => onFormDataChange({ ...formData, server: e.target.value })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
          >
            {WURM_SERVERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type *</label>
          <select
            value={formData.treasure_type}
            onChange={(e) => onFormDataChange({ ...formData, treasure_type: e.target.value as SharedTreasureType })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
          >
            {Object.entries(TREASURE_TYPES).map(([key, { label, icon }]) => (
              <option key={key} value={key}>{icon} {label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">X Coordinate *</label>
          <input
            type="number"
            value={formData.x}
            onChange={(e) => onFormDataChange({ ...formData, x: e.target.value })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Y Coordinate *</label>
          <input
            type="number"
            value={formData.y}
            onChange={(e) => onFormDataChange({ ...formData, y: e.target.value })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
            required
          />
        </div>
      </div>

      <div>
        <MiniMap
          server={formData.server}
          markerX={formData.x ? parseInt(formData.x) : undefined}
          markerY={formData.y ? parseInt(formData.y) : undefined}
          height={180}
          onLocationSelect={(x, y) => {
            onFormDataChange({ ...formData, x: x.toString(), y: y.toString() });
          }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none resize-none"
          rows={3}
          placeholder="Any helpful tips for finding this location..."
        />
      </div>

      <FormButtons saving={saving} onClose={onClose} />
    </form>
  );
}

// Share with Friend Form
function ShareFriendForm({
  selectedHunt,
  userSearchQuery,
  userSearchResults,
  selectedShareUser,
  shareMessage,
  saving,
  onUserSearchQueryChange,
  onSearchUsers,
  onSelectShareUser,
  onShareMessageChange,
  onShareWithUser,
  onClose,
}: {
  selectedHunt: TreasureHunt;
  userSearchQuery: string;
  userSearchResults: { id: number; username: string; display_name?: string }[];
  selectedShareUser: { id: number; username: string } | null;
  shareMessage: string;
  saving: boolean;
  onUserSearchQueryChange: (query: string) => void;
  onSearchUsers: (query: string) => void;
  onSelectShareUser: (user: { id: number; username: string } | null) => void;
  onShareMessageChange: (message: string) => void;
  onShareWithUser: () => void;
  onClose: () => void;
}) {
  return (
    <div className="p-4 space-y-4">
      <p className="text-text-secondary text-sm">
        Share &quot;{selectedHunt.name}&quot; with another user
      </p>

      <div>
        <label className="block text-sm font-medium mb-1">Search User</label>
        <input
          type="text"
          value={userSearchQuery}
          onChange={(e) => {
            onUserSearchQueryChange(e.target.value);
            onSearchUsers(e.target.value);
          }}
          placeholder="Enter username..."
          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
        />
      </div>

      {userSearchResults.length > 0 && !selectedShareUser && (
        <div className="border border-border rounded max-h-40 overflow-y-auto">
          {userSearchResults.map((u) => (
            <div
              key={u.id}
              onClick={() => {
                onSelectShareUser({ id: u.id, username: u.username });
                onUserSearchQueryChange(u.username);
              }}
              className="p-2 hover:bg-bg-tertiary cursor-pointer"
            >
              <span className="font-medium">{u.username}</span>
              {u.display_name && (
                <span className="text-text-muted ml-2">({u.display_name})</span>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedShareUser && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-lg flex items-center justify-between">
          <span>Sharing with: <strong>{selectedShareUser.username}</strong></span>
          <button
            onClick={() => {
              onSelectShareUser(null);
              onUserSearchQueryChange("");
            }}
            className="text-danger text-sm"
          >
            Change
          </button>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Message (optional)</label>
        <textarea
          value={shareMessage}
          onChange={(e) => onShareMessageChange(e.target.value)}
          placeholder="Add a note for the recipient..."
          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none resize-none"
          rows={2}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-bg-tertiary hover:bg-bg-hover rounded"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onShareWithUser}
          disabled={saving || !selectedShareUser}
          className="flex-1 px-4 py-2 bg-info hover:bg-info/80 rounded disabled:opacity-50"
        >
          {saving ? "Sharing..." : "Share"}
        </button>
      </div>
    </div>
  );
}

// Share Options Form
function ShareOptionsForm({
  selectedHunt,
  onOpenShareFriend,
  onOpenShareCommunity,
  onClose,
}: {
  selectedHunt: TreasureHunt;
  onOpenShareFriend: () => void;
  onOpenShareCommunity: () => void;
  onClose: () => void;
}) {
  const hasCoordinates = selectedHunt.x && selectedHunt.y;

  return (
    <div className="p-4 space-y-4">
      <p className="text-text-secondary text-sm">
        How would you like to share &quot;{selectedHunt.name}&quot;?
      </p>

      <div className="space-y-3">
        <button
          onClick={onOpenShareFriend}
          className="w-full p-4 bg-bg-tertiary hover:bg-bg-hover rounded-lg border border-border hover:border-info transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-info/20 rounded-full flex items-center justify-center text-info text-xl">
              👤
            </div>
            <div>
              <div className="font-semibold">Share with Friend</div>
              <div className="text-sm text-text-muted">
                Private share with a specific user
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={onOpenShareCommunity}
          disabled={!hasCoordinates}
          className={`w-full p-4 bg-bg-tertiary rounded-lg border border-border text-left transition-colors ${
            hasCoordinates
              ? "hover:bg-bg-hover hover:border-accent"
              : "opacity-50 cursor-not-allowed"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center text-accent text-xl">
              🌍
            </div>
            <div>
              <div className="font-semibold">Share to Community</div>
              <div className="text-sm text-text-muted">
                {hasCoordinates
                  ? "Make location visible to everyone"
                  : "Requires coordinates to share publicly"}
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-bg-tertiary hover:bg-bg-hover rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Reusable Form Buttons
function FormButtons({ saving, onClose }: { saving: boolean; onClose: () => void }) {
  return (
    <div className="flex gap-3 pt-4">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 px-4 py-2 bg-bg-tertiary hover:bg-bg-hover rounded"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="flex-1 px-4 py-2 bg-accent hover:bg-accent-hover rounded disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
