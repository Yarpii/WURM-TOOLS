"use client";

import type { AnimalFamilyNode } from "@/lib/types";
import { ANIMAL_TYPES, TRAIT_CATEGORIES } from "./constants";

interface FamilyTreeProps {
  tree: AnimalFamilyNode;
  onSelectAnimal: (animalId: number) => void;
}

function AncestorNode({
  node,
  label,
  depth,
  onSelectAnimal,
}: {
  node?: AnimalFamilyNode;
  label: string;
  depth: number;
  onSelectAnimal: (animalId: number) => void;
}) {
  if (!node) {
    return (
      <div className="flex flex-col items-center">
        <div className="px-3 py-2 rounded-lg border border-dashed border-border text-text-muted text-xs text-center min-w-[120px]">
          <div className="text-text-muted">{label}</div>
          <div>Unknown</div>
        </div>
        {depth > 0 && (
          <div className="flex gap-4 mt-2">
            <AncestorNode label="Mother" depth={depth - 1} onSelectAnimal={onSelectAnimal} />
            <AncestorNode label="Father" depth={depth - 1} onSelectAnimal={onSelectAnimal} />
          </div>
        )}
      </div>
    );
  }

  const animal = node.animal;
  const typeInfo = ANIMAL_TYPES[animal.animal_type] || { label: animal.animal_type };

  return (
    <div className="flex flex-col items-center">
      {/* Connector line from parent */}
      <div className="w-px h-2 bg-border" />

      <div
        onClick={() => onSelectAnimal(animal.id)}
        className="px-3 py-2 rounded-lg bg-bg-secondary border border-border hover:border-accent cursor-pointer transition-colors text-center min-w-[140px]"
      >
        <div className="text-xs text-text-muted">{label}</div>
        <div className="font-medium text-sm text-text-primary">{animal.name}</div>
        <div className="text-xs text-text-secondary">
          {typeInfo.label} - {animal.gender === "male" ? "M" : "F"}
        </div>
        {animal.color && <div className="text-xs text-text-muted">{animal.color}</div>}
        {animal.traits && animal.traits.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
            {animal.traits.slice(0, 2).map((trait) => {
              const catInfo = TRAIT_CATEGORIES[trait.trait_category];
              return (
                <span
                  key={trait.id}
                  className={`text-[10px] px-1 py-0 rounded ${catInfo?.color || "bg-bg-tertiary text-text-muted"}`}
                  title={trait.trait_name}
                >
                  {trait.trait_name.split(" ").slice(-2).join(" ")}
                </span>
              );
            })}
            {animal.traits.length > 2 && (
              <span className="text-[10px] text-text-muted">+{animal.traits.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Children: parent ancestors */}
      {depth > 0 && (
        <>
          <div className="w-px h-2 bg-border" />
          <div className="flex gap-4">
            <AncestorNode node={node.mother} label="Mother" depth={depth - 1} onSelectAnimal={onSelectAnimal} />
            <AncestorNode node={node.father} label="Father" depth={depth - 1} onSelectAnimal={onSelectAnimal} />
          </div>
        </>
      )}
    </div>
  );
}

export function FamilyTree({ tree, onSelectAnimal }: FamilyTreeProps) {
  const animal = tree.animal;
  const typeInfo = ANIMAL_TYPES[animal.animal_type] || { label: animal.animal_type };

  return (
    <div className="space-y-6">
      {/* Main animal */}
      <div className="flex flex-col items-center">
        <div className="px-4 py-3 rounded-xl bg-accent/10 border-2 border-accent text-center min-w-[160px]">
          <div className="font-bold text-text-primary">{animal.name}</div>
          <div className="text-sm text-text-secondary">
            {typeInfo.label} - {animal.gender === "male" ? "Male" : "Female"}
          </div>
          {animal.color && <div className="text-xs text-text-muted">{animal.color}</div>}
          <div className="text-xs text-text-muted">Gen {animal.generation}</div>
          {animal.traits && animal.traits.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 justify-center">
              {animal.traits.map((trait) => {
                const catInfo = TRAIT_CATEGORIES[trait.trait_category];
                return (
                  <span
                    key={trait.id}
                    className={`text-xs px-1.5 py-0.5 rounded ${catInfo?.color || "bg-bg-tertiary text-text-muted"}`}
                    title={trait.trait_name}
                  >
                    {trait.trait_name.split(" ").slice(-3).join(" ")}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ancestors section */}
      <div>
        <h4 className="text-sm font-medium text-text-secondary mb-3 text-center">Ancestors</h4>
        <div className="overflow-x-auto pb-4">
          <div className="flex justify-center min-w-fit">
            <div className="flex gap-6">
              <AncestorNode node={tree.mother} label="Mother" depth={2} onSelectAnimal={onSelectAnimal} />
              <AncestorNode node={tree.father} label="Father" depth={2} onSelectAnimal={onSelectAnimal} />
            </div>
          </div>
        </div>
      </div>

      {/* Children section */}
      {tree.children && tree.children.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-3">
            Offspring ({tree.children.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {tree.children.map((child) => {
              const childType = ANIMAL_TYPES[child.animal_type] || { label: child.animal_type };
              return (
                <div
                  key={child.id}
                  onClick={() => onSelectAnimal(child.id)}
                  className="p-3 bg-bg-secondary rounded-lg border border-border hover:border-accent cursor-pointer transition-colors"
                >
                  <div className="font-medium text-sm text-text-primary">{child.name}</div>
                  <div className="text-xs text-text-secondary">
                    {childType.label} - {child.gender === "male" ? "M" : "F"}
                  </div>
                  {child.color && <div className="text-xs text-text-muted">{child.color}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
