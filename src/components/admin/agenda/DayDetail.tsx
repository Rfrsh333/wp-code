"use client";

import type { Booking, EventType, Override, Slot } from "./calendarReducer";
import { dagNamen } from "./calendarReducer";
import { getSlotsForDate, getBookingForSlot, getEventTypeName, getEventTypeColor, slotKleur } from "./agendaUtils";
import { useAgendaStore } from "@/stores/useAgendaStore";

interface DayDetailProps {
  selectedDate: string;
  slots: Slot[];
  bookings: Booking[];
  eventTypes: EventType[];
  overrides: Override[];
  actionPending: boolean;
  onToggleSlot: (slotId: string, isAvailable: boolean) => void;
  onToggleDay: (dateStr: string, block: boolean) => void;
  onOpenBookingModal: (dateStr: string, slotId?: string) => void;
  onOpenOverrideModal: (dateStr: string) => void;
  onSelectBooking: (booking: Booking) => void;
}

export default function DayDetail({
  selectedDate, slots, bookings, eventTypes,
  actionPending,
  onToggleSlot, onToggleDay, onOpenBookingModal, onOpenOverrideModal, onSelectBooking,
}: DayDetailProps) {
  const store = useAgendaStore();
  const daySlots = getSlotsForDate(slots, selectedDate);
  const toggleable = daySlots.filter((s) => !s.is_booked && s.google_calendar_event_id !== "google_blocked");
  const allBlocked = toggleable.length > 0 && toggleable.every((s) => !s.is_available);

  return (
    <div className="mt-4 bg-white rounded-xl border border-neutral-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-neutral-900">
          {dagNamen[new Date(selectedDate + "T12:00:00").getDay()]}{" "}
          {new Date(selectedDate + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
        </h3>
        <div className="flex gap-2">
          {toggleable.length > 0 && (
            <button
              onClick={() => onToggleDay(selectedDate, !allBlocked)}
              disabled={actionPending}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                allBlocked ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-600 hover:bg-red-200"
              }`}
            >
              {allBlocked ? "Maak dag vrij" : "Blokkeer hele dag"}
            </button>
          )}
          <button onClick={() => onOpenOverrideModal(selectedDate)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200">
            Override
          </button>
          <button onClick={() => store.selectDate(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {daySlots.length > 0 ? (
        <div className="space-y-1.5">
          {daySlots.map((slot) => {
            const booking = getBookingForSlot(bookings, slot.id);
            const isGoogle = slot.google_calendar_event_id === "google_blocked";
            return (
              <div key={slot.id} className={`flex items-center justify-between p-2.5 rounded-lg ${slotKleur(slot)}`}>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                  {booking && (
                    <>
                      <span className="text-sm">{booking.client_name}</span>
                      {booking.event_type_id && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: getEventTypeColor(eventTypes, booking.event_type_id) }}>
                          {getEventTypeName(eventTypes, booking.event_type_id)}
                        </span>
                      )}
                    </>
                  )}
                  {isGoogle && <span className="text-xs">(Google Calendar)</span>}
                </div>
                <div className="flex gap-1">
                  {booking ? (
                    <button onClick={() => onSelectBooking(booking)} className="px-2 py-1 text-xs bg-white/80 text-neutral-900 rounded-lg hover:bg-white transition-colors">Details</button>
                  ) : slot.is_available && !isGoogle ? (
                    <>
                      <button onClick={() => onOpenBookingModal(selectedDate, slot.id)} disabled={actionPending} className="px-2 py-1 text-xs bg-[#F27501] text-white rounded-lg hover:bg-[#d96800] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">Boek</button>
                      <button onClick={() => onToggleSlot(slot.id, slot.is_available)} disabled={actionPending} className="px-2 py-1 text-xs bg-white/80 text-neutral-700 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Blokkeer</button>
                    </>
                  ) : !isGoogle ? (
                    <button onClick={() => onToggleSlot(slot.id, slot.is_available)} disabled={actionPending} className="px-2 py-1 text-xs bg-white/80 text-neutral-700 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Vrijgeven</button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-neutral-400 py-4 text-center">Geen slots op deze dag</p>
      )}

      <button
        onClick={() => onOpenBookingModal(selectedDate)}
        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] transition-colors text-sm font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Nieuwe boeking
      </button>
    </div>
  );
}
