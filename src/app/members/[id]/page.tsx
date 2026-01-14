"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { RoleBadges } from "@/components/RoleBadge";

interface UserRole {
  role_name: string;
  role_display_name: string;
  role_color: string;
  role_icon?: string;
  role_priority: number;
}

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
  roles?: UserRole[];
}

interface Character {
  id: number;
  name: string;
  server?: string;
  religion?: string;
  avatar_url?: string;
  deed_name?: string;
  playstyle?: string;
  bio?: string;
  is_primary: boolean;
}

export default function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
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
        setCharacters(data.characters || []);
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
              {/* Role Badges */}
              {profile.roles && profile.roles.length > 0 && (
                <div className="mt-2">
                  <RoleBadges roles={profile.roles} size="md" maxDisplay={5} />
                </div>
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

          {/* Characters */}
          {characters.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-4">
                Characters
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {characters.map((character) => (
                  <div
                    key={character.id}
                    className={`bg-bg-tertiary rounded-lg p-4 border-2 ${
                      character.is_primary ? "border-warning" : "border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      {character.avatar_url ? (
                        <img
                          src={character.avatar_url}
                          alt={character.name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-bg-hover flex items-center justify-center text-sm font-medium flex-shrink-0">
                          {character.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {/* Name */}
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary truncate">
                            {character.name}
                          </span>
                          {character.is_primary && (
                            <span className="text-warning text-sm" title="Primary Character">
                              ★
                            </span>
                          )}
                        </div>

                        {/* Server */}
                        {character.server && (
                          <div className="text-sm text-text-muted">{character.server}</div>
                        )}

                        {/* Deed */}
                        {character.deed_name && (
                          <Link
                            href={`/market?location=${encodeURIComponent(character.deed_name)}`}
                            className="inline-flex items-center gap-1 mt-2 text-sm text-accent hover:text-accent-hover transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            {character.deed_name}
                          </Link>
                        )}

                        {/* Religion & Playstyle */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {character.religion && character.religion !== "None" && (
                            <span className="text-xs px-2 py-0.5 bg-bg-hover rounded text-text-secondary">
                              {character.religion}
                            </span>
                          )}
                          {character.playstyle && (
                            <span className="text-xs px-2 py-0.5 bg-bg-hover rounded text-text-secondary capitalize">
                              {character.playstyle}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
