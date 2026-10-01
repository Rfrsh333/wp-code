"use client";

import { useEffect } from "react";
import { isSessieVerlopen, type Portaal } from "@/lib/sessie-verlopen";

let bezigMetUitloggen = false;

/**
 * Centrale 401-afhandeling voor een portaal. Alle schermen gebruiken losse fetch-calls (en
 * React Query bouwt daar ook op), dus één wrapper om window.fetch vangt elke 401 van het
 * eigen portaal-API af: sessie opruimen via de logout-route en naar het inlogscherm.
 * Voorheen bleven schermen leeg of toonden ze "Er ging iets mis" na een verlopen of ingetrokken
 * sessie (bv. na wachtwoord wijzigen op een ander toestel).
 */
export default function SessieVerlopenBewaker({ portaal }: { portaal: Portaal }) {
  useEffect(() => {
    const origineel = window.fetch;
    const omhulsel: typeof window.fetch = async (input, init) => {
      const res = await origineel(input, init);
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (
        !bezigMetUitloggen &&
        isSessieVerlopen({
          portaal,
          status: res.status,
          url,
          origin: window.location.origin,
          paginaPad: window.location.pathname,
        })
      ) {
        bezigMetUitloggen = true;
        try {
          await origineel(`/api/${portaal}/logout`, { method: "POST", keepalive: true });
        } catch {
          // Cookie wissen lukt dan bij de volgende login; doorsturen gaat toch door.
        }
        window.location.replace(`/${portaal}/login`);
      }
      return res;
    };
    window.fetch = omhulsel;
    return () => {
      if (window.fetch === omhulsel) window.fetch = origineel;
    };
  }, [portaal]);

  return null;
}
