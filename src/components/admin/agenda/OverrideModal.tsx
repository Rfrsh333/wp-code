"use client";

import { useAgendaStore } from "@/stores/useAgendaStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface OverrideModalProps {
  open: boolean;
  date: string;
  reason: string;
  blocked: boolean;
  startTime: string;
  endTime: string;
  actionPending: boolean;
  onSubmit: () => void;
}

export default function OverrideModal({
  open, date, reason, blocked, startTime, endTime,
  actionPending, onSubmit,
}: OverrideModalProps) {
  const store = useAgendaStore();

  const update = (updates: Record<string, unknown>) => {
    store.updateModal(updates);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) store.closeModal(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Datum override</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Datum</Label>
            <Input type="date" value={date} onChange={(e) => update({ date: e.target.value })} className="mt-1" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="override_type" checked={blocked} onChange={() => update({ blocked: true })} className="accent-[#F27501]" />
              <span>Blokkeren</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="override_type" checked={!blocked} onChange={() => update({ blocked: false })} className="accent-[#F27501]" />
              <span>Extra beschikbaar</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start (leeg = hele dag)</Label>
              <Input type="time" value={startTime} onChange={(e) => update({ startTime: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Eind</Label>
              <Input type="time" value={endTime} onChange={(e) => update({ endTime: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Reden (optioneel)</Label>
            <Input type="text" value={reason} onChange={(e) => update({ reason: e.target.value })} placeholder="Bijv. Kerstvakantie" className="mt-1" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => store.closeModal()}>Annuleren</Button>
          <Button variant="brand" onClick={onSubmit} disabled={actionPending}>{actionPending ? "Bezig..." : "Toevoegen"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
