"use client";

import { useMemo } from "react";
import type { Booking, CalendarView, EventType, Override, Slot } from "./calendarReducer";
import { dagNamen, dagNamenKort } from "./calendarReducer";
import { getSlotsFromMap, groupSlotsByDate, getBookingForSlot, getEventTypeColor, slotKleur, isKandidaatBooking } from "./agendaUtils";
import { Calendar } from "@/components/ui/calendar";
import { useAgendaStore } from "@/stores/useAgendaStore";
import DayDetail from "./DayDetail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { DayButton } from "react-day-picker";

interface CalendarGridProps {
  calendarView: CalendarView;
  monthOffset: number;
  selectedDate: string | null;
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

function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function CalendarGrid({
  calendarView, monthOffset, selectedDate,
  slots, bookings, eventTypes, overrides,
  actionPending,
  onToggleSlot, onToggleDay, onOpenBookingModal, onOpenOverrideModal, onSelectBooking,
}: CalendarGridProps) {
  const store = useAgendaStore();
  const todayStr = new Date().toISOString().split("T")[0];

  // Pre-build slot hashmap for O(1) date lookups
  const slotMap = useMemo(() => groupSlotsByDate(slots), [slots]);

  // Compute the month to display based on monthOffset
  const displayMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  // Build a set of dates that have bookings/slots for dot indicators
  const dayData = useMemo(() => {
    const map = new Map<string, { bookedCount: number; availableCount: number; isBlocked: boolean; bookingColors: string[]; hasKandidaat: boolean }>();
    for (const slot of slots) {
      const dateStr = slot.date;
      if (!map.has(dateStr)) map.set(dateStr, { bookedCount: 0, availableCount: 0, isBlocked: false, bookingColors: [], hasKandidaat: false });
      const entry = map.get(dateStr)!;
      if (slot.is_available && !slot.is_booked) entry.availableCount++;
    }
    for (const booking of bookings) {
      if (booking.status === "cancelled") continue;
      const slot = slots.find((s) => s.id === booking.slot_id);
      if (!slot) continue;
      const entry = map.get(slot.date);
      if (entry) {
        entry.bookedCount++;
        if (isKandidaatBooking(booking)) {
          entry.hasKandidaat = true;
          entry.bookingColors.push("#8B5CF6");
        } else {
          entry.bookingColors.push(getEventTypeColor(eventTypes, booking.event_type_id));
        }
      }
    }
    for (const o of overrides) {
      if (o.is_blocked && !o.start_time) {
        if (!map.has(o.date)) map.set(o.date, { bookedCount: 0, availableCount: 0, isBlocked: false, bookingColors: [], hasKandidaat: false });
        map.get(o.date)!.isBlocked = true;
      }
    }
    return map;
  }, [slots, bookings, eventTypes, overrides]);

  const selectedDayObj = selectedDate ? new Date(selectedDate + "T12:00:00") : undefined;

  return (
    <div>
      {/* Legenda */}
      <div className="flex gap-3 mb-4 text-xs flex-wrap">
        <Badge variant="outline" className="gap-1.5 font-normal">
          <span className="w-2.5 h-2.5 bg-green-400 rounded-full" /> Beschikbaar
        </Badge>
        <Badge variant="outline" className="gap-1.5 font-normal">
          <span className="w-2.5 h-2.5 bg-[#F27501] rounded-full" /> Geboekt
        </Badge>
        <Badge variant="outline" className="gap-1.5 font-normal">
          <span className="w-2.5 h-2.5 bg-purple-400 rounded-full" /> Google Cal
        </Badge>
        <Badge variant="outline" className="gap-1.5 font-normal">
          <span className="w-2.5 h-2.5 bg-[#8B5CF6] rounded-full" /> Kandidaat
        </Badge>
        <Badge variant="outline" className="gap-1.5 font-normal">
          <span className="w-2.5 h-2.5 bg-neutral-300 rounded-full" /> Geblokkeerd
        </Badge>
        {eventTypes.map((et) => (
          <Badge key={et.id} variant="outline" className="gap-1.5 font-normal">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: et.color }} />
            {et.name}
          </Badge>
        ))}
      </div>

