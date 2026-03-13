// ============================================
// Types
// ============================================

export interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_booked: boolean;
  google_calendar_event_id: string | null;
}

export interface Booking {
  id: string;
  slot_id: string;
  inquiry_id: string | null;
  event_type_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  company_name: string | null;
  notes: string | null;
  internal_notes: string | null;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  source: string | null;
  no_show: boolean;
  google_calendar_event_id: string | null;
  confirmation_email_sent: boolean;
  reminder_email_sent: boolean;
  created_at: string;
  cancelled_at: string | null;
  completed_at: string | null;
  cancel_reason: string | null;
  booking_type?: "client" | "kandidaat";
  kandidaat_naam?: string | null;
  kandidaat_email?: string | null;
  kandidaat_telefoon?: string | null;
  kandidaat_cv_url?: string | null;
  kandidaat_notities?: string | null;
  inschrijving_id?: string | null;
  google_meet_link?: string | null;
}

export interface EventType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  color: string;
  is_active: boolean;
  max_bookings_per_day: number | null;
  requires_approval: boolean;
  sort_order: number;
  booking_type?: "client" | "kandidaat";
}

export interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface Override {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_blocked: boolean;
  reason: string | null;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
}

export type TabView = "kalender" | "boekingen" | "event_types" | "beschikbaarheid" | "instellingen" | "statistieken";
export type CalendarView = "maand" | "week" | "dag";

// ============================================
// Modal state (discriminated union)
// ============================================

export type ModalState =
  | { type: "none" }
  | { type: "booking_detail"; booking: Booking }
  | { type: "new_booking"; date: string; slotId: string; showCustomTime: boolean; name: string; email: string; phone: string; company: string; notes: string; eventTypeId: string; customStart: string; customEnd: string; saving: boolean; error: string }
  | { type: "event_type"; eventType: EventType; isNew: boolean }
  | { type: "override"; date: string; reason: string; blocked: boolean; startTime: string; endTime: string }
  | { type: "internal_notes"; bookingId: string; notes: string };

// ============================================
// Action status
// ============================================

export type ActionStatus = "idle" | "loading" | "error" | "success";

// ============================================
// State
// ============================================

export interface CalendarState {
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

export const initialState: CalendarState = {
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
};

// ============================================
// Actions
// ============================================

export type CalendarAction =
  // Data loading
  | { type: "SET_DATA"; slots: Slot[]; bookings: Booking[]; settings: Setting[]; eventTypes: EventType[]; schedules: Schedule[]; overrides: Override[] }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_REFRESHING"; refreshing: boolean }

  // UI navigation
  | { type: "SET_VIEW"; view: TabView }
  | { type: "SET_CALENDAR_VIEW"; calendarView: CalendarView }
  | { type: "SET_MONTH_OFFSET"; offset: number }
  | { type: "NAVIGATE_MONTH"; direction: -1 | 1 }
  | { type: "GO_TODAY" }
  | { type: "SELECT_DATE"; date: string | null }
  | { type: "SET_BOOKING_FILTER"; filter: string }

  // Action status
  | { type: "SET_ACTION_PENDING"; pending: boolean }
  | { type: "SET_ACTION_ERROR"; error: string | null }
  | { type: "SET_SYNCING"; syncing: boolean }
  | { type: "SET_SAVING_MSG"; msg: string }

  // Optimistic updates
  | { type: "UPDATE_SLOT"; id: string; data: Partial<Slot> }
  | { type: "UPDATE_SLOTS_BULK"; ids: string[]; data: Partial<Slot> }
  | { type: "UPDATE_BOOKING"; id: string; data: Partial<Booking> }
  | { type: "UPDATE_SETTING"; key: string; value: string }
  | { type: "UPDATE_SCHEDULE"; id: string; data: Partial<Schedule> }
  | { type: "REMOVE_OVERRIDE"; id: string }
  | { type: "REMOVE_EVENT_TYPE"; id: string }

  // Modal
  | { type: "OPEN_MODAL"; modal: ModalState }
  | { type: "CLOSE_MODAL" }
  | { type: "UPDATE_MODAL"; updates: Record<string, unknown> };

// ============================================
// Constants
// ============================================

export const MONTH_LIMIT = 12;
export const dagNamen = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
export const dagNamenKort = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

// ============================================
// Reducer
// ============================================

export function calendarReducer(state: CalendarState, action: CalendarAction): CalendarState {
  switch (action.type) {
    // Data loading
    case "SET_DATA":
      return {
        ...state,
        slots: action.slots,
        bookings: action.bookings,
        settings: action.settings,
        eventTypes: action.eventTypes,
        schedules: action.schedules,
        overrides: action.overrides,
        loading: false,
        refreshing: false,
      };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_REFRESHING":
      return { ...state, refreshing: action.refreshing };

    // UI navigation
    case "SET_VIEW":
      return { ...state, view: action.view };
    case "SET_CALENDAR_VIEW":
      return { ...state, calendarView: action.calendarView };
    case "SET_MONTH_OFFSET":
      return { ...state, monthOffset: action.offset };
    case "NAVIGATE_MONTH":
      return {
        ...state,
        monthOffset: Math.max(-MONTH_LIMIT, Math.min(MONTH_LIMIT, state.monthOffset + action.direction)),
      };
    case "GO_TODAY":
      return { ...state, monthOffset: 0 };
    case "SELECT_DATE":
      return { ...state, selectedDate: action.date };
    case "SET_BOOKING_FILTER":
      return { ...state, bookingFilter: action.filter };

    // Action status
    case "SET_ACTION_PENDING":
      return { ...state, actionPending: action.pending };
    case "SET_ACTION_ERROR":
      return { ...state, actionError: action.error };
    case "SET_SYNCING":
      return { ...state, syncing: action.syncing };
    case "SET_SAVING_MSG":
      return { ...state, savingMsg: action.msg };

    // Optimistic updates
    case "UPDATE_SLOT":
      return { ...state, slots: state.slots.map((s) => s.id === action.id ? { ...s, ...action.data } : s) };
    case "UPDATE_SLOTS_BULK":
      return { ...state, slots: state.slots.map((s) => action.ids.includes(s.id) ? { ...s, ...action.data } : s) };
    case "UPDATE_BOOKING":
      return { ...state, bookings: state.bookings.map((b) => b.id === action.id ? { ...b, ...action.data } : b) };
    case "UPDATE_SETTING": {
      const idx = state.settings.findIndex((s) => s.key === action.key);
      if (idx >= 0) {
        return { ...state, settings: state.settings.map((s) => s.key === action.key ? { ...s, value: action.value } : s) };
      }
      return { ...state, settings: [...state.settings, { id: "temp", key: action.key, value: action.value }] };
    }
    case "UPDATE_SCHEDULE":
      return { ...state, schedules: state.schedules.map((s) => s.id === action.id ? { ...s, ...action.data } : s) };
    case "REMOVE_OVERRIDE":
      return { ...state, overrides: state.overrides.filter((o) => o.id !== action.id) };
    case "REMOVE_EVENT_TYPE":
      return { ...state, eventTypes: state.eventTypes.filter((et) => et.id !== action.id) };

    // Modal
    case "OPEN_MODAL":
      return { ...state, modal: action.modal };
    case "CLOSE_MODAL":
      return { ...state, modal: { type: "none" } };
    case "UPDATE_MODAL":
      return { ...state, modal: { ...state.modal, ...action.updates } as ModalState };

    default:
      return state;
  }
}
