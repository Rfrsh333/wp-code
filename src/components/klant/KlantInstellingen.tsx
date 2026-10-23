"use client";

import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/Toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { klantKeys, useKlantAccount } from "@/hooks/queries/useKlantQueries";

interface Account {
  bedrijfsnaam: string;
  contactpersoon: string | null;
  email: string;
  telefoon: string | null;
  adres?: string | null;
  postcode?: string | null;
  stad?: string | null;
  kvk_nummer?: string | null;
  btw_nummer?: string | null;
}

const invoer =
  "w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] disabled:bg-neutral-50 disabled:text-neutral-500";

async function post(url: string, method: string, body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Er ging iets mis");
  return data;
}

/**
 * Instellingen-tab: bedrijfsgegevens, wachtwoord, meldingen, uitloggen en account verwijderen
 * (App Store 5.1.1(v): verwijderen moet in de app zelf kunnen).
 */
export default function KlantInstellingen({ onLogout }: { onLogout: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useKlantAccount();
  const account: Account | null = data?.account ?? null;

  if (isLoading || !account) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Instellingen</h2>
        <p className="mt-1 text-sm text-neutral-500">Uw bedrijfsgegevens, wachtwoord en account.</p>
      </div>

      <Bedrijfsgegevens
        key={JSON.stringify(account)}
        account={account}
        onOpgeslagen={() => {
          queryClient.invalidateQueries({ queryKey: klantKeys.account() });
          toast.success("Gegevens opgeslagen");
        }}
        onFout={(m) => toast.error(m)}
      />
      <WachtwoordWijzigen onSucces={() => toast.success("Wachtwoord gewijzigd. Andere apparaten zijn uitgelogd.")} onFout={(m) => toast.error(m)} />
      <Meldingen />

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-base font-bold text-neutral-900">Sessies</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={onLogout} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Uitloggen
          </button>
          <button
            onClick={async () => {
              if (!window.confirm("Op alle apparaten uitloggen, ook hier?")) return;
              try {
                await post("/api/klant/logout", "POST", { overal: true });
              } catch {
                // uitloggen gaat hoe dan ook door
              }
              onLogout();
            }}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Overal uitloggen
          </button>
        </div>
      </section>

      <AccountVerwijderen />
    </div>
  );
}

