import type { AnimalType, TraitCategory } from "@/lib/types";

export const ANIMAL_TYPES: Record<AnimalType, { label: string; emoji: string }> = {
  horse: { label: "Horse", emoji: "" },
  hell_horse: { label: "Hell Horse", emoji: "" },
  unicorn: { label: "Unicorn", emoji: "" },
  donkey: { label: "Donkey", emoji: "" },
  mule: { label: "Mule", emoji: "" },
  bison: { label: "Bison", emoji: "" },
  bull: { label: "Bull", emoji: "" },
  cow: { label: "Cow", emoji: "" },
  sheep: { label: "Sheep", emoji: "" },
  pig: { label: "Pig", emoji: "" },
  hen: { label: "Hen", emoji: "" },
  rooster: { label: "Rooster", emoji: "" },
  dog: { label: "Dog", emoji: "" },
  cat: { label: "Cat", emoji: "" },
  deer: { label: "Deer", emoji: "" },
  pheasant: { label: "Pheasant", emoji: "" },
  crab: { label: "Crab", emoji: "" },
};

export const TRAIT_CATEGORIES: Record<TraitCategory, { label: string; color: string }> = {
  speed: { label: "Speed", color: "bg-accent/20 text-accent" },
  draft: { label: "Draft", color: "bg-info/20 text-info" },
  combat: { label: "Combat", color: "bg-warning/20 text-warning" },
  output: { label: "Output", color: "bg-success/20 text-success" },
  misc: { label: "Misc", color: "bg-text-secondary/20 text-text-secondary" },
  negative: { label: "Negative", color: "bg-danger/20 text-danger" },
};

// Complete Wurm Online trait list (post-Animal Update May 2021)
// Points determine breeding budget (AH skill = max points on bred animals)
// ahRequired = minimum Animal Husbandry skill to see the trait via Inspect
export const WURM_TRAITS: Array<{
  name: string;
  category: TraitCategory;
  description: string;
  points: number;
  ahRequired: number;
}> = [
  // === Speed traits ===
  { name: "It has fleeter movement than normal", category: "speed", description: "Increased base speed", points: 3, ahRequired: 20 },
  { name: "It has lightning movement", category: "speed", description: "Further increased speed", points: 5, ahRequired: 30 },
  { name: "It has very strong leg muscles", category: "speed", description: "Speed bonus when riding", points: 3, ahRequired: 25 },
  { name: "It seems accustomed to water", category: "speed", description: "Moves faster in shallow water", points: 2, ahRequired: 35 },
  { name: "It is unbelievably fast", category: "speed", description: "Always-on speed bonus similar to hell horses (rare)", points: 15, ahRequired: 40 },

  // === Draft traits ===
  { name: "It can carry more than average", category: "draft", description: "Increased carry weight", points: 3, ahRequired: 20 },
  { name: "It has a strong body", category: "draft", description: "More hitpoints and carry capacity", points: 5, ahRequired: 25 },
  { name: "It is easy on its gear", category: "draft", description: "Equipped gear takes less damage", points: 3, ahRequired: 30 },
  { name: "It seems stronger than normal", category: "draft", description: "Large carry weight bonus (rare)", points: 10, ahRequired: 40 },
  { name: "It seems more nimble than normal", category: "draft", description: "Increased max ridable slope (rare)", points: 10, ahRequired: 40 },

  // === Combat traits ===
  { name: "It looks fierce", category: "combat", description: "Combat fighting bonus", points: 3, ahRequired: 20 },
  { name: "It seems to be a tough bugger", category: "combat", description: "More combat hitpoints", points: 5, ahRequired: 25 },
  { name: "It has sharp teeth", category: "combat", description: "Bite attack damage bonus", points: 3, ahRequired: 20 },
  { name: "It looks more friendly than normal", category: "combat", description: "Less likely attacked by aggressive creatures", points: 2, ahRequired: 30 },
  { name: "It is especially loyal", category: "combat", description: "Keeps loyalty longer", points: 2, ahRequired: 35 },

  // === Output traits ===
  { name: "It gives more resources", category: "output", description: "Increased wool, milk, and butchering output", points: 5, ahRequired: 30 },
  { name: "It seems vibrant", category: "output", description: "Increases quality and quantity of resources", points: 3, ahRequired: 25 },
  { name: "It has very good genes", category: "output", description: "Significantly increased resource output (rare)", points: 10, ahRequired: 40 },

  // === Misc traits ===
  { name: "It has a certain spark in its eyes", category: "misc", description: "Spark trait - appearance modifier", points: 0, ahRequired: 15 },
  { name: "It looks unusually strong and healthy", category: "misc", description: "General health bonus", points: 3, ahRequired: 20 },
  { name: "It has a thick and shiny mane", category: "misc", description: "Cosmetic appearance trait", points: 0, ahRequired: 10 },
  { name: "The legs are of normal length", category: "misc", description: "Normal leg length (cosmetic)", points: 0, ahRequired: 10 },
  { name: "It has a slow metabolism", category: "misc", description: "Eats half as much food", points: 3, ahRequired: 30 },
  { name: "It looks stationary", category: "misc", description: "Stays in place as if saddled", points: 2, ahRequired: 25 },
  { name: "It seems immortal", category: "misc", description: "Will never die, as if cared for (rare)", points: 15, ahRequired: 40 },
  { name: "It seems extremely tame", category: "misc", description: "Aggressive animals become passive (rare)", points: 10, ahRequired: 40 },
  { name: "It has a chance to produce twins", category: "misc", description: "Chance to birth twins when breeding (rare)", points: 10, ahRequired: 40 },
  { name: "It was bred in captivity", category: "misc", description: "Born from breeding, not wild", points: 0, ahRequired: 0 },

  // === Negative traits ===
  { name: "It seems overly aggressive", category: "negative", description: "May go aggressive randomly", points: -1, ahRequired: 10 },
  { name: "It looks unmotivated", category: "negative", description: "Slower movement speed", points: -1, ahRequired: 10 },
  { name: "It is constantly hungry", category: "negative", description: "Eats more food than normal", points: -1, ahRequired: 10 },
  { name: "It looks feeble and unhealthy", category: "negative", description: "Fewer hitpoints", points: -1, ahRequired: 10 },
  { name: "It seems to have a breeding issue", category: "negative", description: "Cannot breed", points: -1, ahRequired: 15 },
  { name: "It looks extremely sick", category: "negative", description: "Very slim chance to die on hunger tick", points: -3, ahRequired: 10 },
  { name: "It looks shabby and frail", category: "negative", description: "Reduced resource output from butchering/milk/wool", points: -1, ahRequired: 15 },
  { name: "It seems to dislike steep terrain", category: "negative", description: "Decreased max ridable slope", points: -1, ahRequired: 20 },
];

