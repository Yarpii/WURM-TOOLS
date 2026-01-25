"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  UserProfile,
  ProfileFormData,
  PrivacyFormData,
  EmailStatus,
} from "./types";

export function useSettings() {
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    display_name: "",
    bio: "",
    avatar_url: "",
    banner_url: "",
    location: "",
    wurm_server: "",
  });

  const [privacyForm, setPrivacyForm] = useState<PrivacyFormData>({
    show_in_members_list: false,
    show_location: true,
  });

  // Email status
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);

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
        setPrivacyForm({
          show_in_members_list: data.profile.show_in_members_list,
          show_location: data.profile.show_location,
        });

        // Fetch email status
        try {
          const emailRes = await fetch("/api/email");
          const emailData = await emailRes.json();
          if (emailRes.ok) {
            setEmailStatus(emailData);
          }
        } catch (emailErr) {
          console.error("Failed to fetch email status:", emailErr);
        }
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

  return {
    user,
    profile,
    loading,
    saving,
    setSaving,
    error,
    setError,
    success,
    setSuccess,
    profileForm,
    setProfileForm,
    privacyForm,
    setPrivacyForm,
    emailStatus,
    setEmailStatus,
    handleSaveProfile,
    handleSavePrivacy,
  };
}
