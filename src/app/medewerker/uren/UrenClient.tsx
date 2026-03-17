"use client";

import { useEffect, useState } from "react";
import { Euro, Clock, Calendar, TrendingUp } from "lucide-react";
import Image from "next/image";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import { toast } from "sonner";

interface UrenRegistratie {
  id: string;
  gewerkte_uren: number;
  status: string;
  created_at: string;
  dienst: {
    datum: string;
    locatie: string;
    uurtarief: number;
    klant: {
      bedrijfsnaam: string;
      bedrijf_foto_url?: string;
    };
  };
}

interface TeRegistrerenDienst {
  id: string;
  aanmelding_id: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  locatie: string;
  uurtarief: number;
  klant: {
    bedrijfsnaam: string;
    bedrijf_foto_url?: string;
  };
}

interface KlantAanpassing {
  id: string;
  start_tijd: string;
  eind_tijd: string;
  pauze_minuten: number;
  gewerkte_uren: number;
  reiskosten_km: number;
  reiskosten_bedrag: number;
  klant_start_tijd: string;
  klant_eind_tijd: string;
  klant_pauze_minuten: number;
  klant_gewerkte_uren: number;
  klant_reiskosten_km: number;
  klant_reiskosten_bedrag: number;
  klant_opmerking: string | null;
  dienst_datum: string;
  klant_naam: string;
  locatie: string;
}

