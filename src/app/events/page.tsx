"use client";

import { useState, useEffect } from "react";
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
      </div>
    </div>
  );
}
