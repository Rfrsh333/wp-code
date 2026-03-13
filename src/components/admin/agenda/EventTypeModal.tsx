"use client";

import type { Dispatch } from "react";
import type { CalendarAction, EventType } from "./calendarReducer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface EventTypeModalProps {
  open: boolean;
  eventType: EventType | null;
  isNew: boolean;
  actionPending: boolean;
  dispatch: Dispatch<CalendarAction>;
  onSave: (et: Partial<EventType> & { id?: string }) => void;
  onDelete: (id: string) => void;
}

export default function EventTypeModal({
  open, eventType, actionPending,
  dispatch, onSave, onDelete,
}: EventTypeModalProps) {
  if (!eventType) return null;

  const update = (updates: Record<string, unknown>) => {
    dispatch({ type: "UPDATE_MODAL", updates: { eventType: { ...eventType, ...updates } } });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) dispatch({ type: "CLOSE_MODAL" }); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{eventType.id ? "Type bewerken" : "Nieuw afspraaktype"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Naam *</label>
            <input type="text" value={eventType.name} onChange={(e) => update({ name: e.target.value, slug: eventType.id ? eventType.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-") })} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Slug</label>
            <input type="text" value={eventType.slug} onChange={(e) => update({ slug: e.target.value })} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Beschrijving</label>
            <textarea value={eventType.description || ""} onChange={(e) => update({ description: e.target.value })} rows={2} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl outline-none resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Duur (min)</label>
              <input type="number" value={eventType.duration_minutes} onChange={(e) => update({ duration_minutes: parseInt(e.target.value) || 60 })} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Buffer voor</label>
              <input type="number" value={eventType.buffer_before_minutes} onChange={(e) => update({ buffer_before_minutes: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Buffer na</label>
              <input type="number" value={eventType.buffer_after_minutes} onChange={(e) => update({ buffer_after_minutes: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Kleur</label>
              <input type="color" value={eventType.color} onChange={(e) => update({ color: e.target.value })} className="w-full h-10 rounded-xl border border-neutral-200 cursor-pointer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Max per dag</label>
              <input type="number" value={eventType.max_bookings_per_day || ""} onChange={(e) => update({ max_bookings_per_day: parseInt(e.target.value) || null })} placeholder="Onbeperkt" className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl outline-none" />
            </div>
          </div>
        </div>

        <DialogFooter className="justify-between">
          {eventType.id && (
            <button onClick={() => { onDelete(eventType.id); dispatch({ type: "CLOSE_MODAL" }); }} disabled={actionPending} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">Verwijderen</button>
          )}
          <div className="flex gap-3 ml-auto">
            <button onClick={() => dispatch({ type: "CLOSE_MODAL" })} className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors">Annuleren</button>
            <button onClick={() => onSave(eventType)} disabled={actionPending} className="px-6 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] font-medium disabled:opacity-50 disabled:cursor-not-allowed">{actionPending ? "Bezig..." : "Opslaan"}</button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
