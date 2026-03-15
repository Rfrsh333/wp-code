"use client";

import { MapPin, Clock, Euro, Calendar, Check, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

interface DienstCardProps {
  dienst: {
    id: string;
    datum: string;
    start_tijd: string;
    eind_tijd: string;
    locatie: string;
    omschrijving?: string;
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

  const medewerkerUurtarief = dienst.uurtarief - 4; // €4 margin

  const formatDatum = (datum: string) => {
    const d = new Date(datum);
    const dagen = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
    const maanden = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
    return `${dagen[d.getDay()]} ${d.getDate()} ${maanden[d.getMonth()]}`;
  };

  const formatTijd = (start: string, eind: string) => {
    return `${start.slice(0, 5)} - ${eind.slice(0, 5)}`;
  };

  const berekenUren = (start: string, eind: string) => {
    const [startH, startM] = start.split(":").map(Number);
    const [eindH, eindM] = eind.split(":").map(Number);
    const uren = eindH - startH + (eindM - startM) / 60;
    return uren.toFixed(1);
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

      toast.success("Dienst geaccepteerd! 🎉");
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

  return (
    <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] overflow-hidden shadow-[var(--mp-shadow)]">
      {/* Bedrijfsfoto */}
      <div className="relative w-full aspect-[16/9] bg-[var(--mp-bg)]">
        {dienst.klant.bedrijf_foto_url ? (
          <Image
            src={dienst.klant.bedrijf_foto_url}
            alt={dienst.klant.bedrijfsnaam}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--mp-accent)]/10 to-[var(--mp-accent)]/5">
            <span className="text-4xl font-bold text-[var(--mp-accent)]/30">
              {dienst.klant.bedrijfsnaam.charAt(0)}
            </span>
          </div>
        )}

        {/* Status badge */}
        {type === "voltooid" && (
          <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-[var(--mp-success)] text-white text-xs font-semibold shadow-lg flex items-center gap-1">
            <Check className="w-3 h-3" />
            Voltooid
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Bedrijfsnaam */}
        <h3 className="text-lg font-bold text-[var(--mp-text-primary)] mb-2">
          {dienst.klant.bedrijfsnaam}
        </h3>

        {/* Datum */}
        <div className="flex items-center gap-2 text-[var(--mp-text-secondary)] text-sm mb-1">
          <Calendar className="w-4 h-4" />
          <span className="font-semibold">{formatDatum(dienst.datum)}</span>
        </div>

        {/* Tijd */}
        <div className="flex items-center gap-2 text-[var(--mp-text-secondary)] text-sm mb-1">
          <Clock className="w-4 h-4" />
          <span>{formatTijd(dienst.start_tijd, dienst.eind_tijd)}</span>
        </div>

        {/* Locatie */}
        <div className="flex items-center gap-2 text-[var(--mp-text-secondary)] text-sm mb-4">
          <MapPin className="w-4 h-4" />
          <span>{dienst.locatie}</span>
        </div>

        {/* Omschrijving */}
        {dienst.omschrijving && (
          <p className="text-sm text-[var(--mp-text-secondary)] mb-4 line-clamp-2">
            {dienst.omschrijving}
          </p>
        )}

        {/* Verdiensten */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--mp-accent)]/10 mb-4">
          <Euro className="w-5 h-5 text-[var(--mp-accent)]" />
          <div>
            <div className="text-xs text-[var(--mp-text-tertiary)]">Verdiensten</div>
            <div className="text-lg font-bold text-[var(--mp-accent)]">
              €{verdiensten.toFixed(2)}
            </div>
            <div className="text-xs text-[var(--mp-text-secondary)]">
              {uren}u × €{medewerkerUurtarief}
            </div>
          </div>
        </div>

        {/* CTA Buttons op basis van type */}
        {type === "aangeboden" && (
          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={declining}
              className="flex-1 py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {declining ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <X className="w-4 h-4" />
                  Afwijzen
                </>
              )}
            </button>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 py-3 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm transition-all active:scale-[0.98] hover:bg-[var(--mp-accent-dark)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {accepting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Accepteren
                </>
              )}
            </button>
          </div>
        )}

        {type === "gepland" && (
          <button
            onClick={() => toast.info("Navigeren naar dienst details...")}
            className="w-full py-3 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm transition-all active:scale-[0.98] hover:bg-[var(--mp-accent-dark)]"
          >
            Bekijk details
          </button>
        )}

        {type === "voltooid" && (
          <button
            onClick={() => toast.info("Navigeren naar uren registratie...")}
            className="w-full py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] font-semibold text-sm transition-all active:scale-[0.98]"
          >
            Bekijk uren
          </button>
        )}
      </div>
    </div>
  );
}
