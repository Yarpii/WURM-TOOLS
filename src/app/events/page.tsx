"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import type { WurmEvent, EventType, AttendeeStatus, WurmServer } from "@/lib/types";

const EVENT_TYPES: { value: EventType; label: string; icon: string; color: string }[] = [
  { value: "impalong", label: "Impalong", icon: "🔨", color: "#f59e0b" },
  { value: "rift", label: "Rift", icon: "🌀", color: "#8b5cf6" },
  { value: "unique", label: "Unique Hunt", icon: "🐉", color: "#ef4444" },
  { value: "sermon_group", label: "Sermon Group", icon: "📖", color: "#3b82f6" },
  { value: "market", label: "Market", icon: "🛒", color: "#22c55e" },
  { value: "pvp", label: "PvP Event", icon: "⚔️", color: "#dc2626" },
  { value: "community", label: "Community", icon: "🎉", color: "#ec4899" },
  { value: "personal", label: "Personal", icon: "📅", color: "#6b7280" },
  { value: "other", label: "Other", icon: "📌", color: "#94a3b8" },
];

const SERVERS: { value: WurmServer | "all"; label: string }[] = [
  { value: "all", label: "All Servers" },
  { value: "harmony", label: "Harmony" },
  { value: "melody", label: "Melody" },
  { value: "cadence", label: "Cadence" },
  { value: "defiance", label: "Defiance" },
  { value: "independence", label: "Independence" },
  { value: "deliverance", label: "Deliverance" },
  { value: "exodus", label: "Exodus" },
  { value: "celebration", label: "Celebration" },
  { value: "pristine", label: "Pristine" },
  { value: "release", label: "Release" },
  { value: "xanadu", label: "Xanadu" },
];

const ATTENDANCE_OPTIONS: { value: AttendeeStatus; label: string; color: string }[] = [
  { value: "going", label: "Going", color: "#22c55e" },
  { value: "maybe", label: "Maybe", color: "#f59e0b" },
  { value: "interested", label: "Interested", color: "#3b82f6" },
  { value: "not_going", label: "Not Going", color: "#ef4444" },
];

