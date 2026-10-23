"use client";

import { useState } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/nextjs";
import { useToast } from "@/components/ui/Toast";
import { klantKeys, useKlantBedrijfsfoto, type KlantBedrijfsfoto } from "@/hooks/queries/useKlantQueries";
import { webFotoSrc } from "@/lib/sfeerfotos";
import SfeerfotoKiezer from "@/components/klant/SfeerfotoKiezer";

/** Zo groot mag een foto vóór het verkleinen zijn (daarna gaat er max. 500 KB naar de server). */
const MAX_ORIGINEEL = 15 * 1024 * 1024;
const MAX_UPLOAD = 500 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

const knop =
  "rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed";

async function verstuur(init: RequestInit): Promise<KlantBedrijfsfoto> {
  const res = await fetch("/api/klant/bedrijfsfoto", init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Er ging iets mis");
  return data as KlantBedrijfsfoto;
}

/**
 * Instellingen → Bedrijfsfoto: één vaste sfeerfoto van de zaak, bij al zijn diensten zonder eigen
 * foto. Uploaden, kiezen uit de standaardfoto's van TopTalent of verwijderen
 * (GET/PUT/DELETE /api/klant/bedrijfsfoto).
 */
export default function Bedrijfsfoto() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useKlantBedrijfsfoto();
  const [kiezen, setKiezen] = useState(false);
  const [bezig, setBezig] = useState(false);

  const klaar = (nieuw: KlantBedrijfsfoto, melding: string) => {
    queryClient.setQueryData(klantKeys.bedrijfsfoto(), nieuw);
    // De foto staat ook bij de diensten en in het rooster.
    queryClient.invalidateQueries({ queryKey: klantKeys.diensten() });
    queryClient.invalidateQueries({ queryKey: [...klantKeys.all, "rooster"] });
    toast.success(melding);
  };

  const voerUit = async (werk: () => Promise<void>) => {
    setBezig(true);
    try {
      await werk();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setBezig(false);
    }
  };

  const upload = (bestand: File) =>
    voerUit(async () => {
      if (!TYPES.includes(bestand.type)) throw new Error("Kies een JPG-, PNG- of WebP-foto");
      if (bestand.size > MAX_ORIGINEEL) throw new Error("Deze foto is te groot (max. 15 MB)");
      let blob: Blob = bestand;
      try {
        const { compressImage } = await import("@/lib/image-compress");
        blob = await compressImage(bestand, { maxWidth: 1200, maxHeight: 1200, quality: 0.8, maxSizeBytes: 400 * 1024 });
      } catch (err) {
        Sentry.captureException(err);
      }
      if (blob.size > MAX_UPLOAD) throw new Error("Deze foto kon niet klein genoeg worden gemaakt. Probeer een andere foto.");
      const form = new FormData();
      form.append("file", blob, blob.type === "image/jpeg" ? "bedrijfsfoto.jpg" : bestand.name);
      klaar(await verstuur({ method: "PUT", body: form }), "Bedrijfsfoto opgeslagen");
      setKiezen(false);
    });

  const kiesStandaard = (id: string) =>
    voerUit(async () => {
      const nieuw = await verstuur({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sfeerfoto_id: id }),
      });
      klaar(nieuw, "Standaardfoto ingesteld als bedrijfsfoto");
    });

  const verwijder = () => {
    if (!window.confirm("Bedrijfsfoto verwijderen? Uw diensten krijgen dan een standaardfoto die bij de functie past.")) return;
    void voerUit(async () => {
      klaar(await verstuur({ method: "DELETE" }), "Bedrijfsfoto verwijderd");
    });
  };

  // Zonder migratie of bij een fout: geen sectie, het portaal werkt zoals voorheen.
  if (isLoading || isError || !data) return null;

  const foto = data.foto?.groot ? webFotoSrc(data.foto.groot, "groot") : null;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4" aria-labelledby="bedrijfsfoto-titel">
      <div>
        <h3 id="bedrijfsfoto-titel" className="text-base font-bold text-neutral-900">Bedrijfsfoto</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Eén sfeerfoto van uw zaak. Medewerkers zien hem bij al uw diensten waar u geen eigen foto bij kiest.
        </p>
      </div>

      {!data.beschikbaar ? (
        <p className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600">
          Een bedrijfsfoto instellen kan binnenkort. Tot die tijd krijgt elke dienst een standaardfoto die bij de functie past.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative aspect-[3/2] w-full shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:w-60">
              {foto ? (
                <Image src={foto.src} unoptimized={foto.unoptimized} alt="Huidige bedrijfsfoto" fill sizes="(max-width: 640px) 100vw, 240px" className="object-cover" />
              ) : (
                <div className="grid h-full place-items-center p-4 text-center text-xs text-neutral-500">Nog geen bedrijfsfoto</div>
              )}
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-neutral-600">
                {!data.foto_url
                  ? "Zonder bedrijfsfoto krijgt elke dienst een standaardfoto die bij de functie past."
                  : data.sfeerfoto_id
                    ? "U gebruikt een standaardfoto van TopTalent."
                    : "U gebruikt uw eigen foto."}
              </p>
              <div className="flex flex-wrap gap-2">
                <label
                  className={`cursor-pointer rounded-xl bg-[#F27501] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d96800] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#F27501]/40 ${bezig ? "pointer-events-none opacity-50" : ""}`}
                >
                  {bezig ? "Bezig…" : "Foto uploaden"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={bezig}
                    onChange={(e) => {
                      const bestand = e.target.files?.[0];
                      e.target.value = "";
                      if (bestand) void upload(bestand);
                    }}
                  />
                </label>
                <button type="button" onClick={() => setKiezen((k) => !k)} disabled={bezig} aria-expanded={kiezen} className={knop}>
                  {kiezen ? "Standaardfoto's sluiten" : "Kies een standaardfoto"}
                </button>
                {data.foto_url && (
                  <button type="button" onClick={verwijder} disabled={bezig} className={`${knop} text-red-700 hover:bg-red-50`}>
                    Verwijderen
                  </button>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                JPG, PNG of WebP, liefst liggend; we verkleinen hem automatisch. Gebruik alleen foto&apos;s waarvan u de rechten heeft en waarop
                niemand herkenbaar is zonder toestemming.
              </p>
            </div>
          </div>
          {kiezen && <SfeerfotoKiezer gekozen={data.sfeerfoto_id} onKies={kiesStandaard} uitgeschakeld={bezig} />}
        </>
      )}
    </section>
  );
}
