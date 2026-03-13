"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_booked: boolean;
  google_calendar_event_id: string | null;
}

interface Booking {
  id: string;
  slot_id: string;
  inquiry_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  company_name: string | null;
  notes: string | null;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  google_calendar_event_id: string | null;
  confirmation_email_sent: boolean;
  reminder_email_sent: boolean;
  created_at: string;
  // Joined slot data
  availability_slots?: Slot;
}

interface Setting {
  key: string;
  value: string;
}

type TabView = "kalender" | "boekingen" | "beschikbaarheid" | "instellingen";

const dagNamen = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
const dagNamenKort = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

export default function AgendaTab() {
  const [view, setView] = useState<TabView>("kalender");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookingFilter, setBookingFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token
      ? { "Authorization": `Bearer ${session.access_token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = session?.access_token
      ? { "Authorization": `Bearer ${session.access_token}` }
      : {};

    const [slotsRes, bookingsRes, settingsRes] = await Promise.all([
      fetch("/api/admin/data?table=availability_slots", { headers }).then((r) => r.json()),
      fetch("/api/admin/data?table=bookings", { headers }).then((r) => r.json()),
      fetch("/api/admin/data?table=admin_settings", { headers }).then((r) => r.json()),
    ]);

    if (slotsRes.data) setSlots(slotsRes.data);
    if (bookingsRes.data) setBookings(bookingsRes.data);
    if (settingsRes.data) setSettings(settingsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const getSetting = (key: string, fallback: string = ""): string => {
    return settings.find((s) => s.key === key)?.value || fallback;
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/calendar/sync", { headers });
      await fetchData();
    } finally {
      setSyncing(false);
    }
  };

  const updateBookingStatus = async (id: string, status: string) => {
    await fetch("/api/admin/data", {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ action: "update", table: "bookings", id, data: { status } }),
    });
    fetchData();
  };

  const toggleSlotAvailability = async (slotId: string, isAvailable: boolean) => {
    await fetch("/api/admin/data", {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        action: "update",
        table: "availability_slots",
        id: slotId,
        data: { is_available: !isAvailable },
      }),
    });
    fetchData();
  };

  const updateSetting = async (key: string, value: string) => {
    const existing = settings.find((s) => s.key === key);
    if (existing) {
      await fetch("/api/admin/data", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: "update", table: "admin_settings", id: existing.key, data: { value } }),
      });
    }
    // Update locally
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s)),
    );
  };

  // Week berekening
  const getWeekDays = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    const currentDay = today.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    startOfWeek.setDate(today.getDate() + diff + weekOffset * 7);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  };

  const weekDays = getWeekDays();

  const getSlotsForDate = (dateStr: string) => {
    return slots
      .filter((s) => s.date === dateStr)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const getBookingForSlot = (slotId: string): Booking | undefined => {
    return bookings.find((b) => b.slot_id === slotId && b.status !== "cancelled");
  };

  const statusKleur = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-700";
      case "completed": return "bg-blue-100 text-blue-700";
      case "cancelled": return "bg-red-100 text-red-600";
      case "no_show": return "bg-yellow-100 text-yellow-700";
      default: return "bg-neutral-100 text-neutral-600";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "confirmed": return "Bevestigd";
      case "completed": return "Voltooid";
      case "cancelled": return "Geannuleerd";
      case "no_show": return "No-show";
      default: return status;
    }
  };

  const slotKleur = (slot: Slot) => {
    if (slot.is_booked) return "bg-[#F27501] text-white";
    if (!slot.is_available && slot.google_calendar_event_id) return "bg-purple-100 text-purple-700";
    if (!slot.is_available) return "bg-neutral-200 text-neutral-500";
    return "bg-green-50 text-green-700 border border-green-200";
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-neutral-200 rounded" />
        <div className="h-64 bg-neutral-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Agenda</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors text-sm disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? "Syncing..." : "Sync"}
          </button>
          <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
            {(["kalender", "boekingen", "beschikbaarheid", "instellingen"] as TabView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  view === v ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {v === "kalender" ? "Kalender" : v === "boekingen" ? "Boekingen" : v === "beschikbaarheid" ? "Slots" : "Instellingen"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ============ KALENDER VIEW ============ */}
      {view === "kalender" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setWeekOffset((p) => p - 1)}
              className="px-3 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <p className="font-semibold text-neutral-900">
                {weekDays[0].toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                {" — "}
                {weekDays[6].toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              {weekOffset !== 0 && (
                <button onClick={() => setWeekOffset(0)} className="text-sm text-[#F27501] hover:underline">
                  Vandaag
                </button>
              )}
            </div>
            <button
              onClick={() => setWeekOffset((p) => p + 1)}
              className="px-3 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Legenda */}
          <div className="flex gap-4 mb-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-50 border border-green-200 rounded" /> Beschikbaar</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#F27501] rounded" /> Geboekt</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-100 rounded" /> Google Cal</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-neutral-200 rounded" /> Geblokkeerd</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dateStr = day.toISOString().split("T")[0];
              const daySlots = getSlotsForDate(dateStr);
              const isToday = dateStr === new Date().toISOString().split("T")[0];

              return (
                <div
                  key={dateStr}
                  className={`rounded-xl border p-3 min-h-[160px] ${
                    isToday ? "border-[#F27501] bg-[#FEF3E7]/30" : "border-neutral-200 bg-white"
                  }`}
                >
                  <div className="text-center mb-2">
                    <p className="text-xs text-neutral-500">{dagNamenKort[day.getDay()]}</p>
                    <p className={`text-lg font-bold ${isToday ? "text-[#F27501]" : "text-neutral-900"}`}>
                      {day.getDate()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {daySlots.map((slot) => {
                      const booking = getBookingForSlot(slot.id);
                      return (
                        <button
                          key={slot.id}
                          onClick={() => {
                            if (booking) {
                              setSelectedBooking(booking);
                            } else if (!slot.google_calendar_event_id || slot.google_calendar_event_id !== "google_blocked") {
                              toggleSlotAvailability(slot.id, slot.is_available);
                            }
                          }}
                          className={`w-full text-xs p-1.5 rounded-lg ${slotKleur(slot)} text-left transition-opacity hover:opacity-80`}
                          title={booking ? `${booking.client_name}` : slot.is_available ? "Klik om te blokkeren" : "Klik om vrij te geven"}
                        >
                          <p className="font-medium">{slot.start_time.slice(0, 5)}</p>
                          {booking && <p className="truncate">{booking.client_name}</p>}
                        </button>
                      );
                    })}
                    {daySlots.length === 0 && (
                      <p className="text-xs text-neutral-400 text-center py-2">—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ BOEKINGEN VIEW ============ */}
      {view === "boekingen" && (
        <div>
          <div className="flex gap-2 mb-4">
            {["all", "confirmed", "completed", "cancelled", "no_show"].map((f) => (
              <button
                key={f}
                onClick={() => setBookingFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  bookingFilter === f ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {f === "all" ? "Alles" : statusLabel(f)}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Klant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Bedrijf</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Datum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Tijd</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {bookings
                  .filter((b) => bookingFilter === "all" || b.status === bookingFilter)
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .map((b) => {
                    const slot = slots.find((s) => s.id === b.slot_id);
                    return (
                      <tr key={b.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-neutral-900">{b.client_name}</p>
                          <p className="text-sm text-neutral-500">{b.client_email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700">
                          {b.company_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700">
                          {slot ? new Date(slot.date).toLocaleDateString("nl-NL", {
                            weekday: "short", day: "numeric", month: "short",
                          }) : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                          {slot ? `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusKleur(b.status)}`}>
                            {statusLabel(b.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {b.status === "confirmed" && (
                              <>
                                <button
                                  onClick={() => updateBookingStatus(b.id, "completed")}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                >
                                  Voltooid
                                </button>
                                <button
                                  onClick={() => updateBookingStatus(b.id, "no_show")}
                                  className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                                >
                                  No-show
                                </button>
                                <button
                                  onClick={() => updateBookingStatus(b.id, "cancelled")}
                                  className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                >
                                  Annuleer
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {bookings.filter((b) => bookingFilter === "all" || b.status === bookingFilter).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                      Geen boekingen gevonden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ BESCHIKBAARHEID VIEW ============ */}
      {view === "beschikbaarheid" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-neutral-500">
              Klik op een slot om het te blokkeren of vrij te geven. Gebruik de Sync-knop om Google Calendar te synchroniseren.
            </p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] transition-colors text-sm font-medium disabled:opacity-50"
            >
              {syncing ? "Slots genereren..." : "Slots genereren & sync"}
            </button>
          </div>

          {/* Toon slots per dag voor de komende 2 weken */}
          <div className="space-y-4">
            {Array.from({ length: 14 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() + i + 1);
              const dateStr = date.toISOString().split("T")[0];
              const daySlots = getSlotsForDate(dateStr);
              if (daySlots.length === 0) return null;

              return (
                <div key={dateStr} className="bg-white rounded-xl border border-neutral-200 p-4">
                  <h3 className="font-semibold text-neutral-900 mb-3">
                    {dagNamen[date.getDay()]} {date.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {daySlots.map((slot) => {
                      const booking = getBookingForSlot(slot.id);
                      const isGoogle = slot.google_calendar_event_id === "google_blocked";
                      return (
                        <button
                          key={slot.id}
                          onClick={() => {
                            if (!booking && !isGoogle) toggleSlotAvailability(slot.id, slot.is_available);
                          }}
                          disabled={!!booking || isGoogle}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${slotKleur(slot)} ${
                            booking || isGoogle ? "cursor-not-allowed" : "cursor-pointer hover:opacity-80"
                          }`}
                          title={
                            booking ? `Geboekt: ${booking.client_name}` :
                            isGoogle ? "Geblokkeerd door Google Calendar" :
                            slot.is_available ? "Klik om te blokkeren" : "Klik om vrij te geven"
                          }
                        >
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                          {booking && ` (${booking.client_name})`}
                          {isGoogle && " (Google)"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </div>
      )}

      {/* ============ INSTELLINGEN VIEW ============ */}
      {view === "instellingen" && (
        <div className="max-w-2xl space-y-6">
          {/* E-mail instellingen */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">E-mail instellingen</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Afzender e-mailadres</label>
                <input
                  type="email"
                  value={getSetting("sender_email", "info@toptalentjobs.nl")}
                  onChange={(e) => updateSetting("sender_email", e.target.value)}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Afzender naam</label>
                <input
                  type="text"
                  value={getSetting("sender_name", "TopTalent Jobs")}
                  onChange={(e) => updateSetting("sender_name", e.target.value)}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-900">Auto-reply</p>
                  <p className="text-sm text-neutral-500">Automatisch reactie versturen bij nieuwe aanvraag</p>
                </div>
                <button
                  onClick={() => updateSetting("auto_reply_enabled", getSetting("auto_reply_enabled") === "true" ? "false" : "true")}
                  className={`w-12 h-7 rounded-full relative transition-colors ${
                    getSetting("auto_reply_enabled") === "true" ? "bg-[#F27501]" : "bg-neutral-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      getSetting("auto_reply_enabled") === "true" ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Booking instellingen */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">Booking instellingen</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Slot duur</label>
                  <select
                    value={getSetting("slot_duration_minutes", "30")}
                    onChange={(e) => updateSetting("slot_duration_minutes", e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none"
                  >
                    <option value="15">15 minuten</option>
                    <option value="30">30 minuten</option>
                    <option value="45">45 minuten</option>
                    <option value="60">60 minuten</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Vooruit boeken</label>
                  <select
                    value={getSetting("booking_horizon_days", "14")}
                    onChange={(e) => updateSetting("booking_horizon_days", e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none"
                  >
                    <option value="7">7 dagen</option>
                    <option value="14">14 dagen</option>
                    <option value="21">21 dagen</option>
                    <option value="30">30 dagen</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Start tijd</label>
                  <input
                    type="time"
                    value={getSetting("default_start_time", "09:00")}
                    onChange={(e) => updateSetting("default_start_time", e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Eind tijd</label>
                  <input
                    type="time"
                    value={getSetting("default_end_time", "17:00")}
                    onChange={(e) => updateSetting("default_end_time", e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Werkdagen</label>
                <div className="flex gap-2">
                  {[
                    { day: 1, label: "Ma" },
                    { day: 2, label: "Di" },
                    { day: 3, label: "Wo" },
                    { day: 4, label: "Do" },
                    { day: 5, label: "Vr" },
                    { day: 6, label: "Za" },
                    { day: 0, label: "Zo" },
                  ].map(({ day, label }) => {
                    const workingDays = getSetting("working_days", "1,2,3,4,5").split(",").map(Number);
                    const isActive = workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          const newDays = isActive
                            ? workingDays.filter((d) => d !== day)
                            : [...workingDays, day].sort();
                          updateSetting("working_days", newDays.join(","));
                        }}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          isActive ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Booking pagina introductie tekst</label>
                <textarea
                  value={getSetting("booking_page_intro_text")}
                  onChange={(e) => updateSetting("booking_page_intro_text", e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Google Calendar */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">Google Calendar</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${getSetting("google_calendar_last_sync") ? "text-green-600" : "text-neutral-500"}`}>
                  {getSetting("google_calendar_last_sync")
                    ? `Laatst gesynchroniseerd: ${new Date(getSetting("google_calendar_last_sync")).toLocaleString("nl-NL")}`
                    : "Niet geconfigureerd — stel GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET en GOOGLE_REFRESH_TOKEN in als environment variables"
                  }
                </p>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] transition-colors text-sm font-medium disabled:opacity-50"
              >
                {syncing ? "Syncing..." : "Nu synchroniseren"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking detail modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedBooking(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-900">Boeking details</h3>
            </div>
            <div className="p-6 space-y-3">
              <div><span className="text-sm text-neutral-500">Klant:</span> <span className="font-medium">{selectedBooking.client_name}</span></div>
              <div><span className="text-sm text-neutral-500">Email:</span> <span>{selectedBooking.client_email}</span></div>
              {selectedBooking.client_phone && <div><span className="text-sm text-neutral-500">Telefoon:</span> <span>{selectedBooking.client_phone}</span></div>}
              {selectedBooking.company_name && <div><span className="text-sm text-neutral-500">Bedrijf:</span> <span>{selectedBooking.company_name}</span></div>}
              {selectedBooking.notes && <div><span className="text-sm text-neutral-500">Notities:</span> <p className="mt-1 text-sm bg-neutral-50 p-3 rounded-lg">{selectedBooking.notes}</p></div>}
              <div><span className="text-sm text-neutral-500">Status:</span> <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${statusKleur(selectedBooking.status)}`}>{statusLabel(selectedBooking.status)}</span></div>
              {selectedBooking.inquiry_id && (
                <div>
                  <span className="text-sm text-neutral-500">Gekoppelde aanvraag:</span>
                  <button
                    onClick={() => { setSelectedBooking(null); }}
                    className="ml-2 text-sm text-[#F27501] hover:underline"
                  >
                    Bekijk aanvraag
                  </button>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-neutral-100 flex gap-2 justify-end">
              {selectedBooking.status === "confirmed" && (
                <>
                  <button onClick={() => { updateBookingStatus(selectedBooking.id, "completed"); setSelectedBooking(null); }} className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 text-sm font-medium">Voltooid</button>
                  <button onClick={() => { updateBookingStatus(selectedBooking.id, "cancelled"); setSelectedBooking(null); }} className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium">Annuleer</button>
                </>
              )}
              <button onClick={() => setSelectedBooking(null)} className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 text-sm font-medium">Sluiten</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
