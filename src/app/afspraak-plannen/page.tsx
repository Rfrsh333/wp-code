"use client";

import { Suspense, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { generateICS } from "@/lib/ics";

/* ───────────── Types ───────────── */

interface SlotInfo {
  id: string;
  start: string;
  eind: string;
}

interface DagInfo {
  datum: string;
  dag: string;
  slots: SlotInfo[];
}

interface EventType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  color: string;
}

interface Inquiry {
  id: string;
  contactpersoon: string;
  email: string;
  telefoon: string;
  bedrijfsnaam: string;
}

interface BookingResult {
  id: string;
  datum: string;
  datum_formatted: string;
  start_time: string;
  end_time: string;
  client_name: string;
  manage_url?: string;
}

type FormErrors = {
  naam?: string;
  email?: string;
};

/* ───────────── Helpers ───────────── */

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

const MONTH_NAMES = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

const DAY_HEADERS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ───────────── Skeleton Components ───────────── */

function CalendarSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-40 bg-neutral-200 rounded-lg" />
        <div className="flex gap-2">
          <div className="w-9 h-9 bg-neutral-200 rounded-lg" />
          <div className="w-20 h-9 bg-neutral-200 rounded-lg" />
          <div className="w-9 h-9 bg-neutral-200 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 bg-neutral-100 rounded" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-11 bg-neutral-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function SlotsSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden="true">
      <div className="h-6 w-48 bg-neutral-200 rounded-lg" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-neutral-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/* ───────────── Animated Checkmark ───────────── */

function AnimatedCheckmark() {
  return (
    <div className="w-20 h-20 mx-auto mb-6 relative">
      <svg viewBox="0 0 80 80" className="w-full h-full" aria-hidden="true">
        <circle
          cx="40" cy="40" r="36"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeDasharray="226"
          strokeDashoffset="226"
          className="animate-[circleStroke_0.6s_ease-out_forwards]"
        />
        <path
          d="M24 42 L34 52 L56 30"
          fill="none"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="50"
          strokeDashoffset="50"
          className="animate-[checkStroke_0.4s_ease-out_0.5s_forwards]"
        />
      </svg>
    </div>
  );
}

/* ───────────── Main Page ───────────── */

export default function AfspraakPlannenPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="animate-pulse text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-neutral-200 mx-auto" />
            <div className="h-5 w-48 bg-neutral-200 rounded-lg mx-auto" />
          </div>
        </div>
      }
    >
      <AfspraakPlannenContent />
    </Suspense>
  );
}

