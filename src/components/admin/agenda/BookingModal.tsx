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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
              <Label>Afspraaktype</Label>
              <select {...register("eventTypeId")} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">Geen type</option>
                {eventTypes.filter((et) => et.is_active).map((et) => (
                  <option key={et.id} value={et.id}>{et.name} ({et.duration_minutes} min)</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label>Datum *</Label>
            <Input
              type="date"
              {...register("date")}
              onChange={(e) => {
                setValue("date", e.target.value);
                setValue("slotId", "");
                setValue("customStart", "");
                setValue("customEnd", "");
                setValue("showCustomTime", false);
              }}
              className="mt-1"
            />
            {errors.date && <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>}
          </div>

          {watchDate && (
            <div>
              <Label>Tijdslot *</Label>
              {availableSlots.length > 0 && !watchShowCustomTime ? (
                <div className="space-y-2 mt-1">
                  <div className="flex flex-wrap gap-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.id}
                        type="button"
                        variant={watchSlotId === slot.id ? "brand" : "outline"}
                        size="sm"
                        onClick={() => {
                          setValue("slotId", slot.id);
                          setValue("customStart", "");
                          setValue("customEnd", "");
                          setValue("showCustomTime", false);
                        }}
                      >
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </Button>
                    ))}
                  </div>
                  {!watchSlotId && (
                    <Button type="button" variant="link" size="sm" onClick={() => { setValue("showCustomTime", true); setValue("slotId", ""); }} className="text-[#F27501] p-0 h-auto">
                      Of voer een aangepaste tijd in
                    </Button>
                  )}
                </div>
              ) : (
                <div className="mt-1">
                  {availableSlots.length === 0 && (
                    <p className="text-sm text-neutral-500 mb-2">Geen vooraf gegenereerde slots voor deze datum.</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Input type="time" {...register("customStart")} onChange={(e) => { setValue("customStart", e.target.value); setValue("slotId", ""); }} className="flex-1" />
                    <span className="text-neutral-400 text-sm">tot</span>
                    <Input type="time" {...register("customEnd")} onChange={(e) => { setValue("customEnd", e.target.value); setValue("slotId", ""); }} className="flex-1" />
                  </div>
                  {availableSlots.length > 0 && (
                    <Button type="button" variant="link" size="sm" onClick={() => { setValue("showCustomTime", false); setValue("customStart", ""); setValue("customEnd", ""); }} className="text-neutral-500 p-0 h-auto mt-2">
                      Terug naar beschikbare slots
                    </Button>
                  )}
                </div>
              )}
              {errors.slotId && <p className="text-sm text-red-600 mt-1">{errors.slotId.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Naam *</Label>
              <Input type="text" {...register("name")} placeholder="Jan de Vries" className="mt-1" />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input type="email" {...register("email")} placeholder="jan@bedrijf.nl" className="mt-1" />
              {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Telefoon</Label>
              <Input type="tel" {...register("phone")} placeholder="06-12345678" className="mt-1" />
            </div>
            <div>
              <Label>Bedrijf</Label>
              <Input type="text" {...register("company")} placeholder="Bedrijfsnaam BV" className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Notities</Label>
            <Textarea {...register("notes")} rows={3} placeholder="Opmerkingen..." className="mt-1" />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => store.closeModal()}>Annuleren</Button>
            <Button
              type="submit"
              variant="brand"
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Aanmaken...</>) : "Boeking aanmaken"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
