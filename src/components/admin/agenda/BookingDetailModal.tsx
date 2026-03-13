"use client";

import type { Booking, Slot, EventType } from "./calendarReducer";
import { statusLabel, getEventTypeName, getEventTypeColor, isKandidaatBooking } from "./agendaUtils";
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
  const isKand = isKandidaatBooking(booking);

  return (
    <Dialog open={!!booking} onOpenChange={(isOpen) => { if (!isOpen) close(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isKand ? "Kandidaat boeking" : "Boeking details"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-lg">{booking.client_name}</p>
                {isKand && <Badge variant="kandidaat">Kandidaat</Badge>}
              </div>
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
            <div className={isKand ? "bg-purple-50 rounded-xl p-4" : "bg-[#FEF3E7] rounded-xl p-4"}>
              <p className="font-medium">{new Date(slot.date).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              <p className={isKand ? "text-purple-600 font-bold" : "text-[#F27501] font-bold"}>{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</p>
            </div>
          )}

          {/* Kandidaat-specifieke sectie */}
          {isKand && (
            <>
              <Separator />
              <div className="bg-purple-50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-purple-700">Kandidaat informatie</p>
                {booking.kandidaat_notities && (
                  <div><span className="text-sm text-neutral-500">Notities:</span> <p className="mt-1 text-sm">{booking.kandidaat_notities}</p></div>
                )}
                {booking.kandidaat_cv_url && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-500">CV:</span>
                    <a href={booking.kandidaat_cv_url} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Download CV
                    </a>
                  </div>
                )}
                {booking.google_meet_link && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-500">Meet:</span>
                    <a href={booking.google_meet_link} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Google Meet link
                    </a>
                  </div>
                )}
                {booking.inschrijving_id && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-500">Inschrijving:</span>
                    <span className="text-sm font-mono text-neutral-600">{booking.inschrijving_id.slice(0, 8)}...</span>
                  </div>
                )}
              </div>
            </>
          )}

          {!isKand && booking.notes && <div><span className="text-sm text-neutral-500">Notities klant:</span> <p className="mt-1 text-sm bg-neutral-50 p-3 rounded-lg">{booking.notes}</p></div>}
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
