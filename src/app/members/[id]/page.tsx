"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface PublicProfile {
  id: number;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  wurm_server?: string;
  email?: string;
  created_at: string;
  show_in_members_list: boolean;
}

export default function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/members/${resolvedParams.id}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load profile");
          return;
        }

        setProfile(data.profile);
      } catch (err) {
        setError("Failed to load profile: " + String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [resolvedParams.id]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-text-muted">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
          <div className="text-6xl mb-4">404</div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Profile Not Found
          </h2>
          <p className="text-text-muted mb-6">
            {error || "This user doesn't exist or has chosen not to be visible."}
          </p>
          <Link
            href="/members"
            className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Back to Members
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/members"
        className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Members
      </Link>

      {/* Profile Card */}
      <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
        {/* Header with avatar */}
        <div className="bg-gradient-to-r from-accent/20 to-accent/5 p-8">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-bg-secondary border-4 border-bg-secondary shadow-lg flex items-center justify-center text-accent font-bold text-3xl flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || profile.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(profile.display_name || profile.username)
              )}
            </div>

            {/* Basic Info */}
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                {profile.display_name || profile.username}
              </h1>
              {profile.display_name && (
                <p className="text-text-muted">@{profile.username}</p>
              )}
              <p className="text-sm text-text-muted mt-2">
                Member since {formatDate(profile.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-8">
          {/* Bio */}
          {profile.bio && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
                About
              </h2>
              <p className="text-text-primary whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {profile.wurm_server && (
              <div className="bg-bg-tertiary rounded-lg p-4">
                <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                  Wurm Server
                </div>
                <div className="text-text-primary font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success"></span>
                  {profile.wurm_server}
                </div>
              </div>
            )}

            {profile.location && (
              <div className="bg-bg-tertiary rounded-lg p-4">
                <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                  Location
                </div>
                <div className="text-text-primary font-medium">{profile.location}</div>
              </div>
            )}

            {profile.email && (
              <div className="bg-bg-tertiary rounded-lg p-4">
                <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                  Email
                </div>
                <a
                  href={`mailto:${profile.email}`}
                  className="text-accent hover:text-accent-hover transition-colors"
                >
                  {profile.email}
                </a>
              </div>
            )}
          </div>

          {/* Visibility Badge */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-success">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Public Profile
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
