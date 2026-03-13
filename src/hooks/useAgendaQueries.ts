"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAgendaStore } from "@/stores/useAgendaStore";
import type { Booking, EventType, Schedule } from "@/components/admin/agenda/calendarReducer";
import { getSlotsForDate } from "@/components/admin/agenda/agendaUtils";

const AGENDA_KEY = ["agenda-data"] as const;

// ============================================
// Auth helpers
// ============================================

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function fetchTable(table: string, headers: HeadersInit) {
  const res = await fetch(`/api/admin/data?table=${table}`, { headers });
  const json = await res.json();
  return json.data || [];
}

async function adminFetch(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/data", {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const result = await res.json();
  if (!res.ok || result.error) {
    throw new Error(result.error || "Er ging iets mis bij het opslaan");
  }
  return result;
}

// ============================================
// Data fetching query
// ============================================

function useAgendaData() {
  return useQuery({
    queryKey: AGENDA_KEY,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

      const [slots, bookings, settings, eventTypes, schedules, overrides] = await Promise.all([
        fetchTable("availability_slots", headers),
        fetchTable("bookings", headers),
        fetchTable("admin_settings", headers),
        fetchTable("event_types", headers),
        fetchTable("availability_schedules", headers),
        fetchTable("availability_overrides", headers),
      ]);

      return { slots, bookings, settings, eventTypes, schedules, overrides };
    },
  });
}

// ============================================
// Error helper
// ============================================

function showError(msg: string) {
  const s = useAgendaStore.getState();
  s.setActionError(msg);
  setTimeout(() => useAgendaStore.getState().setActionError(null), 5000);
}

// ============================================
// Mutations
// ============================================

