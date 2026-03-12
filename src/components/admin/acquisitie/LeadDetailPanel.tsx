"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Lead {
  id: string;
  bedrijfsnaam: string;
  contactpersoon: string | null;
  email: string | null;
  telefoon: string | null;
  website: string | null;
  adres: string | null;
  stad: string | null;
  branche: string | null;
  tags: string[];
  pipeline_stage: string;
  ai_score: number | null;
  ai_score_reasoning: string | null;
  bron: string;
  emails_verzonden_count: number;
  laatste_email_verzonden_op: string | null;
  laatste_contact_datum: string | null;
  laatste_contact_type: string | null;
  volgende_actie_datum: string | null;
  volgende_actie_notitie: string | null;
  pain_points: string[] | null;
  personalisatie_notities: string | null;
  interne_notities: string | null;
  klant_id: string | null;
  geconverteerd_op: string | null;
  created_at: string;
  auto_sequence_active: boolean;
  auto_sequence_next_action: string | null;
  auto_sequence_next_date: string | null;
  auto_sequence_paused_until: string | null;
  auto_sequence_history: { datum: string; actie: string; reden: string }[] | null;
  engagement_score: number;
  enrichment_data: EnrichmentData | null;
  assigned_to: string | null;
}

interface EnrichmentData {
  website_type: string | null;
  grootte_indicatie: string;
  prijsrange: string;
  heeft_vacatures: boolean;
  heeft_terras: boolean | null;
  aantal_locaties: number | null;
  reviews_count: number | null;
  reviews_score: number | null;
  reviews_pain_points: string[];
  reviews_positief: string[];
  social_media: { instagram: string | null; facebook: string | null; linkedin: string | null };
  branche_verfijnd: string;
  type_gelegenheid: string;
  geschat_aantal_medewerkers: string;
  pain_points: string[];
  personalisatie_notities: string;
  seizoen_advies: string;
  concurrenten_hint: string | null;
  tags: string[];
  website_samenvatting: string | null;
  menu_type: string | null;
  openingstijden_hint: string | null;
  laatst_verrijkt_op: string;
  verrijking_bron: string;
}

interface Contactmoment {
  id: string;
  type: string;
  richting: string;
  onderwerp: string | null;
  inhoud: string | null;
  resultaat: string | null;
  created_at: string;
}

interface Props {
  leadId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const STAGES = ["nieuw", "benaderd", "interesse", "offerte", "klant", "afgewezen"];

export default function LeadDetailPanel({ leadId, onClose, onUpdate }: Props) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [contactmomenten, setContactmomenten] = useState<Contactmoment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"info" | "timeline" | "ai" | "notities">("info");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // AI email state
  const [isGenerating, setIsGenerating] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [emailOnderwerp, setEmailOnderwerp] = useState("");
  const [emailType, setEmailType] = useState("cold_intro");
  const [isSending, setIsSending] = useState(false);

  // Scoring state
  const [isScoring, setIsScoring] = useState(false);

  // Autopilot state
  const [isCalculating, setIsCalculating] = useState(false);
  const [nextAction, setNextAction] = useState<{ action: string; reden: string; prioriteit: string; next_date?: string } | null>(null);

  // Enrichment state
  const [isEnriching, setIsEnriching] = useState(false);

  // WhatsApp state
  const [waMessage, setWaMessage] = useState("");
  const [waType, setWaType] = useState("intro");
  const [isGeneratingWa, setIsGeneratingWa] = useState(false);
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [channelRec, setChannelRec] = useState<{ kanaal: string; reden: string; tijdstip_advies: string } | null>(null);

  // Territory state
  const [salesReps, setSalesReps] = useState<{ id: string; naam: string; kleur: string }[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Contact log state
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactType, setContactType] = useState("telefoon");
  const [contactRichting, setContactRichting] = useState("uitgaand");
  const [contactInhoud, setContactInhoud] = useState("");
  const [contactResultaat, setContactResultaat] = useState("");

