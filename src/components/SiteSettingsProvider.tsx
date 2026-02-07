"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface SiteSettings {
  // Branding
  site_name: string;
  site_tagline: string;
  logo_url: string;
  favicon_url: string;
  og_image_url: string;
  // Colors
  color_accent: string;
  color_accent_hover: string;
  color_success: string;
  color_warning: string;
  color_danger: string;
  color_info: string;
  // Social
  social_twitter: string;
  social_github: string;
  social_discord: string;
  // SEO
  seo_description: string;
  seo_keywords: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "Wurm Tools",
  site_tagline: "Community Hub for Wurm Online",
  logo_url: "/icon.svg",
  favicon_url: "/icon.svg",
  og_image_url: "/og-image.svg",
  color_accent: "#3b82f6",
  color_accent_hover: "#60a5fa",
  color_success: "#22c55e",
  color_warning: "#f59e0b",
  color_danger: "#ef4444",
  color_info: "#06b6d4",
  social_twitter: "@wurmtools",
  social_github: "https://github.com/Yarpii/WURM-TOOLS",
  social_discord: "",
  seo_description: "",
  seo_keywords: "",
};

interface SiteSettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  refresh: async () => {},
});

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/site-settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      }
    } catch {
      // Silently fail - use defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Apply color CSS variables whenever settings change
  useEffect(() => {
    const root = document.documentElement;
    if (settings.color_accent !== DEFAULT_SETTINGS.color_accent) {
      root.style.setProperty("--accent", settings.color_accent);
    }
    if (settings.color_accent_hover !== DEFAULT_SETTINGS.color_accent_hover) {
      root.style.setProperty("--accent-hover", settings.color_accent_hover);
    }
    if (settings.color_success !== DEFAULT_SETTINGS.color_success) {
      root.style.setProperty("--success", settings.color_success);
    }
    if (settings.color_warning !== DEFAULT_SETTINGS.color_warning) {
      root.style.setProperty("--warning", settings.color_warning);
    }
    if (settings.color_danger !== DEFAULT_SETTINGS.color_danger) {
      root.style.setProperty("--danger", settings.color_danger);
    }
    if (settings.color_info !== DEFAULT_SETTINGS.color_info) {
      root.style.setProperty("--info", settings.color_info);
    }
    // Update accent-muted based on accent
    if (settings.color_accent !== DEFAULT_SETTINGS.color_accent) {
      const r = parseInt(settings.color_accent.slice(1, 3), 16);
      const g = parseInt(settings.color_accent.slice(3, 5), 16);
      const b = parseInt(settings.color_accent.slice(5, 7), 16);
      root.style.setProperty("--accent-muted", `rgba(${r}, ${g}, ${b}, 0.1)`);
    }

    // Update favicon dynamically
    if (settings.favicon_url !== DEFAULT_SETTINGS.favicon_url) {
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (link) {
        link.href = settings.favicon_url;
      }
    }
  }, [settings]);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refresh: fetchSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}