export default function UrenClient() {
  const [uren, setUren] = useState<UrenRegistratie[]>([]);
  const [teRegistreren, setTeRegistreren] = useState<TeRegistrerenDienst[]>([]);
  const [aanpassingen, setAanpassingen] = useState<KlantAanpassing[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ deze_maand: 0, totaal_uren: 0 });
  const [urenModal, setUrenModal] = useState<TeRegistrerenDienst | null>(null);
  const [urenForm, setUrenForm] = useState({ start: "", eind: "", pauze: "0", reiskosten_km: "0" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUren();
  }, []);

  const fetchUren = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/medewerker/uren/lijst");
      if (!res.ok) {
        toast.error("Uren ophalen mislukt");
        return;
      }
      const data = await res.json();
      setUren(data.uren || []);
      setTeRegistreren(data.te_registreren || []);
      setAanpassingen(data.aanpassingen || []);
      setSummary(data.summary || { deze_maand: 0, totaal_uren: 0 });
    } catch (err) {
      console.error("Fetch uren error:", err);
      toast.error("Er ging iets mis");
    } finally {
      setLoading(false);
    }
  };

  const handleAccepteerAanpassing = async (urenId: string) => {
    try {
      const res = await fetch("/api/medewerker/diensten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accepteer_aanpassing",
          uren_id: urenId,
        }),
      });

      if (!res.ok) {
        toast.error("Accepteren mislukt");
        return;
      }

      toast.success("Aanpassing geaccepteerd");
      await fetchUren();
    } catch (err) {
      console.error("Accept error:", err);
      toast.error("Er ging iets mis");
    }
  };

  const handleWeigerAanpassing = async (urenId: string) => {
    try {
      const res = await fetch("/api/medewerker/diensten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "weiger_aanpassing",
          uren_id: urenId,
        }),
      });

      if (!res.ok) {
        toast.error("Weigeren mislukt");
        return;
      }

      toast.success("Aanpassing geweigerd");
      await fetchUren();
    } catch (err) {
      console.error("Reject error:", err);
      toast.error("Er ging iets mis");
    }
  };

  const handleUrenIndienen = async () => {
    if (!urenModal) return;

    const start = urenForm.start || urenModal.start_tijd;
    const eind = urenForm.eind || urenModal.eind_tijd;
    const pauze = parseInt(urenForm.pauze) || 0;

    // Bereken gewerkte uren
    const [startH, startM] = start.split(":").map(Number);
    const [eindH, eindM] = eind.split(":").map(Number);
    const totalMinutes = (eindH * 60 + eindM) - (startH * 60 + startM) - pauze;
    const uren = totalMinutes / 60;

    if (uren <= 0) {
      toast.error("Ongeldige uren");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/medewerker/diensten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "uren_indienen",
          aanmelding_id: urenModal.aanmelding_id,
          data: {
            start,
            eind,
            pauze,
            uren: parseFloat(uren.toFixed(2)),
            reiskosten_km: parseFloat(urenForm.reiskosten_km) || 0,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error?.includes("QR") || data.error?.includes("ingecheckt")) {
          toast.error("QR nog niet gescand. Vraag de klant om je QR code te scannen voordat je uren kunt indienen.");
        } else {
          toast.error(data.error || "Indienen mislukt");
        }
        return;
      }

      toast.success("Uren ingediend! ✅");
      setUrenModal(null);
      setUrenForm({ start: "", eind: "", pauze: "0", reiskosten_km: "0" });
      await fetchUren();
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Er ging iets mis");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDatum = (datum: string) => {
    const d = new Date(datum);
    const dagen = ["zo", "ma", "di", "wo", "do", "vr", "za"];
    const maanden = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
    return `${dagen[d.getDay()]} ${d.getDate()} ${maanden[d.getMonth()]}`;
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: { text: string; color: string } } = {
      ingediend: { text: "In behandeling", color: "bg-yellow-500/10 text-yellow-600" },
      klant_goedgekeurd: { text: "Goedgekeurd", color: "bg-[var(--mp-success)]/10 text-[var(--mp-success)]" },
      gefactureerd: { text: "Gefactureerd", color: "bg-blue-500/10 text-blue-600" },
      klant_aangepast: { text: "Aangepast door klant", color: "bg-orange-500/10 text-orange-600" },
    };
    return labels[status] || { text: status, color: "bg-gray-500/10 text-gray-600" };
  };

  return (
    <MedewerkerResponsiveLayout>
    <div className="min-h-screen bg-[var(--mp-bg)]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[var(--mp-card)] border-b border-[var(--mp-separator)]">
        <div className="px-4 py-3">
          <h1 className="text-2xl font-bold text-[var(--mp-text-primary)] mb-4">Uren</h1>

          {/* Summary Card */}
          <div className="bg-gradient-to-br from-[var(--mp-accent)] to-[var(--mp-accent-dark)] rounded-[var(--mp-radius)] p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/80 text-sm font-medium">Deze maand</span>
              <TrendingUp className="w-5 h-5 text-white/80" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              €{summary.deze_maand.toFixed(2)}
            </div>
            <div className="text-white/80 text-sm">
              {summary.totaal_uren.toFixed(1)} uur gewerkt
            </div>
          </div>
        </div>
      </div>

      {/* Klant aanpassingen */}
      {!loading && aanpassingen.length > 0 && (
        <div className="px-4 pt-4">
          <div className="bg-yellow-50 dark:bg-yellow-500/10 border-2 border-yellow-400 dark:border-yellow-500/30 rounded-[var(--mp-radius)] p-4 mb-4">
            <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Klant heeft uren aangepast ({aanpassingen.length})
            </h3>
            <div className="space-y-3">
              {aanpassingen.map((aanpassing) => (
                <div
                  key={aanpassing.id}
                  className="bg-white dark:bg-[var(--mp-card)] rounded-xl p-4 border border-[var(--mp-separator)]"
                >
                  <div className="font-semibold text-[var(--mp-text-primary)] mb-2">
                    {aanpassing.klant_naam}
                  </div>
                  <div className="text-xs text-[var(--mp-text-secondary)] mb-3">
                    {formatDatum(aanpassing.dienst_datum)} • {aanpassing.locatie}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                    <div>
                      <div className="text-[var(--mp-text-tertiary)] mb-1">Jouw registratie:</div>
                      <div className="text-[var(--mp-text-primary)]">
                        {aanpassing.start_tijd.slice(0, 5)} - {aanpassing.eind_tijd.slice(0, 5)}
                      </div>
                      <div className="text-[var(--mp-text-primary)]">
                        {aanpassing.gewerkte_uren}u (pauze: {aanpassing.pauze_minuten}min)
                      </div>
                    </div>
                    <div>
                      <div className="text-[var(--mp-text-tertiary)] mb-1">Klant aanpassing:</div>
                      <div className="text-[var(--mp-accent)] font-semibold">
                        {aanpassing.klant_start_tijd.slice(0, 5)} - {aanpassing.klant_eind_tijd.slice(0, 5)}
                      </div>
                      <div className="text-[var(--mp-accent)] font-semibold">
                        {aanpassing.klant_gewerkte_uren}u (pauze: {aanpassing.klant_pauze_minuten}min)
                      </div>
                    </div>
                  </div>

                  {aanpassing.klant_opmerking && (
                    <div className="bg-[var(--mp-bg)] rounded-lg p-3 mb-3 text-xs">
                      <div className="text-[var(--mp-text-tertiary)] mb-1">Opmerking:</div>
                      <div className="text-[var(--mp-text-primary)]">{aanpassing.klant_opmerking}</div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleWeigerAanpassing(aanpassing.id)}
                      className="flex-1 py-2 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] font-semibold text-xs transition-all active:scale-[0.98]"
                    >
                      Weigeren
                    </button>
                    <button
                      onClick={() => handleAccepteerAanpassing(aanpassing.id)}
                      className="flex-1 py-2 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-xs transition-all active:scale-[0.98]"
                    >
                      Accepteren
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Te registreren diensten */}
      {!loading && teRegistreren.length > 0 && (
        <div className="px-4 pt-4">
          <div className="bg-[var(--mp-accent)]/10 border-2 border-[var(--mp-accent)]/30 rounded-[var(--mp-radius)] p-4 mb-4">
            <h3 className="text-sm font-semibold text-[var(--mp-accent)] mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Uren registreren ({teRegistreren.length})
            </h3>
            <div className="space-y-2">
              {teRegistreren.map((dienst) => (
                <button
                  key={dienst.id}
                  onClick={() => {
                    setUrenModal(dienst);
                    setUrenForm({
                      start: dienst.start_tijd,
                      eind: dienst.eind_tijd,
                      pauze: "0",
                      reiskosten_km: "0",
                    });
                  }}
                  className="w-full text-left p-3 rounded-xl bg-white dark:bg-[var(--mp-card)] border border-[var(--mp-separator)] hover:border-[var(--mp-accent)] transition-colors"
                >
                  <div className="font-semibold text-[var(--mp-text-primary)] text-sm">
                    {dienst.klant.bedrijfsnaam}
                  </div>
                  <div className="text-xs text-[var(--mp-text-secondary)] mt-1">
                    {formatDatum(dienst.datum)} • {dienst.locatie}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Uren List */}
      <div className="px-4 pt-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : uren.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[var(--mp-bg)] mx-auto mb-4 flex items-center justify-center">
              <Clock className="w-8 h-8 text-[var(--mp-text-tertiary)]" />
            </div>
            <p className="text-[var(--mp-text-secondary)] text-sm">
              Nog geen uren geregistreerd
            </p>
          </div>
        ) : (
          uren.map((item) => {
            const medewerkerUurtarief = item.dienst.uurtarief - 4;
            const verdiensten = item.gewerkte_uren * medewerkerUurtarief;
            const statusInfo = getStatusLabel(item.status);

            return (
              <div
                key={item.id}
                className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] overflow-hidden shadow-[var(--mp-shadow)]"
              >
                {/* Bedrijfsfoto */}
                <div className="relative w-full aspect-[16/9] bg-[var(--mp-bg)]">
                  {item.dienst.klant.bedrijf_foto_url ? (
                    <Image
                      src={item.dienst.klant.bedrijf_foto_url}
                      alt={item.dienst.klant.bedrijfsnaam}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--mp-accent)]/10 to-[var(--mp-accent)]/5">
                      <span className="text-4xl font-bold text-[var(--mp-accent)]/30">
                        {item.dienst.klant.bedrijfsnaam.charAt(0)}
                      </span>
                    </div>
                  )}

                  {/* Status badge */}
                  <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full ${statusInfo.color} text-xs font-semibold shadow-lg backdrop-blur-sm`}>
                    {statusInfo.text}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-[var(--mp-text-primary)] mb-2">
                    {item.dienst.klant.bedrijfsnaam}
                  </h3>

                  <div className="flex items-center gap-2 text-[var(--mp-text-secondary)] text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDatum(item.dienst.datum)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[var(--mp-text-secondary)] text-sm mb-4">
                    <Clock className="w-4 h-4" />
                    <span>{item.gewerkte_uren.toFixed(1)} uur gewerkt</span>
                  </div>

                  {/* Verdiensten */}
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--mp-accent)]/10 mb-4">
                    <Euro className="w-5 h-5 text-[var(--mp-accent)]" />
                    <div>
                      <div className="text-xs text-[var(--mp-text-tertiary)]">Verdiensten</div>
                      <div className="text-lg font-bold text-[var(--mp-accent)]">
                        €{verdiensten.toFixed(2)}
                      </div>
                      <div className="text-xs text-[var(--mp-text-secondary)]">
                        {item.gewerkte_uren.toFixed(1)}u × €{medewerkerUurtarief}
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => toast.info("Navigeren naar uren details...")}
                    className="w-full py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] font-semibold text-sm transition-all active:scale-[0.98]"
                  >
                    Bekijk details
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Uren registratie modal */}
      {urenModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4">
          <div
            className="bg-[var(--mp-card)] rounded-t-[var(--mp-radius)] md:rounded-[var(--mp-radius)] w-full md:max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-2 pb-4 md:hidden">
              <div className="w-12 h-1 rounded-full bg-[var(--mp-separator)]" />
            </div>

            <div className="px-6 pb-6">
              <h2 className="text-xl font-bold text-[var(--mp-text-primary)] mb-1">
                Uren registreren
              </h2>
              <p className="text-sm text-[var(--mp-text-secondary)] mb-6">
                {urenModal.klant.bedrijfsnaam} • {formatDatum(urenModal.datum)}
              </p>

              <div className="space-y-4 mb-6">
                {/* Start tijd */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--mp-text-primary)] mb-2">
                    Start tijd
                  </label>
                  <input
                    type="time"
                    value={urenForm.start}
                    onChange={(e) => setUrenForm({ ...urenForm, start: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] border border-[var(--mp-separator)] focus:border-[var(--mp-accent)] focus:outline-none"
                  />
                </div>

                {/* Eind tijd */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--mp-text-primary)] mb-2">
                    Eind tijd
                  </label>
                  <input
                    type="time"
                    value={urenForm.eind}
                    onChange={(e) => setUrenForm({ ...urenForm, eind: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] border border-[var(--mp-separator)] focus:border-[var(--mp-accent)] focus:outline-none"
                  />
                </div>

                {/* Pauze */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--mp-text-primary)] mb-2">
                    Pauze (minuten)
                  </label>
                  <input
                    type="number"
                    value={urenForm.pauze}
                    onChange={(e) => setUrenForm({ ...urenForm, pauze: e.target.value })}
                    min="0"
                    className="w-full px-4 py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] border border-[var(--mp-separator)] focus:border-[var(--mp-accent)] focus:outline-none"
                  />
                </div>

                {/* Reiskosten */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--mp-text-primary)] mb-2">
                    Reiskosten (km)
                  </label>
                  <input
                    type="number"
                    value={urenForm.reiskosten_km}
                    onChange={(e) => setUrenForm({ ...urenForm, reiskosten_km: e.target.value })}
                    min="0"
                    step="0.1"
                    className="w-full px-4 py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] border border-[var(--mp-separator)] focus:border-[var(--mp-accent)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setUrenModal(null);
                    setUrenForm({ start: "", eind: "", pauze: "0", reiskosten_km: "0" });
                  }}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] font-semibold text-sm transition-all active:scale-[0.98]"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleUrenIndienen}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Indienen...
                    </>
                  ) : (
                    "Uren indienen"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </MedewerkerResponsiveLayout>
  );
}
