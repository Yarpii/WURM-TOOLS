"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface Character {
  id: number;
  user_id: number;
  username?: string;
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
}

interface CharacterSkill {
  id: number;
  skill_name: string;
  current_level: number;
  target_level?: number;
  notes?: string;
  updated_at: string;
}

interface CharacterOrder {
  id: number;
  order_type: "buy" | "sell" | "trade";
  item_name: string;
  quantity: number;
  price?: number;
  currency?: string;
  status: string;
  created_at: string;
}

interface TreasureHunt {
  id: number;
  name: string;
  server: string;
  difficulty: string;
  status: string;
  created_at: string;
}

// Skill categories for grouping
const SKILL_CATEGORIES: Record<string, string[]> = {
  "Characteristics": ["Body", "Body Strength", "Body Stamina", "Body Control", "Mind", "Mind Logic", "Mind Speed", "Soul", "Soul Depth", "Soul Strength"],
  "Combat": ["Fighting", "Defensive Fighting", "Aggressive Fighting", "Normal Fighting", "Shield Smithing", "Shields"],
  "Weapons": ["Swords", "Axes", "Mauls", "Hammers", "Knives", "Polearms", "Archery", "Bows", "Long Bow"],
  "Crafting": ["Blacksmithing", "Carpentry", "Fine Carpentry", "Masonry", "Tailoring", "Leatherworking", "Cloth Tailoring", "Pottery", "Jewelry Smithing", "Weaponsmithing", "Armour Smithing", "Ship Building", "Ropemaking"],
  "Gathering": ["Mining", "Woodcutting", "Digging", "Fishing", "Foraging", "Botanizing"],
  "Nature": ["Nature", "Animal Husbandry", "Animal Taming", "Forestry", "Farming", "Gardening", "Papyrusmaking"],
  "Religion": ["Faith", "Favor", "Channeling", "Preaching", "Prayer", "Exorcism"],
  "Cooking": ["Cooking", "Hot Food Cooking", "Baking", "Beverages", "Butchering", "Dairy Food Making"],
  "Misc": ["Alchemy", "Natural Substances", "Locksmithing", "Stealing", "Tracking", "Traps", "War Machines", "Catapults", "Trebuchets"],
};

function getSkillCategory(skillName: string): string {
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    if (skills.some(s => skillName.toLowerCase().includes(s.toLowerCase()))) {
      return category;
    }
  }
  return "Other";
}

