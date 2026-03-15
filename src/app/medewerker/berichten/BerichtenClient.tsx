"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Search } from "lucide-react";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import { toast } from "sonner";

interface Bericht {
  id: string;
  van_type: string;
  onderwerp: string;
  bericht: string;
  created_at: string;
  gelezen: boolean;
}

export default function BerichtenClient() {
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [nieuwBericht, setNieuwBericht] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const berichtenEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBerichten();
    const interval = setInterval(fetchBerichten, 10000); // Poll elke 10 seconden
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [berichten]);

  const fetchBerichten = async () => {
    try {
      const res = await fetch("/api/medewerker/berichten");
      if (!res.ok) return;

      const data = await res.json();
      const alleBerichten = [...(data.berichten || [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setBerichten(alleBerichten);

      // Mark ongelezen berichten as gelezen
      const ongelezen = alleBerichten.filter(
        (b: Bericht) => b.van_type !== "medewerker" && !b.gelezen
      );
      if (ongelezen.length > 0) {
        await fetch("/api/medewerker/berichten/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bericht_ids: ongelezen.map((b: Bericht) => b.id) }),
        });
      }
    } catch (err) {
      console.error("Fetch berichten error:", err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    berichtenEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleVerstuur = async () => {
    if (!nieuwBericht.trim()) return;

    setSending(true);
    try {
      const res = await fetch("/api/medewerker/berichten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onderwerp: "Bericht van medewerker",
          bericht: nieuwBericht,
        }),
      });

      if (!res.ok) {
        toast.error("Versturen mislukt");
        return;
      }

      setNieuwBericht("");
      await fetchBerichten();
    } catch (err) {
      console.error("Send error:", err);
      toast.error("Er ging iets mis");
    } finally {
      setSending(false);
    }
  };

  const formatTijd = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    } else if (isYesterday) {
      return "Gisteren " + date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) + " " + date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    }
  };

  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-[var(--mp-card)] border-b border-[var(--mp-separator)]">
          <div className="px-4 py-3">
            <h1 className="text-2xl font-bold text-[var(--mp-text-primary)]">
              Berichten
            </h1>
            <p className="text-sm text-[var(--mp-text-secondary)] mt-1">
              Chat met TopTalent
            </p>
          </div>
        </div>

        {/* Berichten lijst */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : berichten.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[var(--mp-bg)] mx-auto mb-4 flex items-center justify-center">
                <Search className="w-8 h-8 text-[var(--mp-text-tertiary)]" />
              </div>
              <p className="text-[var(--mp-text-secondary)] text-sm">
                Nog geen berichten
              </p>
            </div>
          ) : (
            berichten.map((bericht) => {
              const isFromMe = bericht.van_type === "medewerker";

              return (
                <div
                  key={bericht.id}
                  className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] md:max-w-md rounded-2xl px-4 py-3 ${
                      isFromMe
                        ? "bg-[var(--mp-accent)] text-white rounded-br-sm"
                        : "bg-[var(--mp-card)] text-[var(--mp-text-primary)] border border-[var(--mp-separator)] rounded-bl-sm"
                    }`}
                  >
                    {!isFromMe && bericht.onderwerp && (
                      <div className="text-xs font-semibold mb-1 opacity-70">
                        {bericht.onderwerp}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {bericht.bericht}
                    </p>
                    <div
                      className={`text-xs mt-1 ${
                        isFromMe ? "text-white/70" : "text-[var(--mp-text-tertiary)]"
                      }`}
                    >
                      {formatTijd(bericht.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={berichtenEndRef} />
        </div>

        {/* Input area */}
        <div className="sticky bottom-0 border-t border-[var(--mp-separator)] bg-[var(--mp-card)] p-4 safe-bottom">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input
              type="text"
              value={nieuwBericht}
              onChange={(e) => setNieuwBericht(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleVerstuur();
                }
              }}
              placeholder="Typ een bericht..."
              className="flex-1 px-4 py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] border border-[var(--mp-separator)] focus:border-[var(--mp-accent)] focus:outline-none transition-colors"
              disabled={sending}
            />
            <button
              onClick={handleVerstuur}
              disabled={sending || !nieuwBericht.trim()}
              className="flex-shrink-0 w-12 h-12 rounded-xl bg-[var(--mp-accent)] text-white flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Verstuur"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </MedewerkerResponsiveLayout>
  );
}