      {/* MAANDWEERGAVE (react-day-picker) */}
      {calendarView === "maand" && (
        <Calendar
          mode="single"
          month={displayMonth}
          onMonthChange={(month) => {
            const now = new Date();
            const diff = (month.getFullYear() - now.getFullYear()) * 12 + (month.getMonth() - now.getMonth());
            store.setMonthOffset(diff);
          }}
          selected={selectedDayObj}
          onSelect={(date) => {
            if (!date) {
              store.selectDate(null);
              return;
            }
            const dateStr = toDateStr(date);
            store.selectDate(selectedDate === dateStr ? null : dateStr);
          }}
          locale={{
            localize: {
              day: (day: number) => dagNamenKort[(day + 6) % 7],
              month: (month: number) => {
                const d = new Date(2024, month, 1);
                return d.toLocaleDateString("nl-NL", { month: "long" });
              },
              ordinalNumber: (n: number) => String(n),
              era: () => "",
              quarter: () => "",
              dayPeriod: () => "",
            },
            formatLong: {
              date: () => "dd-MM-yyyy",
              time: () => "HH:mm",
              dateTime: () => "dd-MM-yyyy HH:mm",
            },
            match: {
              ordinalNumber: () => ({ value: 0, rest: "" }),
              era: () => ({ value: 0, rest: "" }),
              quarter: () => ({ value: 0, rest: "" }),
              month: () => ({ value: 0, rest: "" }),
              day: () => ({ value: 0, rest: "" }),
              dayPeriod: () => ({ value: 0, rest: "" }),
            },
            options: { weekStartsOn: 1, firstWeekContainsDate: 4 },
            code: "nl",
            formatDistance: () => "",
            formatRelative: () => "",
          } as unknown as import("react-day-picker").Locale}
          showOutsideDays
          className="w-full"
          classNames={{
            root: "w-full",
            months: "w-full",
            month: "w-full",
            month_caption: "flex justify-center py-2 relative items-center",
            caption_label: "text-sm font-medium hidden",
            nav: "hidden",
            table: "w-full border-collapse",
            weekdays: "flex w-full",
            weekday: "flex-1 text-center text-xs font-medium text-neutral-500 py-2",
            week: "flex w-full mt-1",
            day: "flex-1 p-0.5",
          }}
          components={{
            DayButton: ({ day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) => {
              const dateStr = toDateStr(day.date);
              const data = dayData.get(dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const isOutside = modifiers.outside;

              return (
                <button
                  {...props}
                  className={`relative rounded-xl p-2 min-h-[72px] w-full text-left transition-all border ${
                    isOutside ? "bg-neutral-50 text-neutral-300 border-transparent"
                    : data?.isBlocked ? "bg-red-50 border-red-200"
                    : isSelected ? "bg-[#FEF3E7] border-2 border-[#F27501] shadow-sm"
                    : isToday ? "bg-[#FEF3E7]/50 border-[#F27501]/40"
                    : "bg-white border-neutral-100 hover:border-neutral-300 hover:shadow-sm"
                  }`}
                >
                  <span className={`text-sm font-semibold ${
                    isOutside ? "text-neutral-300" :
                    isToday ? "text-[#F27501]" : "text-neutral-900"
                  }`}>
                    {day.date.getDate()}
                  </span>
                  {!isOutside && data && (data.bookedCount > 0 || data.availableCount > 0 || data.isBlocked) && (
                    <div className="flex gap-0.5 mt-1 flex-wrap">
                      {data.bookingColors.slice(0, 3).map((color, i) => (
                        <span key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      ))}
                      {data.availableCount > 0 && <span className="w-2 h-2 rounded-full bg-green-400" />}
                      {data.isBlocked && <span className="w-2 h-2 rounded-full bg-red-400" />}
                    </div>
                  )}
                  {!isOutside && data && data.bookedCount > 0 && (
                    <p className="text-[10px] text-[#F27501] font-medium mt-0.5 truncate">
                      {data.bookedCount} afspraak{data.bookedCount > 1 ? "en" : ""}
                    </p>
                  )}
                </button>
              );
            },
          }}
        />
      )}

      {/* WEEKWEERGAVE */}
      {calendarView === "week" && (() => {
        const today = new Date();
        const daysSinceMonday = (today.getDay() + 6) % 7;
        const mondayOfWeek = new Date(today);
        mondayOfWeek.setDate(today.getDate() - daysSinceMonday + (monthOffset * 7));
        const weekDays: Date[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(mondayOfWeek);
          d.setDate(mondayOfWeek.getDate() + i);
          weekDays.push(d);
        }

        return (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((date) => {
              const dateStr = toDateStr(date);
              const daySlots = getSlotsFromMap(slotMap, dateStr);
              const isToday = dateStr === todayStr;

              return (
                <Card key={dateStr} className={`p-3 min-h-[300px] ${isToday ? "border-[#F27501] bg-[#FEF3E7]/30" : ""}`}>
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
                            else store.selectDate(dateStr);
                          }}
                        >
                          <span className="font-medium">{slot.start_time.slice(0, 5)}</span>
                          {booking && <span className="ml-1 truncate">{booking.client_name}</span>}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        );
      })()}

      {/* DAGWEERGAVE */}
      {calendarView === "dag" && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg text-neutral-900 mb-4">
            {selectedDate
              ? `${dagNamen[new Date(selectedDate + "T12:00:00").getDay()]} ${new Date(selectedDate + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`
              : `${dagNamen[new Date().getDay()]} ${new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`}
          </h3>
          {(() => {
            const dateStr = selectedDate || todayStr;
            const daySlots = getSlotsFromMap(slotMap, dateStr);

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
                                {eventTypes.find((et) => et.id === booking.event_type_id)?.name || ""}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {booking ? (
                          <Button variant="ghost" size="sm" onClick={() => onSelectBooking(booking)}>Details</Button>
                        ) : slot.is_available ? (
                          <>
                            <Button variant="brand" size="sm" onClick={() => onOpenBookingModal(dateStr, slot.id)} disabled={actionPending}>Boek</Button>
                            <Button variant="outline" size="sm" onClick={() => onToggleSlot(slot.id, slot.is_available)} disabled={actionPending}>Blokkeer</Button>
                          </>
                        ) : slot.google_calendar_event_id !== "google_blocked" ? (
                          <Button variant="outline" size="sm" onClick={() => onToggleSlot(slot.id, slot.is_available)} disabled={actionPending}>Vrijgeven</Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Card>
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
