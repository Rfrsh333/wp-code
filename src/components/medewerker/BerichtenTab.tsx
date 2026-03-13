"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";

interface Bericht {
  id: string;
  van_type: string;
  van_id: string;
  aan_type: string;
  aan_id: string;
  onderwerp: string | null;
  inhoud: string;
  gelezen: boolean;
  gelezen_at: string | null;
  created_at: string;
}

export default function BerichtenTab() {
  const toast = useToast();
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"inbox" | "verzonden">("inbox");
  const [selectedBericht, setSelectedBericht] = useState<Bericht | null>(null);
  const [showNieuw, setShowNieuw] = useState(false);
  const [nieuwForm, setNieuwForm] = useState({ onderwerp: "", inhoud: "" });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchBerichten();
  }, []);

  const fetchBerichten = async () => {
    try {
      const res = await fetch("/api/medewerker/berichten");
      const data = await res.json();
      if (!res.ok) throw new Error();
      setBerichten(data.berichten || []);
    } catch {
      toast.error("Kon berichten niet laden");
    } finally {
      setIsLoading(false);
    }
  };

  const markeerGelezen = async (id: string) => {
    try {
      await fetch(`/api/medewerker/berichten/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gelezen: true }),
      });
      setBerichten((prev) =>
        prev.map((b) => (b.id === id ? { ...b, gelezen: true, gelezen_at: new Date().toISOString() } : b))
      );
    } catch {
      // silent fail
    }
  };

  const openBericht = (bericht: Bericht) => {
    setSelectedBericht(bericht);
    if (!bericht.gelezen && bericht.aan_type === "medewerker") {
      markeerGelezen(bericht.id);
    }
  };

  const verstuurBericht = async () => {
    if (!nieuwForm.inhoud.trim()) {
      toast.error("Vul een bericht in");
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch("/api/medewerker/berichten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onderwerp: nieuwForm.onderwerp || null,
          inhoud: nieuwForm.inhoud,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Bericht verzonden");
      setShowNieuw(false);
      setNieuwForm({ onderwerp: "", inhoud: "" });
      fetchBerichten();
    } catch {
      toast.error("Kon bericht niet verzenden");
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const inbox = berichten.filter((b) => b.aan_type === "medewerker");
  const verzonden = berichten.filter((b) => b.van_type === "medewerker");
  const currentList = view === "inbox" ? inbox : verzonden;
  const ongelezen = inbox.filter((b) => !b.gelezen).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Detail view
  if (selectedBericht) {
    return (
      <div>
        <button
          onClick={() => setSelectedBericht(null)}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Terug naar berichten
        </button>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-neutral-900">
                {selectedBericht.onderwerp || "Geen onderwerp"}
              </h3>
              <p className="text-sm text-neutral-500 mt-1">
                {selectedBericht.van_type === "admin" ? "TopTalent Admin" : "Jij"} · {formatDate(selectedBericht.created_at)}
              </p>
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-neutral-700 whitespace-pre-wrap">{selectedBericht.inhoud}</p>
          </div>
        </div>
      </div>
    );
  }

  // Nieuw bericht form
  if (showNieuw) {
    return (
      <div>
        <button
          onClick={() => setShowNieuw(false)}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Annuleren
        </button>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">Neem contact op met TopTalent</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Onderwerp (optioneel)</label>
              <input
                type="text"
                value={nieuwForm.onderwerp}
                onChange={(e) => setNieuwForm({ ...nieuwForm, onderwerp: e.target.value })}
                className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
                placeholder="Waar gaat je bericht over?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Bericht</label>
              <textarea
                value={nieuwForm.inhoud}
                onChange={(e) => setNieuwForm({ ...nieuwForm, inhoud: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent resize-none"
                placeholder="Typ je bericht..."
              />
            </div>
            <button
              onClick={verstuurBericht}
              disabled={isSending}
              className="px-6 py-3 bg-[#F27501] hover:bg-[#d96800] text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {isSending ? "Verzenden..." : "Verstuur bericht"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Contact TopTalent</h2>
        <button
          onClick={() => setShowNieuw(true)}
          className="px-4 py-2 bg-[#F27501] hover:bg-[#d96800] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Nieuw bericht
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-neutral-100 rounded-xl p-1">
        <button
          onClick={() => setView("inbox")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            view === "inbox" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Inbox {ongelezen > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{ongelezen}</span>}
        </button>
        <button
          onClick={() => setView("verzonden")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            view === "verzonden" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Verzonden
        </button>
      </div>

      {currentList.length === 0 ? (
        <EmptyState
          title={view === "inbox" ? "Geen berichten" : "Nog geen berichten verzonden"}
          description={view === "inbox" ? "Je hebt nog geen berichten ontvangen." : "Je hebt nog geen berichten gestuurd."}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
      ) : (
        <div className="space-y-2">
          {currentList.map((bericht) => (
            <button
              key={bericht.id}
              onClick={() => openBericht(bericht)}
              className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border transition-shadow hover:shadow-md ${
                !bericht.gelezen && view === "inbox" ? "border-[#F27501]/30 bg-orange-50/30" : "border-neutral-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {!bericht.gelezen && view === "inbox" && (
                  <div className="w-2 h-2 bg-[#F27501] rounded-full mt-2 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-sm truncate ${!bericht.gelezen && view === "inbox" ? "font-bold text-neutral-900" : "font-medium text-neutral-700"}`}>
                      {bericht.onderwerp || "Geen onderwerp"}
                    </p>
                    <span className="text-xs text-neutral-400 ml-2 flex-shrink-0">{formatDate(bericht.created_at)}</span>
                  </div>
                  <p className="text-sm text-neutral-500 truncate">{bericht.inhoud}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {view === "inbox"
                      ? bericht.van_type === "admin" ? "Van: TopTalent Admin" : `Van: ${bericht.van_id}`
                      : "Aan: TopTalent Admin"}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