export default function CharacterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { user } = useAuth();
  const [character, setCharacter] = useState<Character | null>(null);
  const [skills, setSkills] = useState<CharacterSkill[]>([]);
  const [orders, setOrders] = useState<CharacterOrder[]>([]);
  const [hunts, setHunts] = useState<TreasureHunt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "skills" | "orders" | "hunts">("overview");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const res = await fetch(`/api/characters/${resolvedParams.id}?full=true`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load character");
          return;
        }

        setCharacter(data.character);
        setSkills(data.skills || []);
        setOrders(data.orders || []);
        setHunts(data.hunts || []);
        setIsOwner(user?.id === data.character?.user_id);
      } catch (err) {
        setError("Failed to load character: " + String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [resolvedParams.id, user]);

  const isPremiumActive = (premiumDate?: string) => {
    if (!premiumDate) return false;
    return new Date(premiumDate) > new Date();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Group skills by category
  const groupedSkills = skills.reduce((acc, skill) => {
    const category = getSkillCategory(skill.skill_name);
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, CharacterSkill[]>);

  // Sort categories
  const sortedCategories = Object.keys(groupedSkills).sort((a, b) => {
    const order = ["Characteristics", "Combat", "Weapons", "Crafting", "Gathering", "Nature", "Religion", "Cooking", "Misc", "Other"];
    return order.indexOf(a) - order.indexOf(b);
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-text-muted">Loading character...</div>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
          <div className="text-6xl mb-4">404</div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Character Not Found
          </h2>
          <p className="text-text-muted mb-6">
            {error || "This character doesn't exist."}
          </p>
          <Link
            href="/characters"
            className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Back to Characters
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/characters"
        className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Characters
      </Link>

      {/* Character Header */}
      <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-accent/20 to-accent/5 p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-bg-secondary border-4 border-bg-secondary shadow-lg flex items-center justify-center text-accent font-bold text-4xl flex-shrink-0">
              {character.avatar_url ? (
                <img
                  src={character.avatar_url}
                  alt={character.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                character.name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                  {character.name}
                </h1>
                {character.is_primary && (
                  <span className="text-warning text-xl" title="Primary Character">★</span>
                )}
                {character.premium_until && (
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    isPremiumActive(character.premium_until)
                      ? "bg-success/20 text-success"
                      : "bg-danger/20 text-danger"
                  }`}>
                    {isPremiumActive(character.premium_until) ? "Premium" : "Expired"}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4 mt-3 text-text-secondary">
                {character.server && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    {character.server}
                  </div>
                )}
                {character.deed_name && (
                  <Link
                    href={`/market?location=${encodeURIComponent(character.deed_name)}`}
                    className="flex items-center gap-1.5 text-accent hover:text-accent-hover transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    {character.deed_name}
                  </Link>
                )}
                {character.religion && character.religion !== "None" && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    {character.religion}
                  </div>
                )}
                {character.playstyle && (
                  <span className="px-2 py-0.5 bg-bg-tertiary rounded text-sm capitalize">
                    {character.playstyle}
                  </span>
                )}
              </div>

              {character.bio && (
                <p className="mt-4 text-text-secondary">{character.bio}</p>
              )}

              {/* Owner link */}
              {character.username && (
                <div className="mt-4 text-sm text-text-muted">
                  Owned by{" "}
                  <Link
                    href={`/members/${character.user_id}`}
                    className="text-accent hover:text-accent-hover"
                  >
                    {character.username}
                  </Link>
                </div>
              )}
            </div>

            {/* Edit button for owner */}
            {isOwner && (
              <Link
                href="/characters"
                className="px-4 py-2 bg-bg-tertiary hover:bg-bg-hover rounded-lg text-sm text-text-secondary transition-colors"
              >
                Edit Character
              </Link>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 divide-x divide-border bg-bg-tertiary/50">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-text-primary">{skills.length}</div>
            <div className="text-xs text-text-muted">Skills</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-text-primary">{orders.length}</div>
            <div className="text-xs text-text-muted">Orders</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-text-primary">{hunts.length}</div>
            <div className="text-xs text-text-muted">Hunts</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-text-primary">
              {character.premium_until ? formatDate(character.premium_until) : "-"}
            </div>
            <div className="text-xs text-text-muted">Premium Until</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2 overflow-x-auto">
        {(["overview", "skills", "orders", "hunts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            }`}
          >
            {tab === "overview" && "Overview"}
            {tab === "skills" && `Skills (${skills.length})`}
            {tab === "orders" && `Orders (${orders.length})`}
            {tab === "hunts" && `Treasure Hunts (${hunts.length})`}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Skills */}
          <div className="bg-bg-secondary rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Top Skills</h2>
            {skills.length === 0 ? (
              <p className="text-text-muted text-sm">No skills tracked yet.</p>
            ) : (
              <div className="space-y-3">
                {skills
                  .sort((a, b) => b.current_level - a.current_level)
                  .slice(0, 5)
                  .map((skill) => (
                    <div key={skill.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-text-primary">{skill.skill_name}</span>
                          <span className="text-accent font-medium">{skill.current_level.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-bg-tertiary rounded-full h-2">
                          <div
                            className="bg-accent h-2 rounded-full"
                            style={{ width: `${skill.current_level}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            {skills.length > 5 && (
              <button
                onClick={() => setActiveTab("skills")}
                className="mt-4 text-sm text-accent hover:text-accent-hover"
              >
                View all {skills.length} skills →
              </button>
            )}
          </div>

          {/* Recent Orders */}
          <div className="bg-bg-secondary rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Orders</h2>
            {orders.length === 0 ? (
              <p className="text-text-muted text-sm">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-2 bg-bg-tertiary rounded">
                    <div>
                      <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${
                        order.order_type === "buy" ? "bg-success/20 text-success" :
                        order.order_type === "sell" ? "bg-info/20 text-info" :
                        "bg-warning/20 text-warning"
                      }`}>
                        {order.order_type.toUpperCase()}
                      </span>
                      <span className="text-sm text-text-primary">{order.item_name}</span>
                    </div>
                    <span className="text-xs text-text-muted">{order.status}</span>
                  </div>
                ))}
              </div>
            )}
            {orders.length > 5 && (
              <button
                onClick={() => setActiveTab("orders")}
                className="mt-4 text-sm text-accent hover:text-accent-hover"
              >
                View all {orders.length} orders →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Skills Tab */}
      {activeTab === "skills" && (
        <div>
          {skills.length === 0 ? (
            <div className="bg-bg-secondary rounded-lg border border-border p-8 text-center">
              <p className="text-text-muted mb-4">No skills tracked for this character yet.</p>
              {isOwner && (
                <Link
                  href="/skills"
                  className="inline-block px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover"
                >
                  Track Skills
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {sortedCategories.map((category) => (
                <div key={category} className="bg-bg-secondary rounded-lg border border-border overflow-hidden">
                  <div className="bg-bg-tertiary px-4 py-3 border-b border-border">
                    <h3 className="font-semibold text-text-primary">{category}</h3>
                  </div>
                  <div className="p-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {groupedSkills[category]
                        .sort((a, b) => b.current_level - a.current_level)
                        .map((skill) => (
                          <div key={skill.id} className="bg-bg-tertiary rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-text-primary truncate">
                                {skill.skill_name}
                              </span>
                              <span className="text-accent font-bold">
                                {skill.current_level.toFixed(2)}
                              </span>
                            </div>
                            <div className="w-full bg-bg-hover rounded-full h-2">
                              <div
                                className="bg-accent h-2 rounded-full transition-all"
                                style={{ width: `${skill.current_level}%` }}
                              />
                            </div>
                            {skill.target_level && skill.target_level > skill.current_level && (
                              <div className="mt-1 text-xs text-text-muted">
                                Target: {skill.target_level.toFixed(2)}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div>
          {orders.length === 0 ? (
            <div className="bg-bg-secondary rounded-lg border border-border p-8 text-center">
              <p className="text-text-muted mb-4">No orders for this character yet.</p>
              {isOwner && (
                <Link
                  href="/market"
                  className="inline-block px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover"
                >
                  Create Order
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-bg-secondary rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-bg-tertiary">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Item</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Qty</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Price</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-bg-tertiary/50">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          order.order_type === "buy" ? "bg-success/20 text-success" :
                          order.order_type === "sell" ? "bg-info/20 text-info" :
                          "bg-warning/20 text-warning"
                        }`}>
                          {order.order_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-primary">{order.item_name}</td>
                      <td className="px-4 py-3 text-text-secondary">{order.quantity}</td>
                      <td className="px-4 py-3 text-text-secondary">
                        {order.price ? `${order.price} ${order.currency}` : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          order.status === "active" ? "bg-success/20 text-success" :
                          order.status === "completed" ? "bg-info/20 text-info" :
                          "bg-text-muted/20 text-text-muted"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted text-sm">{formatDate(order.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Hunts Tab */}
      {activeTab === "hunts" && (
        <div>
          {hunts.length === 0 ? (
            <div className="bg-bg-secondary rounded-lg border border-border p-8 text-center">
              <p className="text-text-muted mb-4">No treasure hunts for this character yet.</p>
              {isOwner && (
                <Link
                  href="/treasures"
                  className="inline-block px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover"
                >
                  Start Treasure Hunt
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {hunts.map((hunt) => (
                <Link
                  key={hunt.id}
                  href={`/treasures?hunt=${hunt.id}`}
                  className="bg-bg-secondary rounded-lg border border-border p-4 hover:border-accent/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-text-primary">{hunt.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      hunt.status === "completed" ? "bg-success/20 text-success" :
                      hunt.status === "searching" ? "bg-warning/20 text-warning" :
                      "bg-info/20 text-info"
                    }`}>
                      {hunt.status}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-text-muted">
                    <span>{hunt.server}</span>
                    <span className="capitalize">{hunt.difficulty}</span>
                    <span>{formatDate(hunt.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Share link */}
      <div className="mt-8 p-4 bg-bg-secondary rounded-lg border border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Share this character:</span>
          <code className="px-3 py-1 bg-bg-tertiary rounded text-sm text-accent">
            {typeof window !== "undefined" ? window.location.href : `/characters/${character.id}`}
          </code>
        </div>
      </div>
    </div>
  );
}
