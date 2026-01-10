"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserProfile {
  id: number;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  location?: string;
  wurm_server?: string;
  show_in_members_list: boolean;
  show_location: boolean;
}

type TabType = "profile" | "privacy" | "security";

export default function SettingsPage() {
  const { user, refresh, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [profileForm, setProfileForm] = useState({
    display_name: "",
    bio: "",
    avatar_url: "",
    banner_url: "",
    location: "",
    wurm_server: "",
  });

  // Upload state
  const [avatarMode, setAvatarMode] = useState<"upload" | "url">("upload");
  const [bannerMode, setBannerMode] = useState<"upload" | "url">("upload");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [privacyForm, setPrivacyForm] = useState({
    show_in_members_list: false,
    show_location: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [deleteForm, setDeleteForm] = useState({
    password: "",
    confirmation: "",
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load profile");
          return;
        }

        setProfile(data.profile);
        setProfileForm({
          display_name: data.profile.display_name || "",
          bio: data.profile.bio || "",
          avatar_url: data.profile.avatar_url || "",
          banner_url: data.profile.banner_url || "",
          location: data.profile.location || "",
          wurm_server: data.profile.wurm_server || "",
        });
        setAvatarPreview(data.profile.avatar_url || null);
        setBannerPreview(data.profile.banner_url || null);
        setAvatarMode(data.profile.avatar_url ? "url" : "upload");
        setBannerMode(data.profile.banner_url ? "url" : "upload");
        setPrivacyForm({
          show_in_members_list: data.profile.show_in_members_list,
          show_location: data.profile.show_location,
        });
      } catch (err) {
        setError("Failed to load profile: " + String(err));
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
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

    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save profile");
        return;
      }

      setProfile(data.profile);
      setSuccess("Profile updated successfully!");
      refresh();
    } catch (err) {
      setError("Failed to save profile: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(privacyForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save settings");
        return;
      }

      setPrivacyForm(data.settings);
      setSuccess("Privacy settings updated successfully!");
      refresh();
    } catch (err) {
      setError("Failed to save settings: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError("New passwords do not match");
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to change password");
        return;
      }

      setSuccess("Password changed successfully! Please log in again.");
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });

      // Redirect to login after short delay
      setTimeout(() => {
        logout();
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError("Failed to change password: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (deleteForm.confirmation !== "DELETE") {
      setError("Please type DELETE to confirm");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deleteForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to delete account");
        return;
      }

      // Redirect to home
      logout();
      router.push("/");
    } catch (err) {
      setError("Failed to delete account: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Login Required
          </h2>
          <p className="text-text-muted mb-6">
            Please login to access your settings.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-text-muted">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Settings</h1>
        <p className="text-text-secondary">
          Manage your profile and privacy settings
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "profile"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab("privacy")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "privacy"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          }`}
        >
          Privacy & Visibility
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "security"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          }`}
        >
          Security
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
          {success}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-6">
            Edit Profile
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-6">
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
              <label className="block text-sm text-text-secondary mb-2">
                Bio
              </label>
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
                    <div className={`w-full px-3 py-4 bg-bg-tertiary border-2 border-dashed border-border rounded-lg text-center transition-colors ${
                      avatarUploading ? "opacity-50" : "hover:border-accent"
                    }`}>
                      {avatarUploading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent"></div>
                          <span className="text-text-muted">Uploading...</span>
                        </div>
                      ) : avatarPreview || profileForm.avatar_url ? (
                        <span className="text-success">Click to replace image</span>
                      ) : (
                        <span className="text-text-muted">Click to upload (max 5MB)</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-text-muted mt-1">Supports JPEG, PNG, GIF, WebP</p>
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
                    <div className={`w-full px-3 py-4 bg-bg-tertiary border-2 border-dashed border-border rounded-lg text-center transition-colors ${
                      bannerUploading ? "opacity-50" : "hover:border-accent"
                    }`}>
                      {bannerUploading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent"></div>
                          <span className="text-text-muted">Uploading...</span>
                        </div>
                      ) : bannerPreview || profileForm.banner_url ? (
                        <span className="text-success">Click to replace image</span>
                      ) : (
                        <span className="text-text-muted">Click to upload banner (max 5MB)</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-text-muted mt-1">Recommended: 1200x300px or similar wide format</p>
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
      )}

      {/* Privacy Tab */}
      {activeTab === "privacy" && (
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Privacy & Visibility
          </h2>
          <p className="text-text-muted mb-6">
            Control what information is visible to other users
          </p>

          <form onSubmit={handleSavePrivacy} className="space-y-6">
            {/* Show in Members List */}
            <div className="p-4 bg-bg-tertiary rounded-lg border border-border">
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyForm.show_in_members_list}
                  onChange={(e) =>
                    setPrivacyForm({
                      ...privacyForm,
                      show_in_members_list: e.target.checked,
                    })
                  }
                  className="mt-1 w-5 h-5 rounded border-border bg-bg-secondary checked:bg-accent checked:border-accent focus:ring-accent"
                />
                <div className="flex-1">
                  <div className="font-medium text-text-primary">
                    Show in Members List
                  </div>
                  <p className="text-sm text-text-muted mt-1">
                    Allow your profile to appear in the public members list. This is
                    opt-in - you must enable this to be visible.
                  </p>
                  {privacyForm.show_in_members_list && (
                    <div className="mt-2 text-sm text-success flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Your profile is visible
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Show Location */}
            <div className="p-4 bg-bg-tertiary rounded-lg border border-border">
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyForm.show_location}
                  onChange={(e) =>
                    setPrivacyForm({
                      ...privacyForm,
                      show_location: e.target.checked,
                    })
                  }
                  className="mt-1 w-5 h-5 rounded border-border bg-bg-secondary checked:bg-accent checked:border-accent focus:ring-accent"
                />
                <div className="flex-1">
                  <div className="font-medium text-text-primary">
                    Show Location
                  </div>
                  <p className="text-sm text-text-muted mt-1">
                    Display your location on your public profile. Only visible when
                    your profile is public.
                  </p>
                </div>
              </label>
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
              {saving ? "Saving..." : "Save Privacy Settings"}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-info/10 border border-info/30 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-info flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-text-secondary">
                <strong className="text-text-primary">Note:</strong> Your username,
                display name, bio, avatar, and Wurm server are always visible on
                your public profile when you opt-in to the members list.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Change Password */}
          <div className="bg-bg-secondary rounded-xl border border-border p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Change Password
            </h2>
            <p className="text-text-muted mb-6">
              Update your password to keep your account secure
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, current_password: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, new_password: e.target.value })
                  }
                  minLength={8}
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  required
                />
                <p className="text-xs text-text-muted mt-1">
                  Must be at least 8 characters
                </p>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                  }
                  minLength={8}
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  required
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
                {saving ? "Changing Password..." : "Change Password"}
              </button>
            </form>
          </div>

          {/* Delete Account */}
          <div className="bg-bg-secondary rounded-xl border border-danger/30 p-6">
            <h2 className="text-xl font-semibold text-danger mb-2">
              Danger Zone
            </h2>
            <p className="text-text-muted mb-4">
              Permanently delete your account and all associated data
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-danger/20 text-danger rounded-lg hover:bg-danger/30 transition-colors"
              >
                Delete Account
              </button>
            ) : (
              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg mb-4">
                  <p className="text-danger text-sm font-medium mb-2">
                    This action cannot be undone!
                  </p>
                  <p className="text-text-muted text-sm">
                    All your data will be permanently deleted, including orders, projects,
                    prospects, merchants, and achievements.
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Enter your password
                  </label>
                  <input
                    type="password"
                    value={deleteForm.password}
                    onChange={(e) =>
                      setDeleteForm({ ...deleteForm, password: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-danger focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Type <span className="font-mono text-danger">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteForm.confirmation}
                    onChange={(e) =>
                      setDeleteForm({ ...deleteForm, confirmation: e.target.value })
                    }
                    placeholder="DELETE"
                    className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-danger focus:outline-none"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteForm({ password: "", confirmation: "" });
                    }}
                    className="flex-1 py-3 rounded-lg font-medium bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || deleteForm.confirmation !== "DELETE"}
                    className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                      saving || deleteForm.confirmation !== "DELETE"
                        ? "bg-bg-tertiary cursor-not-allowed text-text-muted"
                        : "bg-danger hover:bg-danger/80 text-white"
                    }`}
                  >
                    {saving ? "Deleting..." : "Delete My Account"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
