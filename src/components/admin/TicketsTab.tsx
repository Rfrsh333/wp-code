"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ConfirmDialog";

interface Ticket {
  id: string;
  question: string;
  visitor_name: string | null;
  visitor_email: string | null;
  status: "new" | "in_review" | "answered" | "rejected" | "spam";
  ai_priority: "high" | "medium" | "low" | null;
  ai_category: string | null;
  ai_reasoning: string | null;
  ai_similar_faq: { id: string; question: string; slug: string } | null;
  linked_faq: { id: string; question: string; slug: string } | null;
  created_at: string;
  answered_at: string | null;
}

interface Stats {
  totalFaqs: number;
  openTickets: number;
  highPriority: number;
  weekTickets: number;
}

const CATEGORIES = [
  "Kosten & Tarieven",
  "Hoe het werkt",
  "Functies & Personeel",
  "Contracten & Juridisch",
  "Locaties & Beschikbaarheid",
  "Voor horecamedewerkers",
  "Evenementen & Catering",
  "Kwaliteit & Screening",
  "Overig",
];

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Nieuw",
  in_review: "In behandeling",
  answered: "Beantwoord",
  rejected: "Afgewezen",
  spam: "Spam",
};

export default function TicketsTab() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [answerMode, setAnswerMode] = useState(false);
  const [answerForm, setAnswerForm] = useState({ question: "", answer: "", category: "Overig", publish: true });
  const toast = useToast();
  const confirm = useConfirm();

  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  const fetchTickets = async () => {
    setIsLoading(true);
    const session = await getSession();
    if (!session) return;

    const params = new URLSearchParams();
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterPriority !== "all") params.set("priority", filterPriority);
    if (filterCategory !== "all") params.set("category", filterCategory);

    const res = await fetch(`/api/admin/tickets?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const { data } = await res.json();
    if (data) setTickets(data);
    setIsLoading(false);
  };

  const fetchStats = async () => {
    const session = await getSession();
    if (!session) return;

    const res = await fetch("/api/admin/tickets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: "stats" }),
    });
    const data = await res.json();
    setStats(data);
  };

  useEffect(() => {
    fetchTickets();
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterPriority, filterCategory]);

  const apiCall = async (body: Record<string, unknown>) => {
    const session = await getSession();
    if (!session) return false;
    const res = await fetch("/api/admin/tickets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  };

  const handleStatusChange = async (id: string, status: string) => {
    const success = await apiCall({ action: "update_status", id, data: { status } });
    if (success) {
      toast.success(`Status gewijzigd naar ${STATUS_LABELS[status]}`);
      fetchTickets();
      fetchStats();
      if (selectedTicket?.id === id) setSelectedTicket(null);
    }
  };

  const handleLinkFaq = async (ticketId: string, faqId: string) => {
    const success = await apiCall({ action: "link_faq", id: ticketId, data: { faq_id: faqId } });
    if (success) {
      toast.success("Ticket gekoppeld aan bestaande FAQ");
      fetchTickets();
      fetchStats();
      setSelectedTicket(null);
    }
  };

  const handleAnswerAsFaq = async () => {
    if (!selectedTicket || !answerForm.answer.trim()) return;
    const success = await apiCall({
      action: "answer_as_faq",
      id: selectedTicket.id,
      data: answerForm,
    });
    if (success) {
      toast.success("FAQ aangemaakt en ticket beantwoord");
      setAnswerMode(false);
      setSelectedTicket(null);
      fetchTickets();
      fetchStats();
    } else {
      toast.error("Opslaan mislukt");
    }
  };

  const handleReject = async (id: string) => {
    const ok = await confirm({
      title: "Ticket afwijzen?",
      message: "Dit ticket wordt gemarkeerd als afgewezen.",
      confirmLabel: "Afwijzen",
      variant: "danger",
    });
    if (ok) handleStatusChange(id, "rejected");
  };

  const handleSpam = async (id: string) => {
    handleStatusChange(id, "spam");
  };

  // Detail view
  if (selectedTicket) {
    return (
      <div>
        <button
          onClick={() => { setSelectedTicket(null); setAnswerMode(false); }}
          className="text-sm text-neutral-500 hover:text-neutral-700 mb-4 flex items-center gap-1"
        >
          &larr; Terug naar overzicht
        </button>

        <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold text-neutral-900">Ticket detail</h3>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              selectedTicket.status === "new" ? "bg-blue-100 text-blue-700" :
              selectedTicket.status === "answered" ? "bg-green-100 text-green-700" :
              selectedTicket.status === "spam" ? "bg-red-100 text-red-700" :
              "bg-neutral-100 text-neutral-600"
            }`}>
              {STATUS_LABELS[selectedTicket.status]}
            </span>
          </div>

          <div className="bg-neutral-50 rounded-lg p-4 mb-4">
            <p className="text-neutral-900 font-medium">&ldquo;{selectedTicket.question}&rdquo;</p>
          </div>

          {(selectedTicket.visitor_name || selectedTicket.visitor_email) && (
            <div className="text-sm text-neutral-500 mb-4">
              {selectedTicket.visitor_name && <span className="mr-4">Naam: {selectedTicket.visitor_name}</span>}
              {selectedTicket.visitor_email && <span>Email: {selectedTicket.visitor_email}</span>}
            </div>
          )}

          <p className="text-xs text-neutral-400 mb-6">
            Ingediend op {new Date(selectedTicket.created_at).toLocaleString("nl-NL")}
          </p>

          {/* AI Analysis block */}
          {selectedTicket.ai_priority && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">AI Analyse</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-blue-600 font-medium">Prioriteit:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[selectedTicket.ai_priority]}`}>
                    {selectedTicket.ai_priority.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Categorie:</span>
                  <span className="ml-2 text-neutral-700">{selectedTicket.ai_category}</span>
                </div>
              </div>
              {selectedTicket.ai_reasoning && (
                <p className="text-sm text-blue-800 mt-3 italic">
                  &ldquo;{selectedTicket.ai_reasoning}&rdquo;
                </p>
              )}
              {selectedTicket.ai_similar_faq && (
                <div className="mt-3 bg-white rounded-lg p-3 border border-blue-100">
                  <span className="text-xs text-blue-600 font-medium">Vergelijkbare bestaande FAQ:</span>
                  <p className="text-sm text-neutral-700 mt-1">{selectedTicket.ai_similar_faq.question}</p>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          {selectedTicket.status !== "answered" && selectedTicket.status !== "spam" && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setAnswerMode(true);
                  setAnswerForm({
                    question: selectedTicket.question,
                    answer: "",
                    category: selectedTicket.ai_category || "Overig",
                    publish: true,
                  });
                }}
                className="bg-[#F27501] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#d96800] transition-colors"
              >
                Beantwoorden → nieuwe FAQ
              </button>
              {selectedTicket.ai_similar_faq && (
                <button
                  onClick={() => handleLinkFaq(selectedTicket.id, selectedTicket.ai_similar_faq!.id)}
                  className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-200 transition-colors"
                >
                  Link aan bestaande FAQ
                </button>
              )}
              <button
                onClick={() => handleStatusChange(selectedTicket.id, "in_review")}
                className="bg-neutral-100 text-neutral-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-neutral-200 transition-colors"
              >
                In behandeling
              </button>
              <button
                onClick={() => handleReject(selectedTicket.id)}
                className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
              >
                Afwijzen
              </button>
              <button
                onClick={() => handleSpam(selectedTicket.id)}
                className="text-neutral-400 px-4 py-2 rounded-xl text-sm font-medium hover:bg-neutral-100 transition-colors"
              >
                Spam
              </button>
            </div>
          )}

          {selectedTicket.linked_faq && (
            <div className="mt-4 bg-green-50 border border-green-100 rounded-lg p-3">
              <span className="text-xs text-green-600 font-medium">Beantwoord via FAQ:</span>
              <p className="text-sm text-neutral-700 mt-1">{selectedTicket.linked_faq.question}</p>
            </div>
          )}
        </div>

        {/* Answer as FAQ form */}
        {answerMode && (
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h3 className="text-lg font-bold text-neutral-900 mb-4">Beantwoorden als nieuwe FAQ</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Vraag</label>
                <input
                  type="text"
                  value={answerForm.question}
                  onChange={(e) => setAnswerForm({ ...answerForm, question: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Antwoord</label>
                <textarea
                  value={answerForm.answer}
                  onChange={(e) => setAnswerForm({ ...answerForm, answer: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                  placeholder="Schrijf het antwoord..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Categorie</label>
                  <select
                    value={answerForm.category}
                    onChange={(e) => setAnswerForm({ ...answerForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={answerForm.publish}
                      onChange={(e) => setAnswerForm({ ...answerForm, publish: e.target.checked })}
                      className="rounded border-neutral-300"
                    />
                    Direct publiceren
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAnswerAsFaq}
                  disabled={!answerForm.answer.trim()}
                  className="bg-[#F27501] text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-[#d96800] transition-colors disabled:opacity-50"
                >
                  FAQ aanmaken & ticket sluiten
                </button>
                <button
                  onClick={() => setAnswerMode(false)}
                  className="px-6 py-2 rounded-xl text-sm font-medium border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div>
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-2xl font-bold text-neutral-900">{stats.totalFaqs}</p>
            <p className="text-xs text-neutral-500">Gepubliceerde FAQ&apos;s</p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-2xl font-bold text-neutral-900">
              {stats.openTickets}
              {stats.highPriority > 0 && (
                <span className="ml-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  {stats.highPriority} high
                </span>
              )}
            </p>
            <p className="text-xs text-neutral-500">Open tickets</p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-2xl font-bold text-neutral-900">{stats.weekTickets}</p>
            <p className="text-xs text-neutral-500">Deze week</p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-2xl font-bold text-neutral-900">{tickets.length}</p>
            <p className="text-xs text-neutral-500">Gefilterd</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Ticket Beheer</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Bezoekersvragen met AI-analyse
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white"
        >
          <option value="all">Alle statussen</option>
          <option value="new">Nieuw</option>
          <option value="in_review">In behandeling</option>
          <option value="answered">Beantwoord</option>
          <option value="rejected">Afgewezen</option>
          <option value="spam">Spam</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white"
        >
          <option value="all">Alle prioriteiten</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white"
        >
          <option value="all">Alle categorieën</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Ticket list */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-neutral-100 rounded-xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          Geen tickets gevonden met deze filters.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="text-left px-4 py-3 font-medium text-neutral-500 w-12">Prio</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Vraag</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 hidden md:table-cell">Categorie</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 hidden lg:table-cell">Status</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 hidden lg:table-cell">Datum</th>
                <th className="text-right px-4 py-3 font-medium text-neutral-500">Actie</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="border-b border-neutral-50 hover:bg-neutral-50 cursor-pointer"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <td className="px-4 py-3">
                    {ticket.ai_priority ? (
                      <span className={`inline-block w-3 h-3 rounded-full ${
                        ticket.ai_priority === "high" ? "bg-red-500" :
                        ticket.ai_priority === "medium" ? "bg-yellow-500" :
                        "bg-green-500"
                      }`} title={ticket.ai_priority} />
                    ) : (
                      <span className="inline-block w-3 h-3 rounded-full bg-neutral-300" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900 line-clamp-1">
                      {ticket.question}
                    </div>
                    {ticket.visitor_name && (
                      <span className="text-xs text-neutral-400">
                        Door: {ticket.visitor_name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {ticket.ai_category && (
                      <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full">
                        {ticket.ai_category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      ticket.status === "new" ? "bg-blue-100 text-blue-700" :
                      ticket.status === "in_review" ? "bg-yellow-100 text-yellow-700" :
                      ticket.status === "answered" ? "bg-green-100 text-green-700" :
                      ticket.status === "spam" ? "bg-red-100 text-red-700" :
                      "bg-neutral-100 text-neutral-600"
                    }`}>
                      {STATUS_LABELS[ticket.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-neutral-500 text-xs">
                    {new Date(ticket.created_at).toLocaleDateString("nl-NL")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicket(ticket);
                      }}
                      className="px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded hover:bg-neutral-200"
                    >
                      Bekijk
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
