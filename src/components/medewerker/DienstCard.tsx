"use client";

import { MapPin, Clock, Euro, Calendar, Check, X, Briefcase, FileText, Car } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

interface DienstCardProps {
  dienst: {
    id: string;
    aanmelding_id?: string;
    datum: string;
    start_tijd: string;
    eind_tijd: string;
    locatie: string;
    omschrijving?: string;
    functie?: string;
    notities?: string;
    uurtarief: number;
    status: string;
    klant: {
      bedrijfsnaam: string;
      bedrijf_foto_url?: string;
    };
  };
  type: "aangeboden" | "gepland" | "voltooid";
  onRefresh?: () => void;
}

export default function DienstCard({ dienst, type, onRefresh }: DienstCardProps) {
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showUrenForm, setShowUrenForm] = useState(false);
  const [submittingUren, setSubmittingUren] = useState(false);

  // Uren form state
  const [urenStart, setUrenStart] = useState(dienst.start_tijd?.slice(0, 5) || "");
  const [urenEind, setUrenEind] = useState(dienst.eind_tijd?.slice(0, 5) || "");
  const [pauze, setPauze] = useState(0);
  const [reiskostenKm, setReiskostenKm] = useState(0);

  const medewerkerUurtarief = dienst.uurtarief - 4; // €4 margin

  const formatDatum = (datum: string) => {
    const d = new Date(datum);
    const dagen = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
    const maanden = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
    return `${dagen[d.getDay()]} ${d.getDate()} ${maanden[d.getMonth()]}`;
  };

  const formatDatumLang = (datum: string) => {
    const d = new Date(datum);
    const dagen = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
    const maanden = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
    return `${dagen[d.getDay()]} ${d.getDate()} ${maanden[d.getMonth()]}`;
  };

  const formatTijd = (start: string, eind: string) => {
    return `${start.slice(0, 5)} - ${eind.slice(0, 5)}`;
  };

  const berekenUren = (start: string, eind: string) => {
    const [startH, startM] = start.split(":").map(Number);
    const [eindH, eindM] = eind.split(":").map(Number);
    let uren = eindH - startH + (eindM - startM) / 60;
    // Nachtdienst: als eind eerder is dan start, gaat het over middernacht
    if (uren <= 0) uren += 24;
    return uren.toFixed(1);
  };

  const berekenFormUren = () => {
    if (!urenStart || !urenEind) return 0;
    const [sh, sm] = urenStart.split(":").map(Number);
    const [eh, em] = urenEind.split(":").map(Number);
    let totalMin = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMin <= 0) totalMin += 24 * 60;
    totalMin -= pauze;
    return Math.max(0, totalMin / 60);
  };

  const uren = berekenUren(dienst.start_tijd, dienst.eind_tijd);
  const verdiensten = parseFloat(uren) * medewerkerUurtarief;

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch("/api/medewerker/diensten/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dienst_id: dienst.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Accepteren mislukt");
        return;
      }

      toast.success("Dienst geaccepteerd!");
      onRefresh?.();
    } catch (err) {
      console.error("Accept error:", err);
      toast.error("Er ging iets mis");
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      const res = await fetch("/api/medewerker/diensten/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dienst_id: dienst.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Afwijzen mislukt");
        return;
      }

      toast.success("Dienst afgewezen");
      onRefresh?.();
    } catch (err) {
      console.error("Decline error:", err);
      toast.error("Er ging iets mis");
    } finally {
      setDeclining(false);
    }
  };

  const handleUrenIndienen = async () => {
    if (!dienst.aanmelding_id) {
      toast.error("Aanmelding ID ontbreekt");
      return;
    }

    const gewerkteUren = berekenFormUren();
    if (gewerkteUren <= 0) {
      toast.error("Gewerkte uren moeten meer dan 0 zijn");
      return;
    }

    setSubmittingUren(true);
    try {
      const res = await fetch("/api/medewerker/diensten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "uren_indienen",
          aanmelding_id: dienst.aanmelding_id,
          data: {
            start: urenStart,
            eind: urenEind,
            pauze: pauze,
            uren: parseFloat(gewerkteUren.toFixed(2)),
            reiskosten_km: reiskostenKm,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Uren indienen mislukt");
        return;
      }

      toast.success("Uren succesvol ingediend!");
      setShowUrenForm(false);
      setShowDetail(false);
      onRefresh?.();
    } catch (err) {
      console.error("Uren indienen error:", err);
      toast.error("Er ging iets mis");
    } finally {
      setSubmittingUren(false);
    }
  };

  return (
    <>
      <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] overflow-hidden shadow-[var(--mp-shadow)]">
        {/* Bedrijfsfoto */}
        <div className="relative w-full aspect-[2/1] bg-[var(--mp-bg)]">
          {dienst.klant.bedrijf_foto_url ? (
            <Image
              src={dienst.klant.bedrijf_foto_url}
              alt={dienst.klant.bedrijfsnaam}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--mp-accent)]/10 to-[var(--mp-accent)]/5">
              <span className="text-3xl font-bold text-[var(--mp-accent)]/30">
                {dienst.klant.bedrijfsnaam.charAt(0)}
              </span>
            </div>
          )}

          {/* Status badge */}
          {type === "voltooid" && (
            <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-[var(--mp-success)] text-white text-[11px] font-semibold shadow-lg flex items-center gap-1">
              <Check className="w-3 h-3" />
              Voltooid
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-3 py-2.5">
          {/* Bedrijfsnaam */}
          <h3 className="text-sm font-bold text-[var(--mp-text-primary)] mb-1.5">
            {dienst.klant.bedrijfsnaam}
          </h3>

          {/* Datum */}
          <div className="flex items-center gap-1.5 text-[var(--mp-text-secondary)] text-xs mb-0.5">
            <Calendar className="w-3.5 h-3.5" />
            <span className="font-semibold">{formatDatum(dienst.datum)}</span>
          </div>

          {/* Tijd */}
          <div className="flex items-center gap-1.5 text-[var(--mp-text-secondary)] text-xs mb-0.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTijd(dienst.start_tijd, dienst.eind_tijd)}</span>
          </div>

          {/* Locatie */}
          <div className="flex items-center gap-1.5 text-[var(--mp-text-secondary)] text-xs mb-2.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>{dienst.locatie}</span>
          </div>

          {/* Omschrijving */}
          {dienst.omschrijving && (
            <p className="text-xs text-[var(--mp-text-secondary)] mb-2.5 line-clamp-2">
              {dienst.omschrijving}
            </p>
          )}

          {/* Verdiensten */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--mp-accent)]/10 mb-2.5">
            <Euro className="w-4 h-4 text-[var(--mp-accent)]" />
            <div>
              <div className="text-[10px] text-[var(--mp-text-tertiary)]">Verdiensten</div>
              <div className="text-sm font-bold text-[var(--mp-accent)]">
                €{verdiensten.toFixed(2)}
              </div>
              <div className="text-[10px] text-[var(--mp-text-secondary)]">
                {uren}u × €{medewerkerUurtarief}
              </div>
            </div>
          </div>

          {/* CTA Buttons op basis van type */}
          {type === "aangeboden" && (
            <div className="flex gap-2">
              <button
                onClick={handleDecline}
                disabled={declining}
                className="flex-1 py-2.5 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {declining ? (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <X className="w-3.5 h-3.5" />
                    Afwijzen
                  </>
                )}
              </button>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="flex-1 py-2.5 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-xs transition-all active:scale-[0.98] hover:bg-[var(--mp-accent-dark)] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {accepting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Accepteren
                  </>
                )}
              </button>
            </div>
          )}

          {type === "gepland" && (
            <button
              onClick={() => setShowDetail(true)}
              className="w-full py-2.5 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-xs transition-all active:scale-[0.98] hover:bg-[var(--mp-accent-dark)]"
            >
              Bekijk details
            </button>
          )}

          {type === "voltooid" && (
            <button
              onClick={() => setShowDetail(true)}
              className="w-full py-2.5 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] font-semibold text-xs transition-all active:scale-[0.98]"
            >
              Bekijk uren
            </button>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => { setShowDetail(false); setShowUrenForm(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal Content */}
          <div
            className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-[var(--mp-card)] rounded-t-2xl sm:rounded-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header image */}
            <div className="relative w-full aspect-[3/1] bg-[var(--mp-bg)]">
              {dienst.klant.bedrijf_foto_url ? (
                <Image
                  src={dienst.klant.bedrijf_foto_url}
                  alt={dienst.klant.bedrijfsnaam}
                  fill
                  className="object-cover rounded-t-2xl"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--mp-accent)]/20 to-[var(--mp-accent)]/5 rounded-t-2xl">
                  <span className="text-4xl font-bold text-[var(--mp-accent)]/40">
                    {dienst.klant.bedrijfsnaam.charAt(0)}
                  </span>
                </div>
              )}

              {/* Close button */}
              <button
                onClick={() => { setShowDetail(false); setShowUrenForm(false); }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4">
              <h2 className="text-lg font-bold text-[var(--mp-text-primary)] mb-1">
                {dienst.klant.bedrijfsnaam}
              </h2>

              {dienst.functie && (
                <div className="flex items-center gap-2 text-sm text-[var(--mp-text-secondary)] mb-3">
                  <Briefcase className="w-4 h-4" />
                  <span>{dienst.functie}</span>
                </div>
              )}

              {/* Info grid */}
              <div className="space-y-2.5 mb-4">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-[var(--mp-accent)]" />
                  <span className="text-[var(--mp-text-primary)] font-medium">{formatDatumLang(dienst.datum)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-[var(--mp-accent)]" />
                  <span className="text-[var(--mp-text-primary)]">{formatTijd(dienst.start_tijd, dienst.eind_tijd)} ({uren} uur)</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-[var(--mp-accent)]" />
                  <span className="text-[var(--mp-text-primary)]">{dienst.locatie}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Euro className="w-4 h-4 text-[var(--mp-accent)]" />
                  <span className="text-[var(--mp-text-primary)] font-medium">€{verdiensten.toFixed(2)} ({uren}u × €{medewerkerUurtarief})</span>
                </div>
              </div>

              {/* Notities */}
              {dienst.notities && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--mp-text-secondary)] mb-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Notities
                  </div>
                  <p className="text-sm text-[var(--mp-text-primary)] bg-[var(--mp-bg)] rounded-xl p-3">
                    {dienst.notities}
                  </p>
                </div>
              )}

              {/* Uren invullen form (voor voltooid) */}
              {type === "voltooid" && !showUrenForm && (
                <button
                  onClick={() => setShowUrenForm(true)}
                  className="w-full py-3 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm transition-all active:scale-[0.98] hover:bg-[var(--mp-accent-dark)]"
                >
                  Uren invullen
                </button>
              )}

              {type === "voltooid" && showUrenForm && (
                <div className="bg-[var(--mp-bg)] rounded-xl p-4">
                  <h3 className="text-sm font-bold text-[var(--mp-text-primary)] mb-3">Uren registreren</h3>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-[var(--mp-text-secondary)] mb-1 block">Start tijd</label>
                      <input
                        type="time"
                        value={urenStart}
                        onChange={(e) => setUrenStart(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[var(--mp-card)] border border-[var(--mp-separator)] text-base text-[var(--mp-text-primary)] focus:outline-none focus:border-[var(--mp-accent)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--mp-text-secondary)] mb-1 block">Eind tijd</label>
                      <input
                        type="time"
                        value={urenEind}
                        onChange={(e) => setUrenEind(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[var(--mp-card)] border border-[var(--mp-separator)] text-base text-[var(--mp-text-primary)] focus:outline-none focus:border-[var(--mp-accent)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-[var(--mp-text-secondary)] mb-1 block">Pauze (min)</label>
                      <input
                        type="number"
                        value={pauze}
                        onChange={(e) => setPauze(parseInt(e.target.value) || 0)}
                        min={0}
                        className="w-full px-3 py-2.5 rounded-xl bg-[var(--mp-card)] border border-[var(--mp-separator)] text-base text-[var(--mp-text-primary)] focus:outline-none focus:border-[var(--mp-accent)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--mp-text-secondary)] mb-1 flex items-center gap-1">
                        <Car className="w-3 h-3" /> Reiskosten (km)
                      </label>
                      <input
                        type="number"
                        value={reiskostenKm}
                        onChange={(e) => setReiskostenKm(parseInt(e.target.value) || 0)}
                        min={0}
                        className="w-full px-3 py-2.5 rounded-xl bg-[var(--mp-card)] border border-[var(--mp-separator)] text-base text-[var(--mp-text-primary)] focus:outline-none focus:border-[var(--mp-accent)]"
                      />
                    </div>
                  </div>

                  {/* Berekende uren preview */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--mp-accent)]/10 mb-4">
                    <span className="text-xs text-[var(--mp-text-secondary)]">Gewerkte uren</span>
                    <span className="text-sm font-bold text-[var(--mp-accent)]">{berekenFormUren().toFixed(1)} uur</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowUrenForm(false)}
                      className="flex-1 py-2.5 rounded-xl bg-[var(--mp-card)] text-[var(--mp-text-primary)] font-semibold text-xs transition-all active:scale-[0.98]"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={handleUrenIndienen}
                      disabled={submittingUren || berekenFormUren() <= 0}
                      className="flex-1 py-2.5 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-xs transition-all active:scale-[0.98] hover:bg-[var(--mp-accent-dark)] disabled:opacity-50"
                    >
                      {submittingUren ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                      ) : (
                        "Indienen"
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Sluiten knop voor gepland */}
              {type === "gepland" && (
                <button
                  onClick={() => setShowDetail(false)}
                  className="w-full py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] font-semibold text-sm transition-all active:scale-[0.98]"
                >
                  Sluiten
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
