"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Video } from "lucide-react";
import { toast } from "sonner";

/**
 * Checklistpunt ID via Didit (alleen als ID_CHECK_DIDIT_ACTIEF aan staat). Leest
 * GET /api/medewerker/id-check; staat de functie uit (404), dan toont de kaart niets en meldt hij
 * `onActief(false)`, zodat de documentenpagina de oude upload van het ID-bewijs laat zien.
 *
 * "Controleer je ID" opent de Didit-flow (op een computer toont Didit zelf een QR-code voor de
 * telefoon). Didit stuurt daarna terug naar /medewerker/documenten/?verificationSessionId=…&status=…;
 * dan tonen we "We controleren je ID" en kijken we een minuut lang of de uitslag er is.
 */

type IdCheck = {
  actief: boolean;
  id_ok: boolean;
  status: string | null;
  methode: string | null;
  reden: string | null;
  vervaldatum: string | null;
};

const POLL_MS = 4000;
const POLL_MAX = 15;

function datumNl(datum: string): string {
  return new Date(`${datum}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

export default function IdCheckKaart({ onActief }: { onActief?: (actief: boolean) => void }) {
  const [check, setCheck] = useState<IdCheck | null>(null);
  // Didit stuurt na afloop terug met ?verificationSessionId=…&status=…. De kaart rendert pas iets na
  // het ophalen van de status, dus dit verschil tussen server en browser geeft geen hydration-fout.
  const [terugVanDidit, setTerugVanDidit] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("verificationSessionId"),
  );
  const [bezig, setBezig] = useState<"starten" | "videocall" | null>(null);
  const pogingen = useRef(0);
  const onActiefRef = useRef(onActief);
  useEffect(() => {
    onActiefRef.current = onActief;
  }, [onActief]);

  const laad = useCallback(async (): Promise<IdCheck | null> => {
    try {
      const res = await fetch("/api/medewerker/id-check", { cache: "no-store" });
      if (!res.ok) {
        onActiefRef.current?.(false);
        return null;
      }
      const data = (await res.json()) as IdCheck;
      setCheck(data);
      onActiefRef.current?.(!!data.actief);
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    // Terug van Didit? Dan de parameters uit de adresbalk halen en even blijven kijken.
    const params = new URLSearchParams(window.location.search);
    const terug = params.has("verificationSessionId");
    if (terug) {
      params.delete("verificationSessionId");
      params.delete("status");
      const rest = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${rest ? `?${rest}` : ""}`);
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const kijk = async () => {
      const data = await laad();
      const loopt = !!data && !data.id_ok && (data.status === "gestart" || data.status === "bezig");
      if (terug && loopt && pogingen.current < POLL_MAX) {
        pogingen.current += 1;
        timer = setTimeout(kijk, POLL_MS);
      } else {
        setTerugVanDidit(false);
      }
    };
    void kijk();
    return () => clearTimeout(timer);
  }, [laad]);

  const start = async () => {
    setBezig("starten");
    try {
      const res = await fetch("/api/medewerker/id-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        toast.error(data.error || "De ID-controle kon niet worden gestart. Probeer het later opnieuw.");
        await laad();
        return;
      }
      window.location.assign(data.url);
    } catch {
      toast.error("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setBezig(null);
    }
  };

  const vraagVideocall = async () => {
    if (!confirm("Wil je je ID liever in een videocall laten zien? We nemen contact met je op om een moment af te spreken.")) return;
    setBezig("videocall");
    try {
      const res = await fetch("/api/medewerker/id-check/videocall", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Je verzoek kon niet worden verstuurd.");
        return;
      }
      toast.success("Verzoek verstuurd. We nemen contact met je op.");
      await laad();
    } catch {
      toast.error("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setBezig(null);
    }
  };

  if (!check?.actief) return null;

  const kaart = "bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-5 shadow-[var(--mp-shadow)] mb-6";

  if (check.id_ok) {
    return (
      <div className={`${kaart} flex items-start gap-3`}>
        <CheckCircle2 className="w-6 h-6 text-[var(--mp-success)] flex-shrink-0" />
        <div>
          <h2 className="font-semibold text-[var(--mp-text-primary)]">Je ID is gecontroleerd</h2>
          <p className="text-sm text-[var(--mp-text-secondary)] mt-0.5">
            {check.vervaldatum ? `Geldig tot ${datumNl(check.vervaldatum)}. ` : ""}TopTalent bewaart geen kopie van je ID.
          </p>
        </div>
      </div>
    );
  }

  const wachten = terugVanDidit || check.status === "handmatig";
  if (wachten) {
    return (
      <div className={`${kaart} flex items-start gap-3`}>
        <Loader2 className="w-6 h-6 text-[var(--mp-accent)] flex-shrink-0 animate-spin" />
        <div>
          <h2 className="font-semibold text-[var(--mp-text-primary)]">We controleren je ID</h2>
          <p className="text-sm text-[var(--mp-text-secondary)] mt-0.5">
            Je hoeft niets te doen. Zodra je ID is goedgekeurd, zie je dat hier.
          </p>
        </div>
      </div>
    );
  }

  if (check.status === "videocall_gevraagd") {
    return (
      <div className={`${kaart} flex items-start gap-3`}>
        <Video className="w-6 h-6 text-[var(--mp-accent)] flex-shrink-0" />
        <div>
          <h2 className="font-semibold text-[var(--mp-text-primary)]">Videocall aangevraagd</h2>
          <p className="text-sm text-[var(--mp-text-secondary)] mt-0.5">
            We nemen contact met je op om een moment af te spreken. Houd je paspoort of ID-kaart bij de hand.
          </p>
        </div>
      </div>
    );
  }

  const titel =
    check.status === "afgewezen"
      ? "Je ID-controle is niet goedgekeurd"
      : check.status === "bezig"
        ? "Je ID-controle is nog niet klaar"
        : "Controleer je ID";
  const uitleg =
    check.status === "afgewezen"
      ? check.reden || "Probeer het opnieuw of kies een videocall."
      : check.status === "bezig"
        ? "Rond hem af op je telefoon, of begin opnieuw."
        : "Met je telefoon en je paspoort of ID-kaart. Het duurt een paar minuten. TopTalent bewaart geen kopie van je ID.";

  return (
    <div className={kaart}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--mp-accent)]/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-[var(--mp-accent)]" />
        </div>
        <div>
          <h2 className="font-semibold text-[var(--mp-text-primary)]">{titel}</h2>
          <p className="text-sm text-[var(--mp-text-secondary)] mt-0.5">{uitleg}</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={start}
          disabled={bezig !== null}
          className="px-4 py-2.5 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {bezig === "starten" && <Loader2 className="w-4 h-4 animate-spin" />}
          {check.status === "bezig" ? "Ga verder" : check.status === "afgewezen" ? "Opnieuw proberen" : "Controleer je ID"}
        </button>
        <button
          onClick={vraagVideocall}
          disabled={bezig !== null}
          className="px-4 py-2.5 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] font-semibold text-sm border border-[var(--mp-separator)] transition-all active:scale-95 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {bezig === "videocall" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
          Liever een videocall
        </button>
      </div>
    </div>
  );
}
