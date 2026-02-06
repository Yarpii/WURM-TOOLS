/**
 * Items API client for items.wurm.tools
 * Fetches item/recipe data from the Wurmpedia database
 */

// API base URL - uses environment variable in production, localhost in development
const API_BASE = process.env.NEXT_PUBLIC_ITEMS_API_URL || "http://localhost:3030";

export interface ItemSearchResult {
  slug: string;
  title: string;
  page_type: string;
  image_src: string | null;
  image_original: string | null;
  // Extended fields when details=true
  skill?: string | null;
  difficulty?: string | null;
  time?: string | null;
  tools?: MaterialItem[];
  materials?: MaterialItem[];
  creation?: MaterialItem[];
  materialBreakdown?: MaterialItem[];
  totalMaterials?: MaterialItem[];
  result?: MaterialItem[];
  skillAndImprovement?: MaterialItem[];
  allFields?: Record<string, MaterialItem[]>;
  categories?: string[];
  breadcrumbs?: string[];
}

export interface ItemsResponse {
  items: ItemSearchResult[];
  total: number;
  limit: number;
  offset: number;
}

export interface MaterialItem {
  raw: string;
  links?: { href: string; text: string }[];
}

export interface ItemDetail {
  slug: string;
  title: string;
  page_type: string;
  breadcrumbs: string[];
  image: string | null;
  image_alt: string | null;
  skill: string | null;
  materials: MaterialItem[];
  tools: MaterialItem[];
  result: MaterialItem[];
  creation?: MaterialItem[];
  materialBreakdown?: MaterialItem[];
  totalMaterials?: MaterialItem[];
  skillAndImprovement?: MaterialItem[];
  categories: string[];
  infobox: {
    title: string;
    fields: Record<string, MaterialItem[]>;
  } | null;
}

export interface RecipeData {
  item: string;
  slug: string;
  skill: string | null;
  difficulty: string | null;
  materials: MaterialItem[];
  tools: MaterialItem[];
  result: MaterialItem[];
  time: string | null;
  all_fields: Record<string, MaterialItem[]>;
}

// New structured recipe types from recipe database
export interface RecipeMaterial {
  material_name: string;
  material_slug: string;
  quantity: number;
  unit: string;
  sort_order: number;
  linked_name?: string;
  linked_image?: string;
}

export interface RecipeTool {
  tool_name: string;
  tool_slug: string;
  is_workstation: boolean;
  linked_name?: string;
  linked_image?: string;
}

export interface RecipeStep {
  step_order: number;
  action: string;
  target_name: string;
  target_slug: string | null;
  target_quantity: number | null;
  target_unit: string | null;
  submenu_path: string | null;
  raw_text: string;
}

export interface RecipeDBItem {
  id: number;
  slug: string;
  name: string;
  skill: string | null;
  difficulty: number | null;
  base_time_seconds: number | null;
  image_url: string | null;
  is_base_material: boolean;
  materials: RecipeMaterial[];
  tools: RecipeTool[];
  steps: RecipeStep[];
  categories: string[];
}

export interface RecipeDBListItem {
  id: number;
  slug: string;
  name: string;
  skill: string | null;
  difficulty: number | null;
  base_time_seconds: number | null;
  image_url: string | null;
  is_base_material: boolean;
  material_count: number;
  tool_count: number;
}

export interface RecipeDBResponse {
  items: RecipeDBListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface Category {
  name: string;
  count: number;
}

export interface HealthStatus {
  status: string;
  database: boolean;
  pages_count: number;
  timestamp: string;
}

class ItemsAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  async health(): Promise<HealthStatus> {
    return this.fetch("/api/health");
  }

  async searchItems(query: string, options?: { category?: string; limit?: number; offset?: number; details?: boolean }): Promise<ItemsResponse> {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (options?.category) params.set("category", options.category);
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.offset) params.set("offset", options.offset.toString());
    if (options?.details) params.set("details", "true");
    return this.fetch(`/api/items?${params}`);
  }

  async getItem(slug: string): Promise<ItemDetail> {
    return this.fetch(`/api/items/${encodeURIComponent(slug)}`);
  }

  async getRecipe(slug: string): Promise<RecipeData> {
    return this.fetch(`/api/items/${encodeURIComponent(slug)}/recipe`);
  }

  async getCategories(): Promise<Category[]> {
    const result = await this.fetch<{ data: Category[] }>("/api/categories");
    return result.data;
  }

  async search(query: string, type?: string): Promise<ItemSearchResult[]> {
    const params = new URLSearchParams({ q: query });
    if (type) params.set("type", type);
    return this.fetch(`/api/search?${params}`);
  }

  // Recipe database methods (structured data from migrated tables)
  async getRecipeDB(slug: string): Promise<RecipeDBItem> {
    return this.fetch(`/api/recipes/${encodeURIComponent(slug)}`);
  }

  async searchRecipesDB(query: string, options?: { skill?: string; limit?: number; offset?: number }): Promise<RecipeDBResponse> {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (options?.skill) params.set("skill", options.skill);
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.offset) params.set("offset", options.offset.toString());
    return this.fetch(`/api/recipes?${params}`);
  }

  async getAllRecipesDB(options?: { limit?: number; offset?: number }): Promise<RecipeDBResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.offset) params.set("offset", options.offset.toString());
    return this.fetch(`/api/recipes?${params}`);
  }
}

// Export singleton instance
export const itemsApi = new ItemsAPI();

// Export class for custom instances
export { ItemsAPI };