export const HORSE_COLORS = [
  "Black", "White", "Grey", "Brown", "Gold",
  "Blood Bay", "Ebony Black", "Piebald Pinto",
  "Gold Buckskin", "Black Silver", "Appaloosa", "Chestnut",
  "Jet Black", "Skewbald Pinto", "Dun",
];

// Trait points helper for breeding score calculations
export function getTraitPoints(traits: Array<{ trait_name: string }>): number {
  let total = 0;
  for (const t of traits) {
    const preset = WURM_TRAITS.find((w) => w.name === t.trait_name);
    if (preset) total += preset.points;
  }
  return total;
}

// Get dominant category from an animal's traits (excluding negative and misc)
export function getDominantCategory(traits: Array<{ trait_category: TraitCategory }>): TraitCategory | null {
  const counts: Partial<Record<TraitCategory, number>> = {};
  for (const t of traits) {
    if (t.trait_category !== "negative" && t.trait_category !== "misc") {
      counts[t.trait_category] = (counts[t.trait_category] || 0) + 1;
    }
  }
  let max = 0;
  let dominant: TraitCategory | null = null;
  for (const [cat, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      dominant = cat as TraitCategory;
    }
  }
  return dominant;
}

// Check if two animals share a parent (potential inbreeding)
export function checkInbreeding(animal1MotherID?: number, animal1FatherID?: number, animal2MotherID?: number, animal2FatherID?: number): { isInbred: boolean; reason: string } {
  if (!animal1MotherID && !animal1FatherID) return { isInbred: false, reason: "" };
  if (!animal2MotherID && !animal2FatherID) return { isInbred: false, reason: "" };

  const shared: string[] = [];
  if (animal1MotherID && (animal1MotherID === animal2MotherID || animal1MotherID === animal2FatherID)) {
    shared.push("share a mother");
  }
  if (animal1FatherID && (animal1FatherID === animal2MotherID || animal1FatherID === animal2FatherID)) {
    shared.push("share a father");
  }

  if (shared.length > 0) {
    return { isInbred: true, reason: `Animals ${shared.join(" and ")} (inbreeding reduces max trait points by 1.5x)` };
  }
  return { isInbred: false, reason: "" };
}