function AfspraakPlannenContent() {
  const searchParams = useSearchParams();
  const inquiryRef = searchParams.get("ref");

  /* ── Data state ── */
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [days, setDays] = useState<DagInfo[]>([]);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [introText, setIntroText] = useState("");
  const [senderName, setSenderName] = useState("TopTalent Jobs");

  /* ── Calendar state ── */
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);

  /* ── Selection state ── */
  const [selectedDatum, setSelectedDatum] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);

  /* ── Form state ── */
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [bedrijfsnaam, setBedrijfsnaam] = useState("");
  const [notes, setNotes] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  /* ── Booking state ── */
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  /* ── Refs ── */
  const slotsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  /* ── Available dates set (for calendar dots) ── */
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    for (const d of days) set.add(d.datum);
    return set;
  }, [days]);

  /* ── Slots for selected date ── */
  const selectedDag = days.find((d) => d.datum === selectedDatum);

  /* ── Current step (simplified: event type → date+time → details → done) ── */
  const currentStep = bookingResult
    ? 4
    : selectedSlot
      ? 3
      : selectedEventType
        ? 2
        : 1;

  /* ── Validate form field ── */
  const validateField = useCallback((field: string, value: string): string | undefined => {
    if (field === "naam") {
      if (!value.trim()) return "Vul je naam in";
      if (value.trim().length < 2) return "Naam is te kort";
    }
    if (field === "email") {
      if (!value.trim()) return "Vul je e-mailadres in";
      if (!isValidEmail(value)) return "Ongeldig e-mailadres";
    }
    return undefined;
  }, []);

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, value);
    setFormErrors((prev) => ({ ...prev, [field]: err }));
  };

  /* ── Fetch event types ── */
  const fetchEventTypes = useCallback(async () => {
    try {
      const url = inquiryRef ? `/api/bookings?ref=${inquiryRef}` : "/api/bookings";
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Er ging iets mis");
        return;
      }

      if (data.event_types) {
        setEventTypes(data.event_types);
        if (data.event_types.length === 1) {
          setSelectedEventType(data.event_types[0]);
        }
      }

      setIntroText(data.intro_text || "");
      setSenderName(data.sender_name || "TopTalent Jobs");

      if (data.inquiry) {
        setInquiry(data.inquiry);
        setNaam(data.inquiry.contactpersoon || "");
        setEmail(data.inquiry.email || "");
        setTelefoon(data.inquiry.telefoon || "");
        setBedrijfsnaam(data.inquiry.bedrijfsnaam || "");
      }
    } catch {
      setError("Kon geen verbinding maken met de server");
    } finally {
      setLoading(false);
    }
  }, [inquiryRef]);

  /* ── Fetch slots ── */
  const fetchSlots = useCallback(async (slug: string) => {
    setSlotsLoading(true);
    try {
      const url = inquiryRef
        ? `/api/bookings?type=${slug}&ref=${inquiryRef}`
        : `/api/bookings?type=${slug}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Er ging iets mis");
        return;
      }

      setDays(data.days || []);

      // Auto-navigate calendar to first available month
      if (data.days?.length) {
        const firstDate = new Date(data.days[0].datum);
        setViewMonth(firstDate.getMonth());
        setViewYear(firstDate.getFullYear());
      }
    } catch {
      setError("Kon slots niet ophalen");
    } finally {
      setSlotsLoading(false);
    }
  }, [inquiryRef]);

  useEffect(() => {
    fetchEventTypes();
  }, [fetchEventTypes]);

  useEffect(() => {
    if (selectedEventType) {
      fetchSlots(selectedEventType.slug);
    }
  }, [selectedEventType, fetchSlots]);

  // Scroll to slots when date selected (mobile)
  useEffect(() => {
    if (selectedDatum && slotsRef.current && window.innerWidth < 768) {
      setTimeout(() => {
        slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [selectedDatum]);

  // Scroll to form when slot selected
  useEffect(() => {
    if (selectedSlot && formRef.current) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [selectedSlot]);

  /* ── Calendar navigation ── */
  const navigateMonth = (dir: -1 | 1) => {
    setSlideDirection(dir === 1 ? "left" : "right");
    setTimeout(() => {
      setViewMonth((prev) => {
        const newMonth = prev + dir;
        if (newMonth < 0) {
          setViewYear((y) => y - 1);
          return 11;
        }
        if (newMonth > 11) {
          setViewYear((y) => y + 1);
          return 0;
        }
        return newMonth;
      });
      setSlideDirection(null);
    }, 150);
  };

  const goToToday = () => {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
  };

  /* ── Handle booking ── */
  const handleBook = async () => {
    // Validate all fields
    const naamErr = validateField("naam", naam);
    const emailErr = validateField("email", email);
    if (naamErr || emailErr) {
      setFormErrors({ naam: naamErr, email: emailErr });
      setTouched({ naam: true, email: true });
      return;
    }

    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          event_type_id: selectedEventType?.id || null,
          client_name: naam.trim(),
          client_email: email.trim(),
          client_phone: telefoon.trim() || undefined,
          company_name: bedrijfsnaam.trim() || undefined,
          notes: notes.trim() || undefined,
          inquiry_id: inquiry?.id || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError("Dit tijdslot is helaas net geboekt. Kies een ander tijdstip.");
          setSelectedSlot(null);
          if (selectedEventType) fetchSlots(selectedEventType.slug);
        } else {
          setError(data.error || "Kon afspraak niet boeken");
        }
        return;
      }

      setBookingResult(data.booking);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Er ging iets mis bij het boeken");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── ICS download ── */
  const downloadICS = () => {
    if (!bookingResult) return;
    const icsContent = generateICS({
      title: `${selectedEventType?.name || "Gesprek"} met ${senderName}`,
      description: `${selectedEventType?.name || "Kennismakingsgesprek"} met ${senderName}.${notes ? `\nNotities: ${notes}` : ""}`,
      startDate: bookingResult.datum,
      startTime: bookingResult.start_time,
      endTime: bookingResult.end_time,
    });

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `afspraak-toptalent-${bookingResult.datum}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Google Calendar link ── */
  const googleCalendarUrl = useMemo(() => {
    if (!bookingResult) return "";
    const title = encodeURIComponent(`${selectedEventType?.name || "Gesprek"} met ${senderName}`);
    const startDt = `${bookingResult.datum.replace(/-/g, "")}T${bookingResult.start_time.replace(/:/g, "")}00`;
    const endDt = `${bookingResult.datum.replace(/-/g, "")}T${bookingResult.end_time.replace(/:/g, "")}00`;
    const details = encodeURIComponent(`${selectedEventType?.name || "Kennismakingsgesprek"} met ${senderName}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDt}/${endDt}&details=${details}`;
  }, [bookingResult, selectedEventType, senderName]);

  /* ───────── Calendar grid cells ───────── */
  const calendarCells = useMemo(() => {
    const totalDays = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
    const cells: { day: number; dateKey: string; isCurrentMonth: boolean; isToday: boolean; hasSlots: boolean; isPast: boolean }[] = [];

    // Previous month filler
    const prevMonthDays = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, dateKey: key, isCurrentMonth: false, isToday: false, hasSlots: availableDates.has(key), isPast: true });
    }

    // Current month
    const todayKey = toDateKey(today);
    for (let d = 1; d <= totalDays; d++) {
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dateObj = new Date(viewYear, viewMonth, d);
      cells.push({
        day: d,
        dateKey: key,
        isCurrentMonth: true,
        isToday: key === todayKey,
        hasSlots: availableDates.has(key),
        isPast: dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      });
    }

    // Next month filler
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, dateKey: key, isCurrentMonth: false, isToday: false, hasSlots: availableDates.has(key), isPast: false });
    }

    return cells;
  }, [viewYear, viewMonth, availableDates, today]);

  /* ───────── RENDER: Initial loading ───────── */
  if (loading && !selectedEventType) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <div className="animate-pulse space-y-3">
              <div className="h-8 w-64 bg-white/20 rounded-lg mx-auto" />
              <div className="h-5 w-96 bg-white/10 rounded-lg mx-auto" />
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 -mt-6">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <CalendarSkeleton />
          </div>
        </div>
      </div>
    );
  }

  /* ───────── RENDER: Confirmation page ───────── */
  if (bookingResult) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <style>{`
          @keyframes circleStroke { to { stroke-dashoffset: 0; } }
          @keyframes checkStroke { to { stroke-dashoffset: 0; } }
          @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
        <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white">
          <div className="max-w-3xl mx-auto px-4 py-14 text-center">
            <AnimatedCheckmark />
            <h1 className="text-3xl font-bold mb-2 animate-[fadeSlideUp_0.5s_ease-out_0.8s_both]">
              Je afspraak is bevestigd!
            </h1>
            <p className="text-white/90 text-lg animate-[fadeSlideUp_0.5s_ease-out_1s_both]">
              We kijken ernaar uit je te spreken.
            </p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 -mt-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 animate-[fadeSlideUp_0.5s_ease-out_0.6s_both]">
            {/* Booking summary card */}
            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-neutral-100">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: selectedEventType?.color || "#F97316" }}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-neutral-500">{selectedEventType?.name || "Gesprek"}</p>
                <p className="font-semibold text-neutral-900 text-lg">{bookingResult.datum_formatted}</p>
                <p className="text-[#F97316] font-bold text-lg">{bookingResult.start_time} - {bookingResult.end_time}</p>
              </div>
            </div>

            <p className="text-neutral-600 text-sm mb-6">
              Een bevestiging is verstuurd naar <strong>{email}</strong>. Voeg de afspraak toe aan je agenda zodat je het niet vergeet.
            </p>

            {/* Calendar add buttons */}
            <div className="space-y-3">
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-[#F97316] text-white rounded-xl hover:bg-[#EA580C] transition-all duration-300 font-medium shadow-lg shadow-orange-500/20"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V8h15v11.5z" />
                </svg>
                Google Calendar
              </a>
              <button
                onClick={downloadICS}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border-2 border-neutral-200 text-neutral-700 rounded-xl hover:border-neutral-300 hover:bg-neutral-50 transition-all duration-300 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Andere agenda (.ics)
              </button>
            </div>

            {bookingResult.manage_url && (
              <div className="mt-6 pt-6 border-t border-neutral-100 text-center">
                <a
                  href={bookingResult.manage_url}
                  className="text-sm text-neutral-500 hover:text-[#F97316] transition-colors"
                >
                  Afspraak wijzigen of annuleren &rarr;
                </a>
              </div>
            )}
          </div>

          <div className="text-center mt-8 pb-8">
            <p className="text-sm text-neutral-400">
              <a href="https://www.toptalentjobs.nl" className="text-[#F97316] hover:underline font-medium">TopTalent Jobs</a>
              {" "}&mdash; Specialist in horeca personeel
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ───────── RENDER: Main booking flow ───────── */
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white">
        <div className="max-w-4xl mx-auto px-4 py-10 md:py-12 text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Plan een gesprek in</h1>
          <p className="text-white/90 text-base md:text-lg max-w-xl mx-auto">
            {introText || "Kies een datum en tijd die jou het beste uitkomt."}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-6 pb-32 md:pb-12">
        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center justify-between"
            role="alert"
          >
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-3 text-red-400 hover:text-red-600 transition-colors"
              aria-label="Sluit foutmelding"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Step 1: Event type selection */}
        {!selectedEventType && eventTypes.length > 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Waarvoor wil je een afspraak?</h2>
            <p className="text-sm text-neutral-500 mb-6">Selecteer het type gesprek dat bij je past.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {eventTypes.map((et) => (
                <button
                  key={et.id}
                  onClick={() => setSelectedEventType(et)}
                  className="group p-5 rounded-xl border-2 border-neutral-200 hover:border-[#F97316] hover:shadow-lg transition-all duration-300 text-left"
                  aria-label={`${et.name}, ${et.duration_minutes} minuten`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-3 h-3 rounded-full ring-4 ring-transparent group-hover:ring-[#F97316]/10 transition-all"
                      style={{ backgroundColor: et.color }}
                    />
                    <h3 className="font-semibold text-neutral-900">{et.name}</h3>
                  </div>
                  {et.description && (
                    <p className="text-sm text-neutral-500 mb-3 line-clamp-2">{et.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-neutral-400 group-hover:text-[#F97316] transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {et.duration_minutes} minuten
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No event types */}
        {!selectedEventType && eventTypes.length === 0 && !loading && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">Geen beschikbaarheid</h2>
            <p className="text-neutral-500 mb-4">
              Er zijn momenteel geen afspraaktypen beschikbaar.
            </p>
            <a
              href="mailto:info@toptalentjobs.nl"
              className="inline-flex items-center gap-2 text-[#F97316] hover:underline font-medium"
            >
              Neem contact op
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        )}

        {/* Step 2: Date + Time (combined two-column) */}
        {selectedEventType && (
          <div className="space-y-4">
            {/* Selected type banner */}
            <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedEventType.color }} />
                <div>
                  <p className="font-semibold text-neutral-900">{selectedEventType.name}</p>
                  <p className="text-sm text-neutral-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {selectedEventType.duration_minutes} min
                  </p>
                </div>
              </div>
              {eventTypes.length > 1 && (
                <button
                  onClick={() => {
                    setSelectedEventType(null);
                    setSelectedDatum(null);
                    setSelectedSlot(null);
                    setDays([]);
                  }}
                  className="text-sm text-[#F97316] hover:underline font-medium"
                >
                  Wijzig
                </button>
              )}
            </div>

            {slotsLoading ? (
              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8">
                  <CalendarSkeleton />
                  <SlotsSkeleton />
                </div>
              </div>
            ) : days.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-neutral-900 mb-2">Geen tijdslots beschikbaar</h2>
                <p className="text-neutral-500">
                  Neem contact op via{" "}
                  <a href="mailto:info@toptalentjobs.nl" className="text-[#F97316] hover:underline">info@toptalentjobs.nl</a>
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-5 md:p-8">
                {/* Two-column layout: Calendar + Slots */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6 md:gap-8">
                  {/* Calendar */}
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-lg font-semibold text-neutral-900 capitalize">
                        {MONTH_NAMES[viewMonth]} {viewYear}
                      </h2>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigateMonth(-1)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600"
                          aria-label="Vorige maand"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={goToToday}
                          className="px-3 h-9 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                        >
                          Vandaag
                        </button>
                        <button
                          onClick={() => navigateMonth(1)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600"
                          aria-label="Volgende maand"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-1">
                      {DAY_HEADERS.map((d) => (
                        <div key={d} className="text-center text-xs font-medium text-neutral-400 py-2">
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div
                      className={`grid grid-cols-7 gap-0.5 transition-all duration-150 motion-reduce:transition-none ${
                        slideDirection === "left"
                          ? "opacity-0 -translate-x-4"
                          : slideDirection === "right"
                            ? "opacity-0 translate-x-4"
                            : "opacity-100 translate-x-0"
                      }`}
                      role="grid"
                      aria-label="Kalender"
                    >
                      {calendarCells.map((cell, idx) => {
                        const isSelected = cell.dateKey === selectedDatum;
                        const canSelect = cell.isCurrentMonth && cell.hasSlots && !cell.isPast;

                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (canSelect) {
                                setSelectedDatum(cell.dateKey);
                                setSelectedSlot(null);
                              }
                            }}
                            disabled={!canSelect}
                            className={`
                              relative h-11 rounded-lg text-sm font-medium transition-all duration-200
                              focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-1 outline-none
                              ${!cell.isCurrentMonth ? "text-neutral-300" : ""}
                              ${cell.isCurrentMonth && !canSelect ? "text-neutral-300 cursor-default" : ""}
                              ${canSelect && !isSelected ? "text-neutral-900 hover:bg-[#FEF3E7] cursor-pointer" : ""}
                              ${isSelected ? "bg-[#F97316] text-white shadow-md shadow-orange-500/20" : ""}
                              ${cell.isToday && !isSelected ? "ring-2 ring-[#F97316]/30" : ""}
                            `}
                            aria-label={`${cell.day} ${MONTH_NAMES[viewMonth]}${cell.hasSlots ? ", beschikbaar" : ""}${isSelected ? ", geselecteerd" : ""}`}
                            aria-selected={isSelected}
                            role="gridcell"
                          >
                            {cell.day}
                            {cell.hasSlots && !isSelected && cell.isCurrentMonth && (
                              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#F97316]" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 text-xs text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                        Beschikbaar
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#F97316] ring-2 ring-[#F97316]/30" />
                        Vandaag
                      </div>
                    </div>
                  </div>

                  {/* Time slots panel (right column on desktop, below on mobile) */}
                  <div ref={slotsRef} className="md:border-l md:pl-8 md:border-neutral-100">
                    {!selectedDatum ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-8 md:py-0">
                        <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-neutral-500 text-sm">Kies een datum in de kalender</p>
                        <p className="text-neutral-400 text-xs mt-1">Oranje stippen = beschikbaar</p>
                      </div>
                    ) : selectedDag ? (
                      <div>
                        <h3 className="font-semibold text-neutral-900 mb-1 capitalize">
                          {selectedDag.dag}{" "}
                          {new Date(selectedDatum).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                        </h3>
                        <p className="text-xs text-neutral-400 mb-4">
                          {selectedDag.slots.length} {selectedDag.slots.length === 1 ? "tijdstip" : "tijdstippen"} beschikbaar
                        </p>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                          {selectedDag.slots.map((slot, idx) => {
                            const isSelected = selectedSlot?.id === slot.id;
                            return (
                              <button
                                key={slot.id}
                                onClick={() => setSelectedSlot(isSelected ? null : slot)}
                                className={`
                                  w-full py-3 px-4 rounded-xl border-2 text-left transition-all duration-200
                                  focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-1 outline-none
                                  motion-reduce:transition-none
                                  ${isSelected
                                    ? "border-[#F97316] bg-[#F97316] text-white shadow-md shadow-orange-500/20"
                                    : "border-neutral-200 hover:border-[#F97316] hover:bg-[#FEF3E7]"
                                  }
                                `}
                                style={{
                                  animationDelay: `${idx * 50}ms`,
                                  animation: "fadeSlideUp 0.3s ease-out both",
                                }}
                                aria-label={`${slot.start} tot ${slot.eind}${isSelected ? ", geselecteerd" : ""}`}
                                aria-selected={isSelected}
                              >
                                <span className="font-semibold">{slot.start}</span>
                                <span className={isSelected ? "text-white/70" : "text-neutral-400"}> &mdash; {slot.eind}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-neutral-500 text-sm">Geen tijdstippen op deze dag</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Details form */}
            {selectedSlot && (
              <div ref={formRef} className="bg-white rounded-2xl shadow-lg p-5 md:p-8 animate-[fadeSlideUp_0.3s_ease-out]">
                <style>{`
                  @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
                `}</style>

                <h2 className="text-lg font-semibold text-neutral-900 mb-1">Nog even je gegevens</h2>
                <p className="text-sm text-neutral-500 mb-6">Dan kunnen wij je bevestiging sturen.</p>

                {/* Selected time summary */}
                <div className="bg-neutral-50 rounded-xl p-4 mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: selectedEventType.color }}
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">{selectedEventType.name}</p>
                      <p className="font-medium text-neutral-900">
                        {selectedDag?.dag} {new Date(selectedDatum!).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                      </p>
                      <p className="text-[#F97316] font-bold">{selectedSlot.start} - {selectedSlot.eind}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSlot(null)}
                    className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
                    aria-label="Wijzig datum en tijd"
                  >
                    Wijzig
                  </button>
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="booking-naam" className="block text-sm font-medium text-neutral-700 mb-1">
                        Naam <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="booking-naam"
                        type="text"
                        value={naam}
                        onChange={(e) => {
                          setNaam(e.target.value);
                          if (touched.naam) {
                            setFormErrors((prev) => ({ ...prev, naam: validateField("naam", e.target.value) }));
                          }
                        }}
                        onBlur={() => handleBlur("naam", naam)}
                        placeholder="Je volledige naam"
                        className={`w-full px-4 py-3 border rounded-xl outline-none transition-all bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] ${
                          touched.naam && formErrors.naam ? "border-red-300 focus:ring-red-200 focus:border-red-400" : "border-neutral-200"
                        }`}
                        aria-invalid={touched.naam && !!formErrors.naam}
                        aria-describedby={formErrors.naam ? "naam-error" : undefined}
                        autoComplete="name"
                      />
                      {touched.naam && formErrors.naam && (
                        <p id="naam-error" className="text-red-500 text-xs mt-1 flex items-center gap-1" role="alert">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formErrors.naam}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="booking-email" className="block text-sm font-medium text-neutral-700 mb-1">
                        E-mailadres <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="booking-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (touched.email) {
                            setFormErrors((prev) => ({ ...prev, email: validateField("email", e.target.value) }));
                          }
                        }}
                        onBlur={() => handleBlur("email", email)}
                        placeholder="je@email.nl"
                        className={`w-full px-4 py-3 border rounded-xl outline-none transition-all bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] ${
                          touched.email && formErrors.email ? "border-red-300 focus:ring-red-200 focus:border-red-400" : "border-neutral-200"
                        }`}
                        aria-invalid={touched.email && !!formErrors.email}
                        aria-describedby={formErrors.email ? "email-error" : undefined}
                        autoComplete="email"
                      />
                      {touched.email && formErrors.email && (
                        <p id="email-error" className="text-red-500 text-xs mt-1 flex items-center gap-1" role="alert">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formErrors.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="booking-telefoon" className="block text-sm font-medium text-neutral-700 mb-1">
                        Telefoonnummer <span className="text-neutral-400 text-xs font-normal">optioneel</span>
                      </label>
                      <input
                        id="booking-telefoon"
                        type="tel"
                        value={telefoon}
                        onChange={(e) => setTelefoon(e.target.value)}
                        placeholder="06-12345678"
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl outline-none transition-all bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
                        autoComplete="tel"
                      />
                    </div>
                    <div>
                      <label htmlFor="booking-bedrijf" className="block text-sm font-medium text-neutral-700 mb-1">
                        Bedrijfsnaam <span className="text-neutral-400 text-xs font-normal">optioneel</span>
                      </label>
                      <input
                        id="booking-bedrijf"
                        type="text"
                        value={bedrijfsnaam}
                        onChange={(e) => setBedrijfsnaam(e.target.value)}
                        placeholder="Je bedrijf"
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl outline-none transition-all bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
                        autoComplete="organization"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="booking-notes" className="block text-sm font-medium text-neutral-700 mb-1">
                      Waar gaat het gesprek over? <span className="text-neutral-400 text-xs font-normal">optioneel</span>
                    </label>
                    <textarea
                      id="booking-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Bijv. ik zoek 3 koks voor een kerstevenement"
                      rows={3}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl outline-none transition-all bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] resize-none"
                    />
                  </div>
                </div>

                {/* Desktop submit button */}
                <button
                  onClick={handleBook}
                  disabled={submitting}
                  className="hidden md:flex w-full mt-6 items-center justify-center gap-2 bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 hover:bg-[#EA580C] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Bezig met boeken...
                    </>
                  ) : (
                    <>
                      Afspraak bevestigen
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 pb-4">
          <p className="text-sm text-neutral-400">
            <a href="https://www.toptalentjobs.nl" className="text-[#F97316] hover:underline font-medium">TopTalent Jobs</a>
            {" "}&mdash; Specialist in horeca personeel
          </p>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      {selectedSlot && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200 p-4 md:hidden safe-area-pb z-50">
          <button
            onClick={handleBook}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Bezig met boeken...
              </>
            ) : (
              <>
                Afspraak bevestigen
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
