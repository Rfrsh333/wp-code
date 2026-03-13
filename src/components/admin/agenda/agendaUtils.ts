import type { Slot, Booking, EventType, Setting } from "./calendarReducer";
import { dagNamen } from "./calendarReducer";

// ============================================
// Slot hashmap
// ============================================

export type SlotMap = Record<string, Slot[]>;

export const groupSlotsByDate = (slots: Slot[]): SlotMap => {
  const map: SlotMap = {};
  for (const slot of slots) {
    if (!map[slot.date]) map[slot.date] = [];
    map[slot.date].push(slot);
  }
  // Sort each day's slots by start_time
  for (const key in map) {
    map[key].sort((a, b) => a.start_time.localeCompare(b.start_time));
  }
  return map;
};

// ============================================
// Data lookups
// ============================================

export const getSetting = (settings: Setting[], key: string, fallback = ""): string => {
  return settings.find((s) => s.key === key)?.value || fallback;
};

export const getSlotsForDate = (slots: Slot[], dateStr: string): Slot[] => {
  return slots.filter((s) => s.date === dateStr).sort((a, b) => a.start_time.localeCompare(b.start_time));
};

/** O(1) lookup from pre-built SlotMap */
export const getSlotsFromMap = (slotMap: SlotMap, dateStr: string): Slot[] => {
  return slotMap[dateStr] || [];
};

export const getBookingsForDate = (bookings: Booking[], slots: Slot[], dateStr: string): Booking[] => {
  return bookings.filter((b) => {
    const slot = slots.find((s) => s.id === b.slot_id);
    return slot?.date === dateStr && b.status !== "cancelled";
  });
};

export const getBookingForSlot = (bookings: Booking[], slotId: string): Booking | undefined => {
  return bookings.find((b) => b.slot_id === slotId && b.status !== "cancelled");
};

export const getEventTypeName = (eventTypes: EventType[], id: string | null): string => {
  if (!id) return "";
  return eventTypes.find((et) => et.id === id)?.name || "";
};

export const getEventTypeColor = (eventTypes: EventType[], id: string | null): string => {
  if (!id) return "#F27501";
  return eventTypes.find((et) => et.id === id)?.color || "#F27501";
};

// ============================================
// Status helpers
// ============================================

export const statusKleur = (status: string): string => {
  switch (status) {
    case "confirmed": return "bg-green-100 text-green-700";
    case "completed": return "bg-blue-100 text-blue-700";
    case "cancelled": return "bg-red-100 text-red-600";
    case "no_show": return "bg-yellow-100 text-yellow-700";
    default: return "bg-neutral-100 text-neutral-600";
  }
};

export const statusLabel = (status: string): string => {
  switch (status) {
    case "confirmed": return "Bevestigd";
    case "completed": return "Voltooid";
    case "cancelled": return "Geannuleerd";
    case "no_show": return "No-show";
    default: return status;
  }
};

export const slotKleur = (slot: Slot): string => {
  if (slot.is_booked) return "bg-[#F27501] text-white";
  if (!slot.is_available && slot.google_calendar_event_id) return "bg-purple-100 text-purple-700";
  if (!slot.is_available) return "bg-neutral-200 text-neutral-500";
  return "bg-green-50 text-green-700 border border-green-200";
};

// ============================================
// Calendar helpers
// ============================================

export const getMonthData = (monthOffset: number) => {
  const today = new Date();
  const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6;

  const days: { date: Date; isCurrentMonth: boolean }[] = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  while (days.length < 42) {
    const nextDate = new Date(year, month + 1, days.length - lastDay.getDate() - startDayOfWeek + 1);
    days.push({ date: nextDate, isCurrentMonth: false });
  }

  return {
    year, month,
    monthName: targetMonth.toLocaleDateString("nl-NL", { month: "long", year: "numeric" }),
    days,
  };
};

export const getWeekDays = (monthOffset: number): Date[] => {
  const today = new Date();
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const mondayOfWeek = new Date(today);
  mondayOfWeek.setDate(today.getDate() - daysSinceMonday + (monthOffset * 7));
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayOfWeek);
    d.setDate(mondayOfWeek.getDate() + i);
    days.push(d);
  }
  return days;
};

// ============================================
// Statistics
// ============================================

export const getStats = (bookings: Booking[], slots: Slot[]) => {
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

  const thisMonthBookings = bookings.filter((b) => b.created_at?.startsWith(thisMonth));
  const lastMonthBookings = bookings.filter((b) => b.created_at?.startsWith(lastMonth));

  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const completed = bookings.filter((b) => b.status === "completed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const noShow = bookings.filter((b) => b.status === "no_show").length;
  const total = bookings.length;

  const noShowRate = total > 0 ? Math.round((noShow / (completed + noShow)) * 100) : 0;

  const timeCount: Record<string, number> = {};
  for (const b of bookings.filter((b) => b.status !== "cancelled")) {
    const slot = slots.find((s) => s.id === b.slot_id);
    if (slot) {
      const time = slot.start_time.slice(0, 5);
      timeCount[time] = (timeCount[time] || 0) + 1;
    }
  }
  const popularTimes = Object.entries(timeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const dayCount: Record<string, number> = {};
  for (const b of bookings.filter((b) => b.status !== "cancelled")) {
    const slot = slots.find((s) => s.id === b.slot_id);
    if (slot) {
      const day = dagNamen[new Date(slot.date).getDay()];
      dayCount[day] = (dayCount[day] || 0) + 1;
    }
  }
  const popularDays = Object.entries(dayCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    total, confirmed, completed, cancelled, noShow, noShowRate,
    thisMonth: thisMonthBookings.length,
    lastMonth: lastMonthBookings.length,
    popularTimes, popularDays,
  };
};
