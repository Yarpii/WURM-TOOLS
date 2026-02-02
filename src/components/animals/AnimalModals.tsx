"use client";

import { useState } from "react";
import type { Animal, Stable, AnimalType, AnimalGender, TraitCategory } from "@/lib/types";
import { ANIMAL_TYPES, TRAIT_CATEGORIES, WURM_TRAITS, HORSE_COLORS } from "./constants";

// ==================== STABLE MODAL ====================

interface StableModalProps {
  mode: "create" | "edit";
  stable?: Stable;
  saving: boolean;
  onSave: (data: { name: string; server: string; capacity: number; notes: string }) => void;
  onClose: () => void;
}

export function StableModal({ mode, stable, saving, onSave, onClose }: StableModalProps) {
  const [name, setName] = useState(stable?.name || "");
  const [server, setServer] = useState(stable?.server || "");
  const [capacity, setCapacity] = useState(stable?.capacity || 4);
  const [notes, setNotes] = useState(stable?.notes || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-secondary border border-border rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-text-primary mb-4">
          {mode === "create" ? "New Stable" : "Edit Stable"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
              placeholder="e.g. Main Breeding Stable"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Server *</label>
            <select
              value={server}
              onChange={(e) => setServer(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="">Select Server</option>
              <option value="Harmony">Harmony</option>
              <option value="Melody">Melody</option>
              <option value="Cadence">Cadence</option>
              <option value="Independence">Independence</option>
              <option value="Deliverance">Deliverance</option>
              <option value="Exodus">Exodus</option>
              <option value="Celebration">Celebration</option>
              <option value="Pristine">Pristine</option>
              <option value="Release">Release</option>
              <option value="Xanadu">Xanadu</option>
              <option value="Defiance">Defiance</option>
              <option value="Elevation">Elevation</option>
              <option value="Desertion">Desertion</option>
              <option value="Affliction">Affliction</option>
              <option value="Chaos">Chaos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Capacity</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value) || 4)}
              min={1}
              max={100}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none resize-none"
              placeholder="Optional notes..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ name, server, capacity, notes })}
            disabled={saving || !name || !server}
            className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== ANIMAL MODAL ====================

interface AnimalModalProps {
  mode: "create" | "edit";
  animal?: Animal;
  stables: Stable[];
  allAnimals: Animal[];
  saving: boolean;
  onSave: (data: {
    stable_id?: number;
    name: string;
    animal_type: AnimalType;
    gender: AnimalGender;
    color?: string;
    mother_id?: number;
    father_id?: number;
    is_alive?: boolean;
    notes?: string;
  }) => void;
  onClose: () => void;
}

export function AnimalModal({ mode, animal, stables, allAnimals, saving, onSave, onClose }: AnimalModalProps) {
  const [name, setName] = useState(animal?.name || "");
  const [animalType, setAnimalType] = useState<AnimalType>(animal?.animal_type || "horse");
  const [gender, setGender] = useState<AnimalGender>(animal?.gender || "female");
  const [color, setColor] = useState(animal?.color || "");
  const [stableId, setStableId] = useState<number | undefined>(animal?.stable_id);
  const [motherId, setMotherId] = useState<number | undefined>(animal?.mother_id);
  const [fatherId, setFatherId] = useState<number | undefined>(animal?.father_id);
  const [isAlive, setIsAlive] = useState(animal?.is_alive ?? true);
  const [notes, setNotes] = useState(animal?.notes || "");

  const females = allAnimals.filter((a) => a.gender === "female" && a.id !== animal?.id);
  const males = allAnimals.filter((a) => a.gender === "male" && a.id !== animal?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-secondary border border-border rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-text-primary mb-4">
          {mode === "create" ? "Add Animal" : "Edit Animal"}
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                placeholder="e.g. Shadowmere"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Type *</label>
              <select
                value={animalType}
                onChange={(e) => setAnimalType(e.target.value as AnimalType)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
              >
                {Object.entries(ANIMAL_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as AnimalGender)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Color</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="">Select color...</option>
                {HORSE_COLORS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Stable</label>
            <select
              value={stableId || ""}
              onChange={(e) => setStableId(e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="">No stable</option>
              {stables.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.animal_count || 0}/{s.capacity})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Mother</label>
              <select
                value={motherId || ""}
                onChange={(e) => setMotherId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="">Unknown</option>
                {females.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Father</label>
              <select
                value={fatherId || ""}
                onChange={(e) => setFatherId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="">Unknown</option>
                {males.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {mode === "edit" && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAlive"
                checked={isAlive}
                onChange={(e) => setIsAlive(e.target.checked)}
                className="rounded border-border"
              />
              <label htmlFor="isAlive" className="text-sm text-text-secondary">Alive</label>
            </div>
          )}

          <div>
            <label className="block text-sm text-text-secondary mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none resize-none"
              placeholder="Optional notes..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({
              stable_id: stableId,
              name,
              animal_type: animalType,
              gender,
              color: color || undefined,
              mother_id: motherId,
              father_id: fatherId,
              is_alive: isAlive,
              notes: notes || undefined,
            })}
            disabled={saving || !name || !animalType || !gender}
            className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : mode === "create" ? "Add" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== TRAIT MODAL ====================

interface TraitModalProps {
  animal: Animal;
  saving: boolean;
  onSave: (data: { trait_name: string; trait_category: TraitCategory; is_inherited: boolean }) => void;
  onClose: () => void;
}

export function TraitModal({ animal, saving, onSave, onClose }: TraitModalProps) {
  const [selectedTrait, setSelectedTrait] = useState("");
  const [customTrait, setCustomTrait] = useState("");
  const [category, setCategory] = useState<TraitCategory>("misc");
  const [isInherited, setIsInherited] = useState(false);
  const [useCustom, setUseCustom] = useState(false);

  const existingTraitNames = (animal.traits || []).map((t) => t.trait_name);
  const availableTraits = WURM_TRAITS.filter((t) => !existingTraitNames.includes(t.name));

  const handleSelectPreset = (traitName: string) => {
    setSelectedTrait(traitName);
    const preset = WURM_TRAITS.find((t) => t.name === traitName);
    if (preset) setCategory(preset.category);
  };

  const traitName = useCustom ? customTrait : selectedTrait;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-secondary border border-border rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-text-primary mb-1">Add Trait</h2>
        <p className="text-sm text-text-muted mb-4">for {animal.name}</p>

        <div className="space-y-4">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setUseCustom(false)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${!useCustom ? "bg-accent text-white" : "bg-bg-tertiary text-text-secondary"}`}
            >
              Preset
            </button>
            <button
              onClick={() => setUseCustom(true)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${useCustom ? "bg-accent text-white" : "bg-bg-tertiary text-text-secondary"}`}
            >
              Custom
            </button>
          </div>

          {!useCustom ? (
            <div>
              <label className="block text-sm text-text-secondary mb-1">Select Trait</label>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                {availableTraits.map((trait) => {
                  const catInfo = TRAIT_CATEGORIES[trait.category];
                  return (
                    <div
                      key={trait.name}
                      onClick={() => handleSelectPreset(trait.name)}
                      className={`p-2 rounded cursor-pointer transition-colors ${
                        selectedTrait === trait.name ? "bg-accent/10 border border-accent" : "hover:bg-bg-hover border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${catInfo.color}`}>
                          {catInfo.label}
                        </span>
                        <span className="text-sm text-text-primary">{trait.name}</span>
                      </div>
                      <div className="text-xs text-text-muted mt-0.5 ml-1">{trait.description}</div>
                    </div>
                  );
                })}
                {availableTraits.length === 0 && (
                  <div className="text-sm text-text-muted text-center py-4">All preset traits already added</div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Trait Name *</label>
                <input
                  type="text"
                  value={customTrait}
                  onChange={(e) => setCustomTrait(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                  placeholder="e.g. It has a rare glow"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TraitCategory)}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                >
                  {Object.entries(TRAIT_CATEGORIES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isInherited"
              checked={isInherited}
              onChange={(e) => setIsInherited(e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="isInherited" className="text-sm text-text-secondary">Inherited from parent</label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ trait_name: traitName, trait_category: category, is_inherited: isInherited })}
            disabled={saving || !traitName}
            className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add Trait"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== COMBINED EXPORT ====================

export function AnimalModals() {
  return null; // Individual modals are used directly
}
