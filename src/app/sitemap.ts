import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://wurm.tools";

// Static pages with their priority and change frequency
const staticPages = [
  { path: "/", priority: 1.0, changeFrequency: "daily" as const },
  { path: "/crafting", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/cooking", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/skills", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/map", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/market", priority: 0.8, changeFrequency: "daily" as const },
  { path: "/prices", priority: 0.8, changeFrequency: "daily" as const },
  { path: "/merchants", priority: 0.8, changeFrequency: "daily" as const },
  { path: "/timers", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/events", priority: 0.8, changeFrequency: "daily" as const },
  { path: "/alliances", priority: 0.7, changeFrequency: "daily" as const },
  { path: "/members", priority: 0.7, changeFrequency: "daily" as const },
  { path: "/characters", priority: 0.7, changeFrequency: "daily" as const },
  { path: "/achievements", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/treasures", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/archaeology", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/resources", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/projects", priority: 0.6, changeFrequency: "weekly" as const },
  { path: "/trades", priority: 0.6, changeFrequency: "daily" as const },
  { path: "/analytics", priority: 0.6, changeFrequency: "weekly" as const },
  { path: "/recipes/submit", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/about", priority: 0.4, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.4, changeFrequency: "monthly" as const },
  { path: "/disclaimer", priority: 0.3, changeFrequency: "yearly" as const },
];

async function fetchDynamicPages(): Promise<MetadataRoute.Sitemap> {
  const dynamicEntries: MetadataRoute.Sitemap = [];

  try {
    // Fetch characters
    const charactersRes = await fetch(`${baseUrl}/api/characters?limit=1000`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    if (charactersRes.ok) {
      const characters = await charactersRes.json();
      if (Array.isArray(characters)) {
        characters.forEach((char: { id: number; updated_at?: string }) => {
          dynamicEntries.push({
            url: `${baseUrl}/characters/${char.id}`,
            lastModified: char.updated_at ? new Date(char.updated_at) : new Date(),
            changeFrequency: "weekly",
            priority: 0.6,
          });
        });
      }
    }
  } catch {
    // Silently fail - sitemap will still work with static pages
  }

  try {
    // Fetch alliances
    const alliancesRes = await fetch(`${baseUrl}/api/alliances?limit=1000`, {
      next: { revalidate: 3600 },
    });
    if (alliancesRes.ok) {
      const alliances = await alliancesRes.json();
      if (Array.isArray(alliances)) {
        alliances.forEach((alliance: { id: number; updated_at?: string }) => {
          dynamicEntries.push({
            url: `${baseUrl}/alliances/${alliance.id}`,
            lastModified: alliance.updated_at ? new Date(alliance.updated_at) : new Date(),
            changeFrequency: "weekly",
            priority: 0.6,
          });
        });
      }
    }
  } catch {
    // Silently fail
  }

  try {
    // Fetch members
    const membersRes = await fetch(`${baseUrl}/api/members?limit=1000`, {
      next: { revalidate: 3600 },
    });
    if (membersRes.ok) {
      const members = await membersRes.json();
      if (Array.isArray(members)) {
        members.forEach((member: { id: number; updated_at?: string }) => {
          dynamicEntries.push({
            url: `${baseUrl}/members/${member.id}`,
            lastModified: member.updated_at ? new Date(member.updated_at) : new Date(),
            changeFrequency: "weekly",
            priority: 0.5,
          });
        });
      }
    }
  } catch {
    // Silently fail
  }

  try {
    // Fetch resources
    const resourcesRes = await fetch(`${baseUrl}/api/resources?limit=1000`, {
      next: { revalidate: 3600 },
    });
    if (resourcesRes.ok) {
      const resources = await resourcesRes.json();
      if (Array.isArray(resources)) {
        resources.forEach((resource: { id: number; updated_at?: string }) => {
          dynamicEntries.push({
            url: `${baseUrl}/resources/${resource.id}`,
            lastModified: resource.updated_at ? new Date(resource.updated_at) : new Date(),
            changeFrequency: "monthly",
            priority: 0.5,
          });
        });
      }
    }
  } catch {
    // Silently fail
  }

  return dynamicEntries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Generate static page entries
  const staticEntries: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  // Fetch dynamic page entries
  const dynamicEntries = await fetchDynamicPages();

  return [...staticEntries, ...dynamicEntries];
}
