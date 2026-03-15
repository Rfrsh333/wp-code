"use client";

import { MapPin, Star, Clock, Euro } from "lucide-react";
import Image from "next/image";

interface ShiftCardProps {
  shift: {
    id: string;
    datum: string;
    start_tijd: string;
    eind_tijd: string;
    locatie: string;
    omschrijving?: string;
    uurtarief: number;
    plekken_beschikbaar: number;
    plekken_totaal: number;
    klant: {
      bedrijfsnaam: string;
      bedrijf_foto_url?: string;
      rating?: number;
    };
    tags?: string[];
    is_speciaal?: boolean;
  };
  onApply: (shiftId: string) => void;
  onSave?: (shiftId: string) => void;
  saved?: boolean;
}

export default function ShiftCard({ shift, onApply, onSave, saved = false }: ShiftCardProps) {
  const medewerkerUurtarief = shift.uurtarief - 4; // €4 margin voor TopTalent

  const formatDatum = (datum: string) => {
    const d = new Date(datum);
    const dagen = ["zo", "ma", "di", "wo", "do", "vr", "za"];
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

  const uren = berekenUren(shift.start_tijd, shift.eind_tijd);
  const verdiensten = parseFloat(uren) * medewerkerUurtarief;

  return (
    <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] overflow-hidden shadow-[var(--mp-shadow)]">
      {/* Bedrijfsfoto */}
      <div className="relative w-full aspect-[16/9] bg-[var(--mp-bg)]">
        {shift.klant.bedrijf_foto_url ? (
          <Image
            src={shift.klant.bedrijf_foto_url}
            alt={shift.klant.bedrijfsnaam}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--mp-accent)]/10 to-[var(--mp-accent)]/5">
            <span className="text-4xl font-bold text-[var(--mp-accent)]/30">
              {shift.klant.bedrijfsnaam.charAt(0)}
            </span>
          </div>
        )}

        {/* Speciaal voor jou badge */}
        {shift.is_speciaal && (
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-[var(--mp-tag-special)] text-white text-xs font-semibold shadow-lg">
            ⭐️ Speciaal voor jou
          </div>
        )}

        {/* Plekken beschikbaar badge */}
        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-semibold">
          {shift.plekken_beschikbaar}/{shift.plekken_totaal} plekken
        </div>

        {/* Save button */}
        {onSave && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave(shift.id);
            }}
            className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform active:scale-95"
            aria-label={saved ? "Opgeslagen" : "Bewaren"}
          >
            <svg
              className={`w-5 h-5 ${saved ? "fill-[var(--mp-accent)] text-[var(--mp-accent)]" : "text-[var(--mp-text-primary)]"}`}
              fill={saved ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Bedrijfsnaam + Rating */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-[var(--mp-text-primary)]">
            {shift.klant.bedrijfsnaam}
          </h3>
          {shift.klant.rating && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--mp-stars)]/10">
              <Star className="w-4 h-4 fill-[var(--mp-stars)] text-[var(--mp-stars)]" />
              <span className="text-sm font-semibold text-[var(--mp-text-primary)]">
                {shift.klant.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Locatie */}
        <div className="flex items-center gap-1.5 text-[var(--mp-text-secondary)] text-sm mb-3">
          <MapPin className="w-4 h-4" />
          <span>{shift.locatie}</span>
        </div>

        {/* Tags */}
        {shift.tags && shift.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {shift.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-full bg-[var(--mp-accent)]/10 text-[var(--mp-accent)] text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Datum + Tijd */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--mp-bg)] flex items-center justify-center">
              <Clock className="w-5 h-5 text-[var(--mp-text-secondary)]" />
            </div>
            <div>
              <div className="text-xs text-[var(--mp-text-tertiary)]">Datum</div>
              <div className="text-sm font-semibold text-[var(--mp-text-primary)]">
                {formatDatum(shift.datum)}
              </div>
              <div className="text-xs text-[var(--mp-text-secondary)]">
                {formatTijd(shift.start_tijd, shift.eind_tijd)}
              </div>
            </div>
          </div>

          {/* Verdiensten */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--mp-accent)]/10 flex items-center justify-center">
              <Euro className="w-5 h-5 text-[var(--mp-accent)]" />
            </div>
            <div>
              <div className="text-xs text-[var(--mp-text-tertiary)]">Verdiensten</div>
              <div className="text-sm font-bold text-[var(--mp-accent)]">
                €{verdiensten.toFixed(2)}
              </div>
              <div className="text-xs text-[var(--mp-text-secondary)]">
                {uren}u × €{medewerkerUurtarief}
              </div>
            </div>
          </div>
        </div>

        {/* Omschrijving */}
        {shift.omschrijving && (
          <p className="text-sm text-[var(--mp-text-secondary)] mb-4 line-clamp-2">
            {shift.omschrijving}
          </p>
        )}

        {/* CTA Button */}
        <button
          onClick={() => onApply(shift.id)}
          className="w-full py-3.5 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm transition-all active:scale-[0.98] hover:bg-[var(--mp-accent-dark)]"
        >
          Direct aanmelden
        </button>
      </div>
    </div>
  );
}
