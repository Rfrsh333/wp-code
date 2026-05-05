"use client";

import { useState } from "react";
import { Copy, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Section = "script" | "followup" | "closing";

export default function SalesScriptPanel() {
  const [activeSection, setActiveSection] = useState<Section>("script");
  const toast = useToast();

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Gekopieerd");
  }

  return (
    <div className="space-y-3">
      {/* Section tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-lg p-0.5">
        {([
          { id: "script", label: "Script" },
          { id: "followup", label: "Doorvragen" },
          { id: "closing", label: "Closing" },
        ] as { id: Section; label: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeSection === tab.id ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Script */}
      {activeSection === "script" && (
        <div className="space-y-3">
          <ScriptBlock
            label="Opening"
            text={`Hoi, je spreekt met Rachid van Toptalent.\nIk bel heel kort: wij helpen restaurants met ervaren horecapersoneel, ook last-minute.\nMag ik vragen hoe jullie het nu oplossen als iemand ziek is of niet komt opdagen?`}
            onCopy={copy}
          />
          <ScriptBlock
            label="Aanbod"
            text={`Wat wij doen is simpel: wij kunnen jullie als back-up helpen met ervaren bediening, keuken of eventmedewerkers. Zonder vaste verplichting.`}
            onCopy={copy}
          />
        </div>
      )}

      {/* Follow-up questions */}
      {activeSection === "followup" && (
        <div className="space-y-2">
          <ScriptBlock
            label="Frequentie"
            text="Gebeurt dat vaak in drukke periodes of vooral in het weekend?"
            onCopy={copy}
            compact
          />
          <ScriptBlock
            label="Huidige oplossing"
            text="Wat doen jullie dan meestal? Zelf meedraaien, gasten weigeren, of iemand uit netwerk bellen?"
            onCopy={copy}
            compact
          />
          <ScriptBlock
            label="Back-up"
            text="Hebben jullie nu een vaste back-up voor dit soort momenten?"
            onCopy={copy}
            compact
          />
        </div>
      )}

      {/* Closing strategies */}
      {activeSection === "closing" && (
        <div className="space-y-2">
          <ScriptBlock
            label="Lage commitment"
            text="Zal ik jullie op onze back-up lijst zetten, zodat je ons kunt appen of bellen zodra je iemand nodig hebt?"
            onCopy={copy}
            compact
          />
          <ScriptBlock
            label="Testdienst"
            text="Zullen we het gewoon laagdrempelig houden?\nIk stuur je onze info, en als je een keer iemand tekortkomt, kun je ons testen met één dienst."
            onCopy={copy}
            compact
          />
          <ScriptBlock
            label="Follow-up"
            text="Wanneer is het handig dat ik je kort terugbel?"
            onCopy={copy}
            compact
          />
          <ScriptBlock
            label="Beslisser"
            text="Wie gaat hier normaal gesproken over bij jullie?"
            onCopy={copy}
            compact
          />
          <ScriptBlock
            label="WhatsApp"
            text="Zal ik je onze gegevens via WhatsApp sturen, zodat je ons direct hebt als er iemand uitvalt?"
            onCopy={copy}
            compact
          />
        </div>
      )}
    </div>
  );
}

function ScriptBlock({ label, text, onCopy, compact }: { label: string; text: string; onCopy: (t: string) => void; compact?: boolean }) {
  return (
    <div className={`group bg-blue-50 border border-blue-100 rounded-lg ${compact ? "p-2.5" : "p-3"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className={`font-semibold text-blue-700 ${compact ? "text-xs" : "text-xs uppercase"}`}>{label}</span>
          <p className={`text-blue-900 whitespace-pre-line mt-0.5 ${compact ? "text-xs" : "text-sm"}`}>{text}</p>
        </div>
        <button
          onClick={() => onCopy(text)}
          className="p-1.5 text-blue-400 hover:text-blue-700 hover:bg-blue-100 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          title="Kopieer"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
