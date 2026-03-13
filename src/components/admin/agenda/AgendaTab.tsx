"use client";

import { useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAgendaStore } from "@/stores/useAgendaStore";
import { dagNamen } from "./calendarReducer";
import type { Booking, EventType, Schedule } from "./calendarReducer";
import { getSetting, getSlotsForDate, getStats, statusKleur, statusLabel, getEventTypeName, getEventTypeColor } from "./agendaUtils";
import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import BookingModal from "./BookingModal";
import BookingDetailModal from "./BookingDetailModal";
import OverrideModal from "./OverrideModal";
import EventTypeModal from "./EventTypeModal";
import InternalNotesModal from "./InternalNotesModal";
import { getMonthData } from "./agendaUtils";

export default function AgendaTab() {
  const store = useAgendaStore();
  const {
    slots, bookings, settings, eventTypes, schedules, overrides,
    view, calendarView, monthOffset, selectedDate, bookingFilter,
    loading, refreshing, actionPending, actionError, syncing, savingMsg,
    modal,
  } = store;

  // ============================================
  // Auth & Fetch
  // ============================================

  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token
      ? { "Authorization": `Bearer ${session.access_token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }, []);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) store.setLoading(true);
    else store.setRefreshing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = session?.access_token
        ? { "Authorization": `Bearer ${session.access_token}` }
        : {};

      const [slotsRes, bookingsRes, settingsRes, etRes, schedRes, overRes] = await Promise.all([
        fetch("/api/admin/data?table=availability_slots", { headers }).then((r) => r.json()),
        fetch("/api/admin/data?table=bookings", { headers }).then((r) => r.json()),
        fetch("/api/admin/data?table=admin_settings", { headers }).then((r) => r.json()),
        fetch("/api/admin/data?table=event_types", { headers }).then((r) => r.json()),
        fetch("/api/admin/data?table=availability_schedules", { headers }).then((r) => r.json()),
        fetch("/api/admin/data?table=availability_overrides", { headers }).then((r) => r.json()),
      ]);

      store.setData({
        slots: slotsRes.data || [],
        bookings: bookingsRes.data || [],
        settings: settingsRes.data || [],
        eventTypes: etRes.data || [],
        schedules: schedRes.data || [],
        overrides: overRes.data || [],
      });
    } catch {
      store.setActionError("Kon data niet ophalen");
    }
  }, [store]);

  useEffect(() => {
    void fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // Admin API helper
  // ============================================

  const adminFetch = async (body: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/admin/data", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        console.error("Admin data error:", result.error);
        store.setActionError(result.error || "Er ging iets mis bij het opslaan");
        setTimeout(() => store.setActionError(null), 5000);
      }
      return result;
    } catch (err) {
      console.error("Admin fetch network error:", err);
      store.setActionError("Netwerkfout — controleer je verbinding");
      setTimeout(() => store.setActionError(null), 5000);
      return { error: "network_error" };
    }
  };

  // ============================================
  // Action handlers
  // ============================================

  const handleSync = async () => {
    if (syncing) return;
    store.setSyncing(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/calendar/sync", { headers });
      if (!res.ok) {
        store.setActionError("Synchronisatie mislukt");
        setTimeout(() => store.setActionError(null), 5000);
      }
      await fetchData();
    } catch {
      store.setActionError("Netwerkfout bij synchronisatie");
      setTimeout(() => store.setActionError(null), 5000);
    } finally {
      store.setSyncing(false);
    }
  };

  const updateBookingStatus = async (id: string, status: string) => {
    if (actionPending) return;
    store.setActionPending(true);
    try {
      await adminFetch({ action: "update", table: "bookings", id, data: { status, ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}), ...(status === "no_show" ? { no_show: true } : {}) } });
      store.updateBooking(id, { status: status as Booking["status"], ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}), ...(status === "no_show" ? { no_show: true } : {}) });
    } catch {
      store.setActionError("Kon status niet bijwerken");
      setTimeout(() => store.setActionError(null), 5000);
    } finally {
      store.setActionPending(false);
    }
    fetchData();
  };

  const toggleSlotAvailability = async (slotId: string, isAvailable: boolean) => {
    if (actionPending) return;
    store.setActionPending(true);
    store.updateSlot(slotId, { is_available: !isAvailable });
    try {
      await adminFetch({ action: "update", table: "availability_slots", id: slotId, data: { is_available: !isAvailable } });
    } catch {
      store.updateSlot(slotId, { is_available: isAvailable });
      store.setActionError("Kon slot niet bijwerken");
      setTimeout(() => store.setActionError(null), 5000);
    } finally {
      store.setActionPending(false);
    }
    fetchData();
  };

  const toggleDayAvailability = async (dateStr: string, block: boolean) => {
    if (actionPending) return;
    const daySlots = getSlotsForDate(slots, dateStr);
    const toggleableSlots = daySlots.filter((s) => !s.is_booked && s.google_calendar_event_id !== "google_blocked");
    if (toggleableSlots.length === 0) return;
    store.setActionPending(true);
    const ids = toggleableSlots.map((s) => s.id);
    store.updateSlotsBulk(ids, { is_available: !block });
    try {
      await adminFetch({ action: "bulk_update", table: "availability_slots", ids, data: { is_available: !block } });
    } catch {
      store.updateSlotsBulk(ids, { is_available: block });
      store.setActionError("Kon dag niet bijwerken");
      setTimeout(() => store.setActionError(null), 5000);
    } finally {
      store.setActionPending(false);
    }
    fetchData();
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    store.updateSetting(key, value);
    try {
      const existing = settings.find((s) => s.key === key);
      if (existing) {
        await adminFetch({ action: "update", table: "admin_settings", id: existing.id, data: { value } });
      } else {
        await adminFetch({ action: "insert", table: "admin_settings", data: { key, value } });
      }
      store.setSavingMsg("Opgeslagen");
      setTimeout(() => store.setSavingMsg(""), 2000);
    } catch {
      store.setActionError("Kon instelling niet opslaan");
      setTimeout(() => store.setActionError(null), 5000);
    }
    fetchData();
  };

  // ============================================
  // Modal action handlers
  // ============================================

  const openNewBookingModal = (dateStr?: string, slotId?: string) => {
    store.openModal({
      type: "new_booking",
      date: dateStr || "",
      slotId: slotId || "",
      showCustomTime: false,
      name: "",
      email: "",
      phone: "",
      company: "",
      notes: "",
      eventTypeId: eventTypes[0]?.id || "",
      customStart: "",
      customEnd: "",
      saving: false,
      error: "",
    });
  };

  const submitNewBooking = async () => {
    if (modal.type !== "new_booking") return;
    const { slotId, date, customStart, customEnd, name, email, phone, company, notes, eventTypeId } = modal;

    const hasSlot = !!slotId;
    const hasCustomTime = !!date && !!customStart && !!customEnd;

    if (!hasSlot && !hasCustomTime) {
      store.updateModal({ error: "Kies een tijdslot of vul een aangepaste tijd in" });
      return;
    }
    if (!name.trim() || !email.trim()) {
      store.updateModal({ error: "Naam en e-mailadres zijn verplicht" });
      return;
    }

    store.updateModal({ saving: true, error: "" });
    try {
      const body: Record<string, unknown> = {
        event_type_id: eventTypeId || null,
        client_name: name.trim(),
        client_email: email.trim(),
        client_phone: phone.trim() || null,
        company_name: company.trim() || null,
        notes: notes.trim() || null,
        source: "admin",
      };
      if (hasSlot) {
        body.slot_id = slotId;
      } else {
        body.date = date;
        body.start_time = customStart;
        body.end_time = customEnd;
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        store.closeModal();
        await fetchData();
      } else {
        store.updateModal({ error: data.error || "Kon boeking niet aanmaken", saving: false });
      }
    } catch {
      store.updateModal({ error: "Netwerkfout — probeer opnieuw", saving: false });
    }
  };

  const selectBooking = (booking: Booking) => {
    store.openModal({ type: "booking_detail", booking });
  };

  const openOverrideModal = (dateStr: string) => {
    store.openModal({
      type: "override", date: dateStr, reason: "", blocked: true, startTime: "", endTime: "",
    });
  };

  const submitOverride = async () => {
    if (modal.type !== "override" || !modal.date || actionPending) return;
    store.setActionPending(true);
    try {
      await adminFetch({
        action: "insert",
        table: "availability_overrides",
        data: {
          date: modal.date,
          start_time: modal.startTime || null,
          end_time: modal.endTime || null,
          is_blocked: modal.blocked,
          reason: modal.reason || null,
        },
      });
      if (modal.blocked && !modal.startTime) {
        const daySlots = getSlotsForDate(slots, modal.date);
        const ids = daySlots.filter((s) => !s.is_booked).map((s) => s.id);
        if (ids.length > 0) {
          await adminFetch({ action: "bulk_update", table: "availability_slots", ids, data: { is_available: false } });
        }
      }
      store.closeModal();
    } catch {
      store.setActionError("Kon override niet toevoegen");
      setTimeout(() => store.setActionError(null), 5000);
    } finally {
      store.setActionPending(false);
    }
    fetchData();
  };

  const deleteOverride = async (id: string) => {
    if (actionPending) return;
    store.setActionPending(true);
    store.removeOverride(id);
    try {
      await adminFetch({ action: "delete", table: "availability_overrides", id });
    } catch {
      store.setActionError("Kon override niet verwijderen");
      setTimeout(() => store.setActionError(null), 5000);
    } finally {
      store.setActionPending(false);
    }
    fetchData();
  };

  const saveEventType = async (et: Partial<EventType> & { id?: string }) => {
    if (actionPending) return;
    store.setActionPending(true);
    try {
      if (et.id) {
        const { id, ...data } = et;
        await adminFetch({ action: "update", table: "event_types", id, data });
      } else {
        await adminFetch({ action: "insert", table: "event_types", data: et });
      }
      store.closeModal();
    } catch {
      store.setActionError("Kon event type niet opslaan");
      setTimeout(() => store.setActionError(null), 5000);
    } finally {
      store.setActionPending(false);
    }
    fetchData();
  };

  const deleteEventType = async (id: string) => {
    if (actionPending) return;
    store.setActionPending(true);
    store.removeEventType(id);
    try {
      await adminFetch({ action: "delete", table: "event_types", id });
    } catch {
      store.setActionError("Kon event type niet verwijderen");
      setTimeout(() => store.setActionError(null), 5000);
    } finally {
      store.setActionPending(false);
    }
    fetchData();
  };

  const handleUpdateSchedule = async (id: string, data: Partial<Schedule>) => {
    if (actionPending) return;
    store.setActionPending(true);
    store.updateSchedule(id, data);
    try {
      await adminFetch({ action: "update", table: "availability_schedules", id, data });
    } catch {
      store.setActionError("Kon schema niet bijwerken");
      setTimeout(() => store.setActionError(null), 5000);
    } finally {
      store.setActionPending(false);
    }
    fetchData();
  };

  const openEditNotes = (bookingId: string, notes: string) => {
    store.openModal({ type: "internal_notes", bookingId, notes });
  };

  const saveInternalNotes = async () => {
    if (modal.type !== "internal_notes" || actionPending) return;
    store.setActionPending(true);
    try {
      await adminFetch({ action: "update", table: "bookings", id: modal.bookingId, data: { internal_notes: modal.notes } });
      store.updateBooking(modal.bookingId, { internal_notes: modal.notes });
      store.closeModal();
    } catch {
      store.setActionError("Kon notities niet opslaan");
      setTimeout(() => store.setActionError(null), 5000);
    } finally {
      store.setActionPending(false);
    }
    fetchData();
  };

  // ============================================
  // Render
  // ============================================

  const todayStr = new Date().toISOString().split("T")[0];
  const monthData = getMonthData(monthOffset);

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
      <CalendarHeader
        view={view}
        calendarView={calendarView}
        monthName={monthData.monthName}
        monthOffset={monthOffset}
        refreshing={refreshing}
        syncing={syncing}
        savingMsg={savingMsg}
        actionError={actionError}
        onSync={handleSync}
      />

      {/* ============ KALENDER VIEW ============ */}
      {view === "kalender" && (
        <CalendarGrid
          calendarView={calendarView}
          monthOffset={monthOffset}
          selectedDate={selectedDate}
          slots={slots}
          bookings={bookings}
          eventTypes={eventTypes}
          overrides={overrides}
          actionPending={actionPending}
          onToggleSlot={toggleSlotAvailability}
          onToggleDay={toggleDayAvailability}
          onOpenBookingModal={openNewBookingModal}
          onOpenOverrideModal={openOverrideModal}
          onSelectBooking={selectBooking}
        />
      )}

      {/* ============ BOEKINGEN VIEW ============ */}
      {view === "boekingen" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2 flex-wrap">
              {["all", "confirmed", "completed", "cancelled", "no_show"].map((f) => (
                <button key={f} onClick={() => store.setBookingFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${bookingFilter === f ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
                  {f === "all" ? `Alles (${bookings.length})` : `${statusLabel(f)} (${bookings.filter((b) => b.status === f).length})`}
                </button>
              ))}
            </div>
            <button onClick={() => openNewBookingModal()} className="flex items-center gap-2 px-4 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] transition-colors text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nieuwe boeking
            </button>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Klant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Datum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Tijd</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Bron</th>
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
                      <tr key={b.id} className="hover:bg-neutral-50 cursor-pointer" onClick={() => selectBooking(b)}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-neutral-900">{b.client_name}</p>
                          <p className="text-sm text-neutral-500">{b.client_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          {b.event_type_id ? (
                            <span className="text-xs px-2 py-1 rounded-full text-white" style={{ backgroundColor: getEventTypeColor(eventTypes, b.event_type_id) }}>
                              {getEventTypeName(eventTypes, b.event_type_id)}
                            </span>
                          ) : <span className="text-neutral-400">&mdash;</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700">
                          {slot ? new Date(slot.date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }) : "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                          {slot ? `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}` : "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-500">{b.source || "website"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusKleur(b.status)}`}>{statusLabel(b.status)}</span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            {b.status === "confirmed" && (
                              <>
                                <button onClick={() => updateBookingStatus(b.id, "completed")} disabled={actionPending} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">Voltooid</button>
                                <button onClick={() => updateBookingStatus(b.id, "no_show")} disabled={actionPending} className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed">No-show</button>
                                <button onClick={() => updateBookingStatus(b.id, "cancelled")} disabled={actionPending} className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed">Annuleer</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {bookings.filter((b) => bookingFilter === "all" || b.status === bookingFilter).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">Geen boekingen gevonden</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ EVENT TYPES VIEW ============ */}
      {view === "event_types" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-neutral-500">Beheer de verschillende typen afspraken die klanten kunnen boeken.</p>
            <button
              onClick={() => {
                store.openModal({
                  type: "event_type",
                  eventType: { id: "", name: "", slug: "", description: "", duration_minutes: 60, buffer_before_minutes: 0, buffer_after_minutes: 15, color: "#F27501", is_active: true, max_bookings_per_day: null, requires_approval: false, sort_order: eventTypes.length } as EventType,
                  isNew: true,
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nieuw type
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventTypes.sort((a, b) => a.sort_order - b.sort_order).map((et) => (
              <div key={et.id} className="bg-white rounded-xl border border-neutral-200 p-5 relative">
                <div className="absolute top-4 right-4 w-4 h-4 rounded-full" style={{ backgroundColor: et.color }} />
                <h3 className="font-semibold text-neutral-900 mb-1">{et.name}</h3>
                <p className="text-sm text-neutral-500 mb-3 line-clamp-2">{et.description || "Geen beschrijving"}</p>
                <div className="flex flex-wrap gap-2 mb-3 text-xs">
                  <span className="px-2 py-1 bg-neutral-100 rounded-lg">{et.duration_minutes} min</span>
                  {et.buffer_after_minutes > 0 && <span className="px-2 py-1 bg-neutral-100 rounded-lg">{et.buffer_after_minutes}m buffer</span>}
                  <span className={`px-2 py-1 rounded-lg ${et.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {et.is_active ? "Actief" : "Inactief"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => store.openModal({ type: "event_type", eventType: et, isNew: false })}
                    className="px-3 py-1.5 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
                  >
                    Bewerken
                  </button>
                  <button
                    onClick={() => saveEventType({ id: et.id, is_active: !et.is_active })}
                    className="px-3 py-1.5 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
                  >
                    {et.is_active ? "Deactiveer" : "Activeer"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ BESCHIKBAARHEID/SCHEMA VIEW ============ */}
      {view === "beschikbaarheid" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">Wekelijks schema</h3>
            <p className="text-sm text-neutral-500 mb-4">Stel je standaard werkuren per dag in.</p>
            <div className="space-y-3">
              {[
                { day: 1, label: "Maandag" },
                { day: 2, label: "Dinsdag" },
                { day: 3, label: "Woensdag" },
                { day: 4, label: "Donderdag" },
                { day: 5, label: "Vrijdag" },
                { day: 6, label: "Zaterdag" },
                { day: 0, label: "Zondag" },
              ].map(({ day, label }) => {
                const schedule = schedules.find((s) => s.day_of_week === day);
                return (
                  <div key={day} className="flex items-center gap-4 p-3 rounded-xl bg-neutral-50">
                    <button
                      onClick={() => {
                        if (actionPending) return;
                        if (schedule) {
                          handleUpdateSchedule(schedule.id, { is_active: !schedule.is_active });
                        } else {
                          store.setActionPending(true);
                          adminFetch({ action: "insert", table: "availability_schedules", data: { day_of_week: day, start_time: "09:00", end_time: "17:00", is_active: true } }).then(() => fetchData()).finally(() => store.setActionPending(false));
                        }
                      }}
                      disabled={actionPending}
                      className={`w-12 h-7 rounded-full relative transition-colors disabled:opacity-50 ${schedule?.is_active ? "bg-[#F27501]" : "bg-neutral-300"}`}
                    >
                      <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${schedule?.is_active ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                    <span className="w-24 font-medium text-neutral-900">{label}</span>
                    {schedule?.is_active ? (
                      <div className="flex items-center gap-2">
                        <input type="time" value={schedule.start_time?.slice(0, 5) || "09:00"} onChange={(e) => handleUpdateSchedule(schedule.id, { start_time: e.target.value })} className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm" />
                        <span className="text-neutral-400">tot</span>
                        <input type="time" value={schedule.end_time?.slice(0, 5) || "17:00"} onChange={(e) => handleUpdateSchedule(schedule.id, { end_time: e.target.value })} className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm" />
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-400">Gesloten</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-neutral-900">Datum overrides</h3>
                <p className="text-sm text-neutral-500">Blokkeer specifieke datums (vakantie, feestdagen) of voeg extra beschikbaarheid toe.</p>
              </div>
              <button
                onClick={() => openOverrideModal("")}
                className="flex items-center gap-2 px-4 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Override toevoegen
              </button>
            </div>

            {overrides.length > 0 ? (
              <div className="space-y-2">
                {overrides
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((o) => (
                    <div key={o.id} className={`flex items-center justify-between p-3 rounded-xl ${o.is_blocked ? "bg-red-50" : "bg-green-50"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${o.is_blocked ? "bg-red-400" : "bg-green-400"}`} />
                        <span className="font-medium text-neutral-900">
                          {new Date(o.date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                        </span>
                        {o.start_time && o.end_time && (
                          <span className="text-sm text-neutral-500">{o.start_time.slice(0, 5)} - {o.end_time.slice(0, 5)}</span>
                        )}
                        {!o.start_time && <span className="text-sm text-neutral-500">Hele dag</span>}
                        {o.reason && <span className="text-sm text-neutral-500">— {o.reason}</span>}
                      </div>
                      <button onClick={() => deleteOverride(o.id)} className="text-red-500 hover:text-red-700 p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-neutral-400 text-sm py-4 text-center">Geen overrides ingesteld</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-neutral-900">Slots genereren & synchroniseren</h3>
                <p className="text-sm text-neutral-500">Genereer beschikbaarheidsslots op basis van je schema en synchroniseer met Google Calendar.</p>
              </div>
              <button onClick={handleSync} disabled={syncing} className="px-4 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] transition-colors text-sm font-medium disabled:opacity-50">
                {syncing ? "Bezig..." : "Genereer & sync"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ STATISTIEKEN VIEW ============ */}
      {view === "statistieken" && (() => {
        const stats = getStats(bookings, slots);
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Totaal boekingen", value: stats.total, color: "text-neutral-900" },
                { label: "Bevestigd", value: stats.confirmed, color: "text-green-600" },
                { label: "Voltooid", value: stats.completed, color: "text-blue-600" },
                { label: "No-show rate", value: `${stats.noShowRate}%`, color: stats.noShowRate > 10 ? "text-red-600" : "text-green-600" },
              ].map((kpi, i) => (
                <div key={i} className="bg-white rounded-xl border border-neutral-200 p-5">
                  <p className="text-sm text-neutral-500 mb-1">{kpi.label}</p>
                  <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Maandoverzicht</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-neutral-500">Deze maand</p>
                  <p className="text-3xl font-bold text-[#F27501]">{stats.thisMonth}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Vorige maand</p>
                  <p className="text-3xl font-bold text-neutral-400">{stats.lastMonth}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <h3 className="font-semibold text-neutral-900 mb-4">Populairste tijden</h3>
                <div className="space-y-2">
                  {stats.popularTimes.map(([time, count]) => (
                    <div key={time} className="flex items-center justify-between">
                      <span className="font-medium">{time}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-neutral-100 rounded-full h-2">
                          <div className="bg-[#F27501] h-2 rounded-full" style={{ width: `${(count / Math.max(...stats.popularTimes.map(([,c]) => c))) * 100}%` }} />
                        </div>
                        <span className="text-sm text-neutral-500 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                  {stats.popularTimes.length === 0 && <p className="text-neutral-400 text-sm">Nog geen data</p>}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <h3 className="font-semibold text-neutral-900 mb-4">Populairste dagen</h3>
                <div className="space-y-2">
                  {stats.popularDays.map(([day, count]) => (
                    <div key={day} className="flex items-center justify-between">
                      <span className="font-medium">{day}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-neutral-100 rounded-full h-2">
                          <div className="bg-[#F27501] h-2 rounded-full" style={{ width: `${(count / Math.max(...stats.popularDays.map(([,c]) => c))) * 100}%` }} />
                        </div>
                        <span className="text-sm text-neutral-500 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                  {stats.popularDays.length === 0 && <p className="text-neutral-400 text-sm">Nog geen data</p>}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Status verdeling</h3>
              <div className="flex gap-4">
                {[
                  { label: "Bevestigd", count: stats.confirmed, color: "bg-green-400" },
                  { label: "Voltooid", count: stats.completed, color: "bg-blue-400" },
                  { label: "Geannuleerd", count: stats.cancelled, color: "bg-red-400" },
                  { label: "No-show", count: stats.noShow, color: "bg-yellow-400" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${s.color}`} />
                    <span className="text-sm">{s.label}: <strong>{s.count}</strong></span>
                  </div>
                ))}
              </div>
              {stats.total > 0 && (
                <div className="mt-3 flex h-4 rounded-full overflow-hidden">
                  {[
                    { count: stats.confirmed, color: "bg-green-400" },
                    { count: stats.completed, color: "bg-blue-400" },
                    { count: stats.cancelled, color: "bg-red-400" },
                    { count: stats.noShow, color: "bg-yellow-400" },
                  ].map((s, i) => (
                    s.count > 0 ? <div key={i} className={`${s.color}`} style={{ width: `${(s.count / stats.total) * 100}%` }} /> : null
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ============ INSTELLINGEN VIEW ============ */}
      {view === "instellingen" && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">E-mail instellingen</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Afzender e-mailadres</label>
                <input type="email" value={getSetting(settings, "sender_email", "info@toptalentjobs.nl")} onBlur={(e) => handleUpdateSetting("sender_email", e.target.value)} onChange={(e) => store.updateSetting("sender_email", e.target.value)} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Afzender naam</label>
                <input type="text" value={getSetting(settings, "sender_name", "TopTalent Jobs")} onBlur={(e) => handleUpdateSetting("sender_name", e.target.value)} onChange={(e) => store.updateSetting("sender_name", e.target.value)} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-900">Auto-reply</p>
                  <p className="text-sm text-neutral-500">Automatisch reactie versturen bij nieuwe aanvraag</p>
                </div>
                <button
                  onClick={() => handleUpdateSetting("auto_reply_enabled", getSetting(settings, "auto_reply_enabled") === "true" ? "false" : "true")}
                  className={`w-12 h-7 rounded-full relative transition-colors ${getSetting(settings, "auto_reply_enabled") === "true" ? "bg-[#F27501]" : "bg-neutral-300"}`}
                >
                  <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${getSetting(settings, "auto_reply_enabled") === "true" ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">Booking instellingen</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Vooruit boeken (dagen)</label>
                <select value={getSetting(settings, "booking_horizon_days", "30")} onChange={(e) => handleUpdateSetting("booking_horizon_days", e.target.value)} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none">
                  <option value="7">7 dagen</option>
                  <option value="14">14 dagen</option>
                  <option value="21">21 dagen</option>
                  <option value="30">30 dagen</option>
                  <option value="60">60 dagen</option>
                  <option value="90">90 dagen</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Booking pagina introductie tekst</label>
                <textarea value={getSetting(settings, "booking_page_intro_text")} onBlur={(e) => handleUpdateSetting("booking_page_intro_text", e.target.value)} onChange={(e) => store.updateSetting("booking_page_intro_text", e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none resize-none" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">Google Calendar</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${getSetting(settings, "google_calendar_last_sync") ? "text-green-600" : "text-neutral-500"}`}>
                  {getSetting(settings, "google_calendar_last_sync")
                    ? `Laatst gesynchroniseerd: ${new Date(getSetting(settings, "google_calendar_last_sync")).toLocaleString("nl-NL")}`
                    : "Niet geconfigureerd \u2014 stel GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET en GOOGLE_REFRESH_TOKEN in als environment variables"}
                </p>
              </div>
              <button onClick={handleSync} disabled={syncing} className="px-4 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] transition-colors text-sm font-medium disabled:opacity-50">
                {syncing ? "Syncing..." : "Nu synchroniseren"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODALS ============ */}
      {modal.type === "booking_detail" && (
        <BookingDetailModal
          booking={modal.booking}
          slots={slots}
          eventTypes={eventTypes}
          actionPending={actionPending}
          onStatusChange={updateBookingStatus}
          onEditNotes={openEditNotes}
        />
      )}

      {modal.type === "new_booking" && (
        <BookingModal
          open
          date={modal.date}
          slotId={modal.slotId}
          showCustomTime={modal.showCustomTime}
          name={modal.name}
          email={modal.email}
          phone={modal.phone}
          company={modal.company}
          notes={modal.notes}
          eventTypeId={modal.eventTypeId}
          customStart={modal.customStart}
          customEnd={modal.customEnd}
          saving={modal.saving}
          error={modal.error}
          slots={slots}
          eventTypes={eventTypes}
          onSubmit={submitNewBooking}
        />
      )}

      {modal.type === "event_type" && (
        <EventTypeModal
          open
          eventType={modal.eventType}
          isNew={modal.isNew}
          actionPending={actionPending}
          onSave={saveEventType}
          onDelete={deleteEventType}
        />
      )}

      {modal.type === "override" && (
        <OverrideModal
          open
          date={modal.date}
          reason={modal.reason}
          blocked={modal.blocked}
          startTime={modal.startTime}
          endTime={modal.endTime}
          actionPending={actionPending}
          onSubmit={submitOverride}
        />
      )}

      {modal.type === "internal_notes" && (
        <InternalNotesModal
          open
          bookingId={modal.bookingId}
          notes={modal.notes}
          actionPending={actionPending}
          onSave={saveInternalNotes}
        />
      )}
    </div>
  );
}
