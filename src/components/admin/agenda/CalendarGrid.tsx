"use client";

import type { Dispatch } from "react";
import type { Booking, CalendarAction, CalendarView, EventType, Override, Slot } from "./calendarReducer";
import { dagNamen, dagNamenKort } from "./calendarReducer";
import { getSlotsForDate, getBookingsForDate, getBookingForSlot, getEventTypeColor, getEventTypeName, getMonthData, getWeekDays, slotKleur } from "./agendaUtils";
import DayDetail from "./DayDetail";

interface CalendarGridProps {
  calendarView: CalendarView;
  monthOffset: number;
  selectedDate: string | null;
  slots: Slot[];
  bookings: Booking[];
  eventTypes: EventType[];
  overrides: Override[];
  actionPending: boolean;
  dispatch: Dispatch<CalendarAction>;
  onToggleSlot: (slotId: string, isAvailable: boolean) => void;
  onToggleDay: (dateStr: string, block: boolean) => void;
  onOpenBookingModal: (dateStr: string, slotId?: string) => void;
  onOpenOverrideModal: (dateStr: string) => void;
  onSelectBooking: (booking: Booking) => void;
}

export default function CalendarGrid({
  calendarView, monthOffset, selectedDate,
  slots, bookings, eventTypes, overrides,
  actionPending, dispatch,
  onToggleSlot, onToggleDay, onOpenBookingModal, onOpenOverrideModal, onSelectBooking,
}: CalendarGridProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const monthData = getMonthData(monthOffset);

  return (
    <div>
      {/* Legenda */}
      <div className="flex gap-4 mb-4 text-xs flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded-full" /> Beschikbaar</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#F27501] rounded-full" /> Geboekt</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-400 rounded-full" /> Google Cal</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-neutral-300 rounded-full" /> Geblokkeerd</span>
        {eventTypes.map((et) => (
          <span key={et.id} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: et.color }} />
            {et.name}
          </span>
        ))}
      </div>

      {/* MAANDWEERGAVE */}
      {calendarView === "maand" && (
        <>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dagNamenKort.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-neutral-500 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthData.days.map(({ date, isCurrentMonth }, idx) => {
              const dateStr = date.toISOString().split("T")[0];
              const dayBookings = getBookingsForDate(bookings, slots, dateStr);
              const daySlots = getSlotsForDate(slots, dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const availableCount = daySlots.filter((s) => s.is_available && !s.is_booked).length;
              const bookedCount = dayBookings.length;
              const isOverrideBlocked = overrides.some((o) => o.date === dateStr && o.is_blocked && !o.start_time);

              return (
                <button
                  key={idx}
                  data-calendar-action="select-date"
                  data-date={dateStr}
                  onClick={() => dispatch({ type: "SELECT_DATE", date: isSelected ? null : dateStr })}
                  className={`relative rounded-xl p-2 min-h-[72px] text-left transition-all ${
                    !isCurrentMonth ? "bg-neutral-50 text-neutral-300"
                    : isOverrideBlocked ? "bg-red-50 border border-red-200"
                    : isSelected ? "bg-[#FEF3E7] border-2 border-[#F27501]"
                    : isToday ? "bg-[#FEF3E7]/50 border border-[#F27501]/40"
                    : "bg-white border border-neutral-100 hover:border-neutral-300"
                  }`}
                >
                  <span className={`text-sm font-semibold ${
                    !isCurrentMonth ? "text-neutral-300" :
                    isToday ? "text-[#F27501]" : "text-neutral-900"
                  }`}>
                    {date.getDate()}
                  </span>
                  {isCurrentMonth && (daySlots.length > 0 || isOverrideBlocked) && (
                    <div className="flex gap-0.5 mt-1 flex-wrap">
                      {bookedCount > 0 && dayBookings.slice(0, 3).map((b) => (
                        <span key={b.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: getEventTypeColor(eventTypes, b.event_type_id) }} />
                      ))}
                      {availableCount > 0 && <span className="w-2 h-2 rounded-full bg-green-400" />}
                      {isOverrideBlocked && <span className="w-2 h-2 rounded-full bg-red-400" />}
                    </div>
                  )}
                  {isCurrentMonth && bookedCount > 0 && (
                    <p className="text-[10px] text-[#F27501] font-medium mt-0.5 truncate">
                      {bookedCount} afspraak{bookedCount > 1 ? "en" : ""}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* WEEKWEERGAVE */}
      {calendarView === "week" && (
        <div className="grid grid-cols-7 gap-2">
          {getWeekDays(monthOffset).map((date) => {
            const dateStr = date.toISOString().split("T")[0];
            const daySlots = getSlotsForDate(slots, dateStr);
            const isToday = dateStr === todayStr;

            return (
              <div key={dateStr} className={`rounded-xl border p-3 min-h-[300px] ${isToday ? "border-[#F27501] bg-[#FEF3E7]/30" : "border-neutral-200"}`}>
                <p className={`text-sm font-semibold mb-2 ${isToday ? "text-[#F27501]" : "text-neutral-700"}`}>
                  {dagNamenKort[(date.getDay() + 6) % 7]} {date.getDate()}
                </p>
                <div className="space-y-1">
                  {daySlots.map((slot) => {
                    const booking = getBookingForSlot(bookings, slot.id);
                    return (
                      <div
                        key={slot.id}
                        className={`text-xs px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${slotKleur(slot)}`}
                        onClick={() => {
                          if (booking) onSelectBooking(booking);
                          else dispatch({ type: "SELECT_DATE", date: dateStr });
                        }}
                      >
                        <span className="font-medium">{slot.start_time.slice(0, 5)}</span>
                        {booking && <span className="ml-1 truncate">{booking.client_name}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DAGWEERGAVE */}
      {calendarView === "dag" && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h3 className="font-semibold text-lg text-neutral-900 mb-4">
            {selectedDate
              ? `${dagNamen[new Date(selectedDate + "T12:00:00").getDay()]} ${new Date(selectedDate + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`
              : `${dagNamen[new Date().getDay()]} ${new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`}
          </h3>
          {(() => {
            const dateStr = selectedDate || todayStr;
            const daySlots = getSlotsForDate(slots, dateStr);

            if (daySlots.length === 0) return <p className="text-neutral-400 py-4">Geen slots op deze dag</p>;

            return (
              <div className="space-y-2">
                {daySlots.map((slot) => {
                  const booking = getBookingForSlot(bookings, slot.id);
                  return (
                    <div key={slot.id} className={`flex items-center justify-between p-4 rounded-xl ${slotKleur(slot)}`}>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-lg">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                        {booking && (
                          <div>
                            <p className="font-medium">{booking.client_name}</p>
                            <p className="text-sm opacity-80">{booking.client_email}</p>
                            {booking.event_type_id && (
                              <span className="text-xs px-2 py-0.5 rounded-full text-white mt-1 inline-block" style={{ backgroundColor: getEventTypeColor(eventTypes, booking.event_type_id) }}>
                                {getEventTypeName(eventTypes, booking.event_type_id)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {booking ? (
                          <button onClick={() => onSelectBooking(booking)} className="px-3 py-1.5 text-sm bg-white/80 text-neutral-900 rounded-lg hover:bg-white">Details</button>
                        ) : slot.is_available ? (
                          <>
                            <button onClick={() => onOpenBookingModal(dateStr, slot.id)} disabled={actionPending} className="px-3 py-1.5 text-sm bg-[#F27501] text-white rounded-lg hover:bg-[#d96800] font-medium disabled:opacity-50 disabled:cursor-not-allowed">Boek</button>
                            <button onClick={() => onToggleSlot(slot.id, slot.is_available)} disabled={actionPending} className="px-3 py-1.5 text-sm bg-white/80 text-neutral-700 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed">Blokkeer</button>
                          </>
                        ) : slot.google_calendar_event_id !== "google_blocked" ? (
                          <button onClick={() => onToggleSlot(slot.id, slot.is_available)} disabled={actionPending} className="px-3 py-1.5 text-sm bg-white/80 text-neutral-700 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed">Vrijgeven</button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Day detail panel (maand/week view) */}
      {selectedDate && calendarView !== "dag" && (
        <DayDetail
          selectedDate={selectedDate}
          slots={slots}
          bookings={bookings}
          eventTypes={eventTypes}
          overrides={overrides}
          actionPending={actionPending}
          dispatch={dispatch}
          onToggleSlot={onToggleSlot}
          onToggleDay={onToggleDay}
          onOpenBookingModal={onOpenBookingModal}
          onOpenOverrideModal={onOpenOverrideModal}
          onSelectBooking={onSelectBooking}
        />
      )}
    </div>
  );
}
