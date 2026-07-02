"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { StableCard } from "@/components/animals/StableCard";
import { AnimalCard } from "@/components/animals/AnimalCard";
import { FamilyTree } from "@/components/animals/FamilyTree";
import { StableModal, AnimalModal, TraitModal } from "@/components/animals/AnimalModals";
import { ANIMAL_TYPES, TRAIT_CATEGORIES, WURM_TRAITS, getTraitPoints, getDominantCategory, checkInbreeding } from "@/components/animals/constants";
import type { Stable, Animal, AnimalFamilyNode, AnimalType, AnimalGender, TraitCategory } from "@/lib/types";

type ModalMode = null | "create_stable" | "edit_stable" | "create_animal" | "edit_animal" | "add_trait";
type ActiveTab = "stables" | "all_animals" | "family_tree" | "herd_stats";
type ViewMode = "grid" | "table";
type SortField = "name" | "type" | "gender" | "generation" | "traits" | "points";

export default function AnimalsPage() {
  const { user, loading: authLoading } = useAuth();

  const [stables, setStables] = useState<Stable[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedStable, setSelectedStable] = useState<Stable | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [familyTree, setFamilyTree] = useState<AnimalFamilyNode | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>("stables");
  const [filterType, setFilterType] = useState<string>("");
  const [filterAlive, setFilterAlive] = useState<string>("true");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // All Animals tab state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [breedingTypeFilter, setBreedingTypeFilter] = useState<string>("");

  // Fetch stables
  const fetchStables = useCallback(async () => {
    try {
      const res = await fetch("/api/animals?resource=stables");
      const data = await res.json();
      if (res.ok) setStables(data);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  // Fetch animals
  const fetchAnimals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.append("animal_type", filterType);
      if (filterAlive) params.append("is_alive", filterAlive);
      if (selectedStable && activeTab === "stables") params.append("stable_id", String(selectedStable.id));

      const res = await fetch(`/api/animals?${params}`);
      const data = await res.json();
      if (res.ok) {
        setAnimals(data);
        setError("");
      } else {
        setError(data.error || "Failed to fetch animals");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [filterType, filterAlive, selectedStable, activeTab]);

  // Fetch family tree
  const fetchFamilyTree = useCallback(async (animalId: number) => {
    try {
      const res = await fetch(`/api/animals?resource=family-tree&animal_id=${animalId}`);
      const data = await res.json();
      if (res.ok) {
        setFamilyTree(data);
      } else {
        setError(data.error || "Failed to fetch family tree");
      }
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchStables();
    fetchAnimals();
  }, [user, fetchStables, fetchAnimals]);

  // Auto-clear success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Sorted and filtered animals for the All Animals tab
  const sortedAnimals = useMemo(() => {
    let list = [...animals];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        a.animal_type.toLowerCase().includes(q) ||
        a.color?.toLowerCase().includes(q) ||
        a.stable_name?.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "type": cmp = a.animal_type.localeCompare(b.animal_type); break;
        case "gender": cmp = a.gender.localeCompare(b.gender); break;
        case "generation": cmp = a.generation - b.generation; break;
        case "traits": cmp = (a.traits?.length || 0) - (b.traits?.length || 0); break;
        case "points": cmp = getTraitPoints(a.traits || []) - getTraitPoints(b.traits || []); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [animals, searchQuery, sortField, sortDir]);

  // Herd statistics
  const herdStats = useMemo(() => {
    const alive = animals.filter((a) => a.is_alive);
    const traitCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    let totalPoints = 0;
    let totalTraits = 0;
    let animalsWithTraits = 0;

    for (const a of alive) {
      typeCounts[a.animal_type] = (typeCounts[a.animal_type] || 0) + 1;
      if (a.traits && a.traits.length > 0) {
        animalsWithTraits++;
        totalTraits += a.traits.length;
        totalPoints += getTraitPoints(a.traits);
        for (const t of a.traits) {
          traitCounts[t.trait_name] = (traitCounts[t.trait_name] || 0) + 1;
          categoryCounts[t.trait_category] = (categoryCounts[t.trait_category] || 0) + 1;
        }
      }
    }

    const topTraits = Object.entries(traitCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    return {
      totalAlive: alive.length,
      totalDeceased: animals.length - alive.length,
      animalsWithTraits,
      avgTraits: animalsWithTraits > 0 ? (totalTraits / animalsWithTraits).toFixed(1) : "0",
      avgPoints: animalsWithTraits > 0 ? (totalPoints / animalsWithTraits).toFixed(1) : "0",
      categoryCounts,
      typeCounts,
      topTraits,
    };
  }, [animals]);

  // Breeding pair suggestions
  const breedingPairs = useMemo(() => {
    let alive = animals.filter((a) => a.is_alive);
    if (breedingTypeFilter) {
      alive = alive.filter((a) => a.animal_type === breedingTypeFilter);
    }
    const females = alive.filter((a) => a.gender === "female");
    const males = alive.filter((a) => a.gender === "male");
    const pairs: Array<{
      female: Animal;
      male: Animal;
      score: number;
      sharedTraits: number;
      inbred: boolean;
      reason: string;
    }> = [];

    for (const f of females) {
      for (const m of males) {
        if (f.animal_type !== m.animal_type) continue;

        // Check for breeding issues
        const fHasBreedingIssue = f.traits?.some((t) => t.trait_name === "It seems to have a breeding issue");
        const mHasBreedingIssue = m.traits?.some((t) => t.trait_name === "It seems to have a breeding issue");
        if (fHasBreedingIssue || mHasBreedingIssue) continue;

        const inbreeding = checkInbreeding(f.mother_id, f.father_id, m.mother_id, m.father_id);
        const isParentChild = (
          f.mother_id === m.id || f.father_id === m.id ||
          m.mother_id === f.id || m.father_id === f.id
        );

        const fTraits = new Set((f.traits || []).filter((t) => t.trait_category !== "negative" && t.trait_category !== "misc").map((t) => t.trait_name));
        const mTraits = new Set((m.traits || []).filter((t) => t.trait_category !== "negative" && t.trait_category !== "misc").map((t) => t.trait_name));
        let shared = 0;
        for (const t of fTraits) {
          if (mTraits.has(t)) shared++;
        }

        // Score: shared good traits are great, negative traits are bad, inbreeding penalty
        const fPoints = getTraitPoints(f.traits || []);
        const mPoints = getTraitPoints(m.traits || []);
        const fNeg = (f.traits || []).filter((t) => t.trait_category === "negative").length;
        const mNeg = (m.traits || []).filter((t) => t.trait_category === "negative").length;
        let score = (fPoints + mPoints) + (shared * 5) - ((fNeg + mNeg) * 10);
        if (inbreeding.isInbred || isParentChild) score -= 30;

        pairs.push({
          female: f,
          male: m,
          score,
          sharedTraits: shared,
          inbred: inbreeding.isInbred || !!isParentChild,
          reason: isParentChild ? "Parent-child" : inbreeding.reason,
        });
      }
    }

    return pairs.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [animals, breedingTypeFilter]);

  // --- API handlers ---

  const handleSaveStable = async (data: { name: string; server: string; capacity: number; notes: string }) => {
    setSaving(true);
    try {
      const isEdit = modalMode === "edit_stable" && selectedStable;
      const res = await fetch("/api/animals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isEdit ? "update_stable" : "create_stable",
          ...(isEdit ? { stable_id: selectedStable.id } : {}),
          ...data,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setSuccess(isEdit ? "Stable updated!" : "Stable created!");
        setModalMode(null);
        fetchStables();
        fetchAnimals();
      } else {
        setError(result.error || "Failed to save stable");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStable = async (stableId: number) => {
    if (!confirm("Delete this stable? Animals will be unassigned but not deleted.")) return;
    try {
      const res = await fetch("/api/animals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_stable", stable_id: stableId }),
      });
      if (res.ok) {
        setSuccess("Stable deleted!");
        if (selectedStable?.id === stableId) setSelectedStable(null);
        fetchStables();
        fetchAnimals();
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const handleSaveAnimal = async (data: {
    stable_id?: number;
    name: string;
    animal_type: AnimalType;
    gender: AnimalGender;
    color?: string;
    mother_id?: number;
    father_id?: number;
    is_alive?: boolean;
    notes?: string;
  }) => {
    setSaving(true);
    try {
      const isEdit = modalMode === "edit_animal" && selectedAnimal;
      const res = await fetch("/api/animals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isEdit ? "update_animal" : "create_animal",
          ...(isEdit ? { animal_id: selectedAnimal.id } : {}),
          ...data,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setSuccess(isEdit ? "Animal updated!" : "Animal added!");
        setModalMode(null);
        fetchAnimals();
        fetchStables();
        if (isEdit && selectedAnimal) {
          const animalRes = await fetch(`/api/animals?animal_id=${selectedAnimal.id}`);
          if (animalRes.ok) setSelectedAnimal(await animalRes.json());
        }
      } else {
        setError(result.error || "Failed to save animal");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnimal = async (animalId: number) => {
    if (!confirm("Delete this animal? Parent references on children will be cleared.")) return;
    try {
      const res = await fetch("/api/animals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_animal", animal_id: animalId }),
      });
      if (res.ok) {
        setSuccess("Animal deleted!");
        if (selectedAnimal?.id === animalId) setSelectedAnimal(null);
        setFamilyTree(null);
        fetchAnimals();
        fetchStables();
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const handleAddTrait = async (data: { trait_name: string; trait_category: TraitCategory; is_inherited: boolean }) => {
    if (!selectedAnimal) return;
    setSaving(true);
    try {
      const res = await fetch("/api/animals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_trait", animal_id: selectedAnimal.id, ...data }),
      });
      const result = await res.json();
      if (res.ok) {
        setSuccess("Trait added!");
        setModalMode(null);
        const animalRes = await fetch(`/api/animals?animal_id=${selectedAnimal.id}`);
        if (animalRes.ok) setSelectedAnimal(await animalRes.json());
        fetchAnimals();
        if (familyTree && familyTree.animal.id === selectedAnimal.id) {
          fetchFamilyTree(selectedAnimal.id);
        }
      } else {
        setError(result.error || "Failed to add trait");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTrait = async (traitId: number) => {
    if (!selectedAnimal) return;
    try {
      const res = await fetch("/api/animals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_trait", trait_id: traitId }),
      });
      if (res.ok) {
        const animalRes = await fetch(`/api/animals?animal_id=${selectedAnimal.id}`);
        if (animalRes.ok) setSelectedAnimal(await animalRes.json());
        fetchAnimals();
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const handleSelectAnimalForTree = (animalId: number) => {
    const animal = animals.find((a) => a.id === animalId);
    if (animal) {
      setSelectedAnimal(animal);
      fetchFamilyTree(animalId);
      setActiveTab("family_tree");
    } else {
      fetch(`/api/animals?animal_id=${animalId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.id) {
            setSelectedAnimal(data);
            fetchFamilyTree(animalId);
            setActiveTab("family_tree");
          }
        });
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-3 py-2 text-left text-xs font-medium text-text-secondary cursor-pointer hover:text-text-primary transition-colors select-none"
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-accent">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
        )}
      </span>
    </th>
  );

  // --- Render ---

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-bg-tertiary rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-4 text-center py-20">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Animal Breeding</h1>
        <p className="text-text-secondary mb-6">Log in to manage your animals and breeding lines.</p>
        <a href="/login" className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
          Login
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Animal Breeding</h1>
          <p className="text-sm text-text-muted mt-1">
            {animals.filter((a) => a.is_alive).length} alive across {stables.length} stables
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModalMode("create_stable")}
            className="px-4 py-2 text-sm bg-bg-secondary border border-border text-text-secondary rounded-lg hover:bg-bg-hover transition-colors"
          >
            + Stable
          </button>
          <button
            onClick={() => { setSelectedAnimal(null); setModalMode("create_animal"); }}
            className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            + Animal
          </button>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
          {error}
          <button onClick={() => setError("")} className="float-right text-danger/60 hover:text-danger">x</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg text-success text-sm">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2 overflow-x-auto">
        {([
          { key: "stables", label: "Stables" },
          { key: "all_animals", label: "All Animals" },
          { key: "family_tree", label: "Family Tree" },
          { key: "herd_stats", label: "Herd Stats" },
        ] as { key: ActiveTab; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key ? "bg-accent/10 text-accent border-b-2 border-accent" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* STABLES TAB */}
      {activeTab === "stables" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stables list */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Your Stables</h2>
            {stables.length === 0 ? (
              <div className="p-8 bg-bg-secondary rounded-lg text-center">
                <p className="text-text-muted mb-4">No stables yet</p>
                <button
                  onClick={() => setModalMode("create_stable")}
                  className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
                >
                  Create your first stable
                </button>
              </div>
            ) : (
              <>
                <div
                  onClick={() => setSelectedStable(null)}
                  className={`p-3 bg-bg-secondary rounded-lg cursor-pointer border-2 transition-colors ${
                    !selectedStable ? "border-accent" : "border-transparent hover:border-border"
                  }`}
                >
                  <span className="text-sm text-text-secondary">All Animals ({animals.length})</span>
                </div>
                {stables.map((stable) => (
                  <StableCard
                    key={stable.id}
                    stable={stable}
                    isSelected={selectedStable?.id === stable.id}
                    onClick={() => setSelectedStable(stable)}
                    onEdit={() => { setSelectedStable(stable); setModalMode("edit_stable"); }}
                    onDelete={() => handleDeleteStable(stable.id)}
                  />
                ))}
              </>
            )}
          </div>

          {/* Animals in stable */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-text-primary">
                {selectedStable ? `${selectedStable.name}` : "All Animals"}
              </h2>
              <div className="flex gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-2 py-1 text-sm bg-bg-tertiary border border-border rounded-lg text-text-primary"
                >
                  <option value="">All types</option>
                  {Object.entries(ANIMAL_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.emoji} {val.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-bg-tertiary rounded-lg animate-pulse" />)}
              </div>
            ) : animals.length === 0 ? (
              <div className="p-8 bg-bg-secondary rounded-lg text-center">
                <p className="text-text-muted">No animals found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {animals.map((animal) => (
                  <AnimalCard
                    key={animal.id}
                    animal={animal}
                    isSelected={selectedAnimal?.id === animal.id}
                    onClick={() => {
                      setSelectedAnimal(animal);
                      fetch(`/api/animals?animal_id=${animal.id}`)
                        .then((r) => r.json())
                        .then((data) => { if (data.id) setSelectedAnimal(data); });
                    }}
                  />
                ))}
              </div>
            )}

            {/* Selected animal details */}
            {selectedAnimal && (
              <div className="mt-6 p-4 bg-bg-secondary rounded-lg border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-text-primary">{selectedAnimal.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSelectAnimalForTree(selectedAnimal.id)}
                      className="px-3 py-1.5 text-xs bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
                    >
                      Family Tree
                    </button>
                    <button
                      onClick={() => setModalMode("edit_animal")}
                      className="px-3 py-1.5 text-xs bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-hover transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAnimal(selectedAnimal.id)}
                      className="px-3 py-1.5 text-xs bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-text-muted">Type:</span>{" "}
                    <span className="text-text-primary">{ANIMAL_TYPES[selectedAnimal.animal_type]?.label || selectedAnimal.animal_type}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Gender:</span>{" "}
                    <span className="text-text-primary">{selectedAnimal.gender === "male" ? "Male" : "Female"}</span>
                  </div>
                  {selectedAnimal.color && (
                    <div>
                      <span className="text-text-muted">Color:</span>{" "}
                      <span className="text-text-primary">{selectedAnimal.color}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-text-muted">Generation:</span>{" "}
                    <span className="text-text-primary">{selectedAnimal.generation}</span>
                  </div>
                  {selectedAnimal.traits && selectedAnimal.traits.length > 0 && (
                    <>
                      <div>
                        <span className="text-text-muted">Breed Points:</span>{" "}
                        <span className="text-text-primary">{getTraitPoints(selectedAnimal.traits)}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Dominant:</span>{" "}
                        <span className="text-text-primary">
                          {(() => {
                            const dom = getDominantCategory(selectedAnimal.traits!);
                            return dom ? TRAIT_CATEGORIES[dom].label : "None";
                          })()}
                        </span>
                      </div>
                    </>
                  )}
                  {selectedAnimal.mother_name && (
                    <div>
                      <span className="text-text-muted">Mother:</span>{" "}
                      <button
                        onClick={() => selectedAnimal.mother_id && handleSelectAnimalForTree(selectedAnimal.mother_id)}
                        className="text-accent hover:underline"
                      >
                        {selectedAnimal.mother_name}
                      </button>
                    </div>
                  )}
                  {selectedAnimal.father_name && (
                    <div>
                      <span className="text-text-muted">Father:</span>{" "}
                      <button
                        onClick={() => selectedAnimal.father_id && handleSelectAnimalForTree(selectedAnimal.father_id)}
                        className="text-accent hover:underline"
                      >
                        {selectedAnimal.father_name}
                      </button>
                    </div>
                  )}
                </div>

                {selectedAnimal.notes && (
                  <div className="text-sm text-text-muted mb-4">{selectedAnimal.notes}</div>
                )}

                {/* Traits section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-text-secondary">Traits</h4>
                    <button
                      onClick={() => setModalMode("add_trait")}
                      className="px-2 py-1 text-xs bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
                    >
                      + Add Trait
                    </button>
                  </div>
                  {(!selectedAnimal.traits || selectedAnimal.traits.length === 0) ? (
                    <p className="text-sm text-text-muted">No traits recorded</p>
                  ) : (
                    <div className="space-y-1">
                      {selectedAnimal.traits.map((trait) => {
                        const catInfo = TRAIT_CATEGORIES[trait.trait_category];
                        const presetTrait = WURM_TRAITS.find((w) => w.name === trait.trait_name);
                        return (
                          <div key={trait.id} className="flex items-center justify-between p-2 bg-bg-tertiary rounded">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${catInfo?.color || ""}`}>
                                {catInfo?.label || trait.trait_category}
                              </span>
                              <span className="text-sm text-text-primary">{trait.trait_name}</span>
                              {presetTrait && (
                                <span className="text-[10px] text-text-muted">{presetTrait.points}pt</span>
                              )}
                              {trait.is_inherited && (
                                <span className="text-xs text-text-muted">(inherited)</span>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveTrait(trait.id)}
                              className="text-text-muted hover:text-danger text-xs transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ALL ANIMALS TAB */}
      {activeTab === "all_animals" && (
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search animals..."
              className="px-3 py-2 text-sm bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none w-48"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm bg-bg-tertiary border border-border rounded-lg text-text-primary"
            >
              <option value="">All types</option>
              {Object.entries(ANIMAL_TYPES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <select
              value={filterAlive}
              onChange={(e) => setFilterAlive(e.target.value)}
              className="px-3 py-2 text-sm bg-bg-tertiary border border-border rounded-lg text-text-primary"
            >
              <option value="true">Alive</option>
              <option value="false">Deceased</option>
              <option value="">All</option>
            </select>
            <span className="text-sm text-text-muted">{sortedAnimals.length} animals</span>
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded transition-colors ${viewMode === "grid" ? "bg-accent/10 text-accent" : "text-text-muted hover:text-text-primary"}`}
                title="Grid view"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z" /></svg>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded transition-colors ${viewMode === "table" ? "bg-accent/10 text-accent" : "text-text-muted hover:text-text-primary"}`}
                title="Table view"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M0 2a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H2a2 2 0 01-2-2V2zm15 2H1v10a1 1 0 001 1h12a1 1 0 001-1V4zm0-3a1 1 0 00-1-1H2a1 1 0 00-1 1v1h14V1zM2 5.5a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5zm0 3a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5zm0 3a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5z" /></svg>
              </button>
            </div>
          </div>

          {sortedAnimals.length === 0 ? (
            <div className="p-12 bg-bg-secondary rounded-lg text-center">
              <p className="text-text-muted mb-4">No animals found</p>
              <button
                onClick={() => { setSelectedAnimal(null); setModalMode("create_animal"); }}
                className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                Add your first animal
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedAnimals.map((animal) => (
                <AnimalCard
                  key={animal.id}
                  animal={animal}
                  isSelected={selectedAnimal?.id === animal.id}
                  onClick={() => {
                    fetch(`/api/animals?animal_id=${animal.id}`)
                      .then((r) => r.json())
                      .then((data) => {
                        if (data.id) {
                          setSelectedAnimal(data);
                          setActiveTab("stables");
                        }
                      });
                  }}
                />
              ))}
            </div>
          ) : (
            /* Table view */
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full">
                <thead className="bg-bg-tertiary">
                  <tr>
                    <SortHeader field="name">Name</SortHeader>
                    <SortHeader field="type">Type</SortHeader>
                    <SortHeader field="gender">Gender</SortHeader>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Color</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Stable</th>
                    <SortHeader field="generation">Gen</SortHeader>
                    <SortHeader field="traits">Traits</SortHeader>
                    <SortHeader field="points">Points</SortHeader>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Dominant</th>
                    <th className="px-3 py-2 text-xs font-medium text-text-secondary" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedAnimals.map((animal) => {
                    const typeInfo = ANIMAL_TYPES[animal.animal_type] || { label: animal.animal_type };
                    const traits = animal.traits || [];
                    const dominant = getDominantCategory(traits);
                    const domInfo = dominant ? TRAIT_CATEGORIES[dominant] : null;
                    return (
                      <tr
                        key={animal.id}
                        className={`bg-bg-secondary hover:bg-bg-hover transition-colors cursor-pointer ${!animal.is_alive ? "opacity-50" : ""}`}
                        onClick={() => {
                          fetch(`/api/animals?animal_id=${animal.id}`)
                            .then((r) => r.json())
                            .then((data) => {
                              if (data.id) {
                                setSelectedAnimal(data);
                                setActiveTab("stables");
                              }
                            });
                        }}
                      >
                        <td className="px-3 py-2 text-sm font-medium text-text-primary">
                          {animal.name}
                          {!animal.is_alive && <span className="ml-1 text-xs text-danger">(dead)</span>}
                        </td>
                        <td className="px-3 py-2 text-sm text-text-secondary">{typeInfo.emoji && <span className="mr-1">{typeInfo.emoji}</span>}{typeInfo.label}</td>
                        <td className="px-3 py-2 text-sm text-text-secondary">{animal.gender === "male" ? "M" : "F"}</td>
                        <td className="px-3 py-2 text-sm text-text-muted">{animal.color || "-"}</td>
                        <td className="px-3 py-2 text-sm text-text-muted">{animal.stable_name || "-"}</td>
                        <td className="px-3 py-2 text-sm text-text-secondary">{animal.generation}</td>
                        <td className="px-3 py-2 text-sm text-text-secondary">{traits.length}</td>
                        <td className="px-3 py-2 text-sm text-text-secondary">{getTraitPoints(traits)}</td>
                        <td className="px-3 py-2">
                          {domInfo && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${domInfo.color}`}>{domInfo.label}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSelectAnimalForTree(animal.id); }}
                            className="text-xs text-accent hover:underline"
                          >
                            Tree
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* FAMILY TREE TAB */}
      {activeTab === "family_tree" && (
        <div>
          {!selectedAnimal ? (
            <div className="p-12 bg-bg-secondary rounded-lg text-center">
              <p className="text-text-muted mb-4">Select an animal to view its family tree</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl mx-auto">
                {animals.slice(0, 6).map((animal) => (
                  <AnimalCard
                    key={animal.id}
                    animal={animal}
                    isSelected={false}
                    onClick={() => handleSelectAnimalForTree(animal.id)}
                  />
                ))}
              </div>
            </div>
          ) : !familyTree ? (
            <div className="p-8 text-center">
              <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-text-muted mt-2">Loading family tree...</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleSelectAnimalForTree(parseInt(e.target.value));
                    }}
                    value={selectedAnimal.id}
                    className="px-3 py-2 text-sm bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  >
                    {animals.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({ANIMAL_TYPES[a.animal_type]?.label})</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModalMode("edit_animal")}
                    className="px-3 py-1.5 text-xs bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-hover transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setModalMode("add_trait")}
                    className="px-3 py-1.5 text-xs bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
                  >
                    + Trait
                  </button>
                </div>
              </div>

              <div className="bg-bg-secondary rounded-lg border border-border p-6">
                <FamilyTree tree={familyTree} onSelectAnimal={handleSelectAnimalForTree} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* HERD STATS TAB */}
      {activeTab === "herd_stats" && (
        <div className="space-y-6">
          {/* Overview cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-bg-secondary rounded-lg border border-border">
              <div className="text-2xl font-bold text-text-primary">{herdStats.totalAlive}</div>
              <div className="text-xs text-text-muted">Alive</div>
            </div>
            <div className="p-4 bg-bg-secondary rounded-lg border border-border">
              <div className="text-2xl font-bold text-text-primary">{herdStats.totalDeceased}</div>
              <div className="text-xs text-text-muted">Deceased</div>
            </div>
            <div className="p-4 bg-bg-secondary rounded-lg border border-border">
              <div className="text-2xl font-bold text-text-primary">{herdStats.avgTraits}</div>
              <div className="text-xs text-text-muted">Avg Traits</div>
            </div>
            <div className="p-4 bg-bg-secondary rounded-lg border border-border">
              <div className="text-2xl font-bold text-text-primary">{herdStats.avgPoints}</div>
              <div className="text-xs text-text-muted">Avg Points</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Animals by type */}
            <div className="p-4 bg-bg-secondary rounded-lg border border-border">
              <h3 className="text-sm font-medium text-text-secondary mb-3">Animals by Type</h3>
              <div className="space-y-2">
                {Object.entries(herdStats.typeCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => {
                    const info = ANIMAL_TYPES[type as AnimalType] || { label: type };
                    const pct = herdStats.totalAlive > 0 ? (count / herdStats.totalAlive) * 100 : 0;
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <span className="text-sm text-text-primary w-28 shrink-0">{info.emoji && <span className="mr-1">{info.emoji}</span>}{info.label}</span>
                        <div className="flex-1 h-5 bg-bg-tertiary rounded-full overflow-hidden">
                          <div className="h-full bg-accent/40 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-text-muted w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                {Object.keys(herdStats.typeCounts).length === 0 && (
                  <p className="text-sm text-text-muted">No animals yet</p>
                )}
              </div>
            </div>

            {/* Traits by category */}
            <div className="p-4 bg-bg-secondary rounded-lg border border-border">
              <h3 className="text-sm font-medium text-text-secondary mb-3">Trait Categories</h3>
              <div className="space-y-2">
                {Object.entries(herdStats.categoryCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, count]) => {
                    const catInfo = TRAIT_CATEGORIES[cat as TraitCategory];
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded w-20 text-center shrink-0 ${catInfo?.color || ""}`}>
                          {catInfo?.label || cat}
                        </span>
                        <div className="flex-1 h-5 bg-bg-tertiary rounded-full overflow-hidden">
                          <div className="h-full bg-accent/40 rounded-full" style={{ width: `${Math.min(100, (count / Math.max(1, herdStats.animalsWithTraits)) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-text-muted w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                {Object.keys(herdStats.categoryCounts).length === 0 && (
                  <p className="text-sm text-text-muted">No traits recorded</p>
                )}
              </div>
            </div>

            {/* Most common traits */}
            <div className="p-4 bg-bg-secondary rounded-lg border border-border">
              <h3 className="text-sm font-medium text-text-secondary mb-3">Most Common Traits</h3>
              <div className="space-y-1.5">
                {herdStats.topTraits.map(([traitName, count]) => {
                  const preset = WURM_TRAITS.find((t) => t.name === traitName);
                  const catInfo = preset ? TRAIT_CATEGORIES[preset.category] : null;
                  return (
                    <div key={traitName} className="flex items-center justify-between p-2 bg-bg-tertiary rounded">
                      <div className="flex items-center gap-2">
                        {catInfo && (
                          <span className={`text-[10px] px-1 py-0.5 rounded ${catInfo.color}`}>{catInfo.label}</span>
                        )}
                        <span className="text-xs text-text-primary">
                          {traitName.length > 40 ? traitName.substring(0, 40) + "..." : traitName}
                        </span>
                      </div>
                      <span className="text-xs text-text-muted">{count}x</span>
                    </div>
                  );
                })}
                {herdStats.topTraits.length === 0 && (
                  <p className="text-sm text-text-muted">No traits recorded</p>
                )}
              </div>
            </div>

            {/* Breeding pair suggestions */}
            <div className="p-4 bg-bg-secondary rounded-lg border border-border">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium text-text-secondary">Breeding Suggestions</h3>
                <select
                  value={breedingTypeFilter}
                  onChange={(e) => setBreedingTypeFilter(e.target.value)}
                  className="px-2 py-1 text-xs bg-bg-tertiary border border-border rounded-lg text-text-primary"
                >
                  <option value="">All types</option>
                  {Object.entries(ANIMAL_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.emoji} {val.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-text-muted mb-3">Top pairs ranked by shared good traits, breed points, and no inbreeding</p>
              <div className="space-y-2">
                {breedingPairs.map((pair, i) => (
                  <div
                    key={`${pair.female.id}-${pair.male.id}`}
                    className={`p-2.5 bg-bg-tertiary rounded border ${pair.inbred ? "border-warning/30" : "border-transparent"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-text-muted text-xs">#{i + 1}</span>
                        <button
                          onClick={() => handleSelectAnimalForTree(pair.female.id)}
                          className="text-accent hover:underline"
                        >
                          {pair.female.name}
                        </button>
                        <span className="text-text-muted">x</span>
                        <button
                          onClick={() => handleSelectAnimalForTree(pair.male.id)}
                          className="text-accent hover:underline"
                        >
                          {pair.male.name}
                        </button>
                      </div>
                      <span className="text-xs text-text-muted">Score: {pair.score}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-text-muted">
                        {ANIMAL_TYPES[pair.female.animal_type]?.label}
                      </span>
                      {pair.sharedTraits > 0 && (
                        <span className="text-[10px] text-success">{pair.sharedTraits} shared traits</span>
                      )}
                      {pair.inbred && (
                        <span className="text-[10px] text-warning">Inbreeding risk</span>
                      )}
                    </div>
                  </div>
                ))}
                {breedingPairs.length === 0 && (
                  <p className="text-sm text-text-muted">Need at least one male and one female of the same type</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {(modalMode === "create_stable" || modalMode === "edit_stable") && (
        <StableModal
          mode={modalMode === "edit_stable" ? "edit" : "create"}
          stable={modalMode === "edit_stable" ? selectedStable || undefined : undefined}
          saving={saving}
          onSave={handleSaveStable}
          onClose={() => setModalMode(null)}
        />
      )}

      {(modalMode === "create_animal" || modalMode === "edit_animal") && (
        <AnimalModal
          mode={modalMode === "edit_animal" ? "edit" : "create"}
          animal={modalMode === "edit_animal" ? selectedAnimal || undefined : undefined}
          stables={stables}
          allAnimals={animals}
          saving={saving}
          onSave={handleSaveAnimal}
          onClose={() => setModalMode(null)}
        />
      )}

      {modalMode === "add_trait" && selectedAnimal && (
        <TraitModal
          animal={selectedAnimal}
          saving={saving}
          onSave={handleAddTrait}
          onClose={() => setModalMode(null)}
        />
      )}
    </div>
  );
}
