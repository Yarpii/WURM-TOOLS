import type { AnimalType, TraitCategory } from "@/lib/types";

export const ANIMAL_TYPES: Record<AnimalType, { label: string; emoji: string }> = {
  horse: { label: "Horse", emoji: "" },
  bison: { label: "Bison", emoji: "" },
  bull: { label: "Bull", emoji: "" },
  cow: { label: "Cow", emoji: "" },
  sheep: { label: "Sheep", emoji: "" },
  pig: { label: "Pig", emoji: "" },
  hen: { label: "Hen", emoji: "" },
  rooster: { label: "Rooster", emoji: "" },
  dog: { label: "Dog", emoji: "" },
  cat: { label: "Cat", emoji: "" },
  hell_horse: { label: "Hell Horse", emoji: "" },
  unicorn: { label: "Unicorn", emoji: "" },
};

export const TRAIT_CATEGORIES: Record<TraitCategory, { label: string; color: string }> = {
  speed: { label: "Speed", color: "bg-accent/20 text-accent" },
  draft: { label: "Draft", color: "bg-info/20 text-info" },
  combat: { label: "Combat", color: "bg-warning/20 text-warning" },
  misc: { label: "Misc", color: "bg-text-secondary/20 text-text-secondary" },
  negative: { label: "Negative", color: "bg-danger/20 text-danger" },
};

// Common Wurm Online horse traits
export const WURM_TRAITS: Array<{ name: string; category: TraitCategory; description: string }> = [
  // Speed traits
  { name: "It has fleeter movement than normal", category: "speed", description: "Faster base speed" },
  { name: "It has lightning movement", category: "speed", description: "Even faster speed" },
  { name: "It can carry more than average", category: "draft", description: "Higher carry weight" },
  { name: "It has a strong body", category: "draft", description: "More hitpoints" },
  { name: "It has very strong leg muscles", category: "speed", description: "Speed bonus" },
  { name: "It has a certain spark in its eyes", category: "misc", description: "Spark trait" },
  // Combat traits
  { name: "It looks fierce", category: "combat", description: "Combat bonus" },
  { name: "It seems to be a tough bugger", category: "combat", description: "More combat hitpoints" },
  { name: "It has sharp teeth", category: "combat", description: "Bite attack" },
  // Draft traits
  { name: "It seems overly aggressive", category: "negative", description: "May go aggressive" },
  { name: "It looks unmotivated", category: "negative", description: "Slower speed" },
  { name: "It is constantly hungry", category: "negative", description: "Eats more" },
  { name: "It looks feeble and unhealthy", category: "negative", description: "Less hitpoints" },
  { name: "It seems to have a breeding issue", category: "negative", description: "Cannot breed" },
  // Misc traits
  { name: "It looks unusually strong and healthy", category: "misc", description: "General health bonus" },
  { name: "It has a thick and shiny mane", category: "misc", description: "Cosmetic" },
  { name: "The legs are of normal length", category: "misc", description: "Normal legs" },
];

export const HORSE_COLORS = [
  "Black", "White", "Grey", "Brown", "Gold", "Blood Bay", "Ebony Black",
  "Piebald Pinto", "Gold Buckskin", "Black Silver", "Appaloosa", "Chestnut",
];
