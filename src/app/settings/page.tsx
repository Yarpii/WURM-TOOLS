"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import {
  ProfileTab,
  PrivacyTab,
  SecurityTab,
  useSettings,
  TabType,
} from "@/components/settings";

export default function SettingsPage() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  const {
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
  } = useSettings();

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
        <div className="text-center py-12 text-text-muted">
          Loading settings...
        </div>
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
        <ProfileTab
          profile={profile}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          saving={saving}
          onSave={handleSaveProfile}
          setError={setError}
          setSuccess={setSuccess}
        />
      )}

      {/* Privacy Tab */}
      {activeTab === "privacy" && (
        <PrivacyTab
          privacyForm={privacyForm}
          setPrivacyForm={setPrivacyForm}
          saving={saving}
          onSave={handleSavePrivacy}
        />
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <SecurityTab
          emailStatus={emailStatus}
          setEmailStatus={setEmailStatus}
          saving={saving}
          setSaving={setSaving}
          setError={setError}
          setSuccess={setSuccess}
          logout={logout}
        />
      )}
    </div>
  );
}
