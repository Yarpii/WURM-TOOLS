"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  wurm_server?: string;
  show_in_members_list: boolean;
  show_email: boolean;
  show_location: boolean;
}

type TabType = "profile" | "privacy";

export default function SettingsPage() {
  const { user, refresh } = useAuth();
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
    location: "",
    wurm_server: "",
  });

  const [privacyForm, setPrivacyForm] = useState({
    show_in_members_list: false,
    show_email: false,
    show_location: true,
  });

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
          location: data.profile.location || "",
          wurm_server: data.profile.wurm_server || "",
        });
        setPrivacyForm({
          show_in_members_list: data.profile.show_in_members_list,
          show_email: data.profile.show_email,
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

            {/* Avatar URL */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Avatar URL
              </label>
              <input
                type="url"
                value={profileForm.avatar_url}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, avatar_url: e.target.value })
                }
                placeholder="https://example.com/avatar.png"
                className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
              />
              <p className="text-xs text-text-muted mt-1">
                Link to an image (PNG, JPG, etc.)
              </p>
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

            {/* Show Email */}
            <div className="p-4 bg-bg-tertiary rounded-lg border border-border">
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyForm.show_email}
                  onChange={(e) =>
                    setPrivacyForm({
                      ...privacyForm,
                      show_email: e.target.checked,
                    })
                  }
                  className="mt-1 w-5 h-5 rounded border-border bg-bg-secondary checked:bg-accent checked:border-accent focus:ring-accent"
                />
                <div className="flex-1">
                  <div className="font-medium text-text-primary">
                    Show Email Address
                  </div>
                  <p className="text-sm text-text-muted mt-1">
                    Display your email address on your public profile. Only visible
                    when your profile is public.
                  </p>
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
    </div>
  );
}
