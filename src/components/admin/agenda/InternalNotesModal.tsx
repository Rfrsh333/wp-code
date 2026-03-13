"use client";

import type { Dispatch } from "react";
import type { CalendarAction } from "./calendarReducer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface InternalNotesModalProps {
  open: boolean;
  bookingId: string;
  notes: string;
  actionPending: boolean;
  dispatch: Dispatch<CalendarAction>;
  onSave: () => void;
}

export default function InternalNotesModal({
  open, notes, actionPending,
  dispatch, onSave,
}: InternalNotesModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) dispatch({ type: "CLOSE_MODAL" }); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Interne notities</DialogTitle>
        </DialogHeader>

        <div>
          <textarea
            value={notes}
            onChange={(e) => dispatch({ type: "UPDATE_MODAL", updates: { notes: e.target.value } })}
            rows={5}
            placeholder="Notities alleen zichtbaar voor admins..."
            className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl outline-none resize-none"
          />
        </div>

        <DialogFooter>
          <button onClick={() => dispatch({ type: "CLOSE_MODAL" })} className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-xl">Annuleren</button>
          <button onClick={onSave} disabled={actionPending} className="px-6 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] font-medium disabled:opacity-50 disabled:cursor-not-allowed">{actionPending ? "Bezig..." : "Opslaan"}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
