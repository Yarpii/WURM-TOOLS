"use client";

import { useState, useEffect } from "react";
import { Save, RotateCcw, Palette, Globe, Share2, Search, Loader2, CheckCircle2 } from "lucide-react";
import AdminGuard from "@/components/AdminGuard";
import type { SiteSetting } from "@/lib/db/site-settings";

interface SettingField {
  key: string;
  label: string;
  type: "text" | "color" | "url" | "textarea";
  placeholder?: string;
  description?: string;
}

const SECTIONS: { label: string; icon: React.ReactNode; category: string; fields: SettingField[] }[] = [
  {
    label: "Branding",
    icon: <Globe className="w-5 h-5" />,
    category: "branding",
    fields: [
      { key: "site_name", label: "Site Name", type: "text", placeholder: "Wurm Tools", description: "Displayed in header, footer, and browser tab" },
      { key: "site_tagline", label: "Tagline", type: "text", placeholder: "Community Hub for Wurm Online", description: "Short tagline shown in header/footer" },
      { key: "logo_url", label: "Logo URL", type: "url", placeholder: "/icon.svg", description: "Logo image (SVG, PNG, or external URL)" },
      { key: "favicon_url", label: "Favicon URL", type: "url", placeholder: "/icon.svg", description: "Browser tab icon" },
      { key: "og_image_url", label: "OG Image URL", type: "url", placeholder: "/og-image.svg", description: "Default social sharing image" },
    ],
  },
  {
    label: "Colors",
    icon: <Palette className="w-5 h-5" />,
    category: "colors",
    fields: [
      { key: "color_accent", label: "Accent", type: "color", description: "Primary accent color" },
      { key: "color_accent_hover", label: "Accent Hover", type: "color", description: "Accent hover state" },
      { key: "color_success", label: "Success", type: "color", description: "Success/positive actions" },
      { key: "color_warning", label: "Warning", type: "color", description: "Warning indicators" },
      { key: "color_danger", label: "Danger", type: "color", description: "Danger/error state" },
      { key: "color_info", label: "Info", type: "color", description: "Informational highlights" },
    ],
  },
  {
    label: "Social",
    icon: <Share2 className="w-5 h-5" />,
    category: "social",
    fields: [
      { key: "social_twitter", label: "Twitter/X Handle", type: "text", placeholder: "@wurmtools" },
      { key: "social_github", label: "GitHub URL", type: "url", placeholder: "https://github.com/..." },
      { key: "social_discord", label: "Discord Invite URL", type: "url", placeholder: "https://discord.gg/..." },
    ],
  },
  {
    label: "SEO",
    icon: <Search className="w-5 h-5" />,
    category: "seo",
    fields: [
      { key: "seo_description", label: "Meta Description", type: "textarea", placeholder: "Your all-in-one toolkit for Wurm Online...", description: "Default meta description for search engines" },
      { key: "seo_keywords", label: "Meta Keywords", type: "text", placeholder: "Wurm Online, crafting, ...", description: "Comma-separated keywords" },
    ],
  },
];