function formatEventDate(startDate: string, endDate?: string, isAllDay?: boolean): string {
  const start = new Date(startDate);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: isAllDay ? undefined : "2-digit",
    minute: isAllDay ? undefined : "2-digit",
  };

  if (!endDate) {
    return start.toLocaleDateString("en-US", options);
  }

  const end = new Date(endDate);
  const sameDay = start.toDateString() === end.toDateString();

  if (sameDay) {
    return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}`;
}

function isUpcoming(startDate: string): boolean {
  return new Date(startDate) >= new Date();
}

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<WurmEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<WurmEvent | null>(null);

  // Filters
  const [filterServer, setFilterServer] = useState<WurmServer | "all">("all");
  const [filterType, setFilterType] = useState<EventType | "all">("all");
  const [showPast, setShowPast] = useState(false);

  // Add event form
  const [addForm, setAddForm] = useState({
    title: "",
    description: "",
    event_type: "community" as EventType,
    server: "" as WurmServer | "",
    location: "",
    coordinates: "",
    start_date: "",
    end_date: "",
    is_all_day: false,
    is_public: true,
    max_attendees: "",
    contact_info: "",
    external_link: "",
  });
  const [formError, setFormError] = useState("");

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      if (filterServer !== "all") params.set("server", filterServer);
      if (filterType !== "all") params.set("type", filterType);
      if (!showPast) params.set("upcoming", "true");

      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [filterServer, filterType, showPast]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...addForm,
          server: addForm.server || null,
          max_attendees: addForm.max_attendees ? parseInt(addForm.max_attendees) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create event");
        return;
      }

      setShowAddForm(false);
      setAddForm({
        title: "", description: "", event_type: "community", server: "",
        location: "", coordinates: "", start_date: "", end_date: "",
        is_all_day: false, is_public: true, max_attendees: "", contact_info: "", external_link: "",
      });
      fetchEvents();
    } catch {
      setFormError("Connection error");
    }
  };

  const handleAttend = async (eventId: number, status: AttendeeStatus) => {
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "attend", event_id: eventId, status }),
      });
      fetchEvents();
    } catch (err) {
      console.error("Failed to update attendance:", err);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm("Delete this event?")) return;

    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", event_id: eventId }),
      });
      setSelectedEvent(null);
      fetchEvents();
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  const featuredEvents = events.filter((e) => e.is_featured && isUpcoming(e.start_date));
  const regularEvents = events.filter((e) => !e.is_featured);

  return (
    <div className="min-h-screen bg-bg-primary py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Event Calendar</h1>
            <p className="text-text-muted mt-1">Discover Impalongs, Rifts, and community events</p>
          </div>

          {user && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showAddForm
                  ? "bg-danger text-white"
                  : "bg-accent text-white hover:bg-accent-hover"
              }`}
            >
              {showAddForm ? "Cancel" : "Create Event"}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={filterServer}
            onChange={(e) => setFilterServer(e.target.value as WurmServer | "all")}
            className="px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
          >
            {SERVERS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as EventType | "all")}
            className="px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
          >
            <option value="all">All Types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-text-secondary">
            <input
              type="checkbox"
              checked={showPast}
              onChange={(e) => setShowPast(e.target.checked)}
              className="rounded"
            />
            Show past events
          </label>
        </div>

        {/* Add Event Form */}
        {showAddForm && user && (
          <div className="bg-bg-secondary rounded-lg border border-border p-6 mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Create Event</h2>
            <form onSubmit={handleAddEvent} className="space-y-4">
              {formError && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={addForm.title}
                    onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                    placeholder="e.g., Summer Impalong 2024"
                    required
                    className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Event Type *
                  </label>
                  <select
                    value={addForm.event_type}
                    onChange={(e) => setAddForm({ ...addForm, event_type: e.target.value as EventType })}
                    className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description
                </label>
                <textarea
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  placeholder="Tell people about your event..."
                  rows={3}
                  className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Server
                  </label>
                  <select
                    value={addForm.server}
                    onChange={(e) => setAddForm({ ...addForm, server: e.target.value as WurmServer })}
                    className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                  >
                    <option value="">Select server...</option>
                    {SERVERS.filter((s) => s.value !== "all").map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={addForm.location}
                    onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                    placeholder="e.g., Harmony Bay"
                    className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Coordinates
                  </label>
                  <input
                    type="text"
                    value={addForm.coordinates}
                    onChange={(e) => setAddForm({ ...addForm, coordinates: e.target.value })}
                    placeholder="e.g., X: 1234, Y: 5678"
                    className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={addForm.start_date}
                    onChange={(e) => setAddForm({ ...addForm, start_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={addForm.end_date}
                    onChange={(e) => setAddForm({ ...addForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-text-secondary">
                  <input
                    type="checkbox"
                    checked={addForm.is_all_day}
                    onChange={(e) => setAddForm({ ...addForm, is_all_day: e.target.checked })}
                    className="rounded"
                  />
                  All day event
                </label>

                <label className="flex items-center gap-2 text-text-secondary">
                  <input
                    type="checkbox"
                    checked={addForm.is_public}
                    onChange={(e) => setAddForm({ ...addForm, is_public: e.target.checked })}
                    className="rounded"
                  />
                  Public (visible to everyone)
                </label>
              </div>

              <button
                type="submit"
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                Create Event
              </button>
            </form>
          </div>
        )}

        {/* Featured Events */}
        {featuredEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
              <span className="text-warning">⭐</span> Featured Events
            </h2>
            <div className="grid gap-4">
              {featuredEvents.map((event) => {
                const typeInfo = EVENT_TYPES.find((t) => t.value === event.event_type);

                return (
                  <div
                    key={event.id}
                    className="bg-gradient-to-r from-warning/10 to-transparent rounded-lg border border-warning/30 p-6 cursor-pointer hover:border-warning/50 transition-colors"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{typeInfo?.icon}</span>
                          <h3 className="text-xl font-semibold text-text-primary">{event.title}</h3>
                        </div>
                        <p className="text-text-secondary mb-2">{event.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-text-muted">
                          <span>📅 {formatEventDate(event.start_date, event.end_date || undefined, event.is_all_day)}</span>
                          {event.server && <span>🌍 {event.server}</span>}
                          {event.location && <span>📍 {event.location}</span>}
                          {event.attendee_count !== undefined && <span>👥 {event.attendee_count} going</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Regular Events */}
        <div>
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            {showPast ? "All Events" : "Upcoming Events"}
          </h2>

          {loading ? (
            <div className="text-center py-8 text-text-muted">Loading events...</div>
          ) : regularEvents.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              No events found. {user ? "Be the first to create one!" : "Log in to create events."}
            </div>
          ) : (
            <div className="grid gap-4">
              {regularEvents.map((event) => {
                const typeInfo = EVENT_TYPES.find((t) => t.value === event.event_type);
                const upcoming = isUpcoming(event.start_date);

                return (
                  <div
                    key={event.id}
                    className={`bg-bg-secondary rounded-lg border border-border p-4 cursor-pointer hover:border-accent transition-colors ${
                      !upcoming ? "opacity-60" : ""
                    }`}
                    onClick={() => setSelectedEvent(event)}
                    style={{ borderLeftColor: typeInfo?.color, borderLeftWidth: "4px" }}
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{typeInfo?.icon}</span>
                          <h3 className="font-medium text-text-primary">{event.title}</h3>
                          {!upcoming && (
                            <span className="px-2 py-0.5 bg-bg-tertiary text-text-muted text-xs rounded">Past</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-text-muted">
                          <span>📅 {formatEventDate(event.start_date, event.end_date || undefined, event.is_all_day)}</span>
                          {event.server && <span>🌍 {event.server}</span>}
                          {event.attendee_count !== undefined && event.attendee_count > 0 && (
                            <span>👥 {event.attendee_count}</span>
                          )}
                        </div>
                      </div>

                      {user && upcoming && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {ATTENDANCE_OPTIONS.slice(0, 2).map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => handleAttend(event.id, opt.value)}
                              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                event.user_status === opt.value
                                  ? "bg-accent text-white"
                                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="bg-bg-secondary rounded-lg border border-border p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {EVENT_TYPES.find((t) => t.value === selectedEvent.event_type)?.icon}
                  </span>
                  <h2 className="text-2xl font-bold text-text-primary">{selectedEvent.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedEvent.description && (
                <p className="text-text-secondary mb-4">{selectedEvent.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm text-text-muted">When</div>
                  <div className="text-text-primary">
                    {formatEventDate(selectedEvent.start_date, selectedEvent.end_date || undefined, selectedEvent.is_all_day)}
                  </div>
                </div>
                {selectedEvent.server && (
                  <div>
                    <div className="text-sm text-text-muted">Server</div>
                    <div className="text-text-primary capitalize">{selectedEvent.server}</div>
                  </div>
                )}
                {selectedEvent.location && (
                  <div>
                    <div className="text-sm text-text-muted">Location</div>
                    <div className="text-text-primary">{selectedEvent.location}</div>
                  </div>
                )}
                {selectedEvent.coordinates && (
                  <div>
                    <div className="text-sm text-text-muted">Coordinates</div>
                    <div className="text-text-primary">{selectedEvent.coordinates}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-text-muted">Organized by</div>
                  <div className="text-text-primary">{selectedEvent.username}</div>
                </div>
                {selectedEvent.attendee_count !== undefined && (
                  <div>
                    <div className="text-sm text-text-muted">Attendees</div>
                    <div className="text-text-primary">{selectedEvent.attendee_count} going</div>
                  </div>
                )}
              </div>

              {user && isUpcoming(selectedEvent.start_date) && (
                <div className="mb-4">
                  <div className="text-sm text-text-muted mb-2">Your Status</div>
                  <div className="flex gap-2">
                    {ATTENDANCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleAttend(selectedEvent.id, opt.value)}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                          selectedEvent.user_status === opt.value
                            ? "bg-accent text-white"
                            : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvent.external_link && (
                <a
                  href={selectedEvent.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors mb-4"
                >
                  Visit Event Page →
                </a>
              )}

              {user && (user.id === selectedEvent.user_id || user.role === "admin") && (
                <div className="pt-4 border-t border-border">
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                    className="px-4 py-2 bg-danger/20 text-danger rounded-lg hover:bg-danger/30 transition-colors"
                  >
                    Delete Event
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Not logged in message */}
        {!user && (
          <div className="mt-8 bg-bg-secondary rounded-lg border border-border p-6 text-center">
            <p className="text-text-secondary mb-4">
              Log in to create events and RSVP to community gatherings.
            </p>
            <a
              href="/login"
              className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              Log In
            </a>
          </div>
        )}

        {/* ============================================ */}
        {/* Feature Sections - Events Theme */}
        {/* ============================================ */}

        {/* Section 1: Event Types */}
        <div className="mt-20 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-fuchsia-100 mb-4">
              Never Miss a Wurm Event
            </h2>
            <p className="text-stone-400 max-w-2xl mx-auto">
              From massive Impalongs to intense Unique hunts, Wurm Online has events for every playstyle.
              Track them all in one place and join the fun!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Type 1: Impalong */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-yellow-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50"></div>
              <div className="relative bg-stone-800/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300 h-full">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/25">
                  <span className="text-2xl">🔨</span>
                </div>
                <h3 className="text-lg font-semibold text-amber-100 mb-2">Impalongs</h3>
                <p className="text-stone-400 text-sm">
                  Community improvement events where skilled crafters help improve your gear.
                  Bring items to get them imped to high quality!
                </p>
              </div>
            </div>

            {/* Type 2: Rifts */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50"></div>
              <div className="relative bg-stone-800/80 backdrop-blur-sm rounded-2xl p-6 border border-violet-500/20 hover:border-violet-500/40 transition-all duration-300 h-full">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-violet-500/25">
                  <span className="text-2xl">🌀</span>
                </div>
                <h3 className="text-lg font-semibold text-violet-100 mb-2">Rifts</h3>
                <p className="text-stone-400 text-sm">
                  Fight waves of enemies from other dimensions! Earn points for unique rewards
                  including shoulder pads and rift materials.
                </p>
              </div>
            </div>

            {/* Type 3: Uniques */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50"></div>
              <div className="relative bg-stone-800/80 backdrop-blur-sm rounded-2xl p-6 border border-red-500/20 hover:border-red-500/40 transition-all duration-300 h-full">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-red-500/25">
                  <span className="text-2xl">🐉</span>
                </div>
                <h3 className="text-lg font-semibold text-red-100 mb-2">Unique Hunts</h3>
                <p className="text-stone-400 text-sm">
                  Epic battles against dragons, forest giants, and other unique creatures.
                  Participants share in valuable loot like drake hide and scale!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Community Tips */}
        <div className="mb-16">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-900/30 via-pink-900/20 to-fuchsia-900/30 rounded-3xl"></div>
            <div className="relative bg-stone-800/40 backdrop-blur-sm rounded-3xl p-8 border border-fuchsia-500/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-fuchsia-500/20 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-fuchsia-100">Event Participation Tips</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-pink-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-fuchsia-200 font-medium">Arrive Early</h4>
                      <p className="text-stone-400 text-sm">Popular events fill up fast! Get there early to secure a spot, especially for Impalongs.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-pink-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-fuchsia-200 font-medium">Check Time Zones</h4>
                      <p className="text-stone-400 text-sm">Wurm has players worldwide. Double-check event times match your local timezone.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-pink-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-fuchsia-200 font-medium">Bring Supplies</h4>
                      <p className="text-stone-400 text-sm">For combat events, bring food, bandages, and backup gear. For Impalongs, label your items!</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-fuchsia-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-fuchsia-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-fuchsia-200 font-medium">Join Discord</h4>
                      <p className="text-stone-400 text-sm">Many events coordinate through Discord. Join the server&apos;s community for real-time updates.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-fuchsia-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-fuchsia-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-fuchsia-200 font-medium">RSVP Helps Organizers</h4>
                      <p className="text-stone-400 text-sm">Mark your attendance so hosts can prepare enough space and resources for everyone.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-fuchsia-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-fuchsia-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-fuchsia-200 font-medium">Host Your Own!</h4>
                      <p className="text-stone-400 text-sm">Have a skill to share? Consider hosting your own event - the community loves new organizers!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Related Tools */}
        <div className="mb-16">
          <h3 className="text-xl font-bold text-fuchsia-100 mb-6 text-center">Explore More Tools</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/map" className="group">
              <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-700 hover:border-fuchsia-500/50 transition-all duration-300 hover:bg-stone-800/70">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-stone-200 group-hover:text-green-300 transition-colors">Interactive Map</h4>
                </div>
                <p className="text-sm text-stone-400">Find event locations and navigate to them on the interactive map.</p>
              </div>
            </Link>

            <Link href="/merchants" className="group">
              <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-700 hover:border-fuchsia-500/50 transition-all duration-300 hover:bg-stone-800/70">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-stone-200 group-hover:text-blue-300 transition-colors">Merchant Finder</h4>
                </div>
                <p className="text-sm text-stone-400">Shop for gear and supplies before heading to your next event.</p>
              </div>
            </Link>

            <Link href="/trades" className="group">
              <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-700 hover:border-fuchsia-500/50 transition-all duration-300 hover:bg-stone-800/70">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-pink-500/20 rounded-lg group-hover:bg-pink-500/30 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-stone-200 group-hover:text-pink-300 transition-colors">Trade History</h4>
                </div>
                <p className="text-sm text-stone-400">Check trader ratings before buying from event vendors.</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Section 4: Call to Action */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600/20 via-pink-500/20 to-purple-600/20"></div>
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
            <div className="relative px-8 py-12 text-center">
              <h3 className="text-2xl font-bold text-fuchsia-100 mb-4">
                Ready to Join the Fun?
              </h3>
              <p className="text-stone-300 mb-6 max-w-xl mx-auto">
                {user
                  ? "Create your own event or RSVP to upcoming gatherings. The Wurm community is waiting!"
                  : "Sign in to create events, RSVP to gatherings, and never miss a community happening."
                }
              </p>
              {user ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-400 hover:to-pink-400 text-white font-semibold rounded-xl shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 transition-all duration-300 hover:scale-105"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Create an Event
                </button>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-400 hover:to-pink-400 text-white font-semibold rounded-xl shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 transition-all duration-300 hover:scale-105"
                >
                  Sign In to Get Started
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