  // Notes state
  const [notities, setNotities] = useState("");
  const [volgActieDatum, setVolgActieDatum] = useState("");
  const [volgActieNotitie, setVolgActieNotitie] = useState("");

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  }, []);

  const fetchLead = useCallback(async () => {
    setIsLoading(true);
    const token = await getToken();

    const [leadRes, contactRes] = await Promise.all([
      fetch(`/api/admin/acquisitie/leads?search=${leadId}&limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/admin/acquisitie/contactmomenten?lead_id=${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    // Fetch lead directly by getting all and filtering (since we don't have a single endpoint)
    const allRes = await fetch(`/api/admin/data?table=acquisitie_leads`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (allRes.ok) {
      const json = await allRes.json();
      const found = (json.data || []).find((l: Lead) => l.id === leadId);
      if (found) {
        setLead(found);
        setNotities(found.interne_notities || "");
        setVolgActieDatum(found.volgende_actie_datum || "");
        setVolgActieNotitie(found.volgende_actie_notitie || "");
      }
    }

    if (contactRes.ok) {
      const json = await contactRes.json();
      setContactmomenten(json.data || []);
    }

    setIsLoading(false);
  }, [leadId, getToken]);

  useEffect(() => {
    void fetchLead();
    // Fetch sales reps voor toewijzing
    (async () => {
      const token = await getToken();
      const res = await fetch("/api/admin/acquisitie/territory?view=reps", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setSalesReps((json.data || []).map((r: { id: string; naam: string; kleur: string }) => ({ id: r.id, naam: r.naam, kleur: r.kleur })));
      }
    })();
  }, [fetchLead, getToken]);

  const assignToRep = async (repId: string | null) => {
    setIsAssigning(true);
    const token = await getToken();
    await fetch("/api/admin/acquisitie/territory", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "assign", lead_id: leadId, rep_id: repId }),
    });
    setIsAssigning(false);
    fetchLead();
    onUpdate();
  };

  const updateLead = async (data: Record<string, unknown>) => {
    const token = await getToken();
    await fetch("/api/admin/acquisitie/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "update", id: leadId, data }),
    });
    fetchLead();
    onUpdate();
  };

  const generateEmail = async () => {
    setIsGenerating(true);
    setMessage(null);
    const token = await getToken();
    const res = await fetch("/api/admin/ai/outreach-email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lead_id: leadId, type: emailType }),
    });
    if (res.ok) {
      const data = await res.json();
      setEmailOnderwerp(data.onderwerp);
      setEmailDraft(data.inhoud);
    } else {
      setMessage({ type: "error", text: "Email genereren mislukt" });
    }
    setIsGenerating(false);
  };

  const sendEmail = async () => {
    if (!emailDraft.trim()) return;
    setIsSending(true);
    const token = await getToken();
    const res = await fetch("/api/admin/ai/outreach-email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        lead_id: leadId,
        action: "send",
        email_content: emailDraft,
        onderwerp: emailOnderwerp,
      }),
    });
    if (res.ok) {
      setMessage({ type: "success", text: "Email verstuurd!" });
      setEmailDraft("");
      setEmailOnderwerp("");
      fetchLead();
    } else {
      setMessage({ type: "error", text: "Versturen mislukt" });
    }
    setIsSending(false);
  };

  const scoreLead = async () => {
    setIsScoring(true);
    const token = await getToken();
    const res = await fetch("/api/admin/ai/lead-score", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lead_id: leadId }),
    });
    if (res.ok) {
      const result = await res.json();
      setMessage({ type: "success", text: `Score: ${result.score}/100` });
      fetchLead();
    } else {
      setMessage({ type: "error", text: "Scoring mislukt" });
    }
    setIsScoring(false);
  };

  const logContact = async () => {
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/contactmomenten", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        lead_id: leadId,
        type: contactType,
        richting: contactRichting,
        inhoud: contactInhoud,
        resultaat: contactResultaat || null,
      }),
    });
    if (res.ok) {
      setMessage({ type: "success", text: "Contactmoment gelogd" });
      setShowContactForm(false);
      setContactInhoud("");
      setContactResultaat("");
      fetchLead();
    }
  };

  const toggleAutopilot = async () => {
    const token = await getToken();
    const res = await fetch("/api/admin/ai/next-action", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lead_id: leadId, action: "toggle_sequence" }),
    });
    if (res.ok) {
      const result = await res.json();
      setMessage({ type: "success", text: result.auto_sequence_active ? "Autopilot geactiveerd" : "Autopilot gestopt" });
      fetchLead();
    }
  };

  const calculateNextAction = async () => {
    setIsCalculating(true);
    const token = await getToken();
    const res = await fetch("/api/admin/ai/next-action", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lead_id: leadId, action: "calculate" }),
    });
    if (res.ok) {
      const result = await res.json();
      setNextAction(result);
      fetchLead();
    } else {
      setMessage({ type: "error", text: "Volgende actie berekenen mislukt" });
    }
    setIsCalculating(false);
  };

  const enrichLead = async () => {
    setIsEnriching(true);
    const token = await getToken();
    const res = await fetch("/api/admin/ai/lead-research", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lead_id: leadId }),
    });
    if (res.ok) {
      setMessage({ type: "success", text: "Lead verrijkt met AI research" });
      fetchLead();
    } else {
      setMessage({ type: "error", text: "Verrijking mislukt" });
    }
    setIsEnriching(false);
  };

  const generateWaMessage = async () => {
    setIsGeneratingWa(true);
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lead_id: leadId, action: "generate", type: waType }),
    });
    if (res.ok) {
      const data = await res.json();
      setWaMessage(data.bericht);
    } else {
      setMessage({ type: "error", text: "WhatsApp bericht genereren mislukt" });
    }
    setIsGeneratingWa(false);
  };

  const sendWaMessage = async () => {
    if (!waMessage.trim()) return;
    setIsSendingWa(true);
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lead_id: leadId, action: "send", bericht: waMessage }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.whatsapp_link) {
        // Open WhatsApp Web link
        window.open(data.whatsapp_link, "_blank");
        setMessage({ type: "success", text: "WhatsApp Web geopend — verstuur het bericht daar" });
      } else {
        setMessage({ type: "success", text: "WhatsApp verstuurd via API" });
      }
      setWaMessage("");
      fetchLead();
    } else {
      setMessage({ type: "error", text: "Versturen mislukt" });
    }
    setIsSendingWa(false);
  };

  const fetchChannelRec = async () => {
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lead_id: leadId, action: "recommend_channel" }),
    });
    if (res.ok) {
      setChannelRec(await res.json());
    }
  };

  const parkeerLead = async (dagen: number) => {
    const token = await getToken();
    const res = await fetch("/api/admin/ai/next-action", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lead_id: leadId, action: "parkeer", dagen }),
    });
    if (res.ok) {
      setMessage({ type: "success", text: `Lead geparkeerd voor ${dagen} dagen` });
      fetchLead();
    }
  };

  const saveNotities = async () => {
    await updateLead({
      interne_notities: notities,
      volgende_actie_datum: volgActieDatum || null,
      volgende_actie_notitie: volgActieNotitie || null,
    });
    setMessage({ type: "success", text: "Notities opgeslagen" });
  };

  const convertToKlant = async () => {
    if (!confirm("Lead converteren naar klant?")) return;
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "convert", id: leadId }),
    });
    if (res.ok) {
      setMessage({ type: "success", text: "Lead geconverteerd naar klant!" });
      fetchLead();
      onUpdate();
    }
  };

  if (isLoading || !lead) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
        <div className="w-[600px] bg-white h-full flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const getStageBadge = (stage: string) => {
    const colors: Record<string, string> = {
      nieuw: "bg-blue-100 text-blue-700",
      benaderd: "bg-amber-100 text-amber-700",
      interesse: "bg-purple-100 text-purple-700",
      offerte: "bg-cyan-100 text-cyan-700",
      klant: "bg-green-100 text-green-700",
      afgewezen: "bg-red-100 text-red-700",
    };
    return colors[stage] || "bg-neutral-100 text-neutral-600";
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-[600px] bg-white h-full overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-200 p-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-neutral-900">{lead.bedrijfsnaam}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStageBadge(lead.pipeline_stage)}`}>
                  {lead.pipeline_stage}
                </span>
                {lead.ai_score && (
                  <span className="text-xs text-neutral-500">Score: {lead.ai_score}/100</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg">
              <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stage selector */}
          <div className="flex gap-1 mt-3">
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => updateLead({ pipeline_stage: s })}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                  lead.pipeline_stage === s
                    ? "bg-[#F27501] text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Section tabs */}
          <div className="flex gap-2 mt-3">
            {(["info", "timeline", "ai", "notities"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                  activeSection === s
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {s === "info" ? "Info" : s === "timeline" ? "Timeline" : s === "ai" ? "AI" : "Notities"}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div className={`mx-4 mt-4 p-3 rounded-xl text-sm ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {message.text}
          </div>
        )}

        <div className="p-4">
          {/* Info Section */}
          {activeSection === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Contactpersoon" value={lead.contactpersoon} />
                <InfoField label="Email" value={lead.email} />
                <InfoField label="Telefoon" value={lead.telefoon} />
                <InfoField label="Website" value={lead.website} link />
                <InfoField label="Stad" value={lead.stad} />
                <InfoField label="Branche" value={lead.branche} />
                <InfoField label="Adres" value={lead.adres} />
                <InfoField label="Bron" value={lead.bron} />
              </div>

              {/* Sales Rep Toewijzing */}
              {salesReps.length > 0 && (
                <div className="flex items-center gap-3 bg-neutral-50 p-3 rounded-xl">
                  <span className="text-xs font-medium text-neutral-500 whitespace-nowrap">Toegewezen aan:</span>
                  <select
                    value={lead.assigned_to || ""}
                    onChange={(e) => assignToRep(e.target.value || null)}
                    disabled={isAssigning}
                    className="flex-1 text-sm border border-neutral-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
                  >
                    <option value="">Niet toegewezen</option>
                    {salesReps.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.naam}
                      </option>
                    ))}
                  </select>
                  {lead.assigned_to && (
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: salesReps.find((r) => r.id === lead.assigned_to)?.kleur || "#999" }}
                    />
                  )}
                </div>
              )}

              {lead.ai_score_reasoning && (
                <div className="bg-purple-50 p-3 rounded-xl">
                  <p className="text-xs font-medium text-purple-800 mb-1">AI Score Analyse</p>
                  <p className="text-sm text-purple-700">{lead.ai_score_reasoning}</p>
                </div>
              )}

              {lead.pain_points && lead.pain_points.length > 0 && (
                <div className="bg-amber-50 p-3 rounded-xl">
                  <p className="text-xs font-medium text-amber-800 mb-1">Pain Points</p>
                  <ul className="text-sm text-amber-700 list-disc list-inside">
                    {lead.pain_points.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}

              {lead.personalisatie_notities && (
                <div className="bg-blue-50 p-3 rounded-xl">
                  <p className="text-xs font-medium text-blue-800 mb-1">Personalisatie Tip</p>
                  <p className="text-sm text-blue-700">{lead.personalisatie_notities}</p>
                </div>
              )}

              {/* Enrichment Data */}
              {lead.enrichment_data && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-indigo-800">AI Research Profiel</p>
                    <span className="text-[10px] text-indigo-400">
                      {new Date(lead.enrichment_data.laatst_verrijkt_op).toLocaleDateString("nl-NL")} • {lead.enrichment_data.verrijking_bron}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/70 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-indigo-500">Type</p>
                      <p className="text-xs font-medium text-indigo-900">{lead.enrichment_data.type_gelegenheid}</p>
                    </div>
                    <div className="bg-white/70 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-indigo-500">Grootte</p>
                      <p className="text-xs font-medium text-indigo-900">{lead.enrichment_data.grootte_indicatie}</p>
                    </div>
                    <div className="bg-white/70 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-indigo-500">Prijs</p>
                      <p className="text-xs font-medium text-indigo-900">{lead.enrichment_data.prijsrange}</p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1">
                    {lead.enrichment_data.heeft_vacatures && (
                      <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">Zoekt personeel!</span>
                    )}
                    {lead.enrichment_data.heeft_terras && (
                      <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Terras</span>
                    )}
                    {lead.enrichment_data.aantal_locaties && lead.enrichment_data.aantal_locaties > 1 && (
                      <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{lead.enrichment_data.aantal_locaties} locaties</span>
                    )}
                    {lead.enrichment_data.menu_type && (
                      <span className="text-[10px] px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full">{lead.enrichment_data.menu_type}</span>
                    )}
                  </div>

                  {lead.enrichment_data.seizoen_advies && (
                    <div className="bg-white/70 rounded-lg p-2">
                      <p className="text-[10px] font-medium text-orange-600">Seizoensadvies</p>
                      <p className="text-xs text-neutral-700">{lead.enrichment_data.seizoen_advies}</p>
                    </div>
                  )}

                  {lead.enrichment_data.website_samenvatting && (
                    <div className="bg-white/70 rounded-lg p-2">
                      <p className="text-[10px] font-medium text-indigo-600">Website</p>
                      <p className="text-xs text-neutral-700">{lead.enrichment_data.website_samenvatting}</p>
                    </div>
                  )}

                  {lead.enrichment_data.concurrenten_hint && (
                    <div className="bg-white/70 rounded-lg p-2">
                      <p className="text-[10px] font-medium text-red-600">Concurrentie</p>
                      <p className="text-xs text-neutral-700">{lead.enrichment_data.concurrenten_hint}</p>
                    </div>
                  )}

                  {/* Social media links */}
                  {(lead.enrichment_data.social_media.instagram || lead.enrichment_data.social_media.facebook) && (
                    <div className="flex gap-2">
                      {lead.enrichment_data.social_media.instagram && (
                        <a href={`https://instagram.com/${lead.enrichment_data.social_media.instagram}`} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-600 hover:underline">Instagram</a>
                      )}
                      {lead.enrichment_data.social_media.facebook && (
                        <a href={`https://facebook.com/${lead.enrichment_data.social_media.facebook}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Facebook</a>
                      )}
                      {lead.enrichment_data.social_media.linkedin && (
                        <a href={`https://linkedin.com/company/${lead.enrichment_data.social_media.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-800 hover:underline">LinkedIn</a>
                      )}
                    </div>
                  )}
                </div>
              )}

              <TagManager leadId={leadId} tags={lead.tags || []} getToken={getToken} onUpdate={() => { fetchLead(); onUpdate(); }} />

              <div className="grid grid-cols-2 gap-4 text-xs text-neutral-500 border-t pt-3">
                <div>Emails verstuurd: {lead.emails_verzonden_count}</div>
                <div>Laatste contact: {lead.laatste_contact_datum ? new Date(lead.laatste_contact_datum).toLocaleDateString("nl-NL") : "-"}</div>
                <div>Aangemaakt: {new Date(lead.created_at).toLocaleDateString("nl-NL")}</div>
                <div>Laatste email: {lead.laatste_email_verzonden_op ? new Date(lead.laatste_email_verzonden_op).toLocaleDateString("nl-NL") : "-"}</div>
              </div>

              {/* Convert to klant */}
              {lead.pipeline_stage !== "klant" && (
                <button
                  onClick={convertToKlant}
                  className="w-full py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Converteer naar Klant
                </button>
              )}
              {lead.klant_id && (
                <div className="text-center text-sm text-green-600 font-medium">
                  Geconverteerd op {lead.geconverteerd_op ? new Date(lead.geconverteerd_op).toLocaleDateString("nl-NL") : "-"}
                </div>
              )}
            </div>
          )}

          {/* Timeline Section */}
          {activeSection === "timeline" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-neutral-800">Contact Timeline</h4>
                <button
                  onClick={() => setShowContactForm(!showContactForm)}
                  className="text-xs px-3 py-1.5 bg-[#F27501] text-white rounded-lg hover:bg-[#d96800]"
                >
                  + Log contact
                </button>
              </div>

              {showContactForm && (
                <div className="bg-neutral-50 p-4 rounded-xl mb-4 space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={contactType}
                      onChange={(e) => setContactType(e.target.value)}
                      className="px-2 py-1.5 border border-neutral-300 rounded-lg text-sm"
                    >
                      <option value="telefoon">Telefoon</option>
                      <option value="email">Email</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="bezoek">Bezoek</option>
                    </select>
                    <select
                      value={contactRichting}
                      onChange={(e) => setContactRichting(e.target.value)}
                      className="px-2 py-1.5 border border-neutral-300 rounded-lg text-sm"
                    >
                      <option value="uitgaand">Uitgaand</option>
                      <option value="inkomend">Inkomend</option>
                    </select>
                    <select
                      value={contactResultaat}
                      onChange={(e) => setContactResultaat(e.target.value)}
                      className="px-2 py-1.5 border border-neutral-300 rounded-lg text-sm"
                    >
                      <option value="">Resultaat...</option>
                      <option value="positief">Positief</option>
                      <option value="neutraal">Neutraal</option>
                      <option value="negatief">Negatief</option>
                      <option value="geen_antwoord">Geen antwoord</option>
                      <option value="voicemail">Voicemail</option>
                    </select>
                  </div>
                  <textarea
                    value={contactInhoud}
                    onChange={(e) => setContactInhoud(e.target.value)}
                    placeholder="Notities over het contact..."
                    className="w-full p-2 border border-neutral-300 rounded-lg text-sm min-h-[80px] focus:outline-none focus:border-[#F27501]"
                  />
                  <button
                    onClick={logContact}
                    className="px-4 py-1.5 bg-[#F27501] text-white rounded-lg text-sm hover:bg-[#d96800]"
                  >
                    Opslaan
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {contactmomenten.map((cm) => (
                  <div key={cm.id} className={`border-l-2 pl-4 py-2 ${
                    cm.type === "whatsapp" ? "border-green-400" :
                    cm.type === "telefoon" ? "border-blue-400" :
                    cm.type === "email" ? "border-orange-300" :
                    cm.type === "bezoek" ? "border-purple-400" :
                    "border-neutral-300"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-800 capitalize">{cm.type}</span>
                      <span className="text-xs text-neutral-400">{cm.richting}</span>
                      {cm.resultaat && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          cm.resultaat === "positief" ? "bg-green-100 text-green-700" :
                          cm.resultaat === "negatief" ? "bg-red-100 text-red-700" :
                          "bg-neutral-100 text-neutral-600"
                        }`}>
                          {cm.resultaat}
                        </span>
                      )}
                      <span className="text-xs text-neutral-400 ml-auto">
                        {new Date(cm.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {cm.onderwerp && <p className="text-sm font-medium text-neutral-700 mt-1">{cm.onderwerp}</p>}
                    {cm.inhoud && <p className="text-sm text-neutral-600 mt-1 whitespace-pre-wrap">{cm.inhoud}</p>}
                  </div>
                ))}
                {contactmomenten.length === 0 && (
                  <p className="text-sm text-neutral-400 text-center py-4">Nog geen contactmomenten</p>
                )}
              </div>
            </div>
          )}

          {/* AI Section */}
          {activeSection === "ai" && (
            <div className="space-y-4">
              {/* Autopilot */}
              <div className={`p-4 rounded-xl border-2 ${lead.auto_sequence_active ? "bg-green-50 border-green-200" : "bg-neutral-50 border-neutral-200"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className={`w-5 h-5 ${lead.auto_sequence_active ? "text-green-600" : "text-neutral-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h4 className="font-medium text-neutral-800">AI Autopilot</h4>
                    {lead.auto_sequence_active && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Actief</span>
                    )}
                  </div>
                  <button
                    onClick={toggleAutopilot}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${lead.auto_sequence_active ? "bg-green-500" : "bg-neutral-300"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${lead.auto_sequence_active ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                {/* Volgende actie */}
                {lead.auto_sequence_next_action && (
                  <div className="bg-white rounded-lg p-3 mb-3">
                    <p className="text-xs text-neutral-500 mb-1">Volgende actie</p>
                    <p className="text-sm font-medium text-neutral-900">{lead.auto_sequence_next_action}</p>
                    {lead.auto_sequence_next_date && (
                      <p className="text-xs text-neutral-400 mt-1">
                        Gepland: {new Date(lead.auto_sequence_next_date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                )}

                {lead.auto_sequence_paused_until && new Date(lead.auto_sequence_paused_until) > new Date() && (
                  <div className="bg-yellow-50 rounded-lg p-2 mb-3 text-xs text-yellow-700">
                    Geparkeerd tot {new Date(lead.auto_sequence_paused_until).toLocaleDateString("nl-NL")}
                  </div>
                )}

                {/* Engagement score */}
                {lead.engagement_score > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-neutral-500">Engagement:</span>
                    <div className="flex-1 bg-neutral-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${lead.engagement_score >= 50 ? "bg-green-500" : lead.engagement_score >= 25 ? "bg-yellow-500" : "bg-neutral-400"}`}
                        style={{ width: `${Math.min(lead.engagement_score, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-neutral-700">{lead.engagement_score}</span>
                  </div>
                )}

                {nextAction && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-blue-800">AI Aanbeveling</p>
                    <p className="text-sm text-blue-700 mt-1">{nextAction.reden}</p>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-2 ${
                      nextAction.prioriteit === "hoog" ? "bg-red-100 text-red-700" :
                      nextAction.prioriteit === "normaal" ? "bg-blue-100 text-blue-700" :
                      "bg-neutral-100 text-neutral-600"
                    }`}>
                      {nextAction.prioriteit} prioriteit
                    </span>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={calculateNextAction}
                    disabled={isCalculating}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isCalculating ? "Berekenen..." : "Bereken volgende actie"}
                  </button>
                  <button
                    onClick={() => parkeerLead(14)}
                    className="text-xs px-3 py-1.5 bg-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-300"
                  >
                    Parkeer 14d
                  </button>
                  <button
                    onClick={() => parkeerLead(30)}
                    className="text-xs px-3 py-1.5 bg-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-300"
                  >
                    Parkeer 30d
                  </button>
                </div>

                {/* Sequence historie */}
                {lead.auto_sequence_history && lead.auto_sequence_history.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-700">Sequence historie ({lead.auto_sequence_history.length})</summary>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {lead.auto_sequence_history.map((h, i) => (
                        <div key={i} className="text-xs text-neutral-500 flex items-center gap-2">
                          <span className="text-neutral-400">{new Date(h.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</span>
                          <span className="font-medium text-neutral-700">{h.actie}</span>
                          <span className="truncate">{h.reden}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>

              {/* AI Score */}
              <div className="bg-purple-50 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-purple-800">AI Lead Score</h4>
                  <button
                    onClick={scoreLead}
                    disabled={isScoring}
                    className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isScoring ? "Scoring..." : lead.ai_score ? "Opnieuw scoren" : "Score berekenen"}
                  </button>
                </div>
                {lead.ai_score && (
                  <div>
                    <p className="text-2xl font-bold text-purple-700">{lead.ai_score}/100</p>
                    {lead.ai_score_reasoning && <p className="text-sm text-purple-600 mt-1">{lead.ai_score_reasoning}</p>}
                  </div>
                )}
              </div>

              {/* AI Email */}
              <div className="bg-blue-50 p-4 rounded-xl">
                <h4 className="font-medium text-blue-800 mb-3">AI Email Generator</h4>
                <div className="flex gap-2 mb-3">
                  <select
                    value={emailType}
                    onChange={(e) => setEmailType(e.target.value)}
                    className="px-2 py-1.5 border border-blue-300 rounded-lg text-sm bg-white"
                  >
                    <option value="cold_intro">Eerste contact</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="offerte">Offerte</option>
                    <option value="reminder">Herinnering</option>
                  </select>
                  <button
                    onClick={generateEmail}
                    disabled={isGenerating}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isGenerating ? "Genereren..." : "Genereer email"}
                  </button>
                </div>

                {emailDraft && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={emailOnderwerp}
                      onChange={(e) => setEmailOnderwerp(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:outline-none"
                      placeholder="Onderwerp"
                    />
                    <textarea
                      value={emailDraft}
                      onChange={(e) => setEmailDraft(e.target.value)}
                      className="w-full p-3 border border-blue-300 rounded-lg text-sm bg-white min-h-[200px] focus:outline-none resize-y"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={sendEmail}
                        disabled={isSending || !lead.email}
                        className="text-xs px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {isSending ? "Versturen..." : `Verstuur naar ${lead.email || "(geen email)"}`}
                      </button>
                      <button
                        onClick={() => { setEmailDraft(""); setEmailOnderwerp(""); }}
                        className="text-xs px-3 py-1.5 bg-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-300"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Research / Enrichment */}
              <div className="bg-indigo-50 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-indigo-800">AI Lead Research</h4>
                  <button
                    onClick={enrichLead}
                    disabled={isEnriching}
                    className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isEnriching ? "Onderzoeken..." : lead.enrichment_data ? "Opnieuw onderzoeken" : "Start research"}
                  </button>
                </div>
                <p className="text-xs text-indigo-600">
                  {lead.enrichment_data
                    ? `Laatst verrijkt: ${new Date(lead.enrichment_data.laatst_verrijkt_op).toLocaleDateString("nl-NL")} (${lead.enrichment_data.verrijking_bron})`
                    : "Analyseert website, detecteert vacatures, bepaalt type zaak en seizoensadvies"
                  }
                </p>
              </div>

              {/* WhatsApp */}
              <div className="bg-green-50 p-4 rounded-xl">
                <h4 className="font-medium text-green-800 mb-3">WhatsApp</h4>

                {/* Channel recommendation */}
                {!channelRec && (
                  <button onClick={fetchChannelRec} className="text-xs text-green-600 underline mb-3 block">
                    Welk kanaal is het best voor deze lead?
                  </button>
                )}
                {channelRec && (
                  <div className="bg-white/70 rounded-lg p-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        channelRec.kanaal === "whatsapp" ? "bg-green-200 text-green-800" :
                        channelRec.kanaal === "telefoon" ? "bg-blue-200 text-blue-800" :
                        "bg-neutral-200 text-neutral-800"
                      }`}>
                        {channelRec.kanaal}
                      </span>
                      <span className="text-xs text-neutral-500">{channelRec.tijdstip_advies}</span>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">{channelRec.reden}</p>
                  </div>
                )}

                <div className="flex gap-2 mb-3">
                  <select
                    value={waType}
                    onChange={(e) => setWaType(e.target.value)}
                    className="px-2 py-1.5 border border-green-300 rounded-lg text-sm bg-white"
                  >
                    <option value="intro">Introductie</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="beschikbaarheid">Beschikbaarheid</option>
                    <option value="bedankt">Bedankje</option>
                    <option value="herinnering">Herinnering</option>
                  </select>
                  <button
                    onClick={generateWaMessage}
                    disabled={isGeneratingWa}
                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {isGeneratingWa ? "Genereren..." : "Genereer bericht"}
                  </button>
                </div>

                {(waMessage || true) && (
                  <div className="space-y-2">
                    <textarea
                      value={waMessage}
                      onChange={(e) => setWaMessage(e.target.value)}
                      placeholder="Typ of genereer een WhatsApp bericht..."
                      className="w-full p-3 border border-green-300 rounded-lg text-sm bg-white min-h-[100px] focus:outline-none resize-y"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={sendWaMessage}
                        disabled={isSendingWa || !waMessage.trim() || !lead.telefoon}
                        className="text-xs px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {isSendingWa ? "Versturen..." : "Verstuur via WhatsApp"}
                      </button>
                      {lead.telefoon && (
                        <a
                          href={`https://wa.me/${lead.telefoon.replace(/[^0-9]/g, "").replace(/^0/, "31")}?text=${encodeURIComponent(waMessage)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50"
                        >
                          Open in WhatsApp Web
                        </a>
                      )}
                    </div>
                    {!lead.telefoon && (
                      <p className="text-xs text-red-500">Geen telefoonnummer beschikbaar</p>
                    )}
                  </div>
                )}
              </div>

              {/* Concurrentie Analyse */}
              <PredictionWidget leadId={leadId} getToken={getToken} />
              <CompetitiveInsight leadId={leadId} getToken={getToken} />
            </div>
          )}

          {/* Notities Section */}
          {activeSection === "notities" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1">Interne Notities</label>
                <textarea
                  value={notities}
                  onChange={(e) => setNotities(e.target.value)}
                  className="w-full p-3 border border-neutral-300 rounded-lg text-sm min-h-[150px] focus:outline-none focus:border-[#F27501] resize-y"
                  placeholder="Notities over deze lead..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-neutral-700 block mb-1">Volgende actie datum</label>
                  <input
                    type="date"
                    value={volgActieDatum}
                    onChange={(e) => setVolgActieDatum(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-[#F27501]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 block mb-1">Actie notitie</label>
                  <input
                    type="text"
                    value={volgActieNotitie}
                    onChange={(e) => setVolgActieNotitie(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-[#F27501]"
                    placeholder="Wat moet er gebeuren?"
                  />
                </div>
              </div>

              <button
                onClick={saveNotities}
                className="px-4 py-2 bg-[#F27501] text-white rounded-lg text-sm hover:bg-[#d96800]"
              >
                Opslaan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TagManager({ leadId, tags, getToken, onUpdate }: { leadId: string; tags: string[]; getToken: () => Promise<string>; onUpdate: () => void }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTag, setNewTag] = useState("");

  const suggestTags = async () => {
    setIsLoading(true);
    const token = await getToken();
    const res = await fetch(`/api/admin/acquisitie/segments?view=ai_suggest_tags&lead_id=${leadId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setSuggestions(json.data || []);
    }
    setIsLoading(false);
  };

  const addTag = async (tag: string) => {
    const token = await getToken();
    await fetch("/api/admin/acquisitie/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "bulk_tag", lead_ids: [leadId], tags_to_add: [tag] }),
    });
    setSuggestions((s) => s.filter((t) => t !== tag));
    onUpdate();
  };

  const removeTag = async (tag: string) => {
    const token = await getToken();
    await fetch("/api/admin/acquisitie/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "bulk_tag", lead_ids: [leadId], tags_to_remove: [tag] }),
    });
    onUpdate();
  };

  const addCustomTag = async () => {
    if (!newTag.trim()) return;
    await addTag(newTag.trim().toLowerCase().replace(/\s+/g, "-"));
    setNewTag("");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-neutral-600">Tags</p>
        <button onClick={suggestTags} disabled={isLoading} className="text-[10px] text-purple-500 hover:text-purple-700">
          {isLoading ? "..." : "AI Suggesties"}
        </button>
      </div>
      <div className="flex flex-wrap gap-1 mb-1">
        {tags.map((t) => (
          <span key={t} className="text-xs px-2 py-0.5 bg-neutral-100 rounded-full text-neutral-600 flex items-center gap-1 group">
            {t}
            <button onClick={() => removeTag(t)} className="text-neutral-300 hover:text-red-500 hidden group-hover:inline">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-xs text-neutral-400">Geen tags</span>}
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {suggestions.map((s) => (
            <button key={s} onClick={() => addTag(s)} className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 border border-dashed border-purple-200">
              + {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
          placeholder="Tag toevoegen..."
          className="flex-1 text-xs border border-neutral-200 rounded px-2 py-1"
        />
        {newTag && (
          <button onClick={addCustomTag} className="text-xs px-2 py-1 bg-neutral-100 rounded hover:bg-neutral-200">+</button>
        )}
      </div>
    </div>
  );
}

function PredictionWidget({ leadId, getToken }: { leadId: string; getToken: () => Promise<string> }) {
  const [prediction, setPrediction] = useState<{
    conversion_pct: number;
    deal_value: number;
    close_days: number;
    churn_risk: string;
    best_channel: string;
    best_time: string;
    reasoning: string;
    signals: { type: string; text: string }[];
    recommended_actions: string[];
  } | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const predict = async () => {
    setIsPredicting(true);
    const token = await getToken();
    const res = await fetch(`/api/admin/acquisitie/predictions?view=lead&lead_id=${leadId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setPrediction(json.data);
    }
    setIsPredicting(false);
  };

  const churnColors: Record<string, string> = {
    laag: "bg-green-100 text-green-700",
    midden: "bg-yellow-100 text-yellow-700",
    hoog: "bg-orange-100 text-orange-700",
    kritiek: "bg-red-100 text-red-700",
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <h4 className="text-sm font-semibold text-blue-900">Predictive AI</h4>
        </div>
        <button
          onClick={predict}
          disabled={isPredicting}
          className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isPredicting ? "Berekenen..." : prediction ? "Herbereken" : "Voorspel"}
        </button>
      </div>

      {prediction ? (
        <div className="space-y-3 mt-3">
          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <p className="text-[10px] text-blue-500">Conversie</p>
              <p className={`text-lg font-bold ${prediction.conversion_pct >= 50 ? "text-green-600" : prediction.conversion_pct >= 25 ? "text-amber-600" : "text-red-600"}`}>
                {prediction.conversion_pct}%
              </p>
            </div>
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <p className="text-[10px] text-blue-500">Deal Waarde</p>
              <p className="text-lg font-bold text-blue-800">&euro;{prediction.deal_value.toLocaleString("nl-NL")}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <p className="text-[10px] text-blue-500">Close in</p>
              <p className="text-lg font-bold text-blue-800">{prediction.close_days}d</p>
            </div>
          </div>

          {/* Churn + Channel */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${churnColors[prediction.churn_risk] || ""}`}>
              Churn: {prediction.churn_risk}
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              Best: {prediction.best_channel}
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
              {prediction.best_time}
            </span>
          </div>

          {/* Signals */}
          {prediction.signals.length > 0 && (
            <div className="space-y-1">
              {prediction.signals.slice(0, 4).map((s, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px]">
                  <span className={`flex-shrink-0 mt-0.5 ${s.type === "positief" ? "text-green-500" : s.type === "negatief" ? "text-red-500" : "text-neutral-400"}`}>
                    {s.type === "positief" ? "+" : s.type === "negatief" ? "-" : "·"}
                  </span>
                  <span className="text-blue-800">{s.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {prediction.recommended_actions.length > 0 && (
            <div className="bg-white/50 rounded-lg p-2">
              <p className="text-[10px] text-blue-600 uppercase font-medium mb-1">Aanbevolen</p>
              {prediction.recommended_actions.slice(0, 2).map((a, i) => (
                <p key={i} className="text-xs text-blue-800">• {a}</p>
              ))}
            </div>
          )}

          <p className="text-[10px] text-blue-400 italic">{prediction.reasoning}</p>
        </div>
      ) : (
        <p className="text-xs text-blue-500 mt-1">Klik &quot;Voorspel&quot; voor AI conversie-voorspelling, churn risico en aanbevelingen</p>
      )}
    </div>
  );
}

function CompetitiveInsight({ leadId, getToken }: { leadId: string; getToken: () => Promise<string> }) {
  const [analysis, setAnalysis] = useState<{
    waarschijnlijke_concurrenten: string[];
    onze_positie: string;
    win_kans: number;
    strategie: string;
    key_differentiators: string[];
    aanbevolen_aanpak: string;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyze = async () => {
    setIsAnalyzing(true);
    const token = await getToken();
    const res = await fetch(`/api/admin/acquisitie/competitive?view=lead_analysis&lead_id=${leadId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setAnalysis(json.data);
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
          <h4 className="text-sm font-semibold text-amber-900">Concurrentie Analyse</h4>
        </div>
        <button
          onClick={analyze}
          disabled={isAnalyzing}
          className="text-xs px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
        >
          {isAnalyzing ? "Analyseren..." : analysis ? "Heranalyse" : "Analyseer"}
        </button>
      </div>

      {analysis ? (
        <div className="space-y-3 mt-3">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-700">{analysis.win_kans}%</p>
              <p className="text-[10px] text-amber-500">Win kans</p>
            </div>
            <div className="flex-1">
              <div className="bg-amber-200 rounded-full h-2 overflow-hidden">
                <div className="bg-amber-600 h-full transition-all" style={{ width: `${analysis.win_kans}%` }} />
              </div>
            </div>
          </div>

          {analysis.waarschijnlijke_concurrenten.length > 0 && (
            <div>
              <p className="text-[10px] text-amber-600 uppercase font-medium">Verwachte Concurrenten</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {analysis.waarschijnlijke_concurrenten.map((c) => (
                  <span key={c} className="text-xs px-2 py-0.5 bg-white/70 text-amber-800 rounded-full">{c}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] text-amber-600 uppercase font-medium">Strategie</p>
            <p className="text-xs text-amber-800 mt-0.5">{analysis.strategie}</p>
          </div>

          <div>
            <p className="text-[10px] text-amber-600 uppercase font-medium">Key Differentiators</p>
            <ul className="mt-0.5 space-y-0.5">
              {analysis.key_differentiators.map((d, i) => (
                <li key={i} className="text-xs text-amber-700 flex items-start gap-1">
                  <span className="text-amber-500 flex-shrink-0">&#10003;</span> {d}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white/50 rounded-lg p-2">
            <p className="text-[10px] text-amber-600 uppercase font-medium">Aanbevolen Eerste Stap</p>
            <p className="text-xs text-amber-800 mt-0.5">{analysis.aanbevolen_aanpak}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-amber-500 mt-1">Klik &quot;Analyseer&quot; voor AI concurrentie-inzichten voor deze lead</p>
      )}
    </div>
  );
}

function InfoField({ label, value, link }: { label: string; value: string | null; link?: boolean }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      {link && value ? (
        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate block">
          {value}
        </a>
      ) : (
        <p className="text-sm text-neutral-800">{value || "-"}</p>
      )}
    </div>
  );
}
