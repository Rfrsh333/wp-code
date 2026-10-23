"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/** Bevestigt het e-mailadres uit de registratiemail (lib/klant-onboarding, bevestigEmailMetToken). */
export default function EmailBevestigenClient() {
  const token = useSearchParams().get("token") || "";
  const [stand, setStand] = useState<"bezig" | "bevestigd" | "fout">("bezig");
  const [melding, setMelding] = useState("");
  const gestart = useRef(false);

  useEffect(() => {
    if (gestart.current) return;
    gestart.current = true;
    if (!token) {
      queueMicrotask(() => {
        setStand("fout");
        setMelding("De bevestigingslink is onvolledig. Open de link uit de mail opnieuw.");
      });
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/klant/email-bevestigen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStand("bevestigd");
        } else {
          setStand("fout");
          setMelding(data.error || "Bevestigen mislukt.");
        }
      } catch {
        setStand("fout");
        setMelding("Geen verbinding. Probeer het opnieuw.");
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl shadow-neutral-900/5 p-8 w-full max-w-md border border-neutral-100 text-center">
        {stand === "bezig" && <p className="text-neutral-500">E-mailadres bevestigen...</p>}
        {stand === "bevestigd" && (
          <>
            <h1 className="text-2xl font-bold text-neutral-900">E-mailadres bevestigd</h1>
            <p className="text-neutral-500 mt-2">
              U kunt nu personeel aanvragen. Uw eerste dienst controleert TopTalent kort voordat medewerkers hem zien.
            </p>
            <Link
              href="/klant/dashboard/"
              className="mt-6 inline-block w-full bg-[#F27501] text-white py-3 rounded-xl font-semibold hover:bg-[#d96800] transition-colors"
            >
              Naar TopTalent Business
            </Link>
          </>
        )}
        {stand === "fout" && (
          <>
            <h1 className="text-2xl font-bold text-neutral-900">Bevestigen lukte niet</h1>
            <p role="alert" className="text-red-600 mt-2 text-sm">{melding}</p>
            <Link href="/klant/login/" className="mt-6 inline-block text-sm text-neutral-500 hover:text-[#F27501]">
              Inloggen en een nieuwe link aanvragen
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
