"use client";

import { useState, useEffect } from "react";

interface Klant {
  id: string;
  bedrijfsnaam: string;
  contactpersoon: string;
  email: string;
}

interface UrenRegistratie {
  id: string;
  start_tijd: string;
  eind_tijd: string;
  pauze_minuten: number;
  gewerkte_uren: number;
  status: string;
  created_at: string;
  medewerker_naam: string;
  dienst_datum: string;
  dienst_locatie: string;
  uurtarief: number;
}

interface AanpassingModal {
  open: boolean;
  uren: UrenRegistratie | null;
  startTijd: string;
  eindTijd: string;
  pauzeMinuten: string;
  opmerking: string;
}

interface TeBeoordelen {
  dienst_id: string;
  medewerker_id: string;
  medewerker_naam: string;
  datum: string;
  locatie: string;
}

export default function KlantUrenClient({ klant }: { klant: Klant }) {
  const [uren, setUren] = useState<UrenRegistratie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved" | "beoordelen">("pending");
  const [teBeoordeelen, setTeBeoordeelen] = useState<TeBeoordelen[]>([]);
  const [beoordeelModal, setBeoordeelModal] = useState<{ open: boolean; item: TeBeoordelen | null; score: number; opmerking: string }>({ open: false, item: null, score: 5, opmerking: "" });
  const [modal, setModal] = useState<AanpassingModal>({
    open: false,
    uren: null,
    startTijd: "",
    eindTijd: "",
    pauzeMinuten: "0",
    opmerking: "",
  });

  const fetchUren = async () => {
    setIsLoading(true);
    const [urenRes, beoorRes] = await Promise.all([
      fetch("/api/klant/uren"),
      fetch("/api/klant/beoordelingen")
    ]);
    const urenData = await urenRes.json();
    const beoorData = await beoorRes.json();
    setUren(urenData.uren || []);
    setTeBeoordeelen(beoorData.teBeoordeelen || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitBeoordeling = async () => {
    if (!beoordeelModal.item) return;
    await fetch("/api/klant/beoordelingen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dienst_id: beoordeelModal.item.dienst_id,
        medewerker_id: beoordeelModal.item.medewerker_id,
        score: beoordeelModal.score,
        opmerking: beoordeelModal.opmerking,
      }),
    });
    setBeoordeelModal({ open: false, item: null, score: 5, opmerking: "" });
    fetchUren();
  };

  const approveUren = async (id: string) => {
    await fetch("/api/klant/uren", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", id }),
    });
    fetchUren();
  };

  const openAanpassingModal = (u: UrenRegistratie) => {
    setModal({
      open: true,
      uren: u,
      startTijd: u.start_tijd?.slice(0, 5) || "",
      eindTijd: u.eind_tijd?.slice(0, 5) || "",
      pauzeMinuten: String(u.pauze_minuten || 0),
      opmerking: "",
    });
  };

  const submitAanpassing = async () => {
    if (!modal.uren) return;

    const [startH, startM] = modal.startTijd.split(":").map(Number);
    const [eindH, eindM] = modal.eindTijd.split(":").map(Number);
    const pauze = parseInt(modal.pauzeMinuten) || 0;
    const gewerkteUren = Math.max(0, ((eindH * 60 + eindM) - (startH * 60 + startM) - pauze) / 60);

    await fetch("/api/klant/uren", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "adjust",
        id: modal.uren.id,
        data: {
          startTijd: modal.startTijd,
          eindTijd: modal.eindTijd,
          pauzeMinuten: pauze,
          gewerkteUren: Math.round(gewerkteUren * 100) / 100,
          opmerking: modal.opmerking,
        },
      }),
    });

    setModal({ open: false, uren: null, startTijd: "", eindTijd: "", pauzeMinuten: "0", opmerking: "" });
    fetchUren();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });

  const pending = uren.filter(u => u.status === "ingediend");
  const approved = uren.filter(u => ["klant_goedgekeurd", "goedgekeurd"].includes(u.status));

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#F27501]">TopTalent Jobs</h1>
            <p className="text-sm text-neutral-500">{klant.bedrijfsnaam}</p>
          </div>
          <a href="/api/klant/logout" className="text-sm text-neutral-500 hover:text-neutral-700">Uitloggen</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6">Uren Goedkeuren</h2>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("pending")}
            className={`px-4 py-2 rounded-xl font-medium ${tab === "pending" ? "bg-[#F27501] text-white" : "bg-white text-neutral-600"}`}>
            Te beoordelen ({pending.length})
          </button>
          <button onClick={() => setTab("approved")}
            className={`px-4 py-2 rounded-xl font-medium ${tab === "approved" ? "bg-[#F27501] text-white" : "bg-white text-neutral-600"}`}>
            Goedgekeurd ({approved.length})
          </button>
          {teBeoordeelen.length > 0 && (
            <button onClick={() => setTab("beoordelen")}
              className={`px-4 py-2 rounded-xl font-medium ${tab === "beoordelen" ? "bg-[#F27501] text-white" : "bg-white text-neutral-600"}`}>
              Beoordelen ({teBeoordeelen.length})
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div>
          </div>
        ) : tab === "beoordelen" ? (
          <div className="space-y-4">
            {teBeoordeelen.map((item) => (
              <div key={`${item.dienst_id}-${item.medewerker_id}`} className="bg-white rounded-xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-semibold text-neutral-900">{item.medewerker_naam}</p>
                  <p className="text-sm text-neutral-500">{item.locatie} • {formatDate(item.datum)}</p>
                </div>
                <button onClick={() => setBeoordeelModal({ open: true, item, score: 5, opmerking: "" })}
                  className="px-4 py-2 bg-[#F27501] text-white rounded-lg text-sm font-medium hover:bg-[#d96800]">
                  Beoordelen
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {(tab === "pending" ? pending : approved).map((u) => (
              <div key={u.id} className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-neutral-900">{u.medewerker_naam}</p>
                    <p className="text-sm text-neutral-500">{u.dienst_locatie} • {formatDate(u.dienst_datum)}</p>
                    <div className="flex gap-4 mt-2 text-sm text-neutral-600">
                      <span>{u.start_tijd?.slice(0,5)} - {u.eind_tijd?.slice(0,5)}</span>
                      <span>{u.pauze_minuten}m pauze</span>
                      <span className="font-medium">{u.gewerkte_uren} uur</span>
                    </div>
                    <p className="text-[#F27501] font-semibold mt-2">€{(u.gewerkte_uren * u.uurtarief).toFixed(2)}</p>
                  </div>
                  {tab === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => approveUren(u.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                        Goedkeuren
                      </button>
                      <button onClick={() => openAanpassingModal(u)}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">
                        Aanpassen
                      </button>
                    </div>
                  )}
                  {tab === "approved" && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Goedgekeurd
                    </span>
                  )}
                </div>
              </div>
            ))}
            {(tab === "pending" ? pending : approved).length === 0 && (
              <div className="text-center py-12 text-neutral-500">
                {tab === "pending" ? "Geen uren om te beoordelen" : "Nog geen goedgekeurde uren"}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Beoordeling Modal */}
      {beoordeelModal.open && beoordeelModal.item && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-neutral-900 mb-2">Medewerker Beoordelen</h3>
            <p className="text-sm text-neutral-500 mb-4">{beoordeelModal.item.medewerker_naam} • {beoordeelModal.item.locatie}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Score</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setBeoordeelModal({ ...beoordeelModal, score: s })}
                    className={`w-10 h-10 rounded-full text-lg font-medium ${beoordeelModal.score >= s ? "bg-yellow-400 text-white" : "bg-neutral-100 text-neutral-400"}`}>
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Opmerking (optioneel)</label>
              <textarea value={beoordeelModal.opmerking} onChange={(e) => setBeoordeelModal({ ...beoordeelModal, opmerking: e.target.value })}
                rows={2} className="w-full px-3 py-2 border border-neutral-200 rounded-xl" placeholder="Hoe was de medewerker?" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBeoordeelModal({ ...beoordeelModal, open: false })}
                className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl font-medium">Annuleren</button>
              <button onClick={submitBeoordeling}
                className="flex-1 px-4 py-2 bg-[#F27501] text-white rounded-xl font-medium">Versturen</button>
            </div>
          </div>
        </div>
      )}

      {/* Aanpassing Modal */}
      {modal.open && modal.uren && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-neutral-900 mb-4">Uren Aanpassen</h3>
            <p className="text-sm text-neutral-500 mb-4">
              {modal.uren.medewerker_naam} • {modal.uren.dienst_locatie}
            </p>

            <div className="bg-neutral-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-neutral-500 mb-1">Ingediend door medewerker:</p>
              <p className="text-sm font-medium">
                {modal.uren.start_tijd?.slice(0, 5)} - {modal.uren.eind_tijd?.slice(0, 5)}
                ({modal.uren.pauze_minuten}m pauze) = {modal.uren.gewerkte_uren} uur
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Starttijd</label>
                  <input type="time" value={modal.startTijd}
                    onChange={(e) => setModal({ ...modal, startTijd: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Eindtijd</label>
                  <input type="time" value={modal.eindTijd}
                    onChange={(e) => setModal({ ...modal, eindTijd: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Pauze (minuten)</label>
                <input type="number" value={modal.pauzeMinuten}
                  onChange={(e) => setModal({ ...modal, pauzeMinuten: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Reden aanpassing</label>
                <textarea value={modal.opmerking}
                  onChange={(e) => setModal({ ...modal, opmerking: e.target.value })}
                  placeholder="Bijv: Medewerker was later dan aangegeven"
                  rows={2}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal({ ...modal, open: false })}
                className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50">
                Annuleren
              </button>
              <button onClick={submitAanpassing}
                className="flex-1 px-4 py-2 bg-[#F27501] text-white rounded-xl font-medium hover:bg-[#d96800]">
                Versturen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
