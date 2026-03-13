"use client";

import type { CalendarView, TabView } from "./calendarReducer";
import { useAgendaStore } from "@/stores/useAgendaStore";

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
          <button onClick={() => store.setActionError(null)} className="ml-3 text-red-400 hover:text-red-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-neutral-900">Agenda</h2>
          {refreshing && <div className="w-4 h-4 border-2 border-[#F27501] border-t-transparent rounded-full animate-spin" />}
          {savingMsg && <span className="text-sm text-green-600">{savingMsg}</span>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors text-sm disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? "Syncing..." : "Sync"}
          </button>
          <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 flex-wrap">
            {(Object.keys(tabLabels) as TabView[]).map((v) => (
              <button
                key={v}
                onClick={() => store.setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  view === v ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {tabLabels[v]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "kalender" && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {(["maand", "week", "dag"] as CalendarView[]).map((cv) => (
              <button
                key={cv}
                onClick={() => store.setCalendarView(cv)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  calendarView === cv ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {cv === "maand" ? "Maand" : cv === "week" ? "Week" : "Dag"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => store.navigateMonth(-1)}
              className="px-3 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center min-w-[180px]">
              <p className="font-semibold text-neutral-900 capitalize">{monthName}</p>
              {monthOffset !== 0 && (
                <button onClick={() => store.goToday()} className="text-sm text-[#F27501] hover:underline">Vandaag</button>
              )}
            </div>
            <button
              onClick={() => store.navigateMonth(1)}
              className="px-3 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
