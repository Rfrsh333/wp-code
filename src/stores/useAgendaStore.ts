import { create } from "zustand";
import type { Slot, Booking, EventType, Schedule, Override, Setting, TabView, CalendarView, ModalState } from "@/components/admin/agenda/calendarReducer";
import { MONTH_LIMIT } from "@/components/admin/agenda/calendarReducer";

interface AgendaState {
  // Data
  slots: Slot[];
  bookings: Booking[];
  settings: Setting[];
  eventTypes: EventType[];
  schedules: Schedule[];
  overrides: Override[];

  // UI
  view: TabView;
  calendarView: CalendarView;
  monthOffset: number;
  selectedDate: string | null;
  bookingFilter: string;

  // Status
  loading: boolean;
  refreshing: boolean;
  actionPending: boolean;
  actionError: string | null;
  syncing: boolean;
  savingMsg: string;

  // Modal
  modal: ModalState;
}

interface AgendaActions {
  // Data
  setData: (data: { slots: Slot[]; bookings: Booking[]; settings: Setting[]; eventTypes: EventType[]; schedules: Schedule[]; overrides: Override[] }) => void;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;

  // UI
  setView: (view: TabView) => void;
  setCalendarView: (calendarView: CalendarView) => void;
  setMonthOffset: (offset: number) => void;
  navigateMonth: (direction: -1 | 1) => void;
  goToday: () => void;
  selectDate: (date: string | null) => void;
  setBookingFilter: (filter: string) => void;

  // Status
  setActionPending: (pending: boolean) => void;
  setActionError: (error: string | null) => void;
  setSyncing: (syncing: boolean) => void;
  setSavingMsg: (msg: string) => void;

  // Optimistic updates
  updateSlot: (id: string, data: Partial<Slot>) => void;
  updateSlotsBulk: (ids: string[], data: Partial<Slot>) => void;
  updateBooking: (id: string, data: Partial<Booking>) => void;
  updateSetting: (key: string, value: string) => void;
  updateSchedule: (id: string, data: Partial<Schedule>) => void;
  removeOverride: (id: string) => void;
  removeEventType: (id: string) => void;

  // Modal
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  updateModal: (updates: Record<string, unknown>) => void;
}

export const useAgendaStore = create<AgendaState & AgendaActions>((set, get) => ({
  // Initial state
  slots: [],
  bookings: [],
  settings: [],
  eventTypes: [],
  schedules: [],
  overrides: [],
  view: "kalender",
  calendarView: "maand",
  monthOffset: 0,
  selectedDate: null,
  bookingFilter: "all",
  loading: true,
  refreshing: false,
  actionPending: false,
  actionError: null,
  syncing: false,
  savingMsg: "",
  modal: { type: "none" },

  // Data
  setData: (data) => set({ ...data, loading: false, refreshing: false }),
  setLoading: (loading) => set({ loading }),
  setRefreshing: (refreshing) => set({ refreshing }),

  // UI
  setView: (view) => set({ view }),
  setCalendarView: (calendarView) => set({ calendarView }),
  setMonthOffset: (offset) => set({ monthOffset: offset }),
  navigateMonth: (direction) => set((s) => ({
    monthOffset: Math.max(-MONTH_LIMIT, Math.min(MONTH_LIMIT, s.monthOffset + direction)),
  })),
  goToday: () => set({ monthOffset: 0 }),
  selectDate: (date) => set({ selectedDate: date }),
  setBookingFilter: (filter) => set({ bookingFilter: filter }),

  // Status
  setActionPending: (pending) => set({ actionPending: pending }),
  setActionError: (error) => set({ actionError: error }),
  setSyncing: (syncing) => set({ syncing: syncing }),
  setSavingMsg: (msg) => set({ savingMsg: msg }),

  // Optimistic updates
  updateSlot: (id, data) => set((s) => ({
    slots: s.slots.map((slot) => slot.id === id ? { ...slot, ...data } : slot),
  })),
  updateSlotsBulk: (ids, data) => set((s) => ({
    slots: s.slots.map((slot) => ids.includes(slot.id) ? { ...slot, ...data } : slot),
  })),
  updateBooking: (id, data) => set((s) => ({
    bookings: s.bookings.map((b) => b.id === id ? { ...b, ...data } : b),
  })),
  updateSetting: (key, value) => set((s) => {
    const idx = s.settings.findIndex((st) => st.key === key);
    if (idx >= 0) {
      return { settings: s.settings.map((st) => st.key === key ? { ...st, value } : st) };
    }
    return { settings: [...s.settings, { id: "temp", key, value }] };
  }),
  updateSchedule: (id, data) => set((s) => ({
    schedules: s.schedules.map((sc) => sc.id === id ? { ...sc, ...data } : sc),
  })),
  removeOverride: (id) => set((s) => ({
    overrides: s.overrides.filter((o) => o.id !== id),
  })),
  removeEventType: (id) => set((s) => ({
    eventTypes: s.eventTypes.filter((et) => et.id !== id),
  })),

  // Modal
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: { type: "none" } }),
  updateModal: (updates) => set((s) => ({
    modal: { ...s.modal, ...updates } as ModalState,
  })),
}));
