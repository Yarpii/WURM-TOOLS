"use client";

import { useInfoSections } from "@/components/InfoSectionsProvider";
import { PrivacyFormData } from "./types";

interface PrivacyTabProps {
  privacyForm: PrivacyFormData;
  setPrivacyForm: (form: PrivacyFormData) => void;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
}

export default function PrivacyTab({
  privacyForm,
  setPrivacyForm,
  saving,
  onSave,
}: PrivacyTabProps) {
  const { showInfoSections, setShowInfoSections } = useInfoSections();

  return (
    <div className="space-y-6">
      {/* Privacy & Visibility */}
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Privacy & Visibility
        </h2>
        <p className="text-text-muted mb-6">
          Control what information is visible to other users
        </p>

        <form onSubmit={onSave} className="space-y-6">
          {/* Show in Members List */}
          <div className="p-4 bg-bg-tertiary rounded-lg border border-border">
            <label className="flex items-start gap-4 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyForm.show_in_members_list}
                onChange={(e) =>
                  setPrivacyForm({
                    ...privacyForm,
                    show_in_members_list: e.target.checked,
                  })
                }
                className="mt-1 w-5 h-5 rounded border-border bg-bg-secondary checked:bg-accent checked:border-accent focus:ring-accent"
              />
              <div className="flex-1">
                <div className="font-medium text-text-primary">
                  Show in Members List
                </div>
                <p className="text-sm text-text-muted mt-1">
                  Allow your profile to appear in the public members list. This is
                  opt-in - you must enable this to be visible.
                </p>
                {privacyForm.show_in_members_list && (
                  <div className="mt-2 text-sm text-success flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Your profile is visible
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Show Location */}
          <div className="p-4 bg-bg-tertiary rounded-lg border border-border">
            <label className="flex items-start gap-4 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyForm.show_location}
                onChange={(e) =>
                  setPrivacyForm({
                    ...privacyForm,
                    show_location: e.target.checked,
                  })
                }
                className="mt-1 w-5 h-5 rounded border-border bg-bg-secondary checked:bg-accent checked:border-accent focus:ring-accent"
              />
              <div className="flex-1">
                <div className="font-medium text-text-primary">Show Location</div>
                <p className="text-sm text-text-muted mt-1">
                  Display your location on your public profile. Only visible when
                  your profile is public.
                </p>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full py-3 rounded-lg font-medium transition-all ${
              saving
                ? "bg-bg-tertiary cursor-not-allowed text-text-muted"
                : "bg-accent hover:bg-accent-hover text-white"
            }`}
          >
            {saving ? "Saving..." : "Save Privacy Settings"}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-info/10 border border-info/30 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-info flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-text-secondary">
              <strong className="text-text-primary">Note:</strong> Your username,
              display name, bio, avatar, and Wurm server are always visible on
              your public profile when you opt-in to the members list.
            </div>
          </div>
        </div>
      </div>

      {/* Display Preferences */}
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Display Preferences
        </h2>
        <p className="text-text-muted mb-6">
          Customize how pages look for you
        </p>

        <div className="p-4 bg-bg-tertiary rounded-lg border border-border">
          <label className="flex items-start gap-4 cursor-pointer">
            <input
              type="checkbox"
              checked={showInfoSections}
              onChange={(e) => setShowInfoSections(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-border bg-bg-secondary checked:bg-accent checked:border-accent focus:ring-accent"
            />
            <div className="flex-1">
              <div className="font-medium text-text-primary">
                Show Info Sections
              </div>
              <p className="text-sm text-text-muted mt-1">
                Display feature explanations, tips, and &quot;Explore More&quot; sections
                on pages. Useful for new members, but experienced users may
                prefer a cleaner view.
              </p>
              {!showInfoSections && (
                <div className="mt-2 text-sm text-accent flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Info sections are hidden across all pages
                </div>
              )}
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
