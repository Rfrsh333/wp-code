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
      {/* Bedrijfsfoto — compact: smaller aspect ratio */}
      <div className="relative w-full aspect-[2/1] bg-[var(--mp-bg)]">
        {shift.klant.bedrijf_foto_url ? (
          <Image
            src={shift.klant.bedrijf_foto_url}
            alt={shift.klant.bedrijfsnaam}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--mp-accent)]/10 to-[var(--mp-accent)]/5">
            <span className="text-3xl font-bold text-[var(--mp-accent)]/30">
              {shift.klant.bedrijfsnaam.charAt(0)}
            </span>
          </div>
        )}

        {/* Speciaal voor jou badge */}
        {shift.is_speciaal && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-[var(--mp-tag-special)] text-white text-[10px] font-semibold shadow-lg">
            ⭐️ Speciaal voor jou
          </div>
        )}

        {/* Plekken beschikbaar badge */}
        <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold">
          {shift.plekken_beschikbaar}/{shift.plekken_totaal} plekken
        </div>

        {/* Save button */}
        {onSave && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave(shift.id);
            }}
            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform active:scale-95"
            aria-label={saved ? "Opgeslagen" : "Bewaren"}
          >
            <svg
              className={`w-4 h-4 ${saved ? "fill-[var(--mp-accent)] text-[var(--mp-accent)]" : "text-[var(--mp-text-primary)]"}`}
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

      {/* Content — compact padding */}
      <div className="px-3 py-2.5">
        {/* Bedrijfsnaam + Rating */}
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-sm font-bold text-[var(--mp-text-primary)] leading-tight">
            {shift.klant.bedrijfsnaam}
          </h3>
          {shift.klant.rating && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[var(--mp-stars)]/10 shrink-0 ml-2">
              <Star className="w-3 h-3 fill-[var(--mp-stars)] text-[var(--mp-stars)]" />
              <span className="text-xs font-semibold text-[var(--mp-text-primary)]">
                {shift.klant.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Locatie */}
        <div className="flex items-center gap-1 text-[var(--mp-text-secondary)] text-xs mb-1.5">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{shift.locatie}</span>
        </div>

        {/* Tags */}
        {shift.tags && shift.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {shift.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-full bg-[var(--mp-accent)]/10 text-[var(--mp-accent)] text-[10px] font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Info grid — compact */}
        <div className="grid grid-cols-2 gap-2 mb-2.5">
          {/* Datum + Tijd */}
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--mp-bg)] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-[var(--mp-text-secondary)]" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[var(--mp-text-tertiary)]">Datum</div>
              <div className="text-xs font-semibold text-[var(--mp-text-primary)] leading-tight">
                {formatDatum(shift.datum)}
              </div>
              <div className="text-[10px] text-[var(--mp-text-secondary)]">
                {formatTijd(shift.start_tijd, shift.eind_tijd)}
              </div>
            </div>
          </div>

          {/* Verdiensten */}
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--mp-accent)]/10 flex items-center justify-center shrink-0">
              <Euro className="w-4 h-4 text-[var(--mp-accent)]" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[var(--mp-text-tertiary)]">Verdiensten</div>
              <div className="text-xs font-bold text-[var(--mp-accent)] leading-tight">
                €{verdiensten.toFixed(2)}
              </div>
              <div className="text-[10px] text-[var(--mp-text-secondary)]">
                {uren}u × €{medewerkerUurtarief}
              </div>
            </div>
          </div>
        </div>

        {/* Omschrijving */}
        {shift.omschrijving && (
          <p className="text-xs text-[var(--mp-text-secondary)] mb-2 line-clamp-1">
            {shift.omschrijving}
          </p>
        )}

        {/* CTA Button — compact */}
        <button
          onClick={() => onApply(shift.id)}
          className="w-full py-2.5 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-xs transition-all active:scale-[0.98] hover:bg-[var(--mp-accent-dark)]"
        >
          Direct aanmelden
        </button>
      </div>
    </div>
  );
}
