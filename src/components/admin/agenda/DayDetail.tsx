"use client";

import { X, Plus } from "lucide-react";
import type { Booking, EventType, Override, Slot } from "./calendarReducer";
import { dagNamen } from "./calendarReducer";
import { getSlotsForDate, getBookingForSlot, getEventTypeName, getEventTypeColor, slotKleur } from "./agendaUtils";
import { useAgendaStore } from "@/stores/useAgendaStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <Card className="mt-4 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-neutral-900">
          {dagNamen[new Date(selectedDate + "T12:00:00").getDay()]}{" "}
          {new Date(selectedDate + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
        </h3>
        <div className="flex gap-2">
          {toggleable.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleDay(selectedDate, !allBlocked)}
              disabled={actionPending}
              className={allBlocked ? "text-green-700 border-green-200 hover:bg-green-50" : "text-red-600 border-red-200 hover:bg-red-50"}
            >
              {allBlocked ? "Maak dag vrij" : "Blokkeer hele dag"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenOverrideModal(selectedDate)} className="text-purple-700 border-purple-200 hover:bg-purple-50">
            Override
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => store.selectDate(null)}>
            <X className="w-4 h-4" />
          </Button>
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
                    <Button variant="ghost" size="sm" onClick={() => onSelectBooking(booking)} className="text-xs h-7">Details</Button>
                  ) : slot.is_available && !isGoogle ? (
                    <>
                      <Button variant="brand" size="sm" onClick={() => onOpenBookingModal(selectedDate, slot.id)} disabled={actionPending} className="text-xs h-7">Boek</Button>
                      <Button variant="outline" size="sm" onClick={() => onToggleSlot(slot.id, slot.is_available)} disabled={actionPending} className="text-xs h-7">Blokkeer</Button>
                    </>
                  ) : !isGoogle ? (
                    <Button variant="outline" size="sm" onClick={() => onToggleSlot(slot.id, slot.is_available)} disabled={actionPending} className="text-xs h-7">Vrijgeven</Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-neutral-400 py-4 text-center">Geen slots op deze dag</p>
      )}

      <Button
        variant="brand"
        className="mt-3 w-full"
        onClick={() => onOpenBookingModal(selectedDate)}
      >
        <Plus className="w-4 h-4" />
        Nieuwe boeking
      </Button>
    </Card>
  );
}
