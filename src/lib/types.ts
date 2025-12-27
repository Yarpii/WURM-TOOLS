export interface Item {
  id: number;
  name: string;
  category: string;
  is_base_material: number;
  description: string | null;
}

export interface Recipe {
  id: number;
  result_item_id: number;
  ingredient_item_id: number;
  quantity: number;
}

export interface RecipeWithNames extends Recipe {
  result_name: string;
  ingredient_name: string;
}

export interface CraftingNode {
  id: number;
  name: string;
  category: string;
  quantity: number;
  is_base: boolean;
  depth: number;
  children: CraftingNode[];
}

export interface MaterialResult {
  id: number;
  name: string;
  category: string;
  quantity: number;
  formatted: string;
}

export interface CraftableResult {
  item: Item;
  quantity_needed: number;
}

export interface ImportStats {
  items_added: number;
  items_skipped: number;
  recipes_added: number;
  recipes_skipped: number;
  errors: string[];
}

export interface CsvPreviewResult {
  valid: Array<Record<string, unknown>>;
  invalid: Array<{ row: number; data: string[]; error: string }>;
  duplicates: Array<Record<string, unknown>>;
}

export type Category =
  | "wood"
  | "ore"
  | "material"
  | "metal"
  | "vehicle"
  | "building"
  | "tool"
  | "food"
  | "armor"
  | "weapon"
  | "misc";
