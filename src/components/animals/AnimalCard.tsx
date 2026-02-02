"use client";

import type { Animal } from "@/lib/types";
import { ANIMAL_TYPES, TRAIT_CATEGORIES, getTraitPoints, getDominantCategory } from "./constants";

interface AnimalCardProps {
  animal: Animal;
  isSelected: boolean;
  onClick: () => void;
}

export function AnimalCard({ animal, isSelected, onClick }: AnimalCardProps) {
  const typeInfo = ANIMAL_TYPES[animal.animal_type] || { label: animal.animal_type, emoji: "" };
  const traits = animal.traits || [];
  const traitPoints = getTraitPoints(traits);
  const dominant = getDominantCategory(traits);
  const dominantInfo = dominant ? TRAIT_CATEGORIES[dominant] : null;
  const negativeCount = traits.filter((t) => t.trait_category === "negative").length;

  return (
    <div
      onClick={onClick}
      className={`p-4 bg-bg-secondary rounded-lg cursor-pointer border-2 transition-colors ${
        isSelected ? "border-accent" : "border-transparent hover:border-border"
      } ${!animal.is_alive ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-text-primary">{animal.name}</h3>
          {!animal.is_alive && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-danger/20 text-danger">Deceased</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {dominant && dominantInfo && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${dominantInfo.color}`} title={`Dominant: ${dominantInfo.label}`}>
              {dominantInfo.label}
            </span>
          )}
          <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary">
            {animal.gender === "male" ? "M" : "F"}
          </span>
        </div>
      </div>

      <div className="text-sm text-text-secondary">
        {typeInfo.label}
        {animal.color && <span className="text-text-muted"> - {animal.color}</span>}
      </div>

      {animal.stable_name && (
        <div className="text-xs text-text-muted mt-1">Stable: {animal.stable_name}</div>
      )}

      {(animal.mother_name || animal.father_name) && (
        <div className="text-xs text-text-muted mt-1">
          {animal.mother_name && <span>Mother: {animal.mother_name}</span>}
          {animal.mother_name && animal.father_name && <span> | </span>}
          {animal.father_name && <span>Father: {animal.father_name}</span>}
        </div>
      )}

      {traits.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1 mt-2">
            {traits.slice(0, 3).map((trait) => {
              const catInfo = TRAIT_CATEGORIES[trait.trait_category];
              return (
                <span
                  key={trait.id}
                  className={`text-xs px-1.5 py-0.5 rounded ${catInfo?.color || "bg-bg-tertiary text-text-muted"}`}
                >
                  {trait.trait_name.length > 30 ? trait.trait_name.substring(0, 30) + "..." : trait.trait_name}
                </span>
              );
            })}
            {traits.length > 3 && (
              <span className="text-xs text-text-muted">+{traits.length - 3} more</span>
            )}
          </div>

          {/* Breed score bar */}
          <div className="flex items-center gap-2 mt-2">
            <div className="text-[10px] text-text-muted whitespace-nowrap">
              {traitPoints}pts / {traits.length} traits
            </div>
            {negativeCount > 0 && (
              <span className="text-[10px] text-danger">({negativeCount} neg)</span>
            )}
          </div>
        </>
      )}

      {animal.generation > 0 && (
        <div className="text-xs text-text-muted mt-1">Gen {animal.generation}</div>
      )}
    </div>
  );
}
