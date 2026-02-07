import { query } from "./core";

export interface SiteSetting {
  setting_key: string;
  setting_value: string;
  setting_type: "string" | "color" | "url" | "json";
  category: "branding" | "colors" | "social" | "seo";
  description: string;
  updated_at: string;
  updated_by: number | null;
}

export type SiteSettings = Record<string, string>;

// In-memory cache with TTL
let settingsCache: SiteSettings | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Get all site settings as a flat key-value map.
 * Uses in-memory cache to avoid DB hit on every request.
 */
export async function getAllSiteSettings(): Promise<SiteSettings> {
  const now = Date.now();
  if (settingsCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return settingsCache;
  }

  const result = await query<{ setting_key: string; setting_value: string }>(
    "SELECT setting_key, setting_value FROM site_settings"
  );

  const settings: SiteSettings = {};
  for (const row of result.rows) {
    settings[row.setting_key] = row.setting_value;
  }

  settingsCache = settings;
  cacheTimestamp = now;
  return settings;
}

/**
 * Get all settings with full metadata (for admin panel).
 */
export async function getAllSiteSettingsDetailed(): Promise<SiteSetting[]> {
  const result = await query<SiteSetting>(
    "SELECT setting_key, setting_value, setting_type, category, description, updated_at, updated_by FROM site_settings ORDER BY category, setting_key"
  );
  return result.rows;
}

/**
 * Get settings filtered by category.
 */
export async function getSiteSettingsByCategory(
  category: string
): Promise<SiteSetting[]> {
  const result = await query<SiteSetting>(
    "SELECT setting_key, setting_value, setting_type, category, description, updated_at, updated_by FROM site_settings WHERE category = ?",
    [category]
  );
  return result.rows;
}

/**
 * Get a single setting value.
 */
export async function getSiteSetting(
  key: string,
  fallback = ""
): Promise<string> {
  // Check cache first
  if (settingsCache && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return settingsCache[key] ?? fallback;
  }

  const result = await query<{ setting_value: string }>(
    "SELECT setting_value FROM site_settings WHERE setting_key = ?",
    [key]
  );
  return result.rows[0]?.setting_value ?? fallback;
}

/**
 * Update a single setting.
 */
export async function updateSiteSetting(
  key: string,
  value: string,
  userId: number
): Promise<void> {
  await query(
    "UPDATE site_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?",
    [value, userId, key]
  );
  // Invalidate cache
  invalidateSettingsCache();
}

/**
 * Update multiple settings at once.
 */
export async function updateSiteSettings(
  settings: Record<string, string>,
  userId: number
): Promise<void> {
  const entries = Object.entries(settings);
  if (entries.length === 0) return;

  for (const [key, value] of entries) {
    await query(
      "UPDATE site_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?",
      [value, userId, key]
    );
  }
  // Invalidate cache
  invalidateSettingsCache();
}

/**
 * Invalidate the settings cache.
 * Call this after any update.
 */
export function invalidateSettingsCache(): void {
  settingsCache = null;
  cacheTimestamp = 0;
}
