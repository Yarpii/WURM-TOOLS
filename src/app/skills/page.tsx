"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { UserSkill, WurmSkill } from "@/lib/types";

// Wurm skill gain formula approximation
function calculateActionsNeeded(current: number, target: number): number {
  if (current >= target) return 0;

  // Simplified Wurm skill gain formula
  // Higher skills require exponentially more actions
  let actions = 0;
  let level = current;

  while (level < target) {
    // Base difficulty increases with level
    const difficulty = 1 + (level / 10);
    // Gain per action decreases as you level
    const gainPerAction = Math.max(0.001, (100 - level) / 1000 / difficulty);
    const stepsNeeded = Math.ceil(0.1 / gainPerAction); // 0.1 skill increments
    actions += stepsNeeded;
    level += 0.1;
  }

  return Math.round(actions);
}

function formatTime(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} hours`;
  const days = hours / 24;
  if (days < 7) return `${days.toFixed(1)} days`;
  return `${(days / 7).toFixed(1)} weeks`;
}

const SKILL_CATEGORIES = [
  { value: "all", label: "All Skills" },
  { value: "characteristics", label: "Characteristics" },
  { value: "combat", label: "Combat" },
  { value: "weapons", label: "Weapons" },
  { value: "crafting", label: "Crafting" },
  { value: "gathering", label: "Gathering" },
  { value: "nature", label: "Nature" },
  { value: "religion", label: "Religion" },
  { value: "cooking", label: "Cooking" },
  { value: "misc", label: "Miscellaneous" },
];

export default function SkillsPage() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [allSkills, setAllSkills] = useState<WurmSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Add skill form
  const [addForm, setAddForm] = useState({
    skill_name: "",
    current_level: 1,
    target_level: 50,
    notes: "",
  });
  const [formError, setFormError] = useState("");

  // Edit skill
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);

  const fetchData = async () => {
    try {
      const [skillsRes, allSkillsRes] = await Promise.all([
        user ? fetch("/api/skills") : Promise.resolve({ json: () => [] }),
        fetch("/api/skills?list=true"),
      ]);

      if (user) {
        const skillsData = await (skillsRes as Response).json();
        if (Array.isArray(skillsData)) setSkills(skillsData);
      }

      const allSkillsData = await allSkillsRes.json();
      if (Array.isArray(allSkillsData)) setAllSkills(allSkillsData);
    } catch (err) {
      console.error("Failed to fetch skills:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...addForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to add skill");
        return;
      }

      setShowAddForm(false);
      setAddForm({ skill_name: "", current_level: 1, target_level: 50, notes: "" });
      fetchData();
    } catch {
      setFormError("Connection error");
    }
  };

  const handleUpdateSkill = async (skillId: number, currentLevel: number) => {
    try {
      await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          skill_id: skillId,
          current_level: currentLevel,
        }),
      });
      fetchData();
      setEditingSkill(null);
    } catch (err) {
      console.error("Failed to update skill:", err);
    }
  };

  const handleDeleteSkill = async (skillId: number) => {
    if (!confirm("Remove this skill from tracking?")) return;

    try {
      await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", skill_id: skillId }),
      });
      fetchData();
    } catch (err) {
      console.error("Failed to delete skill:", err);
    }
  };

  const filteredAllSkills = selectedCategory === "all"
    ? allSkills
    : allSkills.filter(s => s.category === selectedCategory);

  const getProgressPercentage = (current: number, target: number) => {
    if (!target || target <= current) return 100;
    return Math.min(100, (current / target) * 100);
  };

  return (
    <div className="min-h-screen bg-bg-primary py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Skill Calculator</h1>
            <p className="text-text-muted mt-1">Track your progress and estimate time to goals</p>
          </div>

          {user && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showAddForm
                  ? "bg-danger text-white"
                  : "bg-accent text-white hover:bg-accent-hover"
              }`}
            >
              {showAddForm ? "Cancel" : "Track New Skill"}
            </button>
          )}
        </div>

        {/* Add Skill Form */}
        {showAddForm && user && (
          <div className="bg-bg-secondary rounded-lg border border-border p-6 mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Add Skill to Track</h2>
            <form onSubmit={handleAddSkill} className="space-y-4">
              {formError && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Skill Name
                  </label>
                  <input
                    type="text"
                    list="skill-list"
                    value={addForm.skill_name}
                    onChange={(e) => setAddForm({ ...addForm, skill_name: e.target.value })}
                    placeholder="e.g., Blacksmithing"
                    required
                    className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                  />
                  <datalist id="skill-list">
                    {allSkills.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Current Level
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max="100"
                      value={addForm.current_level}
                      onChange={(e) => setAddForm({ ...addForm, current_level: parseFloat(e.target.value) || 1 })}
                      className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Target Level
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max="100"
                      value={addForm.target_level}
                      onChange={(e) => setAddForm({ ...addForm, target_level: parseFloat(e.target.value) || 50 })}
                      className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="e.g., Working on imping tools"
                  rows={2}
                  className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border resize-none"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                Start Tracking
              </button>
            </form>
          </div>
        )}

        {/* Tracked Skills */}
        {user && skills.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Your Tracked Skills</h2>
            <div className="grid gap-4">
              {skills.map((skill) => {
                const actions = calculateActionsNeeded(skill.current_level, skill.target_level || 100);
                const hoursNormal = actions * 0.02; // ~50 actions per hour
                const hoursSB = hoursNormal / 3; // Sleep bonus is 3x
                const progress = getProgressPercentage(skill.current_level, skill.target_level || 100);

                return (
                  <div
                    key={skill.id}
                    className="bg-bg-secondary rounded-lg border border-border p-4"
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-text-primary">{skill.skill_name}</h3>
                          {editingSkill?.id === skill.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                min="1"
                                max="100"
                                value={editingSkill.current_level}
                                onChange={(e) => setEditingSkill({ ...editingSkill, current_level: parseFloat(e.target.value) || 1 })}
                                className="w-20 px-2 py-1 bg-bg-tertiary rounded text-text-primary border border-border text-sm"
                              />
                              <button
                                onClick={() => handleUpdateSkill(skill.id, editingSkill.current_level)}
                                className="px-2 py-1 bg-success/20 text-success rounded text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingSkill(null)}
                                className="px-2 py-1 bg-bg-tertiary text-text-muted rounded text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingSkill(skill)}
                              className="text-sm text-accent hover:underline"
                            >
                              {skill.current_level.toFixed(2)} → {(skill.target_level || 100).toFixed(2)}
                            </button>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-bg-tertiary rounded-full h-3 mb-2">
                          <div
                            className="bg-accent h-3 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-text-muted">
                          <span>Progress: {progress.toFixed(1)}%</span>
                          <span>Est. actions: ~{actions.toLocaleString()}</span>
                          <span>Time: ~{formatTime(hoursNormal)}</span>
                          <span className="text-success">With SB: ~{formatTime(hoursSB)}</span>
                        </div>

                        {skill.notes && (
                          <p className="text-sm text-text-secondary mt-2">{skill.notes}</p>
                        )}
                      </div>

                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => handleDeleteSkill(skill.id)}
                          className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          title="Remove from tracking"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Skill Reference */}
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <h2 className="text-xl font-semibold text-text-primary">Wurm Skills Reference</h2>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
            >
              {SKILL_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-text-muted">Loading skills...</div>
          ) : (
            <div className="bg-bg-secondary rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-bg-tertiary">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Skill</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Category</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Parent</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Description</th>
                      {user && (
                        <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAllSkills.map((skill) => (
                      <tr key={skill.id} className="hover:bg-bg-tertiary/50">
                        <td className="px-4 py-3 text-text-primary font-medium">{skill.name}</td>
                        <td className="px-4 py-3 text-text-secondary capitalize">{skill.category}</td>
                        <td className="px-4 py-3 text-text-muted">{skill.parent_skill || "-"}</td>
                        <td className="px-4 py-3 text-text-muted text-sm">{skill.description || "-"}</td>
                        {user && (
                          <td className="px-4 py-3 text-right">
                            {!skills.find((s) => s.skill_name === skill.name) && (
                              <button
                                onClick={() => {
                                  setAddForm({ ...addForm, skill_name: skill.name });
                                  setShowAddForm(true);
                                }}
                                className="text-sm text-accent hover:underline"
                              >
                                Track
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Not logged in message */}
        {!user && (
          <div className="mt-8 bg-bg-secondary rounded-lg border border-border p-6 text-center">
            <p className="text-text-secondary mb-4">
              Log in to track your skills and save your progress.
            </p>
            <a
              href="/login"
              className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              Log In
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