function Bedrijfsgegevens({ account, onOpgeslagen, onFout }: { account: Account; onOpgeslagen: () => void; onFout: (m: string) => void }) {
  const [form, setForm] = useState({
    contactpersoon: account.contactpersoon ?? "",
    telefoon: account.telefoon ?? "",
    adres: account.adres ?? "",
    postcode: account.postcode ?? "",
    stad: account.stad ?? "",
    kvk_nummer: account.kvk_nummer ?? "",
    btw_nummer: account.btw_nummer ?? "",
  });
  const [bezig, setBezig] = useState(false);
  const heeftAdresKolommen = "adres" in account;

  const opslaan = async (e: FormEvent) => {
    e.preventDefault();
    setBezig(true);
    try {
      const body: Record<string, string> = { contactpersoon: form.contactpersoon, telefoon: form.telefoon };
      if (heeftAdresKolommen) Object.assign(body, {
        adres: form.adres, postcode: form.postcode, stad: form.stad, kvk_nummer: form.kvk_nummer, btw_nummer: form.btw_nummer,
      });
      await post("/api/klant/account", "PATCH", body);
      onOpgeslagen();
    } catch (err) {
      onFout(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setBezig(false);
    }
  };

  const veld = (key: keyof typeof form, label: string, extra?: { placeholder?: string; type?: string; autoComplete?: string }) => (
    <div>
      <label htmlFor={`inst-${key}`} className="block text-xs font-medium text-neutral-600 mb-1">{label}</label>
      <input
        id={`inst-${key}`}
        type={extra?.type ?? "text"}
        autoComplete={extra?.autoComplete}
        value={form[key]}
        placeholder={extra?.placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={invoer}
      />
    </div>
  );

  return (
    <form onSubmit={opslaan} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
      <h3 className="text-base font-bold text-neutral-900">Bedrijfsgegevens</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Bedrijfsnaam</label>
          <input value={account.bedrijfsnaam} disabled className={invoer} />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">E-mailadres (inloggen)</label>
          <input value={account.email} disabled className={invoer} />
        </div>
        {veld("contactpersoon", "Contactpersoon *", { autoComplete: "name" })}
        {veld("telefoon", "Telefoon", { type: "tel", autoComplete: "tel" })}
        {heeftAdresKolommen && (
          <>
            <div className="sm:col-span-2">{veld("adres", "Adres", { placeholder: "Straat en huisnummer", autoComplete: "street-address" })}</div>
            {veld("postcode", "Postcode", { placeholder: "1234 AB", autoComplete: "postal-code" })}
            {veld("stad", "Plaats", { autoComplete: "address-level2" })}
            {veld("kvk_nummer", "KvK-nummer", { placeholder: "12345678" })}
            {veld("btw_nummer", "Btw-nummer", { placeholder: "NL000000000B01" })}
          </>
        )}
      </div>
      <p className="text-xs text-neutral-400">Bedrijfsnaam of e-mailadres wijzigen? Neem contact op met TopTalent.</p>
      <button type="submit" disabled={bezig} className="rounded-xl bg-[#F27501] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d96800] disabled:opacity-50">
        {bezig ? "Opslaan..." : "Opslaan"}
      </button>
    </form>
  );
}

function WachtwoordWijzigen({ onSucces, onFout }: { onSucces: () => void; onFout: (m: string) => void }) {
  const [huidig, setHuidig] = useState("");
  const [nieuw, setNieuw] = useState("");
  const [bevestig, setBevestig] = useState("");
  const [bezig, setBezig] = useState(false);

  const wijzig = async (e: FormEvent) => {
    e.preventDefault();
    if (nieuw.length < 8) return onFout("Nieuw wachtwoord moet minimaal 8 tekens zijn");
    if (nieuw !== bevestig) return onFout("Wachtwoorden komen niet overeen");
    setBezig(true);
    try {
      await post("/api/klant/account/wachtwoord", "POST", { huidig_wachtwoord: huidig, nieuw_wachtwoord: nieuw });
      setHuidig(""); setNieuw(""); setBevestig("");
      onSucces();
    } catch (err) {
      onFout(err instanceof Error ? err.message : "Wachtwoord wijzigen mislukt");
    } finally {
      setBezig(false);
    }
  };

  return (
    <form onSubmit={wijzig} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
      <h3 className="text-base font-bold text-neutral-900">Wachtwoord wijzigen</h3>
      <input type="password" autoComplete="current-password" placeholder="Huidig wachtwoord" value={huidig} onChange={(e) => setHuidig(e.target.value)} className={invoer} required aria-label="Huidig wachtwoord" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="password" autoComplete="new-password" placeholder="Nieuw wachtwoord" value={nieuw} onChange={(e) => setNieuw(e.target.value)} className={invoer} required aria-label="Nieuw wachtwoord" />
        <input type="password" autoComplete="new-password" placeholder="Herhaal nieuw wachtwoord" value={bevestig} onChange={(e) => setBevestig(e.target.value)} className={invoer} required aria-label="Herhaal nieuw wachtwoord" />
      </div>
      <button type="submit" disabled={bezig} className="rounded-xl bg-[#1e3a5f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#16304f] disabled:opacity-50">
        {bezig ? "Wijzigen..." : "Wachtwoord wijzigen"}
      </button>
    </form>
  );
}

function Meldingen() {
  const toast = useToast();
  const { permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  const omschrijving =
    permission === "unsupported"
      ? "Dit apparaat of deze browser ondersteunt geen pushmeldingen."
      : permission === "denied"
        ? "Meldingen zijn geblokkeerd in de instellingen van uw browser/telefoon."
        : isSubscribed
          ? "U ontvangt meldingen over aanmeldingen, uren en facturen op dit apparaat."
          : "Meldingen staan uit op dit apparaat.";

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-neutral-900">Pushmeldingen</h3>
          <p className="mt-1 text-sm text-neutral-500">{omschrijving}</p>
        </div>
        {permission !== "unsupported" && permission !== "denied" && (
          <button
            role="switch"
            aria-checked={isSubscribed}
            disabled={loading}
            onClick={async () => {
              // Uitzetten verwijdert ook het abonnement op de server (voorheen kon dat nergens).
              const ok = isSubscribed ? await unsubscribe() : await subscribe();
              if (!ok) toast.error("Wijzigen van meldingen is mislukt");
            }}
            className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${isSubscribed ? "bg-[#F27501]" : "bg-neutral-300"}`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${isSubscribed ? "left-[22px]" : "left-0.5"}`} />
            <span className="sr-only">{isSubscribed ? "Meldingen uitzetten" : "Meldingen aanzetten"}</span>
          </button>
        )}
      </div>
    </section>
  );
}

function AccountVerwijderen() {
  const [open, setOpen] = useState(false);
  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestiging, setBevestiging] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const verwijder = async (e: FormEvent) => {
    e.preventDefault();
    setFout("");
    setBezig(true);
    try {
      await post("/api/klant/account/verwijderen", "POST", { wachtwoord, bevestiging });
      try {
        const { clearSwCacheOnLogout } = await import("@/lib/sw-utils");
        await clearSwCacheOnLogout();
      } catch {
        // cache wissen is best effort
      }
      window.location.href = "/klant/login";
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Verwijderen mislukt");
      setBezig(false);
    }
  };

  return (
    <section className="rounded-2xl border border-red-200 bg-red-50/40 p-5 space-y-3">
      <h3 className="text-base font-bold text-red-800">Account verwijderen</h3>
      <p className="text-sm text-neutral-600">
        Uw account wordt gesloten en uw persoonsgegevens worden gewist. Facturen bewaren wij 7 jaar
        vanwege de wettelijke (fiscale) bewaarplicht. Komende diensten met ingeplande medewerkers moet u eerst annuleren.
      </p>
      {!open ? (
        <button onClick={() => setOpen(true)} className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
          Account verwijderen…
        </button>
      ) : (
        <form onSubmit={verwijder} className="space-y-3">
          {fout && <div role="alert" className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">{fout}</div>}
          <input type="password" autoComplete="current-password" placeholder="Uw wachtwoord" value={wachtwoord} onChange={(e) => setWachtwoord(e.target.value)} className={invoer} required aria-label="Wachtwoord" />
          <input placeholder="Typ VERWIJDEREN" value={bevestiging} onChange={(e) => setBevestiging(e.target.value)} className={invoer} required aria-label="Typ VERWIJDEREN ter bevestiging" />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setOpen(false); setFout(""); }} className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700">
              Annuleren
            </button>
            <button type="submit" disabled={bezig || bevestiging !== "VERWIJDEREN" || !wachtwoord} className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {bezig ? "Verwijderen..." : "Definitief verwijderen"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
