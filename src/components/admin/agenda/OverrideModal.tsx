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

interface OverrideModalProps {
  open: boolean;
  date: string;
  reason: string;
  blocked: boolean;
  startTime: string;
  endTime: string;
  actionPending: boolean;
  dispatch: Dispatch<CalendarAction>;
  onSubmit: () => void;
}

export default function OverrideModal({
  open, date, reason, blocked, startTime, endTime,
  actionPending, dispatch, onSubmit,
}: OverrideModalProps) {
  const update = (updates: Record<string, unknown>) => {
    dispatch({ type: "UPDATE_MODAL", updates });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) dispatch({ type: "CLOSE_MODAL" }); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Datum override</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Datum</label>
            <input type="date" value={date} onChange={(e) => update({ date: e.target.value })} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl outline-none" />
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
              <label className="block text-sm font-medium text-neutral-700 mb-1">Start (leeg = hele dag)</label>
              <input type="time" value={startTime} onChange={(e) => update({ startTime: e.target.value })} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Eind</label>
              <input type="time" value={endTime} onChange={(e) => update({ endTime: e.target.value })} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Reden (optioneel)</label>
            <input type="text" value={reason} onChange={(e) => update({ reason: e.target.value })} placeholder="Bijv. Kerstvakantie" className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl outline-none" />
          </div>
        </div>

        <DialogFooter>
          <button onClick={() => dispatch({ type: "CLOSE_MODAL" })} className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-xl">Annuleren</button>
          <button onClick={onSubmit} disabled={actionPending} className="px-6 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] font-medium disabled:opacity-50 disabled:cursor-not-allowed">{actionPending ? "Bezig..." : "Toevoegen"}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
