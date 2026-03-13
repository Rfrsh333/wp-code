"use client";

import { Plus, Trash2 } from "lucide-react";
import { useAgendaStore } from "@/stores/useAgendaStore";
import { useAgendaQueries } from "@/hooks/useAgendaQueries";
import type { Booking, EventType } from "./calendarReducer";
import { getSetting, getStats, statusLabel, getEventTypeName, getEventTypeColor } from "./agendaUtils";
import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import BookingModal from "./BookingModal";
import BookingDetailModal from "./BookingDetailModal";
import OverrideModal from "./OverrideModal";
import EventTypeModal from "./EventTypeModal";
import InternalNotesModal from "./InternalNotesModal";
import { getMonthData } from "./agendaUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function AgendaTab() {
  const store = useAgendaStore();
  const {
    slots, bookings, settings, eventTypes, schedules, overrides,
    view, calendarView, monthOffset, selectedDate, bookingFilter,
    loading, actionPending, actionError, syncing, savingMsg,
    modal,
  } = store;

  const {
    handleSync,
    updateBookingStatus,
    toggleSlotAvailability,
    toggleDayAvailability,
    handleUpdateSetting,
    submitNewBooking,
    submitOverride,
    deleteOverride,
    saveEventType,
    deleteEventType,
    handleUpdateSchedule,
    insertSchedule,
    saveInternalNotes,
    isRefreshing,
  } = useAgendaQueries();

  // ============================================
  // Modal action handlers
  // ============================================

  const openNewBookingModal = (dateStr?: string, slotId?: string) => {
    store.openModal({
      type: "new_booking",
      date: dateStr || "",
      slotId: slotId || "",
      showCustomTime: false,
      name: "",
      email: "",
      phone: "",
      company: "",
      notes: "",
      eventTypeId: eventTypes[0]?.id || "",
      customStart: "",
      customEnd: "",
      saving: false,
      error: "",
    });
  };

  const selectBooking = (booking: Booking) => {
    store.openModal({ type: "booking_detail", booking });
  };

  const openOverrideModal = (dateStr: string) => {
    store.openModal({
      type: "override", date: dateStr, reason: "", blocked: true, startTime: "", endTime: "",
    });
  };

  const openEditNotes = (bookingId: string, notes: string) => {
    store.openModal({ type: "internal_notes", bookingId, notes });
  };

  // ============================================
  // Render
  // ============================================

  const monthData = getMonthData(monthOffset);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-neutral-200 rounded" />
        <div className="h-64 bg-neutral-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <CalendarHeader
        view={view}
        calendarView={calendarView}
        monthName={monthData.monthName}
        monthOffset={monthOffset}
        refreshing={isRefreshing}
        syncing={syncing}
        savingMsg={savingMsg}
        actionError={actionError}
        onSync={handleSync}
      />

      {/* ============ KALENDER VIEW ============ */}
      {view === "kalender" && (
        <CalendarGrid
          calendarView={calendarView}
          monthOffset={monthOffset}
          selectedDate={selectedDate}
          slots={slots}
          bookings={bookings}
          eventTypes={eventTypes}
          overrides={overrides}
          actionPending={actionPending}
          onToggleSlot={toggleSlotAvailability}
          onToggleDay={toggleDayAvailability}
          onOpenBookingModal={openNewBookingModal}
          onOpenOverrideModal={openOverrideModal}
          onSelectBooking={selectBooking}
        />
      )}

      {/* ============ BOEKINGEN VIEW ============ */}
      {view === "boekingen" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2 flex-wrap">
              {["all", "confirmed", "completed", "cancelled", "no_show"].map((f) => (
                <Button
                  key={f}
                  variant={bookingFilter === f ? "brand" : "ghost"}
                  size="sm"
                  onClick={() => store.setBookingFilter(f)}
                >
                  {f === "all" ? `Alles (${bookings.length})` : `${statusLabel(f)} (${bookings.filter((b) => b.status === f).length})`}
                </Button>
              ))}
            </div>
            <Button variant="brand" onClick={() => openNewBookingModal()}>
              <Plus className="w-4 h-4" />
              Nieuwe boeking
            </Button>
          </div>

          <Card className="overflow-hidden p-0">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Klant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Datum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Tijd</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Bron</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {bookings
                  .filter((b) => bookingFilter === "all" || b.status === bookingFilter)
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .map((b) => {
                    const slot = slots.find((s) => s.id === b.slot_id);
                    return (
                      <tr key={b.id} className="hover:bg-neutral-50 cursor-pointer" onClick={() => selectBooking(b)}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-neutral-900">{b.client_name}</p>
                          <p className="text-sm text-neutral-500">{b.client_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          {b.event_type_id ? (
                            <span className="text-xs px-2 py-1 rounded-full text-white" style={{ backgroundColor: getEventTypeColor(eventTypes, b.event_type_id) }}>
                              {getEventTypeName(eventTypes, b.event_type_id)}
                            </span>
                          ) : <span className="text-neutral-400">&mdash;</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700">
                          {slot ? new Date(slot.date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }) : "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                          {slot ? `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}` : "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-500">{b.source || "website"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={b.status as "confirmed" | "completed" | "cancelled" | "no_show"}>{statusLabel(b.status)}</Badge>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            {b.status === "confirmed" && (
                              <>
                                <Button variant="outline" size="xs" onClick={() => updateBookingStatus(b.id, "completed")} disabled={actionPending} className="text-blue-700 border-blue-200 hover:bg-blue-50">Voltooid</Button>
                                <Button variant="outline" size="xs" onClick={() => updateBookingStatus(b.id, "no_show")} disabled={actionPending} className="text-yellow-700 border-yellow-200 hover:bg-yellow-50">No-show</Button>
                                <Button variant="outline" size="xs" onClick={() => updateBookingStatus(b.id, "cancelled")} disabled={actionPending} className="text-red-600 border-red-200 hover:bg-red-50">Annuleer</Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {bookings.filter((b) => bookingFilter === "all" || b.status === bookingFilter).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">Geen boekingen gevonden</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ============ EVENT TYPES VIEW ============ */}
      {view === "event_types" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-neutral-500">Beheer de verschillende typen afspraken die klanten kunnen boeken.</p>
            <Button
              variant="brand"
              onClick={() => {
                store.openModal({
                  type: "event_type",
                  eventType: { id: "", name: "", slug: "", description: "", duration_minutes: 60, buffer_before_minutes: 0, buffer_after_minutes: 15, color: "#F27501", is_active: true, max_bookings_per_day: null, requires_approval: false, sort_order: eventTypes.length } as EventType,
                  isNew: true,
                });
              }}
            >
              <Plus className="w-4 h-4" />
              Nieuw type
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventTypes.sort((a, b) => a.sort_order - b.sort_order).map((et) => (
              <Card key={et.id} className="p-5 hover:shadow-sm transition-shadow relative">
                <div className="absolute top-4 right-4 w-4 h-4 rounded-full" style={{ backgroundColor: et.color }} />
                <h3 className="font-semibold text-neutral-900 mb-1">{et.name}</h3>
                <p className="text-sm text-neutral-500 mb-3 line-clamp-2">{et.description || "Geen beschrijving"}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="secondary">{et.duration_minutes} min</Badge>
                  {et.buffer_after_minutes > 0 && <Badge variant="secondary">{et.buffer_after_minutes}m buffer</Badge>}
                  <Badge variant={et.is_active ? "confirmed" : "cancelled"}>
                    {et.is_active ? "Actief" : "Inactief"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => store.openModal({ type: "event_type", eventType: et, isNew: false })}
                  >
                    Bewerken
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveEventType({ id: et.id, is_active: !et.is_active })}
                  >
                    {et.is_active ? "Deactiveer" : "Activeer"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ============ BESCHIKBAARHEID/SCHEMA VIEW ============ */}
      {view === "beschikbaarheid" && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-neutral-900 mb-1">Wekelijks schema</h3>
            <p className="text-sm text-neutral-500 mb-4">Stel je standaard werkuren per dag in.</p>
            <Separator className="mb-4" />
            <div className="space-y-3">
              {[
                { day: 1, label: "Maandag" },
                { day: 2, label: "Dinsdag" },
                { day: 3, label: "Woensdag" },
                { day: 4, label: "Donderdag" },
                { day: 5, label: "Vrijdag" },
                { day: 6, label: "Zaterdag" },
                { day: 0, label: "Zondag" },
              ].map(({ day, label }) => {
                const schedule = schedules.find((s) => s.day_of_week === day);
                return (
                  <div key={day} className="flex items-center gap-4 p-3 rounded-xl bg-neutral-50">
                    <Switch
                      checked={schedule?.is_active ?? false}
                      onCheckedChange={(checked) => {
                        if (actionPending) return;
                        if (schedule) {
                          handleUpdateSchedule(schedule.id, { is_active: checked });
                        } else {
                          insertSchedule({ day_of_week: day, start_time: "09:00", end_time: "17:00", is_active: true });
                        }
                      }}
                      disabled={actionPending}
                      className="data-[state=checked]:bg-[#F27501]"
                    />
                    <span className="w-24 font-medium text-neutral-900">{label}</span>
                    {schedule?.is_active ? (
                      <div className="flex items-center gap-2">
                        <Input type="time" value={schedule.start_time?.slice(0, 5) || "09:00"} onChange={(e) => handleUpdateSchedule(schedule.id, { start_time: e.target.value })} className="w-auto" />
                        <span className="text-neutral-400">tot</span>
                        <Input type="time" value={schedule.end_time?.slice(0, 5) || "17:00"} onChange={(e) => handleUpdateSchedule(schedule.id, { end_time: e.target.value })} className="w-auto" />
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-400">Gesloten</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-neutral-900">Datum overrides</h3>
                <p className="text-sm text-neutral-500">Blokkeer specifieke datums (vakantie, feestdagen) of voeg extra beschikbaarheid toe.</p>
              </div>
              <Button
                variant="brand"
                onClick={() => openOverrideModal("")}
              >
                <Plus className="w-4 h-4" />
                Override toevoegen
              </Button>
            </div>

            {overrides.length > 0 ? (
              <div className="space-y-2">
                {overrides
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((o) => (
                    <div key={o.id} className={`flex items-center justify-between p-3 rounded-xl ${o.is_blocked ? "bg-red-50" : "bg-green-50"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${o.is_blocked ? "bg-red-400" : "bg-green-400"}`} />
                        <span className="font-medium text-neutral-900">
                          {new Date(o.date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                        </span>
                        {o.start_time && o.end_time && (
                          <span className="text-sm text-neutral-500">{o.start_time.slice(0, 5)} - {o.end_time.slice(0, 5)}</span>
                        )}
                        {!o.start_time && <span className="text-sm text-neutral-500">Hele dag</span>}
                        {o.reason && <span className="text-sm text-neutral-500">— {o.reason}</span>}
                      </div>
                      <Button variant="ghost" size="icon-xs" onClick={() => deleteOverride(o.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-neutral-400 text-sm py-4 text-center">Geen overrides ingesteld</p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-neutral-900">Slots genereren & synchroniseren</h3>
                <p className="text-sm text-neutral-500">Genereer beschikbaarheidsslots op basis van je schema en synchroniseer met Google Calendar.</p>
              </div>
              <Button variant="brand" onClick={handleSync} disabled={syncing}>
                {syncing ? "Bezig..." : "Genereer & sync"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ============ STATISTIEKEN VIEW ============ */}
      {view === "statistieken" && (() => {
        const stats = getStats(bookings, slots);
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Totaal boekingen", value: stats.total, color: "text-neutral-900" },
                { label: "Bevestigd", value: stats.confirmed, color: "text-green-600" },
                { label: "Voltooid", value: stats.completed, color: "text-blue-600" },
                { label: "No-show rate", value: `${stats.noShowRate}%`, color: stats.noShowRate > 10 ? "text-red-600" : "text-green-600" },
              ].map((kpi, i) => (
                <Card key={i} className="p-5">
                  <p className="text-sm text-neutral-500 mb-1">{kpi.label}</p>
                  <p className={`text-4xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </Card>
              ))}
            </div>

            <Card className="p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Maandoverzicht</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-neutral-500">Deze maand</p>
                  <p className="text-4xl font-bold text-[#F27501]">{stats.thisMonth}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Vorige maand</p>
                  <p className="text-4xl font-bold text-neutral-400">{stats.lastMonth}</p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold text-neutral-900 mb-4">Populairste tijden</h3>
                <div className="space-y-2">
                  {stats.popularTimes.map(([time, count]) => (
                    <div key={time} className="flex items-center justify-between">
                      <span className="font-medium">{time}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-neutral-100 rounded-full h-2.5">
                          <div className="bg-[#F27501] h-2.5 rounded-full transition-all" style={{ width: `${(count / Math.max(...stats.popularTimes.map(([,c]) => c))) * 100}%` }} />
                        </div>
                        <span className="text-sm text-neutral-500 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                  {stats.popularTimes.length === 0 && <p className="text-neutral-400 text-sm">Nog geen data</p>}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-neutral-900 mb-4">Populairste dagen</h3>
                <div className="space-y-2">
                  {stats.popularDays.map(([day, count]) => (
                    <div key={day} className="flex items-center justify-between">
                      <span className="font-medium">{day}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-neutral-100 rounded-full h-2.5">
                          <div className="bg-[#F27501] h-2.5 rounded-full transition-all" style={{ width: `${(count / Math.max(...stats.popularDays.map(([,c]) => c))) * 100}%` }} />
                        </div>
                        <span className="text-sm text-neutral-500 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                  {stats.popularDays.length === 0 && <p className="text-neutral-400 text-sm">Nog geen data</p>}
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Status verdeling</h3>
              <div className="flex gap-4">
                {[
                  { label: "Bevestigd", count: stats.confirmed, variant: "confirmed" as const },
                  { label: "Voltooid", count: stats.completed, variant: "completed" as const },
                  { label: "Geannuleerd", count: stats.cancelled, variant: "cancelled" as const },
                  { label: "No-show", count: stats.noShow, variant: "no_show" as const },
                ].map((s) => (
                  <Badge key={s.label} variant={s.variant} className="gap-1">
                    {s.label}: <strong>{s.count}</strong>
                  </Badge>
                ))}
              </div>
              {stats.total > 0 && (
                <div className="mt-3 flex h-4 rounded-full overflow-hidden">
                  {[
                    { count: stats.confirmed, color: "bg-green-400" },
                    { count: stats.completed, color: "bg-blue-400" },
                    { count: stats.cancelled, color: "bg-red-400" },
                    { count: stats.noShow, color: "bg-yellow-400" },
                  ].map((s, i) => (
                    s.count > 0 ? <div key={i} className={`${s.color}`} style={{ width: `${(s.count / stats.total) * 100}%` }} /> : null
                  ))}
                </div>
              )}
            </Card>
          </div>
        );
      })()}

      {/* ============ INSTELLINGEN VIEW ============ */}
      {view === "instellingen" && (
        <div className="max-w-2xl space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-neutral-900 mb-1">E-mail instellingen</h3>
            <Separator className="my-3" />
            <div className="space-y-4">
              <div>
                <Label>Afzender e-mailadres</Label>
                <Input type="email" value={getSetting(settings, "sender_email", "info@toptalentjobs.nl")} onBlur={(e) => handleUpdateSetting("sender_email", e.target.value)} onChange={(e) => store.updateSetting("sender_email", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Afzender naam</Label>
                <Input type="text" value={getSetting(settings, "sender_name", "TopTalent Jobs")} onBlur={(e) => handleUpdateSetting("sender_name", e.target.value)} onChange={(e) => store.updateSetting("sender_name", e.target.value)} className="mt-1" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-900">Auto-reply</p>
                  <p className="text-sm text-neutral-500">Automatisch reactie versturen bij nieuwe aanvraag</p>
                </div>
                <Switch
                  checked={getSetting(settings, "auto_reply_enabled") === "true"}
                  onCheckedChange={(checked) => handleUpdateSetting("auto_reply_enabled", checked ? "true" : "false")}
                  className="data-[state=checked]:bg-[#F27501]"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-neutral-900 mb-1">Booking instellingen</h3>
            <Separator className="my-3" />
            <div className="space-y-4">
              <div>
                <Label>Vooruit boeken (dagen)</Label>
                <select value={getSetting(settings, "booking_horizon_days", "30")} onChange={(e) => handleUpdateSetting("booking_horizon_days", e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="7">7 dagen</option>
                  <option value="14">14 dagen</option>
                  <option value="21">21 dagen</option>
                  <option value="30">30 dagen</option>
                  <option value="60">60 dagen</option>
                  <option value="90">90 dagen</option>
                </select>
              </div>
              <div>
                <Label>Booking pagina introductie tekst</Label>
                <Textarea value={getSetting(settings, "booking_page_intro_text")} onBlur={(e) => handleUpdateSetting("booking_page_intro_text", e.target.value)} onChange={(e) => store.updateSetting("booking_page_intro_text", e.target.value)} rows={3} className="mt-1" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-neutral-900 mb-1">Google Calendar</h3>
            <Separator className="my-3" />
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${getSetting(settings, "google_calendar_last_sync") ? "text-green-600" : "text-neutral-500"}`}>
                  {getSetting(settings, "google_calendar_last_sync")
                    ? `Laatst gesynchroniseerd: ${new Date(getSetting(settings, "google_calendar_last_sync")).toLocaleString("nl-NL")}`
                    : "Niet geconfigureerd \u2014 stel GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET en GOOGLE_REFRESH_TOKEN in als environment variables"}
                </p>
              </div>
              <Button variant="brand" onClick={handleSync} disabled={syncing}>
                {syncing ? "Syncing..." : "Nu synchroniseren"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ============ MODALS ============ */}
      {modal.type === "booking_detail" && (
        <BookingDetailModal
          booking={modal.booking}
          slots={slots}
          eventTypes={eventTypes}
          actionPending={actionPending}
          onStatusChange={updateBookingStatus}
          onEditNotes={openEditNotes}
        />
      )}

      {modal.type === "new_booking" && (
        <BookingModal
          open
          date={modal.date}
          slotId={modal.slotId}
          showCustomTime={modal.showCustomTime}
          name={modal.name}
          email={modal.email}
          phone={modal.phone}
          company={modal.company}
          notes={modal.notes}
          eventTypeId={modal.eventTypeId}
          customStart={modal.customStart}
          customEnd={modal.customEnd}
          saving={modal.saving}
          error={modal.error}
          slots={slots}
          eventTypes={eventTypes}
          onSubmit={submitNewBooking}
        />
      )}

      {modal.type === "event_type" && (
        <EventTypeModal
          open
          eventType={modal.eventType}
          isNew={modal.isNew}
          actionPending={actionPending}
          onSave={saveEventType}
          onDelete={deleteEventType}
        />
      )}

      {modal.type === "override" && (
        <OverrideModal
          open
          date={modal.date}
          reason={modal.reason}
          blocked={modal.blocked}
          startTime={modal.startTime}
          endTime={modal.endTime}
          actionPending={actionPending}
          onSubmit={submitOverride}
        />
      )}

      {modal.type === "internal_notes" && (
        <InternalNotesModal
          open
          bookingId={modal.bookingId}
          notes={modal.notes}
          actionPending={actionPending}
          onSave={saveInternalNotes}
        />
      )}
    </div>
  );
}
