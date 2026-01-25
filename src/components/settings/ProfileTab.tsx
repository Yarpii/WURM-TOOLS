"use client";

import { useState } from "react";
import { ProfileFormData, UserProfile } from "./types";

interface ProfileTabProps {
  profile: UserProfile | null;
  profileForm: ProfileFormData;
  setProfileForm: (form: ProfileFormData) => void;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
  setError: (error: string) => void;
  setSuccess: (success: string) => void;
}

export default function ProfileTab({
  profile,
  profileForm,
  setProfileForm,
  saving,
  onSave,
  setError,
  setSuccess,
}: ProfileTabProps) {
  // Upload state
  const [avatarMode, setAvatarMode] = useState<"upload" | "url">(
    profileForm.avatar_url ? "url" : "upload"
  );
  const [bannerMode, setBannerMode] = useState<"upload" | "url">(
    profileForm.banner_url ? "url" : "upload"
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profileForm.avatar_url || null
  );
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    profileForm.banner_url || null
  );

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
        file.type
      )
    ) {
      setError("Invalid file type. Please use JPEG, PNG, GIF, or WebP");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum size is 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    setAvatarUploading(true);
    setError("");

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("category", "avatars");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        setAvatarPreview(null);
      } else {
        setProfileForm({ ...profileForm, avatar_url: data.url });
        setSuccess("Avatar uploaded!");
      }
    } catch (err) {
      setError("Upload failed: " + String(err));
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
    }
  };

  // Handle banner upload
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
        file.type
      )
    ) {
      setError("Invalid file type. Please use JPEG, PNG, GIF, or WebP");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum size is 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setBannerPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    setBannerUploading(true);
    setError("");

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("category", "banners");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        setBannerPreview(null);
      } else {
        setProfileForm({ ...profileForm, banner_url: data.url });
        setSuccess("Banner uploaded!");
      }
    } catch (err) {
      setError("Upload failed: " + String(err));
      setBannerPreview(null);
    } finally {
      setBannerUploading(false);
    }
  };

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      <h2 className="text-xl font-semibold text-text-primary mb-6">
        Edit Profile
      </h2>

      <form onSubmit={onSave} className="space-y-6">
        {/* Display Name */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={profileForm.display_name}
            onChange={(e) =>
              setProfileForm({ ...profileForm, display_name: e.target.value })
            }
            placeholder={profile?.username || "Your display name"}
            maxLength={50}
            className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
          />
          <p className="text-xs text-text-muted mt-1">
            Leave blank to use your username ({profile?.username})
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">Bio</label>
          <textarea
            value={profileForm.bio}
            onChange={(e) =>
              setProfileForm({ ...profileForm, bio: e.target.value })
            }
            placeholder="Tell others about yourself..."
            maxLength={500}
            rows={4}
            className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none resize-none"
          />
          <p className="text-xs text-text-muted mt-1">
            {profileForm.bio.length}/500 characters
          </p>
        </div>

        {/* Avatar */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Profile Picture
          </label>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setAvatarMode("upload")}
              className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
                avatarMode === "upload"
                  ? "bg-accent text-white"
                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
              }`}
            >
              Upload Image
            </button>
            <button
              type="button"
              onClick={() => setAvatarMode("url")}
              className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
                avatarMode === "url"
                  ? "bg-accent text-white"
                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
              }`}
            >
              Use URL
            </button>
          </div>

          {avatarMode === "upload" ? (
            <div>
              <div className="relative">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={avatarUploading}
                />
                <div
                  className={`w-full px-3 py-4 bg-bg-tertiary border-2 border-dashed border-border rounded-lg text-center transition-colors ${
                    avatarUploading ? "opacity-50" : "hover:border-accent"
                  }`}
                >
                  {avatarUploading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent"></div>
                      <span className="text-text-muted">Uploading...</span>
                    </div>
                  ) : avatarPreview || profileForm.avatar_url ? (
                    <span className="text-success">Click to replace image</span>
                  ) : (
                    <span className="text-text-muted">
                      Click to upload (max 5MB)
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Supports JPEG, PNG, GIF, WebP
              </p>
            </div>
          ) : (
            <input
              type="url"
              value={profileForm.avatar_url}
              onChange={(e) => {
                setProfileForm({ ...profileForm, avatar_url: e.target.value });
                setAvatarPreview(e.target.value || null);
              }}
              placeholder="https://example.com/avatar.png"
              className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
            />
          )}

          {/* Preview */}
          {(avatarPreview || profileForm.avatar_url) && (
            <div className="mt-3 flex items-center gap-3">
              <img
                src={avatarPreview || profileForm.avatar_url}
                alt="Avatar preview"
                className="w-16 h-16 rounded-full object-cover border border-border"
                onError={() => setAvatarPreview(null)}
              />
              <button
                type="button"
                onClick={() => {
                  setProfileForm({ ...profileForm, avatar_url: "" });
                  setAvatarPreview(null);
                }}
                className="text-sm text-danger hover:text-danger/80"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Banner */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Profile Banner
          </label>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setBannerMode("upload")}
              className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
                bannerMode === "upload"
                  ? "bg-accent text-white"
                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
              }`}
            >
              Upload Image
            </button>
            <button
              type="button"
              onClick={() => setBannerMode("url")}
              className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
                bannerMode === "url"
                  ? "bg-accent text-white"
                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
              }`}
            >
              Use URL
            </button>
          </div>

          {bannerMode === "upload" ? (
            <div>
              <div className="relative">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleBannerUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={bannerUploading}
                />
                <div
                  className={`w-full px-3 py-4 bg-bg-tertiary border-2 border-dashed border-border rounded-lg text-center transition-colors ${
                    bannerUploading ? "opacity-50" : "hover:border-accent"
                  }`}
                >
                  {bannerUploading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent"></div>
                      <span className="text-text-muted">Uploading...</span>
                    </div>
                  ) : bannerPreview || profileForm.banner_url ? (
                    <span className="text-success">Click to replace image</span>
                  ) : (
                    <span className="text-text-muted">
                      Click to upload banner (max 5MB)
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Recommended: 1200x300px or similar wide format
              </p>
            </div>
          ) : (
            <input
              type="url"
              value={profileForm.banner_url}
              onChange={(e) => {
                setProfileForm({ ...profileForm, banner_url: e.target.value });
                setBannerPreview(e.target.value || null);
              }}
              placeholder="https://example.com/banner.png"
              className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
            />
          )}

          {/* Preview */}
          {(bannerPreview || profileForm.banner_url) && (
            <div className="mt-3 relative">
              <img
                src={bannerPreview || profileForm.banner_url}
                alt="Banner preview"
                className="w-full h-24 object-cover rounded-lg border border-border"
                onError={() => setBannerPreview(null)}
              />
              <button
                type="button"
                onClick={() => {
                  setProfileForm({ ...profileForm, banner_url: "" });
                  setBannerPreview(null);
                }}
                className="absolute top-2 right-2 px-2 py-1 bg-danger text-white rounded text-xs hover:bg-danger/80"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Location
          </label>
          <input
            type="text"
            value={profileForm.location}
            onChange={(e) =>
              setProfileForm({ ...profileForm, location: e.target.value })
            }
            placeholder="e.g., Netherlands, USA, etc."
            maxLength={100}
            className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
          />
        </div>

        {/* Wurm Server */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Main Wurm Server
          </label>
          <input
            type="text"
            value={profileForm.wurm_server}
            onChange={(e) =>
              setProfileForm({ ...profileForm, wurm_server: e.target.value })
            }
            placeholder="e.g., Harmony, Cadence, Defiance..."
            maxLength={50}
            className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`w-full py-3 rounded-lg font-medium transition-all ${
            saving
              ? "bg-bg-tertiary cursor-not-allowed text-text-muted"
              : "bg-accent hover:bg-accent-hover text-white"
          }`}
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