export function useAgendaQueries() {
  const store = useAgendaStore();
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: AGENDA_KEY });

  // ---------- Data query ----------
  const dataQuery = useAgendaData();

  // Sync React Query data → Zustand store
  useEffect(() => {
    if (dataQuery.data) {
      store.setData({
        slots: dataQuery.data.slots,
        bookings: dataQuery.data.bookings,
        settings: dataQuery.data.settings,
        eventTypes: dataQuery.data.eventTypes,
        schedules: dataQuery.data.schedules,
        overrides: dataQuery.data.overrides,
      });
    }
    store.setLoading(dataQuery.isLoading);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataQuery.data, dataQuery.isLoading]);

  // ---------- Sync mutation ----------
  const syncMutation = useMutation({
    mutationFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/calendar/sync", { headers });
      if (!res.ok) throw new Error("Synchronisatie mislukt");
    },
    onMutate: () => store.setSyncing(true),
    onSuccess: () => invalidate(),
    onError: (err: Error) => showError(err.message || "Netwerkfout bij synchronisatie"),
    onSettled: () => store.setSyncing(false),
  });

  // ---------- Update booking status ----------
  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const data: Record<string, unknown> = { status };
      if (status === "completed") data.completed_at = new Date().toISOString();
      if (status === "no_show") data.no_show = true;
      await adminFetch({ action: "update", table: "bookings", id, data });
      return { id, status, data };
    },
    onMutate: () => store.setActionPending(true),
    onSuccess: ({ id, status, data }) => {
      store.updateBooking(id, { status: status as Booking["status"], ...data });
      invalidate();
    },
    onError: () => showError("Kon status niet bijwerken"),
    onSettled: () => store.setActionPending(false),
  });

  // ---------- Toggle slot availability ----------
  const toggleSlotMutation = useMutation({
    mutationFn: async ({ slotId, isAvailable }: { slotId: string; isAvailable: boolean }) => {
      await adminFetch({ action: "update", table: "availability_slots", id: slotId, data: { is_available: !isAvailable } });
      return { slotId, isAvailable };
    },
    onMutate: ({ slotId, isAvailable }) => {
      store.setActionPending(true);
      store.updateSlot(slotId, { is_available: !isAvailable });
      return { slotId, isAvailable };
    },
    onSuccess: () => invalidate(),
    onError: (_err, _vars, context) => {
      if (context) store.updateSlot(context.slotId, { is_available: context.isAvailable });
      showError("Kon slot niet bijwerken");
    },
    onSettled: () => store.setActionPending(false),
  });

  // ---------- Toggle day availability ----------
  const toggleDayMutation = useMutation({
    mutationFn: async ({ dateStr, block }: { dateStr: string; block: boolean }) => {
      const daySlots = getSlotsForDate(store.slots, dateStr);
      const toggleableSlots = daySlots.filter((s) => !s.is_booked && s.google_calendar_event_id !== "google_blocked");
      if (toggleableSlots.length === 0) return { ids: [], block };
      const ids = toggleableSlots.map((s) => s.id);
      await adminFetch({ action: "bulk_update", table: "availability_slots", ids, data: { is_available: !block } });
      return { ids, block };
    },
    onMutate: ({ dateStr, block }) => {
      store.setActionPending(true);
      const daySlots = getSlotsForDate(store.slots, dateStr);
      const ids = daySlots.filter((s) => !s.is_booked && s.google_calendar_event_id !== "google_blocked").map((s) => s.id);
      store.updateSlotsBulk(ids, { is_available: !block });
      return { ids, block };
    },
    onSuccess: () => invalidate(),
    onError: (_err, _vars, context) => {
      if (context) store.updateSlotsBulk(context.ids, { is_available: context.block });
      showError("Kon dag niet bijwerken");
    },
    onSettled: () => store.setActionPending(false),
  });

  // ---------- Update setting ----------
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const existing = store.settings.find((s) => s.key === key);
      if (existing) {
        await adminFetch({ action: "update", table: "admin_settings", id: existing.id, data: { value } });
      } else {
        await adminFetch({ action: "insert", table: "admin_settings", data: { key, value } });
      }
    },
    onMutate: ({ key, value }) => {
      store.updateSetting(key, value);
    },
    onSuccess: () => {
      store.setSavingMsg("Opgeslagen");
      setTimeout(() => store.setSavingMsg(""), 2000);
      invalidate();
    },
    onError: () => showError("Kon instelling niet opslaan"),
  });

  // ---------- Submit new booking ----------
  const submitBookingMutation = useMutation({
    mutationFn: async () => {
      const m = store.modal;
      if (m.type !== "new_booking") throw new Error("Invalid modal state");
      const { slotId, date, customStart, customEnd, name, email, phone, company, notes, eventTypeId } = m;

      const body: Record<string, unknown> = {
        event_type_id: eventTypeId || null,
        client_name: name.trim(),
        client_email: email.trim(),
        client_phone: phone.trim() || null,
        company_name: company.trim() || null,
        notes: notes.trim() || null,
        source: "admin",
      };
      if (slotId) {
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
      if (!data.success) throw new Error(data.error || "Kon boeking niet aanmaken");
      return data;
    },
    onMutate: () => store.updateModal({ saving: true, error: "" }),
    onSuccess: () => {
      store.closeModal();
      invalidate();
    },
    onError: (err: Error) => {
      store.updateModal({ error: err.message, saving: false });
    },
  });

  // ---------- Submit override ----------
  const submitOverrideMutation = useMutation({
    mutationFn: async () => {
      const m = store.modal;
      if (m.type !== "override" || !m.date) throw new Error("Invalid modal state");
      await adminFetch({
        action: "insert",
        table: "availability_overrides",
        data: {
          date: m.date,
          start_time: m.startTime || null,
          end_time: m.endTime || null,
          is_blocked: m.blocked,
          reason: m.reason || null,
        },
      });
      if (m.blocked && !m.startTime) {
        const daySlots = getSlotsForDate(store.slots, m.date);
        const ids = daySlots.filter((s) => !s.is_booked).map((s) => s.id);
        if (ids.length > 0) {
          await adminFetch({ action: "bulk_update", table: "availability_slots", ids, data: { is_available: false } });
        }
      }
    },
    onMutate: () => store.setActionPending(true),
    onSuccess: () => {
      store.closeModal();
      invalidate();
    },
    onError: () => showError("Kon override niet toevoegen"),
    onSettled: () => store.setActionPending(false),
  });

  // ---------- Delete override ----------
  const deleteOverrideMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminFetch({ action: "delete", table: "availability_overrides", id });
      return id;
    },
    onMutate: (id) => {
      store.setActionPending(true);
      store.removeOverride(id);
    },
    onSuccess: () => invalidate(),
    onError: () => showError("Kon override niet verwijderen"),
    onSettled: () => store.setActionPending(false),
  });

  // ---------- Save event type ----------
  const saveEventTypeMutation = useMutation({
    mutationFn: async (et: Partial<EventType> & { id?: string }) => {
      if (et.id) {
        const { id, ...data } = et;
        await adminFetch({ action: "update", table: "event_types", id, data });
      } else {
        await adminFetch({ action: "insert", table: "event_types", data: et });
      }
    },
    onMutate: () => store.setActionPending(true),
    onSuccess: () => {
      store.closeModal();
      invalidate();
    },
    onError: () => showError("Kon event type niet opslaan"),
    onSettled: () => store.setActionPending(false),
  });

  // ---------- Delete event type ----------
  const deleteEventTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminFetch({ action: "delete", table: "event_types", id });
      return id;
    },
    onMutate: (id) => {
      store.setActionPending(true);
      store.removeEventType(id);
    },
    onSuccess: () => invalidate(),
    onError: () => showError("Kon event type niet verwijderen"),
    onSettled: () => store.setActionPending(false),
  });

  // ---------- Update schedule ----------
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Schedule> }) => {
      await adminFetch({ action: "update", table: "availability_schedules", id, data });
      return { id, data };
    },
    onMutate: ({ id, data }) => {
      store.setActionPending(true);
      store.updateSchedule(id, data);
    },
    onSuccess: () => invalidate(),
    onError: () => showError("Kon schema niet bijwerken"),
    onSettled: () => store.setActionPending(false),
  });

  // ---------- Insert schedule ----------
  const insertScheduleMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await adminFetch({ action: "insert", table: "availability_schedules", data });
    },
    onMutate: () => store.setActionPending(true),
    onSuccess: () => invalidate(),
    onError: () => showError("Kon schema niet toevoegen"),
    onSettled: () => store.setActionPending(false),
  });

  // ---------- Save internal notes ----------
  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      const m = store.modal;
      if (m.type !== "internal_notes") throw new Error("Invalid modal state");
      await adminFetch({ action: "update", table: "bookings", id: m.bookingId, data: { internal_notes: m.notes } });
      return { bookingId: m.bookingId, notes: m.notes };
    },
    onMutate: () => store.setActionPending(true),
    onSuccess: ({ bookingId, notes }) => {
      store.updateBooking(bookingId, { internal_notes: notes });
      store.closeModal();
      invalidate();
    },
    onError: () => showError("Kon notities niet opslaan"),
    onSettled: () => store.setActionPending(false),
  });

  return {
    // Query
    dataQuery,
    isLoading: dataQuery.isLoading,
    isRefreshing: dataQuery.isRefetching,

    // Mutations
    handleSync: () => syncMutation.mutate(),
    updateBookingStatus: (id: string, status: string) => updateBookingStatusMutation.mutate({ id, status }),
    toggleSlotAvailability: (slotId: string, isAvailable: boolean) => toggleSlotMutation.mutate({ slotId, isAvailable }),
    toggleDayAvailability: (dateStr: string, block: boolean) => toggleDayMutation.mutate({ dateStr, block }),
    handleUpdateSetting: (key: string, value: string) => updateSettingMutation.mutate({ key, value }),
    submitNewBooking: () => submitBookingMutation.mutate(),
    submitOverride: () => submitOverrideMutation.mutate(),
    deleteOverride: (id: string) => deleteOverrideMutation.mutate(id),
    saveEventType: (et: Partial<EventType> & { id?: string }) => saveEventTypeMutation.mutate(et),
    deleteEventType: (id: string) => deleteEventTypeMutation.mutate(id),
    handleUpdateSchedule: (id: string, data: Partial<Schedule>) => updateScheduleMutation.mutate({ id, data }),
    insertSchedule: (data: Record<string, unknown>) => insertScheduleMutation.mutate(data),
    saveInternalNotes: () => saveNotesMutation.mutate(),
  };
}
