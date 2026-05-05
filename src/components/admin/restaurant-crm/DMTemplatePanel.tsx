"use client";

import { useState } from "react";
import { Copy, Check, ChevronDown, Send } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { CRMLead } from "./types";

interface DMTemplatePanelProps {
  lead: CRMLead;
  onMarkSent: (channel: "instagram" | "facebook") => void;
}

interface Template {
  id: string;
  name: string;
  context: string;
  body: string;
}

const TEMPLATES: Template[] = [
  {
    id: "after_call",
    name: "Na geen gehoor",
    context: "Gebruik na een mislukte belpoging",
    body: `Hey, ik probeerde jullie net kort te bellen.\n\nSnelle vraag: hoe lossen jullie het nu op als iemand last-minute uitvalt in de bediening of keuken?`,
  },
  {
    id: "direct",
    name: "Direct",
    context: "Eerste benadering zonder eerdere poging",
    body: `Hey! Wij helpen restaurants in {{city}} met ervaren horecapersoneel, ook last-minute.\n\nHebben jullie soms moeite om diensten gevuld te krijgen?`,
  },
  {
    id: "soft",
    name: "Soft approach",
    context: "Vriendelijk en laagdrempelig",
    body: `Hey, korte vraag 😊\n\nWerken jullie met een vaste pool voor extra horecapersoneel, of regelen jullie dat meestal ad hoc?`,
  },
  {
    id: "urgency",
    name: "Spoed/urgentie",
    context: "Bij urgente bezetting of seizoensdrukte",
    body: `Hey! Als er deze week iemand uitvalt in de bediening of keuken, hebben jullie dan al een back-up?\n\nWij kunnen vaak snel schakelen in {{city}}.`,
  },
  {
    id: "after_email",
    name: "Follow-up na e-mail",
    context: "Na eerder een cold email gestuurd",
    body: `Hey, ik heb jullie net kort een mail gestuurd over flexibel horecapersoneel.\n\nMag ik vragen wie hierover gaat bij jullie?`,
  },
];

export default function DMTemplatePanel({ lead, onMarkSent }: DMTemplatePanelProps) {
  const [selectedId, setSelectedId] = useState(TEMPLATES[0].id);
  const [editedBody, setEditedBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const toast = useToast();

  const selected = TEMPLATES.find(t => t.id === selectedId)!;

  function fillVariables(text: string): string {
    return text
      .replace(/\{\{company_name\}\}/g, lead.company_name || "")
      .replace(/\{\{city\}\}/g, lead.city || "Utrecht")
      .replace(/\{\{contact_name\}\}/g, lead.contact_person || "");
  }

  function getDisplayText(): string {
    if (isEditing && editedBody) return editedBody;
    return fillVariables(selected.body);
  }

  async function copyTemplate() {
    const text = getDisplayText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Template gekopieerd");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    setEditedBody("");
    setIsEditing(false);
  }

  return (
    <div className="space-y-3">
      {/* Template selector */}
      <div className="flex items-center gap-2">
        <select
          value={selectedId}
          onChange={e => handleSelect(e.target.value)}
          className="flex-1 text-sm border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/20"
        >
          {TEMPLATES.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Context hint */}
      <p className="text-xs text-neutral-500 italic">{selected.context}</p>

      {/* Template body */}
      {isEditing ? (
        <textarea
          value={editedBody || fillVariables(selected.body)}
          onChange={e => setEditedBody(e.target.value)}
          className="w-full border border-pink-200 rounded-lg p-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-pink-500/20"
        />
      ) : (
        <div className="bg-pink-50 border border-pink-100 rounded-lg p-3">
          <p className="text-sm text-pink-900 whitespace-pre-line">{getDisplayText()}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={copyTemplate}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            copied
              ? "bg-green-100 text-green-700"
              : "bg-pink-100 text-pink-700 hover:bg-pink-200"
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Gekopieerd!" : "Kopieer template"}
        </button>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg"
        >
          {isEditing ? "Preview" : "Bewerken"}
        </button>

        <div className="ml-auto flex gap-2">
          {lead.instagram_available && (
            <button
              onClick={() => onMarkSent("instagram")}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:opacity-90"
            >
              <Send className="w-3.5 h-3.5" />
              IG DM gestuurd
            </button>
          )}
          {lead.facebook_available && (
            <button
              onClick={() => onMarkSent("facebook")}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Send className="w-3.5 h-3.5" />
              FB gestuurd
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
