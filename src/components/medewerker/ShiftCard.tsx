"use client";

import { MapPin, Star, Clock, Euro, Shirt, Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import { geschatteVerdiensten, medewerkerTariefVanDienst } from "@/lib/medewerker/reactie-regels";
import { afstandLabel } from "@/lib/locatie/locatie-regels";
import { reactiesLabel } from "@/lib/medewerker/ontdekken-regels";
import { webFotoSrc, type DienstFoto } from "@/lib/sfeerfotos";

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
    afbeelding_url?: string | null;
    /** Sfeerfoto (dienst → bedrijfsfoto → standaard per functie); ontbreekt bij een oudere backend. */
    foto?: DienstFoto | null;
    klant: {
      bedrijfsnaam: string;
      bedrijf_foto_url?: string;
      rating?: number;
    };
    tags?: string[];
    is_speciaal?: boolean;
    kledingvoorschrift?: string | null;
    pauze_minuten?: number | null;
    medewerker_uurtarief?: number;
    // Stap 3 (Ontdekken): ontbreken bij een oudere backend.
    afstand_km?: number | null;
    aantal_reacties?: number;
    werkgever_favoriet?: boolean;
    ik_ben_favoriet?: boolean;
  };
  /** Opent het reageerscherm (uitgebreid reageren). */
  onApply: (shiftId: string) => void;
  /** Opent het dienstdetail (tik op de kaart). */
  onOpen?: (shiftId: string) => void;
  onSave?: (shiftId: string) => void;
  saved?: boolean;
  /** Reageerscherm voor deze dienst staat open: knop uitgeschakeld. */
  bezig?: boolean;
}

export default function ShiftCard({ shift, onApply, onOpen, onSave, saved = false, bezig = false }: ShiftCardProps) {
  // Klanttarief min € 4 (lib/medewerker/reactie-regels), nooit negatief.
  const medewerkerUurtarief = shift.medewerker_uurtarief ?? medewerkerTariefVanDienst(shift.uurtarief);

  const formatDatum = (datum: string) => {
    const d = new Date(datum);
    const dagen = ["zo", "ma", "di", "wo", "do", "vr", "za"];
    const maanden = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
    return `${dagen[d.getDay()]} ${d.getDate()} ${maanden[d.getMonth()]}`;
  };

  const formatTijd = (start: string, eind: string) => {
    return `${start.slice(0, 5)} - ${eind.slice(0, 5)}`;
  };

  // ± verdiensten: pauze eraf, nachtdiensten over middernacht goed (voorheen negatief).
  const schatting = geschatteVerdiensten({
    start_tijd: shift.start_tijd,
    eind_tijd: shift.eind_tijd,
    pauze_minuten: shift.pauze_minuten,
    uurtarief: medewerkerUurtarief,
  });
  const uren = schatting.uren.toFixed(1);
  const verdiensten = schatting.bedrag;
  const afstand = afstandLabel(shift.afstand_km);
  const reacties = reactiesLabel(shift.aantal_reacties);
  // Kleine versie van de sfeerfoto; zonder `foto` (oudere backend) zoals voorheen.
  const fotoUrl = shift.foto?.klein || shift.afbeelding_url || shift.klant.bedrijf_foto_url || null;
  const foto = fotoUrl ? webFotoSrc(fotoUrl, "klein") : null;

  return (
    <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] overflow-hidden shadow-[var(--mp-shadow)]">
      {/* Sfeerfoto: dienstfoto, anders bedrijfsfoto, anders een standaardfoto bij de functie. Tik = dienstdetail. */}
      <div
        className={`relative w-full aspect-[2/1] bg-[var(--mp-bg)] ${onOpen ? "cursor-pointer" : ""}`}
        onClick={onOpen ? () => onOpen(shift.id) : undefined}
      >
        {foto ? (
          <Image
            src={foto.src}
            unoptimized={foto.unoptimized}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--mp-accent)]/10 to-[var(--mp-accent)]/5">
            <span className="text-3xl font-bold text-[var(--mp-accent)]/30">
              {shift.klant.bedrijfsnaam.charAt(0)}
            </span>
          </div>
        )}

        {/* Jij staat bij deze werkgever in de favorieten; anders "Speciaal voor jou" */}
        {shift.ik_ben_favoriet ? (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-[var(--mp-tag-special)] text-white text-[10px] font-semibold shadow-lg">
            ⭐️ Jij bent favoriet
          </div>
        ) : shift.is_speciaal ? (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-[var(--mp-tag-special)] text-white text-[10px] font-semibold shadow-lg">
            ⭐️ Speciaal voor jou
          </div>
        ) : null}

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
          <h3 className="text-sm font-bold text-[var(--mp-text-primary)] leading-tight flex items-center gap-1 min-w-0">
            {onOpen ? (
              <button onClick={() => onOpen(shift.id)} className="text-left truncate hover:underline">
                {shift.klant.bedrijfsnaam}
              </button>
            ) : (
              <span className="truncate">{shift.klant.bedrijfsnaam}</span>
            )}
            {shift.werkgever_favoriet && (
              <Heart className="w-3.5 h-3.5 shrink-0 fill-[var(--mp-accent)] text-[var(--mp-accent)]" aria-label="Favoriete werkgever" />
            )}
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
        <div className="flex items-center gap-1 text-[var(--mp-text-secondary)] text-xs mb-1.5 min-w-0">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{shift.locatie}</span>
          {afstand && <span className="shrink-0 text-[var(--mp-text-tertiary)]">· {afstand}</span>}
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
              <div className="text-[10px] text-[var(--mp-text-tertiary)]">± Verdiensten</div>
              <div className="text-xs font-bold text-[var(--mp-accent)] leading-tight">
                €{verdiensten.toFixed(2)}
              </div>
              <div className="text-[10px] text-[var(--mp-text-secondary)]">
                {uren}u × €{medewerkerUurtarief}
              </div>
            </div>
          </div>
        </div>

        {/* Pauze en kledingvoorschrift (uitgebreid reageren) */}
        {(shift.kledingvoorschrift || (shift.pauze_minuten ?? 0) > 0) && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2 text-[10px] text-[var(--mp-text-secondary)]">
            {(shift.pauze_minuten ?? 0) > 0 && <span>{shift.pauze_minuten} min pauze</span>}
            {shift.kledingvoorschrift && (
              <span className="flex items-center gap-1 min-w-0">
                <Shirt className="w-3 h-3 shrink-0" />
                <span className="truncate">{shift.kledingvoorschrift}</span>
              </span>
            )}
          </div>
        )}

        {/* Omschrijving */}
        {shift.omschrijving && (
          <p className="text-xs text-[var(--mp-text-secondary)] mb-2 line-clamp-1">
            {shift.omschrijving}
          </p>
        )}

        {reacties && (
          <p className="flex items-center gap-1 text-[10px] font-medium text-[var(--mp-text-secondary)] mb-2">
            <MessageCircle className="w-3 h-3" /> {reacties}
          </p>
        )}

        {/* CTA Button — compact */}
        <button
          onClick={() => onApply(shift.id)}
          disabled={bezig}
          aria-busy={bezig}
          className="w-full py-2.5 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-xs transition-all active:scale-[0.98] hover:bg-[var(--mp-accent-dark)] disabled:opacity-50"
        >
          {bezig ? "Reageren…" : "Reageren"}
        </button>
      </div>
    </div>
  );
}
