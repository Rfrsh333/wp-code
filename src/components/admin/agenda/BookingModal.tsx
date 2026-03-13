"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import type { EventType, Slot } from "./calendarReducer";
import { getSlotsForDate } from "./agendaUtils";
import { useAgendaStore } from "@/stores/useAgendaStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const bookingSchema = z.object({
  eventTypeId: z.string().optional(),
  date: z.string().min(1, "Datum is verplicht"),
  slotId: z.string().optional(),
  showCustomTime: z.boolean(),
  customStart: z.string().optional(),
  customEnd: z.string().optional(),
  name: z.string().min(1, "Naam is verplicht"),
  email: z.string().min(1, "E-mail is verplicht").email("Ongeldig e-mailadres"),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => !!data.slotId || (!!data.customStart && !!data.customEnd),
  { message: "Kies een tijdslot of vul een aangepaste tijd in", path: ["slotId"] }
);

type BookingFormValues = z.infer<typeof bookingSchema>;

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
  onSubmit: () => void;
}

export default function BookingModal({
  open, date, slotId, showCustomTime, name, email, phone, company, notes,
  eventTypeId, customStart, customEnd, saving, error,
  slots, eventTypes, onSubmit,
}: BookingModalProps) {
  const store = useAgendaStore();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      eventTypeId: eventTypeId || "",
      date,
      slotId: slotId || "",
      showCustomTime,
      customStart,
      customEnd,
      name,
      email,
      phone,
      company,
      notes,
    },
  });

  const { register, watch, setValue, handleSubmit, formState: { errors } } = form;
  const watchDate = watch("date");
  const watchSlotId = watch("slotId");
  const watchShowCustomTime = watch("showCustomTime");

  // Sync form values back to Zustand modal state for compatibility
  useEffect(() => {
    const subscription = form.watch((values) => {
      store.updateModal(values as Record<string, unknown>);
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableSlots = watchDate
    ? getSlotsForDate(slots, watchDate).filter((s) => s.is_available && !s.is_booked)
    : [];

  const onFormSubmit = () => {
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) store.closeModal(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuwe boeking</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}

          {eventTypes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Afspraaktype</label>
              <select {...register("eventTypeId")} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none">
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
              {...register("date")}
              onChange={(e) => {
                setValue("date", e.target.value);
                setValue("slotId", "");
                setValue("customStart", "");
                setValue("customEnd", "");
                setValue("showCustomTime", false);
              }}
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none"
            />
            {errors.date && <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>}
          </div>

          {watchDate && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Tijdslot *</label>
              {availableSlots.length > 0 && !watchShowCustomTime ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => {
                          setValue("slotId", slot.id);
                          setValue("customStart", "");
                          setValue("customEnd", "");
                          setValue("showCustomTime", false);
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          watchSlotId === slot.id ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                        }`}
                      >
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </button>
                    ))}
                  </div>
                  {!watchSlotId && (
                    <button type="button" onClick={() => { setValue("showCustomTime", true); setValue("slotId", ""); }} className="text-xs text-[#F27501] hover:underline">
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
                    <input type="time" {...register("customStart")} onChange={(e) => { setValue("customStart", e.target.value); setValue("slotId", ""); }} className="flex-1 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none text-sm" />
                    <span className="text-neutral-400 text-sm">tot</span>
                    <input type="time" {...register("customEnd")} onChange={(e) => { setValue("customEnd", e.target.value); setValue("slotId", ""); }} className="flex-1 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none text-sm" />
                  </div>
                  {availableSlots.length > 0 && (
                    <button type="button" onClick={() => { setValue("showCustomTime", false); setValue("customStart", ""); setValue("customEnd", ""); }} className="text-xs text-neutral-500 hover:text-neutral-700 mt-2">
                      Terug naar beschikbare slots
                    </button>
                  )}
                </div>
              )}
              {errors.slotId && <p className="text-sm text-red-600 mt-1">{errors.slotId.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Naam *</label>
              <input type="text" {...register("name")} placeholder="Jan de Vries" className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none" />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">E-mail *</label>
              <input type="email" {...register("email")} placeholder="jan@bedrijf.nl" className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none" />
              {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Telefoon</label>
              <input type="tel" {...register("phone")} placeholder="06-12345678" className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Bedrijf</label>
              <input type="text" {...register("company")} placeholder="Bedrijfsnaam BV" className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Notities</label>
            <textarea {...register("notes")} rows={3} placeholder="Opmerkingen..." className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none resize-none" />
          </div>

          <DialogFooter>
            <button type="button" onClick={() => store.closeModal()} className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors">Annuleren</button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
            >
              {saving ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Aanmaken...</>) : "Boeking aanmaken"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
