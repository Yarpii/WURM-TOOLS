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
    return this.fetch("/api/categories");
  }

  async search(query: string, type?: string): Promise<ItemSearchResult[]> {
    const params = new URLSearchParams({ q: query });
    if (type) params.set("type", type);
    return this.fetch(`/api/search?${params}`);
  }
}

// Export singleton instance
export const itemsApi = new ItemsAPI();

// Export class for custom instances
export { ItemsAPI };
