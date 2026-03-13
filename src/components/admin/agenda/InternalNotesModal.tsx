"use client";

import { useAgendaStore } from "@/stores/useAgendaStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface InternalNotesModalProps {
  open: boolean;
  bookingId: string;
  notes: string;
  actionPending: boolean;
  onSave: () => void;
}

export default function InternalNotesModal({
  open, notes, actionPending, onSave,
}: InternalNotesModalProps) {
  const store = useAgendaStore();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) store.closeModal(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Interne notities</DialogTitle>
        </DialogHeader>

        <div>
          <Textarea
            value={notes}
            onChange={(e) => store.updateModal({ notes: e.target.value })}
            rows={5}
            placeholder="Notities alleen zichtbaar voor admins..."
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => store.closeModal()}>Annuleren</Button>
          <Button variant="brand" onClick={onSave} disabled={actionPending}>{actionPending ? "Bezig..." : "Opslaan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
