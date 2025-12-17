"use client";

import { useState, useEffect } from "react";

interface Medewerker {
  id: string;
  naam: string;
  email: string;
  functie: string[];
}

interface Dienst {
  id: string;
  klant_naam: string;
  locatie: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  functie: string;
  uurtarief: number | null;
  afbeelding: string | null;
  status: string;
  aangemeld?: boolean;
  aanmelding_id?: string;
  aanmelding_status?: string;
  uren_status?: string;
}

interface KlantAanpassing {
  id: string;
  start_tijd: string;
  eind_tijd: string;
  pauze_minuten: number;
  gewerkte_uren: number;
  klant_start_tijd: string;
  klant_eind_tijd: string;
  klant_pauze_minuten: number;
  klant_gewerkte_uren: number;
  klant_opmerking: string;
  dienst_datum: string;
  klant_naam: string;
  locatie: string;
}

export default function MedewerkerDienstenClient({ medewerker }: { medewerker: Medewerker }) {
  const [diensten, setDiensten] = useState<Dienst[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<"beschikbaar" | "mijn" | "aanpassingen">("beschikbaar");
  const [urenModal, setUrenModal] = useState<Dienst | null>(null);
  const [urenForm, setUrenForm] = useState({ start: "", eind: "", pauze: "0" });
  const [aanpassingen, setAanpassingen] = useState<KlantAanpassing[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    const res = await fetch("/api/medewerker/diensten");
    const data = await res.json();
    setDiensten(data.diensten || []);
    setAanpassingen(data.aanpassingen || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const aanmelden = async (dienstId: string) => {
    await fetch("/api/medewerker/diensten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "aanmelden", dienst_id: dienstId }),
    });
    fetchData();
  };

  const afmelden = async (dienstId: string) => {
    await fetch("/api/medewerker/diensten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "afmelden", dienst_id: dienstId }),
    });
    fetchData();
  };

  const openUrenModal = (dienst: Dienst) => {
    setUrenForm({ start: dienst.start_tijd.slice(0, 5), eind: dienst.eind_tijd.slice(0, 5), pauze: "0" });
    setUrenModal(dienst);
  };

  const submitUren = async () => {
    if (!urenModal?.aanmelding_id) return;
    const start = urenForm.start.split(":").map(Number);
    const eind = urenForm.eind.split(":").map(Number);
    const uren = (eind[0] * 60 + eind[1] - start[0] * 60 - start[1] - parseInt(urenForm.pauze)) / 60;

    await fetch("/api/medewerker/diensten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "uren_indienen",
        aanmelding_id: urenModal.aanmelding_id,
        data: { start: urenForm.start, eind: urenForm.eind, pauze: parseInt(urenForm.pauze), uren: Math.round(uren * 100) / 100 },
      }),
    });
    setUrenModal(null);
    fetchData();
  };

  const accepteerAanpassing = async (id: string) => {
    await fetch("/api/medewerker/diensten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accepteer_aanpassing", uren_id: id }),
    });
    fetchData();
  };

  const weigerAanpassing = async (id: string) => {
    await fetch("/api/medewerker/diensten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "weiger_aanpassing", uren_id: id }),
    });
    fetchData();
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });

  const beschikbaar = diensten.filter((d) => !d.aangemeld);
  const mijnDiensten = diensten.filter((d) => d.aangemeld);

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#F27501]">TopTalent Jobs</h1>
            <p className="text-sm text-neutral-500">Welkom, {medewerker.naam}</p>
          </div>
          <a href="/api/medewerker/logout" className="text-sm text-neutral-500 hover:text-neutral-700">
            Uitloggen
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setTab("beschikbaar")}
            className={`px-4 py-2 rounded-xl font-medium ${
              tab === "beschikbaar" ? "bg-[#F27501] text-white" : "bg-white text-neutral-600"
            }`}
          >
            Beschikbaar ({beschikbaar.length})
          </button>
          <button
            onClick={() => setTab("mijn")}
            className={`px-4 py-2 rounded-xl font-medium ${
              tab === "mijn" ? "bg-[#F27501] text-white" : "bg-white text-neutral-600"
            }`}
          >
            Mijn diensten ({mijnDiensten.length})
          </button>
          {aanpassingen.length > 0 && (
            <button
              onClick={() => setTab("aanpassingen")}
              className={`px-4 py-2 rounded-xl font-medium ${
                tab === "aanpassingen" ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-700"
              }`}
            >
              Klant aanpassingen ({aanpassingen.length})
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div>
          </div>
        ) : tab === "aanpassingen" ? (
          <div className="space-y-4">
            {aanpassingen.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-neutral-900">{a.klant_naam}</h3>
                    <p className="text-sm text-neutral-500">{a.locatie} • {formatDate(a.dienst_datum)}</p>
                  </div>
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                    Klant aanpassing
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-neutral-50 rounded-xl p-3">
                    <p className="text-xs text-neutral-500 mb-1">Jouw uren (origineel)</p>
                    <p className="font-medium">{a.start_tijd?.slice(0,5)} - {a.eind_tijd?.slice(0,5)}</p>
                    <p className="text-sm text-neutral-600">{a.pauze_minuten}m pauze = {a.gewerkte_uren} uur</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3 border-2 border-orange-200">
                    <p className="text-xs text-orange-600 mb-1">Klant correctie</p>
                    <p className="font-medium text-orange-700">{a.klant_start_tijd?.slice(0,5)} - {a.klant_eind_tijd?.slice(0,5)}</p>
                    <p className="text-sm text-orange-600">{a.klant_pauze_minuten}m pauze = {a.klant_gewerkte_uren} uur</p>
                  </div>
                </div>

                {a.klant_opmerking && (
                  <div className="bg-neutral-50 rounded-xl p-3 mb-4">
                    <p className="text-xs text-neutral-500 mb-1">Reden van klant</p>
                    <p className="text-sm">{a.klant_opmerking}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => accepteerAanpassing(a.id)}
                    className="flex-1 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">
                    Akkoord
                  </button>
                  <button onClick={() => weigerAanpassing(a.id)}
                    className="flex-1 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600">
                    Niet akkoord
                  </button>
                </div>
              </div>
            ))}
            {aanpassingen.length === 0 && (
              <div className="text-center py-12 text-neutral-500">
                Geen klant aanpassingen
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(tab === "beschikbaar" ? beschikbaar : mijnDiensten).map((dienst) => (
              <div key={dienst.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                {/* Image */}
                <div className="relative aspect-[16/10] bg-neutral-100">
                  {dienst.afbeelding ? (
                    <img src={dienst.afbeelding} alt={dienst.klant_naam} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50">
                      <svg className="w-16 h-16 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  )}
                  <span className="absolute top-3 left-3 bg-[#F27501] text-white text-xs font-semibold px-3 py-1 rounded-full capitalize">
                    {dienst.functie}
                  </span>
                  {dienst.aanmelding_status && (
                    <span className={`absolute top-3 right-3 text-xs font-semibold px-3 py-1 rounded-full ${
                      dienst.aanmelding_status === "geaccepteerd" ? "bg-green-500 text-white" :
                      dienst.aanmelding_status === "afgewezen" ? "bg-red-500 text-white" : "bg-yellow-500 text-white"
                    }`}>
                      {dienst.aanmelding_status}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-bold text-lg text-neutral-900 mb-1">{dienst.klant_naam}</h3>
                  <p className="text-neutral-500 text-sm mb-3 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {dienst.locatie}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-neutral-600 mb-4">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(dienst.datum)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {dienst.start_tijd.slice(0, 5)} - {dienst.eind_tijd.slice(0, 5)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    {dienst.uurtarief && (
                      <span className="text-[#F27501] font-bold">€{dienst.uurtarief}/uur</span>
                    )}
                    <div className="ml-auto">
                      {!dienst.aangemeld ? (
                        <button onClick={() => aanmelden(dienst.id)} className="px-5 py-2 bg-[#F27501] text-white rounded-xl text-sm font-semibold hover:bg-[#d96800] transition-colors">
                          Aanmelden
                        </button>
                      ) : dienst.aanmelding_status === "aangemeld" ? (
                        <button onClick={() => afmelden(dienst.id)} className="px-5 py-2 bg-neutral-200 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-300 transition-colors">
                          Afmelden
                        </button>
                      ) : dienst.aanmelding_status === "geaccepteerd" && !dienst.uren_status && new Date(dienst.datum) <= new Date() ? (
                        <button onClick={() => openUrenModal(dienst)} className="px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                          Uren invullen
                        </button>
                      ) : dienst.uren_status ? (
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-medium ${dienst.uren_status === "goedgekeurd" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          Uren {dienst.uren_status}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(tab === "beschikbaar" ? beschikbaar : mijnDiensten).length === 0 && (
              <div className="col-span-2 text-center py-12 text-neutral-500">
                {tab === "beschikbaar" ? "Geen beschikbare diensten" : "Nog geen aanmeldingen"}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Uren Modal */}
      {urenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold mb-4">Uren invullen</h3>
            <p className="text-sm text-neutral-500 mb-4">{urenModal.klant_naam} - {formatDate(urenModal.datum)}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Starttijd</label>
                <input type="time" value={urenForm.start} onChange={(e) => setUrenForm({ ...urenForm, start: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Eindtijd</label>
                <input type="time" value={urenForm.eind} onChange={(e) => setUrenForm({ ...urenForm, eind: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pauze (minuten)</label>
                <input type="number" value={urenForm.pauze} onChange={(e) => setUrenForm({ ...urenForm, pauze: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" min="0" step="5" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setUrenModal(null)} className="flex-1 py-2 border rounded-lg">Annuleren</button>
              <button onClick={submitUren} className="flex-1 py-2 bg-[#F27501] text-white rounded-lg font-medium">Versturen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
