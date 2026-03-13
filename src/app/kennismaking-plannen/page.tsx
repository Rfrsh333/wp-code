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

interface BookingResult {
  id: string;
  datum: string;
  datum_formatted: string;
  start_time: string;
  end_time: string;
  client_name: string;
  manage_url?: string;
  meet_link?: string;
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
  return day === 0 ? 6 : day - 1;
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

const ACCENT = "#8B5CF6";
const ACCENT_DARK = "#7C3AED";

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

/* ───────────── CV Upload Component ───────────── */

function CVUpload({ file, onFileChange, error }: {
  file: File | null;
  onFileChange: (f: File | null) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFileChange(f);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1">
        CV uploaden <span className="text-neutral-400 text-xs font-normal">optioneel, max 5MB</span>
      </label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
          ${dragOver ? `border-[${ACCENT}] bg-purple-50` : "border-neutral-200 hover:border-purple-300 hover:bg-purple-50/50"}
          ${error ? "border-red-300" : ""}
        `}
      >
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium text-neutral-700">{file.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onFileChange(null); }}
              className="text-neutral-400 hover:text-red-500 ml-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <svg className="w-8 h-8 mx-auto text-neutral-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-neutral-500">Sleep je CV hierheen of <span className="text-purple-600 font-medium">klik om te uploaden</span></p>
            <p className="text-xs text-neutral-400 mt-1">PDF, DOC of DOCX</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
      />
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}

/* ───────────── Main Page ───────────── */

export default function KennismakingPlannenPage() {
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
      <KennismakingPlannenContent />
    </Suspense>
  );
}

function KennismakingPlannenContent() {
  const searchParams = useSearchParams();
  const refId = searchParams.get("ref");
  const prefillNaam = searchParams.get("naam");
  const prefillEmail = searchParams.get("email");
  const prefillTelefoon = searchParams.get("telefoon");

  /* ── Data state ── */
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<DagInfo[]>([]);

  /* ── Calendar state ── */
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);

  /* ── Selection state ── */
  const [selectedDatum, setSelectedDatum] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);

  /* ── Form state ── */
  const [naam, setNaam] = useState(prefillNaam || "");
  const [email, setEmail] = useState(prefillEmail || "");
  const [telefoon, setTelefoon] = useState(prefillTelefoon || "");
  const [notities, setNotities] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string | undefined>();
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  /* ── Booking state ── */
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  /* ── Refs ── */
  const slotsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  /* ── Available dates set ── */
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    for (const d of days) set.add(d.datum);
    return set;
  }, [days]);

  const selectedDag = days.find((d) => d.datum === selectedDatum);

  /* ── Validate ── */
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

  /* ── Pre-fill from inschrijving ref ── */
  const fetchInschrijving = useCallback(async () => {
    if (!refId) return;
    try {
      const res = await fetch(`/api/inschrijvingen/${refId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.voornaam) setNaam(`${data.voornaam} ${data.achternaam || ""}`.trim());
        if (data.email) setEmail(data.email);
        if (data.telefoon) setTelefoon(data.telefoon);
      }
    } catch {
      // Silently fail — prefill is optional
    }
  }, [refId]);

  /* ── Fetch slots (always kennismakingsgesprek-kandidaat) ── */
  const fetchSlots = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const res = await fetch("/api/bookings?booking_type=kandidaat");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Er ging iets mis");
        return;
      }

      setDays(data.days || []);

      if (data.days?.length) {
        const firstDate = new Date(data.days[0].datum);
        setViewMonth(firstDate.getMonth());
        setViewYear(firstDate.getFullYear());
      }
    } catch {
      setError("Kon beschikbare tijden niet ophalen");
    } finally {
      setSlotsLoading(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
    fetchInschrijving();
  }, [fetchSlots, fetchInschrijving]);

  // Scroll to slots on mobile
  useEffect(() => {
    if (selectedDatum && slotsRef.current && window.innerWidth < 768) {
      setTimeout(() => slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [selectedDatum]);

  useEffect(() => {
    if (selectedSlot && formRef.current) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [selectedSlot]);

  /* ── Calendar navigation ── */
  const navigateMonth = (dir: -1 | 1) => {
    setSlideDirection(dir === 1 ? "left" : "right");
    setTimeout(() => {
      setViewMonth((prev) => {
        const newMonth = prev + dir;
        if (newMonth < 0) { setViewYear((y) => y - 1); return 11; }
        if (newMonth > 11) { setViewYear((y) => y + 1); return 0; }
        return newMonth;
      });
      setSlideDirection(null);
    }, 150);
  };

  const goToToday = () => {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
  };

  /* ── CV file validation ── */
  const handleCvFile = (f: File | null) => {
    setCvError(undefined);
    if (f) {
      const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (!allowed.includes(f.type)) {
        setCvError("Alleen PDF, DOC of DOCX bestanden");
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setCvError("Bestand is te groot (max 5MB)");
        return;
      }
    }
    setCvFile(f);
  };

  /* ── Handle booking ── */
  const handleBook = async () => {
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
      // Upload CV if present
      let cvUrl: string | undefined;
      if (cvFile) {
        const formData = new FormData();
        formData.append("file", cvFile);
        const uploadRes = await fetch("/api/cv-upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          cvUrl = uploadData.url;
        }
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          booking_type: "kandidaat",
          kandidaat_naam: naam.trim(),
          kandidaat_email: email.trim(),
          kandidaat_telefoon: telefoon.trim() || undefined,
          kandidaat_notities: notities.trim() || undefined,
          kandidaat_cv_url: cvUrl || undefined,
          inschrijving_id: refId || undefined,
          client_name: naam.trim(),
          client_email: email.trim(),
          client_phone: telefoon.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError("Dit tijdslot is helaas net geboekt. Kies een ander tijdstip.");
          setSelectedSlot(null);
          fetchSlots();
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
      title: "Kennismakingsgesprek TopTalent Jobs",
      description: `Kennismakingsgesprek met TopTalent Jobs${bookingResult.meet_link ? `\nGoogle Meet: ${bookingResult.meet_link}` : ""}`,
      startDate: bookingResult.datum,
      startTime: bookingResult.start_time,
      endTime: bookingResult.end_time,
    });
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kennismaking-toptalent-${bookingResult.datum}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Google Calendar link ── */
  const googleCalendarUrl = useMemo(() => {
    if (!bookingResult) return "";
    const title = encodeURIComponent("Kennismakingsgesprek TopTalent Jobs");
    const startDt = `${bookingResult.datum.replace(/-/g, "")}T${bookingResult.start_time.replace(/:/g, "")}00`;
    const endDt = `${bookingResult.datum.replace(/-/g, "")}T${bookingResult.end_time.replace(/:/g, "")}00`;
    const details = encodeURIComponent("Kennismakingsgesprek met TopTalent Jobs");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDt}/${endDt}&details=${details}`;
  }, [bookingResult]);

  /* ── Calendar grid cells ── */
  const calendarCells = useMemo(() => {
    const totalDays = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
    const cells: { day: number; dateKey: string; isCurrentMonth: boolean; isToday: boolean; hasSlots: boolean; isPast: boolean }[] = [];

    const prevMonthDays = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, dateKey: key, isCurrentMonth: false, isToday: false, hasSlots: availableDates.has(key), isPast: true });
    }

    const todayKey = toDateKey(today);
    for (let d = 1; d <= totalDays; d++) {
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dateObj = new Date(viewYear, viewMonth, d);
      cells.push({
        day: d, dateKey: key, isCurrentMonth: true,
        isToday: key === todayKey,
        hasSlots: availableDates.has(key),
        isPast: dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      });
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, dateKey: key, isCurrentMonth: false, isToday: false, hasSlots: availableDates.has(key), isPast: false });
    }

    return cells;
  }, [viewYear, viewMonth, availableDates, today]);

  /* ───────── RENDER: Loading ───────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white">
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

  /* ───────── RENDER: Confirmation ───────── */
  if (bookingResult) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <style>{`
          @keyframes circleStroke { to { stroke-dashoffset: 0; } }
          @keyframes checkStroke { to { stroke-dashoffset: 0; } }
          @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
        <div className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white">
          <div className="max-w-3xl mx-auto px-4 py-14 text-center">
            <AnimatedCheckmark />
            <h1 className="text-3xl font-bold mb-2 animate-[fadeSlideUp_0.5s_ease-out_0.8s_both]">
              Je kennismakingsgesprek is ingepland!
            </h1>
            <p className="text-white/90 text-lg animate-[fadeSlideUp_0.5s_ease-out_1s_both]">
              We kijken ernaar uit je te ontmoeten.
            </p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 -mt-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 animate-[fadeSlideUp_0.5s_ease-out_0.6s_both]">
            {/* Summary card */}
            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-neutral-100">
              <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Kennismakingsgesprek (15 min)</p>
                <p className="font-semibold text-neutral-900 text-lg">{bookingResult.datum_formatted}</p>
                <p className="text-purple-600 font-bold text-lg">{bookingResult.start_time} - {bookingResult.end_time}</p>
              </div>
            </div>

            {/* Meet link */}
            {bookingResult.meet_link && (
              <a
                href={bookingResult.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-300 font-medium shadow-lg shadow-purple-500/20 mb-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Deelnemen via Google Meet
              </a>
            )}

            <p className="text-neutral-600 text-sm mb-6">
              Een bevestiging is verstuurd naar <strong>{email}</strong>.
              {bookingResult.meet_link && " De Google Meet link staat ook in de bevestigingsmail."}
            </p>

            {/* Calendar buttons */}
            <div className="space-y-3">
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border-2 border-purple-200 text-purple-700 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all duration-300 font-medium"
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
                <a href={bookingResult.manage_url} className="text-sm text-neutral-500 hover:text-purple-600 transition-colors">
                  Afspraak wijzigen of annuleren &rarr;
                </a>
              </div>
            )}
          </div>

          <div className="text-center mt-8 pb-8">
            <p className="text-sm text-neutral-400">
              <a href="https://www.toptalentjobs.nl" className="text-purple-600 hover:underline font-medium">TopTalent Jobs</a>
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
      <div className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white">
        <div className="max-w-4xl mx-auto px-4 py-10 md:py-12 text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Plan je kennismakingsgesprek</h1>
          <p className="text-white/90 text-base md:text-lg max-w-xl mx-auto">
            Kies een datum en tijd voor een kort videogesprek van 15 minuten.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-6 pb-32 md:pb-12">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center justify-between" role="alert">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600 transition-colors" aria-label="Sluit foutmelding">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Step 1: Date + Time */}
        <div className="space-y-4">
          {/* Event type banner */}
          <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <div>
              <p className="font-semibold text-neutral-900">Kennismakingsgesprek</p>
              <p className="text-sm text-neutral-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                15 min &middot; Video call
              </p>
            </div>
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
                <a href="mailto:info@toptalentjobs.nl" className="text-purple-600 hover:underline">info@toptalentjobs.nl</a>
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-5 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6 md:gap-8">
                {/* Calendar */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-neutral-900 capitalize">
                      {MONTH_NAMES[viewMonth]} {viewYear}
                    </h2>
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigateMonth(-1)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600" aria-label="Vorige maand">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button onClick={goToToday} className="px-3 h-9 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors">Vandaag</button>
                      <button onClick={() => navigateMonth(1)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600" aria-label="Volgende maand">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 mb-1">
                    {DAY_HEADERS.map((d) => (
                      <div key={d} className="text-center text-xs font-medium text-neutral-400 py-2">{d}</div>
                    ))}
                  </div>

                  <div
                    className={`grid grid-cols-7 gap-0.5 transition-all duration-150 motion-reduce:transition-none ${
                      slideDirection === "left" ? "opacity-0 -translate-x-4"
                        : slideDirection === "right" ? "opacity-0 translate-x-4"
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
                          onClick={() => { if (canSelect) { setSelectedDatum(cell.dateKey); setSelectedSlot(null); } }}
                          disabled={!canSelect}
                          className={`
                            relative h-11 rounded-lg text-sm font-medium transition-all duration-200
                            focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1 outline-none
                            ${!cell.isCurrentMonth ? "text-neutral-300" : ""}
                            ${cell.isCurrentMonth && !canSelect ? "text-neutral-300 cursor-default" : ""}
                            ${canSelect && !isSelected ? "text-neutral-900 hover:bg-purple-50 cursor-pointer" : ""}
                            ${isSelected ? "bg-purple-600 text-white shadow-md shadow-purple-500/20" : ""}
                            ${cell.isToday && !isSelected ? "ring-2 ring-purple-400/30" : ""}
                          `}
                          aria-label={`${cell.day} ${MONTH_NAMES[viewMonth]}${cell.hasSlots ? ", beschikbaar" : ""}${isSelected ? ", geselecteerd" : ""}`}
                          aria-selected={isSelected}
                          role="gridcell"
                        >
                          {cell.day}
                          {cell.hasSlots && !isSelected && cell.isCurrentMonth && (
                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-4 mt-4 text-xs text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      Beschikbaar
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500 ring-2 ring-purple-400/30" />
                      Vandaag
                    </div>
                  </div>
                </div>

                {/* Time slots */}
                <div ref={slotsRef} className="md:border-l md:pl-8 md:border-neutral-100">
                  {!selectedDatum ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8 md:py-0">
                      <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-neutral-500 text-sm">Kies een datum in de kalender</p>
                      <p className="text-neutral-400 text-xs mt-1">Paarse stippen = beschikbaar</p>
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
                          const isSlotSelected = selectedSlot?.id === slot.id;
                          return (
                            <button
                              key={slot.id}
                              onClick={() => setSelectedSlot(isSlotSelected ? null : slot)}
                              className={`
                                w-full py-3 px-4 rounded-xl border-2 text-left transition-all duration-200
                                focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1 outline-none
                                ${isSlotSelected
                                  ? "border-purple-500 bg-purple-600 text-white shadow-md shadow-purple-500/20"
                                  : "border-neutral-200 hover:border-purple-400 hover:bg-purple-50"
                                }
                              `}
                              style={{ animationDelay: `${idx * 50}ms`, animation: "fadeSlideUp 0.3s ease-out both" }}
                              aria-selected={isSlotSelected}
                            >
                              <span className="font-semibold">{slot.start}</span>
                              <span className={isSlotSelected ? "text-white/70" : "text-neutral-400"}> &mdash; {slot.eind}</span>
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

          {/* Step 2: Details form */}
          {selectedSlot && (
            <div ref={formRef} className="bg-white rounded-2xl shadow-lg p-5 md:p-8 animate-[fadeSlideUp_0.3s_ease-out]">
              <style>{`
                @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
              `}</style>

              <h2 className="text-lg font-semibold text-neutral-900 mb-1">Je gegevens</h2>
              <p className="text-sm text-neutral-500 mb-6">Zodat wij je bevestiging en Meet-link kunnen sturen.</p>

              {/* Selected time summary */}
              <div className="bg-purple-50 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Kennismakingsgesprek (15 min)</p>
                    <p className="font-medium text-neutral-900">
                      {selectedDag?.dag} {new Date(selectedDatum!).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                    </p>
                    <p className="text-purple-600 font-bold">{selectedSlot.start} - {selectedSlot.eind}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedSlot(null)} className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors" aria-label="Wijzig datum en tijd">Wijzig</button>
              </div>

              {/* Form fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="kb-naam" className="block text-sm font-medium text-neutral-700 mb-1">
                      Naam <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="kb-naam"
                      type="text"
                      value={naam}
                      onChange={(e) => { setNaam(e.target.value); if (touched.naam) setFormErrors((prev) => ({ ...prev, naam: validateField("naam", e.target.value) })); }}
                      onBlur={() => handleBlur("naam", naam)}
                      placeholder="Je volledige naam"
                      className={`w-full px-4 py-3 border rounded-xl outline-none transition-all bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 ${touched.naam && formErrors.naam ? "border-red-300" : "border-neutral-200"}`}
                      autoComplete="name"
                    />
                    {touched.naam && formErrors.naam && <p className="text-red-500 text-xs mt-1">{formErrors.naam}</p>}
                  </div>
                  <div>
                    <label htmlFor="kb-email" className="block text-sm font-medium text-neutral-700 mb-1">
                      E-mailadres <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="kb-email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (touched.email) setFormErrors((prev) => ({ ...prev, email: validateField("email", e.target.value) })); }}
                      onBlur={() => handleBlur("email", email)}
                      placeholder="je@email.nl"
                      className={`w-full px-4 py-3 border rounded-xl outline-none transition-all bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 ${touched.email && formErrors.email ? "border-red-300" : "border-neutral-200"}`}
                      autoComplete="email"
                    />
                    {touched.email && formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                  </div>
                </div>
                <div>
                  <label htmlFor="kb-telefoon" className="block text-sm font-medium text-neutral-700 mb-1">
                    Telefoonnummer <span className="text-neutral-400 text-xs font-normal">optioneel</span>
                  </label>
                  <input
                    id="kb-telefoon"
                    type="tel"
                    value={telefoon}
                    onChange={(e) => setTelefoon(e.target.value)}
                    placeholder="06-12345678"
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl outline-none transition-all bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    autoComplete="tel"
                  />
                </div>

                <CVUpload file={cvFile} onFileChange={handleCvFile} error={cvError} />

                <div>
                  <label htmlFor="kb-notities" className="block text-sm font-medium text-neutral-700 mb-1">
                    Opmerkingen <span className="text-neutral-400 text-xs font-normal">optioneel</span>
                  </label>
                  <textarea
                    id="kb-notities"
                    value={notities}
                    onChange={(e) => setNotities(e.target.value)}
                    placeholder="Bijv. ik heb ervaring als kok en ben direct beschikbaar"
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl outline-none transition-all bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                  />
                  <p className="text-xs text-neutral-400 text-right mt-1">{notities.length}/500</p>
                </div>
              </div>

              <button
                onClick={handleBook}
                disabled={submitting}
                className="hidden md:flex w-full mt-6 items-center justify-center gap-2 bg-purple-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 hover:bg-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Bezig met boeken...
                  </>
                ) : (
                  <>
                    Gesprek bevestigen
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="text-center mt-8 pb-4">
          <p className="text-sm text-neutral-400">
            <a href="https://www.toptalentjobs.nl" className="text-purple-600 hover:underline font-medium">TopTalent Jobs</a>
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
            className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Bezig met boeken...
              </>
            ) : (
              <>
                Gesprek bevestigen
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
