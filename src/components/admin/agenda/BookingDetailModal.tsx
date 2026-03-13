"use client";

import type { Booking, Slot, EventType } from "./calendarReducer";
import { statusLabel, getEventTypeName, getEventTypeColor } from "./agendaUtils";
import { useAgendaStore } from "@/stores/useAgendaStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface BookingDetailModalProps {
  booking: Booking | null;
  slots: Slot[];
  eventTypes: EventType[];
  actionPending: boolean;
  onStatusChange: (id: string, status: string) => void;
  onEditNotes: (bookingId: string, notes: string) => void;
}

export default function BookingDetailModal({
  booking, slots, eventTypes, actionPending,
  onStatusChange, onEditNotes,
}: BookingDetailModalProps) {
  const store = useAgendaStore();

  if (!booking) return null;

  const slot = slots.find((s) => s.id === booking.slot_id);
  const close = () => store.closeModal();

  return (
    <Dialog open={!!booking} onOpenChange={(isOpen) => { if (!isOpen) close(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Boeking details</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">{booking.client_name}</p>
              <p className="text-sm text-neutral-500">{booking.client_email}</p>
            </div>
            <Badge variant={booking.status as "confirmed" | "completed" | "cancelled" | "no_show"}>{statusLabel(booking.status)}</Badge>
          </div>
          {booking.client_phone && <div><span className="text-sm text-neutral-500">Telefoon:</span> <span>{booking.client_phone}</span></div>}
          {booking.company_name && <div><span className="text-sm text-neutral-500">Bedrijf:</span> <span>{booking.company_name}</span></div>}
          {booking.event_type_id && (
            <div><span className="text-sm text-neutral-500">Type:</span> <span className="ml-2 text-sm px-2 py-1 rounded-full text-white" style={{ backgroundColor: getEventTypeColor(eventTypes, booking.event_type_id) }}>{getEventTypeName(eventTypes, booking.event_type_id)}</span></div>
          )}
          {slot && (
            <div className="bg-[#FEF3E7] rounded-xl p-4">
              <p className="font-medium">{new Date(slot.date).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              <p className="text-[#F27501] font-bold">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</p>
            </div>
          )}
          {booking.notes && <div><span className="text-sm text-neutral-500">Notities klant:</span> <p className="mt-1 text-sm bg-neutral-50 p-3 rounded-lg">{booking.notes}</p></div>}
          <div><span className="text-sm text-neutral-500">Bron:</span> <span className="text-sm ml-1">{booking.source || "website"}</span></div>
          <div><span className="text-sm text-neutral-500">Aangemaakt:</span> <span className="text-sm ml-1">{new Date(booking.created_at).toLocaleString("nl-NL")}</span></div>
          {booking.cancelled_at && <div><span className="text-sm text-neutral-500">Geannuleerd:</span> <span className="text-sm ml-1">{new Date(booking.cancelled_at).toLocaleString("nl-NL")}</span></div>}
          {booking.cancel_reason && <div><span className="text-sm text-neutral-500">Reden:</span> <span className="text-sm ml-1">{booking.cancel_reason}</span></div>}

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700">Interne notities</span>
              <Button
                variant="link"
                size="sm"
                onClick={() => onEditNotes(booking.id, booking.internal_notes || "")}
                className="text-[#F27501] p-0 h-auto"
              >
                Bewerken
              </Button>
            </div>
            <p className="text-sm text-neutral-500">{booking.internal_notes || "Geen interne notities"}</p>
          </div>
        </div>

        <DialogFooter>
          {booking.status === "confirmed" && (
            <>
              <Button variant="outline" size="sm" onClick={() => { onStatusChange(booking.id, "completed"); close(); }} disabled={actionPending} className="text-blue-700 border-blue-200 hover:bg-blue-50">Voltooid</Button>
              <Button variant="outline" size="sm" onClick={() => { onStatusChange(booking.id, "no_show"); close(); }} disabled={actionPending} className="text-yellow-700 border-yellow-200 hover:bg-yellow-50">No-show</Button>
              <Button variant="destructive" size="sm" onClick={() => { onStatusChange(booking.id, "cancelled"); close(); }} disabled={actionPending}>Annuleer</Button>
            </>
          )}
          <Button variant="default" size="sm" onClick={close}>Sluiten</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
