"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

interface Character {
  id: number;
  user_id: number;
  name: string;
  server?: string;
  religion?: string;
  avatar_url?: string;
  premium_until?: string;
  is_primary: boolean;
  bio?: string;
  deed_name?: string;
  playstyle?: string;
  created_at: string;
  updated_at: string;
  orders_count?: number;
  merchants_count?: number;
  projects_count?: number;
  skills_count?: number;
}

interface CharacterFormData {
  name: string;
  server: string;
  religion: string;
  avatar_url: string;
  premium_until: string;
  bio: string;
  deed_name: string;
  playstyle: string;
}

const WURM_SERVERS = [
  "Xanadu",
  "Deliverance",
  "Exodus",
  "Celebration",
  "Pristine",
  "Release",
  "Independence",
  "Chaos",
  "Harmony",
  "Melody",
  "Cadence",
  "Defiance",
];

const RELIGIONS = ["Fo", "Vynora", "Magranon", "Libila", "None"];
const PLAYSTYLES = [
  { value: "pve", label: "PvE" },
  { value: "pvp", label: "PvP" },
  { value: "both", label: "Both" },
  { value: "casual", label: "Casual" },
  { value: "hardcore", label: "Hardcore" },
];

const MAX_CHARACTERS = 5;

export default function CharactersPage() {
  const { user, loading: authLoading } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [formData, setFormData] = useState<CharacterFormData>({
    name: "",
    server: "",
    religion: "",
    avatar_url: "",
    premium_until: "",
    bio: "",
    deed_name: "",
    playstyle: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchCharacters = useCallback(async () => {
    try {
      const res = await fetch("/api/characters?stats=true");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load characters");
        return;
      }

      setCharacters(data.characters);
    } catch (err) {
      setError("Failed to load characters: " + String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchCharacters();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading, fetchCharacters]);

  const openCreateModal = () => {
    setEditingCharacter(null);
    setFormData({
      name: "",
      server: "",
      religion: "",
      avatar_url: "",
      premium_until: "",
      bio: "",
      deed_name: "",
      playstyle: "",
    });
    setShowModal(true);
  };

  const openEditModal = (character: Character) => {
    setEditingCharacter(character);
    setFormData({
      name: character.name,
      server: character.server || "",
      religion: character.religion || "",
      avatar_url: character.avatar_url || "",
      premium_until: character.premium_until ? character.premium_until.split("T")[0] : "",
      bio: character.bio || "",
      deed_name: character.deed_name || "",
      playstyle: character.playstyle || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const url = editingCharacter
        ? `/api/characters/${editingCharacter.id}`
        : "/api/characters";
      const method = editingCharacter ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          premium_until: formData.premium_until || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save character");
        return;
      }

      setSuccess(editingCharacter ? "Character updated!" : "Character created!");
      setShowModal(false);
      fetchCharacters();
    } catch (err) {
      setError("Failed to save character: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (characterId: number) => {
    if (!confirm("Are you sure you want to delete this character? This cannot be undone.")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/characters/${characterId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to delete character");
        return;
      }

      setSuccess("Character deleted!");
      fetchCharacters();
    } catch (err) {
      setError("Failed to delete character: " + String(err));
    }
  };

  const handleSetPrimary = async (characterId: number) => {
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/characters/${characterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_primary" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to set primary character");
        return;
      }

      setSuccess("Primary character updated!");
      fetchCharacters();
    } catch (err) {
      setError("Failed to set primary character: " + String(err));
    }
  };

  const isPremiumActive = (premiumDate?: string) => {
    if (!premiumDate) return false;
    return new Date(premiumDate) > new Date();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Character Showcase</h1>
        <p className="text-text-secondary mb-4">Please log in to manage your characters.</p>
        <Link href="/login" className="px-4 py-2 bg-accent rounded hover:bg-accent-hover">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Character Showcase</h1>
            <p className="text-text-secondary mt-1">
              Manage your Wurm Online characters ({characters.length}/{MAX_CHARACTERS})
            </p>
          </div>
          {characters.length < MAX_CHARACTERS && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-accent rounded-lg hover:bg-accent-hover flex items-center gap-2"
            >
              <span>+</span> Add Character
            </button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-danger/20 border border-danger text-danger px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-success/20 border border-success text-success px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Characters Grid */}
        {characters.length === 0 ? (
          <div className="text-center py-12 bg-bg-secondary rounded-lg">
            <p className="text-text-secondary mb-4">You haven&apos;t created any characters yet.</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-accent rounded hover:bg-accent-hover"
            >
              Create Your First Character
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {characters.map((character) => (
              <div
                key={character.id}
                className={`bg-bg-secondary rounded-lg overflow-hidden border-2 ${
                  character.is_primary ? "border-warning" : "border-border"
                }`}
              >
                {/* Character Header */}
                <div className="p-4 bg-bg-tertiary/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {character.avatar_url ? (
                        <img
                          src={character.avatar_url}
                          alt={character.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-bg-hover flex items-center justify-center text-xl">
                          {character.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          {character.name}
                          {character.is_primary && (
                            <span className="text-warning text-sm" title="Primary Character">
                              ★
                            </span>
                          )}
                        </h3>
                        {character.server && (
                          <p className="text-text-secondary text-sm">{character.server}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(character)}
                        className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(character.id)}
                        className="p-2 text-text-secondary hover:text-danger hover:bg-bg-hover rounded"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>

                {/* Character Details */}
                <div className="p-4 space-y-3">
                  {character.deed_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-text-muted">Deed:</span>
                      <span>{character.deed_name}</span>
                    </div>
                  )}
                  {character.religion && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-text-muted">Religion:</span>
                      <span>{character.religion}</span>
                    </div>
                  )}
                  {character.playstyle && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-text-muted">Playstyle:</span>
                      <span className="capitalize">{character.playstyle}</span>
                    </div>
                  )}
                  {character.premium_until && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-text-muted">Premium:</span>
                      <span className={isPremiumActive(character.premium_until) ? "text-success" : "text-danger"}>
                        {isPremiumActive(character.premium_until) ? "Active" : "Expired"}
                        <span className="text-text-muted ml-1">
                          ({new Date(character.premium_until).toLocaleDateString()})
                        </span>
                      </span>
                    </div>
                  )}
                  {character.bio && (
                    <p className="text-sm text-text-secondary line-clamp-2">{character.bio}</p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border">
                    <div className="text-center">
                      <div className="text-lg font-bold">{character.orders_count || 0}</div>
                      <div className="text-xs text-text-muted">Orders</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{character.merchants_count || 0}</div>
                      <div className="text-xs text-text-muted">Merchants</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{character.projects_count || 0}</div>
                      <div className="text-xs text-text-muted">Projects</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{character.skills_count || 0}</div>
                      <div className="text-xs text-text-muted">Skills</div>
                    </div>
                  </div>

                  {/* Actions */}
                  {!character.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(character.id)}
                      className="w-full mt-2 px-3 py-2 bg-bg-tertiary hover:bg-bg-hover rounded text-sm"
                    >
                      Set as Primary
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-secondary rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editingCharacter ? "Edit Character" : "Create Character"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Character Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                    required
                    maxLength={100}
                  />
                </div>

                {/* Server */}
                <div>
                  <label className="block text-sm font-medium mb-1">Server</label>
                  <select
                    value={formData.server}
                    onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                  >
                    <option value="">Select a server...</option>
                    {WURM_SERVERS.map((server) => (
                      <option key={server} value={server}>
                        {server}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Religion */}
                <div>
                  <label className="block text-sm font-medium mb-1">Religion</label>
                  <select
                    value={formData.religion}
                    onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                  >
                    <option value="">Select religion...</option>
                    {RELIGIONS.map((religion) => (
                      <option key={religion} value={religion}>
                        {religion}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Playstyle */}
                <div>
                  <label className="block text-sm font-medium mb-1">Playstyle</label>
                  <select
                    value={formData.playstyle}
                    onChange={(e) => setFormData({ ...formData, playstyle: e.target.value })}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                  >
                    <option value="">Select playstyle...</option>
                    {PLAYSTYLES.map((style) => (
                      <option key={style.value} value={style.value}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deed Name */}
                <div>
                  <label className="block text-sm font-medium mb-1">Deed Name</label>
                  <input
                    type="text"
                    value={formData.deed_name}
                    onChange={(e) => setFormData({ ...formData, deed_name: e.target.value })}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                    placeholder="Your deed/settlement name"
                    maxLength={100}
                  />
                </div>

                {/* Premium Until */}
                <div>
                  <label className="block text-sm font-medium mb-1">Premium Until</label>
                  <input
                    type="date"
                    value={formData.premium_until}
                    onChange={(e) => setFormData({ ...formData, premium_until: e.target.value })}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Avatar URL */}
                <div>
                  <label className="block text-sm font-medium mb-1">Avatar URL</label>
                  <input
                    type="url"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                    placeholder="https://..."
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium mb-1">Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none resize-none"
                    rows={3}
                    placeholder="Tell us about this character..."
                    maxLength={500}
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 bg-bg-tertiary hover:bg-bg-hover rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !formData.name.trim()}
                    className="flex-1 px-4 py-2 bg-accent hover:bg-accent-hover rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : editingCharacter ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
