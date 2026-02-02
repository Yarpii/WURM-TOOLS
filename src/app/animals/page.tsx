"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { StableCard } from "@/components/animals/StableCard";
import { AnimalCard } from "@/components/animals/AnimalCard";
import { FamilyTree } from "@/components/animals/FamilyTree";
import { StableModal, AnimalModal, TraitModal } from "@/components/animals/AnimalModals";
import { ANIMAL_TYPES, TRAIT_CATEGORIES } from "@/components/animals/constants";
import type { Stable, Animal, AnimalFamilyNode, AnimalType, AnimalGender, TraitCategory } from "@/lib/types";

type ModalMode = null | "create_stable" | "edit_stable" | "create_animal" | "edit_animal" | "add_trait";
type ActiveTab = "stables" | "all_animals" | "family_tree";

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
          // Refresh the selected animal
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
        // Refresh animal
        const animalRes = await fetch(`/api/animals?animal_id=${selectedAnimal.id}`);
        if (animalRes.ok) setSelectedAnimal(await animalRes.json());
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
      // Animal might not be in current list, fetch it
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

  // --- Render ---

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-bg-tertiary rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto p-4 text-center py-20">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Animal Breeding</h1>
        <p className="text-text-secondary mb-6">Log in to manage your animals and breeding lines.</p>
        <a href="/login" className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
          Login
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Animal Breeding</h1>
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
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        {(["stables", "all_animals", "family_tree"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${
              activeTab === tab ? "bg-accent/10 text-accent border-b-2 border-accent" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab === "stables" ? "Stables" : tab === "all_animals" ? "All Animals" : "Family Tree"}
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
                    <option key={key} value={key}>{val.label}</option>
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
                      // Fetch full animal with traits
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
                        return (
                          <div key={trait.id} className="flex items-center justify-between p-2 bg-bg-tertiary rounded">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${catInfo?.color || ""}`}>
                                {catInfo?.label || trait.trait_category}
                              </span>
                              <span className="text-sm text-text-primary">{trait.trait_name}</span>
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
          <div className="flex items-center gap-3 mb-4">
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
            <span className="text-sm text-text-muted">{animals.length} animals</span>
          </div>

          {animals.length === 0 ? (
            <div className="p-12 bg-bg-secondary rounded-lg text-center">
              <p className="text-text-muted mb-4">No animals yet</p>
              <button
                onClick={() => { setSelectedAnimal(null); setModalMode("create_animal"); }}
                className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                Add your first animal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {animals.map((animal) => (
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
                          setActiveTab("stables"); // Switch to stables tab to see details panel
                        }
                      });
                  }}
                />
              ))}
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
