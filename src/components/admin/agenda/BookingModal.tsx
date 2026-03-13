"use client";

import type { Dispatch } from "react";
import type { CalendarAction, EventType, Slot } from "./calendarReducer";
import { getSlotsForDate } from "./agendaUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface BookingModalProps {
  open: boolean;
  date: string;
  slotId: string;
  showCustomTime: boolean;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  eventTypeId: string;
  customStart: string;
  customEnd: string;
  saving: boolean;
  error: string;
  slots: Slot[];
  eventTypes: EventType[];
  dispatch: Dispatch<CalendarAction>;
  onSubmit: () => void;
}

export default function BookingModal({
  open, date, slotId, showCustomTime, name, email, phone, company, notes,
  eventTypeId, customStart, customEnd, saving, error,
  slots, eventTypes, dispatch, onSubmit,
}: BookingModalProps) {
  const availableSlots = date
    ? getSlotsForDate(slots, date).filter((s) => s.is_available && !s.is_booked)
    : [];

  const update = (updates: Record<string, unknown>) => {
    dispatch({ type: "UPDATE_MODAL", updates });
  };

  const canSubmit = !saving
    && (!!slotId || (!!date && !!customStart && !!customEnd))
    && !!name.trim()
    && !!email.trim();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) dispatch({ type: "CLOSE_MODAL" }); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuwe boeking</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}

          {eventTypes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Afspraaktype</label>
              <select value={eventTypeId} onChange={(e) => update({ eventTypeId: e.target.value })} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none">
                <option value="">Geen type</option>
                {eventTypes.filter((et) => et.is_active).map((et) => (
                  <option key={et.id} value={et.id}>{et.name} ({et.duration_minutes} min)</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Datum *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => update({ date: e.target.value, slotId: "", customStart: "", customEnd: "", showCustomTime: false })}
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none"
            />
          </div>

          {date && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Tijdslot *</label>
              {availableSlots.length > 0 && !showCustomTime ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => update({ slotId: slot.id, customStart: "", customEnd: "", showCustomTime: false })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          slotId === slot.id ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                        }`}
                      >
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </button>
                    ))}
                  </div>
                  {!slotId && (
                    <button onClick={() => update({ showCustomTime: true, slotId: "" })} className="text-xs text-[#F27501] hover:underline">
                      Of voer een aangepaste tijd in
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  {availableSlots.length === 0 && (
                    <p className="text-sm text-neutral-500 mb-2">Geen vooraf gegenereerde slots voor deze datum.</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <input type="time" value={customStart} onChange={(e) => update({ customStart: e.target.value, slotId: "" })} className="flex-1 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none text-sm" />
                    <span className="text-neutral-400 text-sm">tot</span>
                    <input type="time" value={customEnd} onChange={(e) => update({ customEnd: e.target.value, slotId: "" })} className="flex-1 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none text-sm" />
                  </div>
                  {availableSlots.length > 0 && (
                    <button onClick={() => update({ showCustomTime: false, customStart: "", customEnd: "" })} className="text-xs text-neutral-500 hover:text-neutral-700 mt-2">
                      Terug naar beschikbare slots
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Naam *</label>
              <input type="text" value={name} onChange={(e) => update({ name: e.target.value })} placeholder="Jan de Vries" className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">E-mail *</label>
              <input type="email" value={email} onChange={(e) => update({ email: e.target.value })} placeholder="jan@bedrijf.nl" className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Telefoon</label>
              <input type="tel" value={phone} onChange={(e) => update({ phone: e.target.value })} placeholder="06-12345678" className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Bedrijf</label>
              <input type="text" value={company} onChange={(e) => update({ company: e.target.value })} placeholder="Bedrijfsnaam BV" className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Notities</label>
            <textarea value={notes} onChange={(e) => update({ notes: e.target.value })} rows={3} placeholder="Opmerkingen..." className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none resize-none" />
          </div>
        </div>

        <DialogFooter>
          <button onClick={() => dispatch({ type: "CLOSE_MODAL" })} className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors">Annuleren</button>
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="px-6 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {saving ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Aanmaken...</>) : "Boeking aanmaken"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
