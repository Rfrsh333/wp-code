"use client";

import { useId } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { SFEER_CATEGORIEEN, sfeerfotoCatalogus, sfeerPad, type SfeerCategorie } from "@/lib/sfeerfotos";

const CATALOGUS = sfeerfotoCatalogus();

/**
 * Raster met de standaardfoto's van TopTalent, per categorie (bar, keuken, …). Eén keuze over alle
 * categorieën heen: echte radioknoppen, dus pijltjestoetsen en schermlezers werken zoals verwacht.
 * `eersteCategorie` (bv. die bij de gekozen functie) staat bovenaan met een label.
 */
export default function SfeerfotoKiezer({
  gekozen,
  onKies,
  eersteCategorie,
  uitgeschakeld = false,
}: {
  gekozen: string | null;
  onKies: (id: string) => void;
  eersteCategorie?: SfeerCategorie | null;
  uitgeschakeld?: boolean;
}) {
  const naam = useId();
  const categorieen = eersteCategorie
    ? [...SFEER_CATEGORIEEN.filter((c) => c.id === eersteCategorie), ...SFEER_CATEGORIEEN.filter((c) => c.id !== eersteCategorie)]
    : SFEER_CATEGORIEEN;

  return (
    <div className="max-h-[30rem] overflow-y-auto overscroll-contain pr-1 space-y-4">
      {categorieen.map((c) => (
        <fieldset key={c.id} disabled={uitgeschakeld}>
          <legend className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
            {c.label}
            {c.id === eersteCategorie && (
              <span className="rounded-full bg-[#F27501]/10 px-2 py-0.5 text-[10px] font-semibold text-[#c25e00]">Past bij de functie</span>
            )}
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CATALOGUS.filter((f) => f.categorie === c.id).map((f) => {
              const aan = gekozen === f.id;
              return (
                <label
                  key={f.id}
                  className={`relative block cursor-pointer overflow-hidden rounded-xl border-2 bg-white transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#F27501]/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${
                    aan ? "border-[#F27501]" : "border-transparent hover:border-neutral-300"
                  }`}
                >
                  <input type="radio" name={naam} value={f.id} checked={aan} onChange={() => onKies(f.id)} className="sr-only" />
                  <span className="relative block aspect-[3/2] bg-neutral-100">
                    <Image src={sfeerPad(f.id, "klein")} alt="" fill sizes="(max-width: 640px) 50vw, 200px" className="object-cover" />
                  </span>
                  <span className="block truncate px-2 py-1.5 text-[11px] leading-tight text-neutral-700">{f.label}</span>
                  {aan && (
                    <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#F27501] text-white shadow" aria-hidden="true">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
