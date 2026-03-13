"use client";

import type { Booking, Slot, EventType } from "./calendarReducer";
import { statusKleur, statusLabel, getEventTypeName, getEventTypeColor } from "./agendaUtils";
import { useAgendaStore } from "@/stores/useAgendaStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusKleur(booking.status)}`}>{statusLabel(booking.status)}</span>
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

          <div className="border-t pt-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700">Interne notities</span>
              <button
                onClick={() => onEditNotes(booking.id, booking.internal_notes || "")}
                className="text-xs text-[#F27501] hover:underline"
              >
                Bewerken
              </button>
            </div>
            <p className="text-sm text-neutral-500">{booking.internal_notes || "Geen interne notities"}</p>
          </div>
        </div>

        <DialogFooter>
          {booking.status === "confirmed" && (
            <>
              <button onClick={() => { onStatusChange(booking.id, "completed"); close(); }} disabled={actionPending} className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">Voltooid</button>
              <button onClick={() => { onStatusChange(booking.id, "no_show"); close(); }} disabled={actionPending} className="px-4 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">No-show</button>
              <button onClick={() => { onStatusChange(booking.id, "cancelled"); close(); }} disabled={actionPending} className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">Annuleer</button>
            </>
          )}
          <button onClick={close} className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 text-sm font-medium">Sluiten</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
