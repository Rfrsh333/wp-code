"use client";

import type { EventType } from "./calendarReducer";
import { useAgendaStore } from "@/stores/useAgendaStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface EventTypeModalProps {
  open: boolean;
  eventType: EventType | null;
  isNew: boolean;
  actionPending: boolean;
  onSave: (et: Partial<EventType> & { id?: string }) => void;
  onDelete: (id: string) => void;
}

export default function EventTypeModal({
  open, eventType, actionPending,
  onSave, onDelete,
}: EventTypeModalProps) {
  const store = useAgendaStore();

  if (!eventType) return null;

  const update = (updates: Record<string, unknown>) => {
    store.updateModal({ eventType: { ...eventType, ...updates } });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) store.closeModal(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{eventType.id ? "Type bewerken" : "Nieuw afspraaktype"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Naam *</Label>
            <Input type="text" value={eventType.name} onChange={(e) => update({ name: e.target.value, slug: eventType.id ? eventType.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-") })} className="mt-1" />
          </div>
          <div>
            <Label>Slug</Label>
            <Input type="text" value={eventType.slug} onChange={(e) => update({ slug: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Beschrijving</Label>
            <Textarea value={eventType.description || ""} onChange={(e) => update({ description: e.target.value })} rows={2} className="mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Duur (min)</Label>
              <Input type="number" value={eventType.duration_minutes} onChange={(e) => update({ duration_minutes: parseInt(e.target.value) || 60 })} className="mt-1" />
            </div>
            <div>
              <Label>Buffer voor</Label>
              <Input type="number" value={eventType.buffer_before_minutes} onChange={(e) => update({ buffer_before_minutes: parseInt(e.target.value) || 0 })} className="mt-1" />
            </div>
            <div>
              <Label>Buffer na</Label>
              <Input type="number" value={eventType.buffer_after_minutes} onChange={(e) => update({ buffer_after_minutes: parseInt(e.target.value) || 0 })} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kleur</Label>
              <input type="color" value={eventType.color} onChange={(e) => update({ color: e.target.value })} className="w-full h-10 rounded-xl border border-neutral-200 cursor-pointer mt-1" />
            </div>
            <div>
              <Label>Max per dag</Label>
              <Input type="number" value={eventType.max_bookings_per_day || ""} onChange={(e) => update({ max_bookings_per_day: parseInt(e.target.value) || null })} placeholder="Onbeperkt" className="mt-1" />
            </div>
          </div>
        </div>

        <DialogFooter className="justify-between">
          {eventType.id && (
            <Button variant="destructive" size="sm" onClick={() => { onDelete(eventType.id); store.closeModal(); }} disabled={actionPending}>Verwijderen</Button>
          )}
          <div className="flex gap-3 ml-auto">
            <Button variant="ghost" onClick={() => store.closeModal()}>Annuleren</Button>
            <Button variant="brand" onClick={() => onSave(eventType)} disabled={actionPending}>{actionPending ? "Bezig..." : "Opslaan"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
