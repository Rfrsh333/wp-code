"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { generateICS } from "@/lib/ics";

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
}

export default function AfspraakPlannenPage() {
  const searchParams = useSearchParams();
  const inquiryRef = searchParams.get("ref");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<DagInfo[]>([]);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [introText, setIntroText] = useState("");
  const [senderName, setSenderName] = useState("TopTalent Jobs");

  // Form state
  const [selectedDatum, setSelectedDatum] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [bedrijfsnaam, setBedrijfsnaam] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  const fetchSlots = useCallback(async () => {
    try {
      const url = inquiryRef
        ? `/api/bookings?ref=${inquiryRef}`
        : "/api/bookings";
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Er ging iets mis");
        return;
      }

      setDays(data.days || []);
      setIntroText(data.intro_text || "");
      setSenderName(data.sender_name || "TopTalent Jobs");

      // Vul form voor als er een inquiry is
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

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleBook = async () => {
    if (!selectedSlot || !naam || !email) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          client_name: naam,
          client_email: email,
          client_phone: telefoon || undefined,
          company_name: bedrijfsnaam || undefined,
          notes: notes || undefined,
          inquiry_id: inquiry?.id || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kon afspraak niet boeken");
        return;
      }

      setBookingResult(data.booking);
    } catch {
      setError("Er ging iets mis bij het boeken");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadICS = () => {
    if (!bookingResult || !selectedSlot) return;

    const icsContent = generateICS({
      title: `Gesprek met ${senderName}`,
      description: `Kennismakingsgesprek met ${senderName}.\n${notes ? `Notities: ${notes}` : ""}`,
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

  const selectedDag = days.find((d) => d.datum === selectedDatum);

  // Huidige stap bepalen
  const currentStep = bookingResult
    ? 4
    : selectedSlot
      ? 3
      : selectedDatum
        ? 2
        : 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Beschikbaarheid laden...</p>
        </div>
      </div>
    );
  }

  // Stap 4: Bevestiging
  if (bookingResult) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white">
          <div className="max-w-3xl mx-auto px-4 py-12 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-2">Je afspraak is ingepland!</h1>
            <p className="text-white/90">Je ontvangt een bevestiging per e-mail.</p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 -mt-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-[#FEF3E7] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Gesprek met {senderName}</p>
                <p className="font-semibold text-neutral-900">{bookingResult.datum_formatted}</p>
                <p className="text-[#F97316] font-bold">{bookingResult.start_time} - {bookingResult.end_time}</p>
              </div>
            </div>

            <button
              onClick={downloadICS}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-[#F97316] text-[#F97316] rounded-xl hover:bg-[#FEF3E7] transition-all duration-300 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Voeg toe aan je agenda
            </button>
          </div>

          <div className="text-center mt-8 pb-8">
            <p className="text-sm text-neutral-500">
              We kijken ernaar uit je te spreken!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white">
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Plan een gesprek in</h1>
          <p className="text-white/90 text-lg max-w-xl mx-auto">
            {introText || "Kies een datum en tijd voor een vrijblijvend kennismakingsgesprek."}
          </p>
        </div>
      </div>

      {/* Stappen indicator */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { num: 1, label: "Dag kiezen" },
            { num: 2, label: "Tijd kiezen" },
            { num: 3, label: "Gegevens" },
          ].map((step, i) => (
            <div key={step.num} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  currentStep >= step.num
                    ? "bg-[#F97316] text-white"
                    : "bg-neutral-200 text-neutral-500"
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center text-xs">
                  {currentStep > step.num ? "✓" : step.num}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {i < 2 && (
                <div className={`w-8 h-0.5 mx-1 ${currentStep > step.num ? "bg-[#F97316]" : "bg-neutral-200"}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {days.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-neutral-600 text-lg">
              Er zijn momenteel geen beschikbare tijdslots. Neem contact op via{" "}
              <a href="mailto:info@toptalentjobs.nl" className="text-[#F97316] hover:underline">
                info@toptalentjobs.nl
              </a>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stap 1: Dag kiezen */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-[#F97316] text-white text-sm rounded-full flex items-center justify-center">1</span>
                Kies een dag
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {days.map((dag) => {
                  const date = new Date(dag.datum);
                  const dayNum = date.getDate();
                  const month = date.toLocaleDateString("nl-NL", { month: "short" });

                  return (
                    <button
                      key={dag.datum}
                      onClick={() => {
                        setSelectedDatum(dag.datum);
                        setSelectedSlot(null);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                        selectedDatum === dag.datum
                          ? "border-[#F97316] bg-[#FEF3E7] shadow-md"
                          : "border-neutral-200 hover:border-[#F97316]/50 hover:bg-neutral-50"
                      }`}
                    >
                      <p className="text-sm font-medium text-neutral-500">{dag.dag.slice(0, 2)}</p>
                      <p className="text-2xl font-bold text-neutral-900">{dayNum}</p>
                      <p className="text-sm text-neutral-500">{month}</p>
                      <p className="text-xs text-[#F97316] mt-1">
                        {dag.slots.length} {dag.slots.length === 1 ? "slot" : "slots"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stap 2: Tijd kiezen */}
            {selectedDag && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-[#F97316] text-white text-sm rounded-full flex items-center justify-center">2</span>
                  Kies een tijdstip
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {selectedDag.slots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-3 px-3 rounded-xl border-2 transition-all duration-200 text-center ${
                        selectedSlot?.id === slot.id
                          ? "border-[#F97316] bg-[#FEF3E7] shadow-md"
                          : "border-neutral-200 hover:border-[#F97316]/50 hover:bg-neutral-50"
                      }`}
                    >
                      <p className="font-semibold text-neutral-900">{slot.start}</p>
                      <p className="text-xs text-neutral-500">{slot.eind}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stap 3: Gegevens invullen */}
            {selectedSlot && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-[#F97316] text-white text-sm rounded-full flex items-center justify-center">3</span>
                  Jouw gegevens
                </h2>

                {/* Samenvatting */}
                <div className="bg-[#FEF3E7] rounded-xl p-4 mb-6 flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#F97316] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">
                      {selectedDag?.dag}{" "}
                      {selectedDatum && new Date(selectedDatum).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                    </p>
                    <p className="text-[#F97316] font-bold">{selectedSlot.start} - {selectedSlot.eind}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSlot(null);
                      setSelectedDatum(null);
                    }}
                    className="ml-auto text-sm text-neutral-500 hover:text-neutral-700"
                  >
                    Wijzig
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Naam <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={naam}
                        onChange={(e) => setNaam(e.target.value)}
                        placeholder="Je volledige naam"
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        E-mailadres <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="je@email.nl"
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Telefoonnummer <span className="text-neutral-400">(optioneel)</span>
                      </label>
                      <input
                        type="tel"
                        value={telefoon}
                        onChange={(e) => setTelefoon(e.target.value)}
                        placeholder="06-12345678"
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Bedrijfsnaam <span className="text-neutral-400">(optioneel)</span>
                      </label>
                      <input
                        type="text"
                        value={bedrijfsnaam}
                        onChange={(e) => setBedrijfsnaam(e.target.value)}
                        placeholder="Je bedrijf"
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Waar gaat het gesprek over? <span className="text-neutral-400">(optioneel)</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Bijv. ik zoek 3 koks voor een kerstevenement"
                      rows={3}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] outline-none transition-all duration-300 bg-neutral-50 focus:bg-white resize-none"
                    />
                  </div>

                  <button
                    onClick={handleBook}
                    disabled={submitting || !naam.trim() || !email.trim()}
                    className="w-full bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 hover:bg-[#EA580C] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Bezig met boeken...
                      </span>
                    ) : (
                      "Afspraak Bevestigen"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 pb-8">
          <p className="text-sm text-neutral-500">
            <a href="https://www.toptalentjobs.nl" className="text-[#F97316] hover:underline font-medium">
              TopTalent Jobs
            </a>{" "}
            &mdash; Specialist in horeca personeel
          </p>
        </div>
      </div>
    </div>
  );
}
