"use client";

import { ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";
import type { CalendarView, TabView } from "./calendarReducer";
import { useAgendaStore } from "@/stores/useAgendaStore";
import { Button } from "@/components/ui/button";

interface CalendarHeaderProps {
  view: TabView;
  calendarView: CalendarView;
  monthName: string;
  monthOffset: number;
  refreshing: boolean;
  syncing: boolean;
  savingMsg: string;
  actionError: string | null;
  onSync: () => void;
}

const tabLabels: Record<TabView, string> = {
  kalender: "Kalender",
  boekingen: "Boekingen",
  event_types: "Types",
  beschikbaarheid: "Schema",
  statistieken: "Stats",
  instellingen: "Instellingen",
};

export default function CalendarHeader({
  view, calendarView, monthName, monthOffset,
  refreshing, syncing, savingMsg, actionError,
  onSync,
}: CalendarHeaderProps) {
  const store = useAgendaStore();

  return (
    <>
      {actionError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{actionError}</span>
          <Button variant="ghost" size="icon-xs" onClick={() => store.setActionError(null)} className="ml-3 text-red-400 hover:text-red-600">
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-neutral-900">Agenda</h2>
          {refreshing && <div className="w-4 h-4 border-2 border-[#F27501] border-t-transparent rounded-full animate-spin" />}
          {savingMsg && <span className="text-sm text-green-600">{savingMsg}</span>}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={syncing}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync"}
          </Button>
          <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 flex-wrap">
            {(Object.keys(tabLabels) as TabView[]).map((v) => (
              <Button
                key={v}
                variant="ghost"
                size="sm"
                onClick={() => store.setView(v)}
                className={`rounded-lg ${
                  view === v ? "bg-white text-neutral-900 shadow-sm hover:bg-white" : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {tabLabels[v]}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {view === "kalender" && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {(["maand", "week", "dag"] as CalendarView[]).map((cv) => (
              <Button
                key={cv}
                variant={calendarView === cv ? "brand" : "outline"}
                size="sm"
                onClick={() => store.setCalendarView(cv)}
              >
                {cv === "maand" ? "Maand" : cv === "week" ? "Week" : "Dag"}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => store.navigateMonth(-1)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center min-w-[180px]">
              <p className="font-semibold text-neutral-900 capitalize">{monthName}</p>
              {monthOffset !== 0 && (
                <Button variant="link" size="sm" onClick={() => store.goToday()} className="text-[#F27501] p-0 h-auto">Vandaag</Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => store.navigateMonth(1)}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
