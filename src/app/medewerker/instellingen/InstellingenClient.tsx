"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Moon, Trash2 } from "lucide-react";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import { PushNotificationToggle } from "@/components/medewerker/PushNotificationBanner";
import ThemeToggle from "@/components/medewerker/ThemeToggle";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

const invoerKlasse =
  "w-full px-4 py-2.5 rounded-xl bg-[var(--mp-bg)] border border-[var(--mp-separator)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-accent)]";

function Sectie({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] overflow-hidden shadow-[var(--mp-shadow)]">
      <div className="px-4 py-3 border-b border-[var(--mp-separator)]">
        <h2 className="text-sm font-semibold text-[var(--mp-text-secondary)]">{titel}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function WachtwoordWijzigen() {
  const [open, setOpen] = useState(false);
  const [huidig, setHuidig] = useState("");
  const [nieuw, setNieuw] = useState("");
  const [herhaal, setHerhaal] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const opslaan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFout("");
    if (nieuw.length < 8) {
      setFout("Je nieuwe wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }
    if (nieuw !== herhaal) {
      setFout("De nieuwe wachtwoorden komen niet overeen.");
      return;
    }
    setBezig(true);
    try {
      const res = await fetch("/api/medewerker/wachtwoord-wijzigen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ huidig_wachtwoord: huidig, nieuw_wachtwoord: nieuw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(data.error || "Wachtwoord wijzigen mislukt");
        return;
      }
      toast.success("Wachtwoord gewijzigd. Andere apparaten zijn uitgelogd.");
      setHuidig("");
      setNieuw("");
      setHerhaal("");
      setOpen(false);
    } catch (err) {
      Sentry.captureException(err);
      setFout("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  };

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--mp-bg)] flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-[var(--mp-text-secondary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[var(--mp-text-primary)]">Wachtwoord wijzigen</div>
          <div className="text-xs text-[var(--mp-text-tertiary)] mt-0.5">Daarna word je op andere apparaten uitgelogd</div>
        </div>
        <button onClick={() => setOpen(true)} className="text-[var(--mp-accent)] text-sm font-medium">
          Wijzig
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={opslaan} className="space-y-3">
      <h3 className="font-medium text-[var(--mp-text-primary)]">Wachtwoord wijzigen</h3>
      {fout && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-sm">{fout}</div>}
      <input
        type="password"
        autoComplete="current-password"
        placeholder="Huidig wachtwoord"
        value={huidig}
        onChange={(e) => setHuidig(e.target.value)}
        className={invoerKlasse}
        required
      />
      <input
        type="password"
        autoComplete="new-password"
        placeholder="Nieuw wachtwoord (min. 8 tekens)"
        value={nieuw}
        onChange={(e) => setNieuw(e.target.value)}
        className={invoerKlasse}
        required
      />
      <input
        type="password"
        autoComplete="new-password"
        placeholder="Herhaal nieuw wachtwoord"
        value={herhaal}
        onChange={(e) => setHerhaal(e.target.value)}
        className={invoerKlasse}
        required
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setFout("");
          }}
          disabled={bezig}
          className="flex-1 py-2.5 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] font-semibold text-sm"
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={bezig}
          className="flex-1 py-2.5 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm disabled:opacity-50"
        >
          {bezig ? "Opslaan..." : "Opslaan"}
        </button>
      </div>
    </form>
  );
}

function AccountVerwijderen() {
  const [open, setOpen] = useState(false);
  const [wachtwoord, setWachtwoord] = useState("");
  const [reden, setReden] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [verstuurd, setVerstuurd] = useState(false);

  const versturen = async (e: React.FormEvent) => {
    e.preventDefault();
    setFout("");
    if (!window.confirm("Weet je zeker dat je wilt dat TopTalent je account verwijdert?")) return;
    setBezig(true);
    try {
      const res = await fetch("/api/medewerker/account-verwijderen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wachtwoord, reden }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(data.error || "Verzoek versturen mislukt");
        return;
      }
      setVerstuurd(true);
      setWachtwoord("");
    } catch (err) {
      Sentry.captureException(err);
      setFout("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  };

  if (verstuurd) {
    return (
      <p className="text-sm text-[var(--mp-text-secondary)]">
        Je verzoek is verstuurd. TopTalent neemt contact met je op en verwijdert je account. Gegevens die we
        wettelijk moeten bewaren (zoals loon- en urenadministratie) blijven bewaard zolang dat verplicht is.
      </p>
    );
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--mp-danger)]/10 flex items-center justify-center flex-shrink-0">
          <Trash2 className="w-5 h-5 text-[var(--mp-danger)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[var(--mp-text-primary)]">Account verwijderen</div>
          <div className="text-xs text-[var(--mp-text-tertiary)] mt-0.5">Vraag TopTalent je account te verwijderen</div>
        </div>
        <button onClick={() => setOpen(true)} className="text-[var(--mp-danger)] text-sm font-medium">
          Verwijderen
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={versturen} className="space-y-3">
      <h3 className="font-medium text-[var(--mp-text-primary)]">Account verwijderen</h3>
      <p className="text-sm text-[var(--mp-text-secondary)]">
        Je verzoek gaat naar TopTalent, dat je account verwijdert. Gegevens die we wettelijk moeten bewaren (zoals
        loon- en urenadministratie) blijven bewaard zolang dat verplicht is. Bevestig met je wachtwoord.
      </p>
      {fout && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-sm">{fout}</div>}
      <textarea
        placeholder="Reden (optioneel)"
        value={reden}
        onChange={(e) => setReden(e.target.value)}
        maxLength={1000}
        rows={2}
        className={invoerKlasse}
      />
      <input
        type="password"
        autoComplete="current-password"
        placeholder="Wachtwoord"
        value={wachtwoord}
        onChange={(e) => setWachtwoord(e.target.value)}
        className={invoerKlasse}
        required
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setFout("");
          }}
          disabled={bezig}
          className="flex-1 py-2.5 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] font-semibold text-sm"
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={bezig || !wachtwoord}
          className="flex-1 py-2.5 rounded-xl bg-[var(--mp-danger)] text-white font-semibold text-sm disabled:opacity-50"
        >
          {bezig ? "Versturen..." : "Verzoek versturen"}
        </button>
      </div>
    </form>
  );
}

export default function InstellingenClient() {
  const router = useRouter();

  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        {/* Header */}
        <div className="bg-gradient-to-br from-[var(--mp-accent)] to-[var(--mp-accent-dark)] pt-4 pb-6 px-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white mb-4 transition-opacity active:opacity-70"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Terug</span>
            </button>
            <h1 className="text-2xl font-bold text-white">Instellingen</h1>
            <p className="text-white/80 text-sm mt-1">Beheer je voorkeuren en account</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 -mt-2 space-y-4">
          <Sectie titel="Notificaties">
            <PushNotificationToggle />
          </Sectie>

          <Sectie titel="Weergave">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--mp-bg)] flex items-center justify-center flex-shrink-0">
                <Moon className="w-5 h-5 text-[var(--mp-text-secondary)]" />
              </div>
              <div className="flex-1 font-medium text-[var(--mp-text-primary)]">Thema</div>
              <ThemeToggle />
            </div>
          </Sectie>

          <Sectie titel="Account">
            <div className="space-y-5">
              <WachtwoordWijzigen />
              <div className="border-t border-[var(--mp-separator)]" />
              <AccountVerwijderen />
            </div>
          </Sectie>
        </div>

        {/* Spacing */}
        <div className="h-8" />
      </div>
    </MedewerkerResponsiveLayout>
  );
}
