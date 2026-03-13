"use client";

import { useEffect, useState, useCallback, use } from "react";

interface BookingInfo {
  id: string;
  client_name: string;
  status: string;
  date: string;
  start_time: string;
  end_time: string;
  event_type_name: string;
  can_cancel: boolean;
  can_reschedule: boolean;
}

export default function AfspraakBeherenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"view" | "cancel" | "cancelled">("view");
  const [cancelReason, setCancelReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/manage?token=${token}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Boeking niet gevonden");
        return;
      }
      setBooking(data.booking);
    } catch {
      setError("Kon booking niet ophalen");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const handleCancel = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/bookings/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "cancel",
          reason: cancelReason || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAction("cancelled");
      } else {
        setError(data.error || "Kon niet annuleren");
      }
    } catch {
      setError("Er ging iets mis");
    } finally {
      setProcessing(false);
    }
  };

  const datumFormatted = booking?.date
    ? new Date(booking.date).toLocaleDateString("nl-NL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C]">
          <div className="max-w-3xl mx-auto px-4 py-12 text-center">
            <div className="animate-pulse space-y-3">
              <div className="h-8 w-56 bg-white/20 rounded-lg mx-auto" />
              <div className="h-5 w-72 bg-white/10 rounded-lg mx-auto" />
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 -mt-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-neutral-200 rounded-xl" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-neutral-200 rounded" />
                <div className="h-5 w-48 bg-neutral-200 rounded" />
                <div className="h-5 w-28 bg-neutral-200 rounded" />
              </div>
            </div>
            <div className="h-12 w-full bg-neutral-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Error / not found ── */
  if (error || !booking) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Boeking niet gevonden</h1>
          <p className="text-neutral-500 mb-6">{error || "Deze link is niet meer geldig of verlopen."}</p>
          <a
            href="/afspraak-plannen"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#F97316] text-white rounded-xl font-medium hover:bg-[#EA580C] transition-all duration-300 shadow-lg shadow-orange-500/20"
          >
            Nieuwe afspraak plannen
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  /* ── Cancelled confirmation ── */
  if (action === "cancelled") {
    return (
      <div className="min-h-screen bg-neutral-50">
        <style>{`
          @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
        <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white">
          <div className="max-w-3xl mx-auto px-4 py-14 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-2">Afspraak geannuleerd</h1>
            <p className="text-white/90">Je afspraak is succesvol geannuleerd.</p>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 -mt-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center animate-[fadeSlideUp_0.4s_ease-out]">
            <p className="text-neutral-600 mb-2">We hebben een bevestiging naar je e-mail gestuurd.</p>
            <p className="text-neutral-400 text-sm mb-6">Het tijdslot is weer vrijgegeven.</p>
            <a
              href="/afspraak-plannen"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#F97316] text-white rounded-xl font-medium hover:bg-[#EA580C] transition-all duration-300 shadow-lg shadow-orange-500/20"
            >
              Nieuwe afspraak plannen
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
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

  /* ── Already cancelled or completed ── */
  if (booking.status !== "confirmed") {
    const statusConfig: Record<string, { title: string; icon: string; color: string }> = {
      cancelled: { title: "Afspraak geannuleerd", icon: "M6 18L18 6M6 6l12 12", color: "bg-red-50 text-red-400" },
      completed: { title: "Afspraak voltooid", icon: "M5 13l4 4L19 7", color: "bg-green-50 text-green-500" },
    };
    const config = statusConfig[booking.status] || { title: "Afspraak", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "bg-neutral-100 text-neutral-400" };

    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${config.color}`}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mb-2">{config.title}</h1>
          <p className="text-neutral-500 mb-6">Deze afspraak kan niet meer gewijzigd worden.</p>
          <a
            href="/afspraak-plannen"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#F97316] text-white rounded-xl font-medium hover:bg-[#EA580C] transition-all duration-300"
          >
            Nieuwe afspraak plannen
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  /* ── Active booking management ── */
  return (
    <div className="min-h-screen bg-neutral-50">
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white">
        <div className="max-w-3xl mx-auto px-4 py-10 md:py-12 text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Je afspraak beheren</h1>
          <p className="text-white/90">Bekijk of annuleer je geplande afspraak.</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Booking details */}
          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-neutral-100">
            <div className="w-12 h-12 bg-[#FEF3E7] rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-neutral-500">{booking.event_type_name}</p>
              <p className="font-semibold text-neutral-900 text-lg capitalize">{datumFormatted}</p>
              <p className="text-[#F97316] font-bold text-lg">{booking.start_time} - {booking.end_time}</p>
            </div>
          </div>

          <p className="text-neutral-600 mb-6">
            Hallo <strong>{booking.client_name}</strong>, hieronder kun je je afspraak beheren.
          </p>

          {/* Status badge */}
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Bevestigd
            </span>
          </div>

          {action === "view" && (
            <button
              onClick={() => setAction("cancel")}
              className="w-full px-4 py-3.5 border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all duration-300 font-medium"
            >
              Afspraak annuleren
            </button>
          )}

          {action === "cancel" && (
            <div className="space-y-4 border-t border-neutral-100 pt-5 animate-[fadeSlideUp_0.3s_ease-out]">
              <div className="bg-red-50 rounded-xl p-4">
                <h3 className="font-semibold text-red-800 mb-1">Weet je het zeker?</h3>
                <p className="text-sm text-red-600">Na het annuleren wordt het tijdslot weer vrijgegeven voor anderen.</p>
              </div>
              <div>
                <label htmlFor="cancel-reason" className="block text-sm font-medium text-neutral-700 mb-1">
                  Reden <span className="text-neutral-400 text-xs font-normal">optioneel</span>
                </label>
                <textarea
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                  placeholder="Laat ons weten waarom je annuleert..."
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl outline-none resize-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all bg-neutral-50 focus:bg-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setAction("view")}
                  className="flex-1 px-4 py-3.5 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-all duration-200 font-medium"
                >
                  Terug
                </button>
                <button
                  onClick={handleCancel}
                  disabled={processing}
                  className="flex-1 px-4 py-3.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Bezig...
                    </>
                  ) : (
                    "Ja, annuleren"
                  )}
                </button>
              </div>
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