function BrandingContent() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Record<string, SiteSetting>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      const settingsMap: Record<string, string> = {};
      const detailsMap: Record<string, SiteSetting> = {};
      for (const s of data.settings as SiteSetting[]) {
        settingsMap[s.setting_key] = s.setting_value;
        detailsMap[s.setting_key] = s;
      }
      setValues(settingsMap);
      setOriginal(settingsMap);
      setDetails(detailsMap);
    } catch {
      showMessage("error", "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const hasChanges = () => {
    return Object.keys(values).some((key) => values[key] !== original[key]);
  };

  const changedKeys = () => {
    return Object.keys(values).filter((key) => values[key] !== original[key]);
  };

  const handleSave = async () => {
    const changed = changedKeys();
    if (changed.length === 0) return;

    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const key of changed) {
        payload[key] = values[key];
      }

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      const data = await res.json();
      // Update originals
      const settingsMap: Record<string, string> = {};
      const detailsMap: Record<string, SiteSetting> = {};
      for (const s of data.settings as SiteSetting[]) {
        settingsMap[s.setting_key] = s.setting_value;
        detailsMap[s.setting_key] = s;
      }
      setValues(settingsMap);
      setOriginal(settingsMap);
      setDetails(detailsMap);
      showMessage("success", `Saved ${changed.length} setting${changed.length > 1 ? "s" : ""} successfully`);
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setValues({ ...original });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
        <p className="text-text-muted">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">Branding & Style</h1>
          <p className="text-text-secondary">Customize logo, colors, social links, and SEO settings</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={!hasChanges() || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges() || saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover transition-all shadow-lg shadow-accent/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : `Save${hasChanges() ? ` (${changedKeys().length})` : ""}`}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-2 ${
            message.type === "success"
              ? "bg-success/15 text-success border border-success/20"
              : "bg-danger/15 text-danger border border-danger/20"
          }`}
        >
          {message.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <section
            key={section.category}
            className="bg-bg-secondary border border-border rounded-xl overflow-hidden"
          >
            {/* Section Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-bg-tertiary/50">
              <span className="text-accent">{section.icon}</span>
              <h2 className="text-lg font-semibold text-text-primary">{section.label}</h2>
            </div>

            {/* Fields */}
            <div className="p-6 space-y-5">
              {section.category === "colors" ? (
                /* Color grid layout */
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {section.fields.map((field) => {
                    const isChanged = values[field.key] !== original[field.key];
                    return (
                      <div key={field.key} className="space-y-2">
                        <label htmlFor={field.key} className="flex items-center gap-2 text-sm font-medium text-text-primary">
                          {field.label}
                          {isChanged && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            id={`${field.key}-picker`}
                            value={values[field.key] || "#000000"}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            id={field.key}
                            value={values[field.key] || ""}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            placeholder="#000000"
                            pattern="^#[0-9a-fA-F]{6}$"
                            className="flex-1 px-3 py-2 rounded-lg bg-bg-primary border border-border text-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                          />
                        </div>
                        {field.description && (
                          <p className="text-xs text-text-muted">{field.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Standard field layout */
                section.fields.map((field) => {
                  const isChanged = values[field.key] !== original[field.key];
                  const lastUpdated = details[field.key]?.updated_at;
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor={field.key} className="flex items-center gap-2 text-sm font-medium text-text-primary">
                          {field.label}
                          {isChanged && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                        </label>
                        {lastUpdated && (
                          <span className="text-xs text-text-muted">
                            Updated {new Date(lastUpdated).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {field.type === "textarea" ? (
                        <textarea
                          id={field.key}
                          value={values[field.key] || ""}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-y"
                        />
                      ) : (
                        <input
                          type={field.type === "url" ? "url" : "text"}
                          id={field.key}
                          value={values[field.key] || ""}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                        />
                      )}
                      {field.description && (
                        <p className="text-xs text-text-muted">{field.description}</p>
                      )}
                      {/* Preview for logo/favicon URLs */}
                      {(field.key === "logo_url" || field.key === "favicon_url" || field.key === "og_image_url") && values[field.key] && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-xs text-text-muted">Preview:</span>
                          <div className="w-8 h-8 rounded border border-border bg-bg-primary flex items-center justify-center overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={values[field.key]}
                              alt={`${field.label} preview`}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Floating save bar */}
      {hasChanges() && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-4 px-6 py-3 rounded-xl bg-bg-secondary/95 backdrop-blur-xl border border-border shadow-2xl shadow-black/20">
            <span className="text-sm text-text-secondary">
              {changedKeys().length} unsaved change{changedKeys().length > 1 ? "s" : ""}
            </span>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-all"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg bg-accent text-white hover:bg-accent-hover transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrandingPage() {
  return (
    <AdminGuard>
      <BrandingContent />
    </AdminGuard>
  );
}
